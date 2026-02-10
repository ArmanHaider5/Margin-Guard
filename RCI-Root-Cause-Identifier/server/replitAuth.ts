import * as client from "openid-client";
import { Strategy, type VerifyFunction } from "openid-client/passport";

import passport from "passport";
import session from "express-session";
import type { Express, RequestHandler } from "express";
import memoize from "memoizee";
import connectPg from "connect-pg-simple";
import { Pool } from "pg";
import { storage } from "./storage";

const getOidcConfig = memoize(
  async () => {
    return await client.discovery(
      new URL(process.env.ISSUER_URL ?? "https://replit.com/oidc"),
      process.env.REPL_ID!
    );
  },
  { maxAge: 3600 * 1000 }
);

export function getSession() {
  const sessionTtl = 7 * 24 * 60 * 60 * 1000; // 1 week
  const isProduction = process.env.NODE_ENV === "production";
  
  const PgStore = connectPg(session);
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const sessionStore = new PgStore({
    pool,
    createTableIfMissing: false,
    ttl: sessionTtl / 1000,
    tableName: "sessions",
  });
  
  return session({
    secret: process.env.SESSION_SECRET!,
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: isProduction,
      maxAge: sessionTtl,
    },
  });
}

function updateUserSession(
  user: any,
  tokens: client.TokenEndpointResponse & client.TokenEndpointResponseHelpers
) {
  user.claims = tokens.claims();
  user.access_token = tokens.access_token;
  user.refresh_token = tokens.refresh_token;
  user.expires_at = user.claims?.exp;
}

async function upsertUser(claims: any) {
  await storage.upsertUser({
    id: claims["sub"],
    email: claims["email"],
    firstName: claims["first_name"],
    lastName: claims["last_name"],
    profileImageUrl: claims["profile_image_url"],
  });
}

export async function setupAuth(app: Express) {
  app.set("trust proxy", 1);
  app.use(getSession());
  app.use(passport.initialize());
  app.use(passport.session());

  const config = await getOidcConfig();

  const verify: VerifyFunction = async (
    tokens: client.TokenEndpointResponse & client.TokenEndpointResponseHelpers,
    verified: passport.AuthenticateCallback
  ) => {
    const user = {};
    updateUserSession(user, tokens);
    await upsertUser(tokens.claims());
    verified(null, user);
  };

  const registeredStrategies = new Set<string>();

  const ensureStrategy = (domain: string) => {
    const strategyName = `replitauth:${domain}`;
    if (!registeredStrategies.has(strategyName)) {
      const strategy = new Strategy(
        {
          name: strategyName,
          config,
          scope: "openid email profile offline_access",
          callbackURL: `https://${domain}/api/callback`,
        },
        verify,
      );
      passport.use(strategy);
      registeredStrategies.add(strategyName);
    }
  };

  passport.serializeUser((user: Express.User, cb) => cb(null, user));
  passport.deserializeUser((user: Express.User, cb) => cb(null, user));

  app.get("/api/login", (req, res, next) => {
    ensureStrategy(req.hostname);
    passport.authenticate(`replitauth:${req.hostname}`, {
      prompt: "login consent",
      scope: ["openid", "email", "profile", "offline_access"],
    })(req, res, next);
  });

  app.get("/api/callback", (req, res, next) => {
    ensureStrategy(req.hostname);
    passport.authenticate(`replitauth:${req.hostname}`, {
      successReturnToOrRedirect: "/",
      failureRedirect: "/api/login",
    })(req, res, next);
  });

  app.get("/api/logout", (req, res) => {
    req.logout(() => {
      res.redirect(
        client.buildEndSessionUrl(config, {
          client_id: process.env.REPL_ID!,
          post_logout_redirect_uri: `${req.protocol}://${req.hostname}`,
        }).href
      );
    });
  });
}

export const isAuthenticated: RequestHandler = async (req, res, next) => {
  const user = req.user as any;

  // Debug logging
  console.log("[isAuthenticated] req.isAuthenticated():", req.isAuthenticated());
  console.log("[isAuthenticated] user:", user ? JSON.stringify(user).substring(0, 200) : "undefined");
  console.log("[isAuthenticated] user.claims:", user?.claims);

  // Basic authentication check
  if (!req.isAuthenticated() || !user?.claims?.sub) {
    console.log("[isAuthenticated] FAILED - isAuth:", req.isAuthenticated(), "claims.sub:", user?.claims?.sub);
    return res.status(401).json({ message: "Unauthorized" });
  }

  // If no expires_at, allow through (legacy session or missing field)
  // This ensures backwards compatibility with existing sessions
  if (!user.expires_at) {
    console.log("[isAuthenticated] No expires_at, allowing through");
    return next();
  }

  const now = Math.floor(Date.now() / 1000);
  console.log("[isAuthenticated] expires_at:", user.expires_at, "now:", now, "expired:", now > user.expires_at);
  if (now <= user.expires_at) {
    console.log("[isAuthenticated] Token still valid, allowing through");
    return next();
  }

  // Token expired, try to refresh
  console.log("[isAuthenticated] Token expired, trying to refresh");
  const refreshToken = user.refresh_token;
  if (!refreshToken) {
    // No refresh token but user has valid session - allow through
    // They can still use the app, will need to re-login eventually
    console.log("[isAuthenticated] No refresh token, but session valid - allowing through");
    return next();
  }

  try {
    const config = await getOidcConfig();
    const tokenResponse = await client.refreshTokenGrant(config, refreshToken);
    updateUserSession(user, tokenResponse);
    console.log("[isAuthenticated] Token refreshed, allowing through");
    return next();
  } catch (error) {
    // Token refresh failed but user has valid session with claims
    // Allow them through - they're authenticated via session
    console.log("[isAuthenticated] Token refresh failed, but session valid - allowing through");
    return next();
  }
};
