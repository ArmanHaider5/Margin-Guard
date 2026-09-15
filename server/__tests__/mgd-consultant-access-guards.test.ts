import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import path from "path";

// ─────────────────────────────────────────────────────────────────────────────
// MGD Consultant Access — architecture-fitness sweep.
//
// server/system/routes.ts cannot be imported directly in a unit test: its
// module-level code (and everything it transitively imports — ai-analyzer,
// db, etc.) requires a real DATABASE_URL and other live service config (see
// server/routes/__tests__/mgd-routes.test.ts's own header comment for the
// same constraint on a smaller surface). These are plain source-text
// assertions instead — the same pattern server/__tests__/
// mgd-route-classification.test.ts already establishes for this codebase —
// encoding the security-critical invariants of this milestone as regression
// guards: isAdmin must stay byte-identical and admin-only, the new
// isAdminOrConsultant guard must never be substituted for it on any
// /api/admin/* route, and the MGD-only guard must be used for /api/mgd/*.
// ─────────────────────────────────────────────────────────────────────────────

const ROOT = path.resolve(__dirname, "..", "..");

function read(relPath: string): string {
  return readFileSync(path.join(ROOT, relPath), "utf-8");
}

describe("shared/schema.ts — role model", () => {
  const schema = read("shared/schema.ts");

  it("UserRole includes admin, client, and consultant — nothing else", () => {
    expect(schema).toMatch(/export type UserRole = "admin" \| "client" \| "consultant";/);
  });

  it("consultantClientAssignments table exists with the exact approved shape", () => {
    expect(schema).toMatch(/export const consultantClientAssignments = pgTable\(\s*"consultant_client_assignments"/);
    expect(schema).toMatch(/userId: varchar\("user_id"\)\.notNull\(\)/);
    expect(schema).toMatch(/clientId: varchar\("client_id"\)\.notNull\(\)/);
    expect(schema).toMatch(/createdAt: timestamp\("created_at"\)\.defaultNow\(\)/);
  });

  it("consultantClientAssignments has a uniqueness constraint on (userId, clientId)", () => {
    expect(schema).toMatch(/uniqueIndex\("IDX_consultant_client_unique"\)\.on\(table\.userId, table\.clientId\)/);
  });

  it("does not reinterpret users.clientId — that field is untouched", () => {
    expect(schema).toMatch(/clientId: varchar\("client_id"\), \/\/ Links client users to their client/);
  });
});

describe("server/system/routes.ts — isAdmin stays byte-identical and admin-only", () => {
  const routes = read("server/system/routes.ts");

  it("isAdmin's role check is still exactly role !== \"admin\" — never widened to include consultant", () => {
    const isAdminBlock = routes.match(/const isAdmin = async[\s\S]*?\n  \};/);
    expect(isAdminBlock).not.toBeNull();
    expect(isAdminBlock![0]).toMatch(/user\.role !== "admin"/);
    expect(isAdminBlock![0]).not.toMatch(/consultant/);
  });

  it("every /api/admin/* route is still gated by isAuthenticated, isAdmin (never isAdminOrConsultant)", () => {
    const adminRouteMatches = routes.match(/app\.(get|post|patch|delete)\("\/api\/admin\/[^"]*",\s*isAuthenticated,\s*isAdmin\b/g) ?? [];
    // A representative, non-exhaustive floor — this file registers well over
    // 20 /api/admin/* routes; the real invariant is the negative check below.
    expect(adminRouteMatches.length).toBeGreaterThan(10);

    const adminRoutesWithWrongGuard = routes.match(/app\.(get|post|patch|delete)\("\/api\/admin\/[^"]*",\s*isAuthenticated,\s*isAdminOrConsultant\b/g) ?? [];
    expect(adminRoutesWithWrongGuard).toEqual([]);
  });

  it("PATCH /api/admin/users/:id/role now validates admin, client, AND consultant", () => {
    expect(routes).toMatch(/if \(!\["admin", "client", "consultant"\]\.includes\(role\)\)/);
  });
});

describe("server/system/routes.ts — isAdminOrConsultant is a genuinely separate guard", () => {
  const routes = read("server/system/routes.ts");

  it("isAdminOrConsultant exists and checks for admin OR consultant", () => {
    const block = routes.match(/const isAdminOrConsultant = async[\s\S]*?\n  \};/);
    expect(block).not.toBeNull();
    expect(block![0]).toMatch(/user\.role !== "admin" && user\.role !== "consultant"/);
  });

  it("registerMGDRoutes is mounted with isAdminOrConsultant, not isAdmin", () => {
    expect(routes).toMatch(/registerMGDRoutes\(app,\s*\[isAuthenticated,\s*isAdminOrConsultant\]\)/);
    expect(routes).not.toMatch(/registerMGDRoutes\(app,\s*\[isAuthenticated,\s*isAdmin\]\)/);
  });
});

describe("server/routes/mgd-routes.ts — per-endpoint admin-only sub-guard", () => {
  const mgdRoutes = read("server/routes/mgd-routes.ts");

  const adminOnlyRoutes: Array<[string, RegExp]> = [
    ["DELETE /api/mgd/reports/:id", /app\.delete\("\/api\/mgd\/reports\/:id",\s*\.\.\.guard,\s*\.\.\.adminOnly,/],
    ["POST /api/mgd/export-pdf",    /app\.post\("\/api\/mgd\/export-pdf",\s*\.\.\.guard,\s*\.\.\.adminOnly,/],
    ["GET /api/mgd/traces",         /app\.get\("\/api\/mgd\/traces",\s*\.\.\.guard,\s*\.\.\.adminOnly,/],
    ["GET /api/mgd/traces/:id",     /app\.get\("\/api\/mgd\/traces\/:id",\s*\.\.\.guard,\s*\.\.\.adminOnly,/],
    ["POST /api/mgd/estimate-health",  /app\.post\("\/api\/mgd\/estimate-health",\s*\.\.\.guard,\s*\.\.\.adminOnly,/],
    ["POST /api/mgd/findings",         /app\.post\("\/api\/mgd\/findings",\s*\.\.\.guard,\s*\.\.\.adminOnly,/],
    ["POST /api/mgd/root-causes",      /app\.post\("\/api\/mgd\/root-causes",\s*\.\.\.guard,\s*\.\.\.adminOnly,/],
    ["POST /api/mgd/recommendations",  /app\.post\("\/api\/mgd\/recommendations",\s*\.\.\.guard,\s*\.\.\.adminOnly,/],
    ["POST /api/mgd/benchmarks",       /app\.post\("\/api\/mgd\/benchmarks",\s*\.\.\.guard,\s*\.\.\.adminOnly,/],
    ["POST /api/mgd/narrative",        /app\.post\("\/api\/mgd\/narrative",\s*\.\.\.guard,\s*\.\.\.adminOnly,/],
  ];

  it.each(adminOnlyRoutes)("%s carries the ...adminOnly sub-guard", (_label, pattern) => {
    expect(mgdRoutes).toMatch(pattern);
  });

  const consultantAccessibleRoutes: Array<[string, RegExp]> = [
    ["POST /api/mgd/run",                         /app\.post\("\/api\/mgd\/run",\s*\.\.\.guard,\s*async/],
    ["GET /api/mgd/reports",                      /app\.get\("\/api\/mgd\/reports",\s*\.\.\.guard,\s*async/],
    ["GET /api/mgd/reports/:id",                  /app\.get\("\/api\/mgd\/reports\/:id",\s*\.\.\.guard,\s*async/],
    ["GET /api/mgd/clients",                      /app\.get\("\/api\/mgd\/clients",\s*\.\.\.guard,\s*async/],
    ["GET /api/mgd/clients/:id/documents",        /app\.get\("\/api\/mgd\/clients\/:id\/documents",\s*\.\.\.guard,\s*\.\.\.clientScoped,/],
    ["POST /api/mgd/clients/:id/documents",       /app\.post\("\/api\/mgd\/clients\/:id\/documents",\s*\.\.\.guard,\s*\.\.\.clientScoped,/],
  ];

  it.each(consultantAccessibleRoutes)("%s has no ...adminOnly sub-guard (consultant-accessible)", (_label, pattern) => {
    expect(mgdRoutes).toMatch(pattern);
  });

  it("GET /api/mgd/health remains public — no guard at all", () => {
    expect(mgdRoutes).toMatch(/app\.get\("\/api\/mgd\/health",\s*\(_req: Request, res: Response\)/);
  });
});

describe("client/src/hooks/useAuth.ts — canAccessMGD derivation", () => {
  const useAuth = read("client/src/hooks/useAuth.ts");

  it("canAccessMGD is admin OR consultant, never plain client", () => {
    expect(useAuth).toMatch(/canAccessMGD:\s*user\?\.role === "admin" \|\| user\?\.role === "consultant"/);
  });
});

describe("client/src/App.tsx — MGD Consultant Access route split", () => {
  const appTsx = read("client/src/App.tsx");

  it("a canAccessMGD-gated block exists, separate from the admin-only block", () => {
    expect(appTsx).toMatch(/if \(canAccessMGD\) \{/);
  });

  it("the canAccessMGD block registers the five MGD product-surface routes", () => {
    const block = appTsx.match(/if \(canAccessMGD\) \{[\s\S]*?\n  \}/);
    expect(block).not.toBeNull();
    for (const routePath of ["/mgd\"", "/mgd/reports\"", "/mgd/report\"", "/mgd/diagnostic\"", "/mgd/present\""]) {
      expect(block![0]).toContain(routePath);
    }
  });

  it("the canAccessMGD block does NOT register any /admin, /management, or /mgd/run route", () => {
    const block = appTsx.match(/if \(canAccessMGD\) \{[\s\S]*?\n  \}/);
    expect(block).not.toBeNull();
    expect(block![0]).not.toMatch(/path="\/admin/);
    expect(block![0]).not.toMatch(/path="\/management/);
    expect(block![0]).not.toMatch(/path="\/mgd\/run"/);
    expect(block![0]).not.toMatch(/path="\/clients\/:clientId\/diagnostics\/new"/);
  });

  it("does not use role-context.tsx's RoleProvider/useRole for the canAccessMGD authorization decision", () => {
    const block = appTsx.match(/if \(canAccessMGD\) \{[\s\S]*?\n  \}/);
    expect(block).not.toBeNull();
    expect(block![0]).not.toMatch(/useRole\(/);
  });
});

describe("client/src/pages/mgd-diagnostic-wizard.tsx — MGD-scoped client endpoints", () => {
  const wizard = read("client/src/pages/mgd-diagnostic-wizard.tsx");

  it("client listing and document listing/upload use /api/mgd/clients*, never /api/admin/clients*", () => {
    expect(wizard).toMatch(/fetch\("\/api\/mgd\/clients"\)/);
    expect(wizard).toMatch(/fetch\(`\/api\/mgd\/clients\/\$\{selectedId\}\/documents`\)/);
    expect(wizard).not.toMatch(/\/api\/admin\/clients\/\$\{selectedId\}\/documents/);
    expect(wizard).not.toMatch(/fetch\("\/api\/admin\/clients"\)/);
  });

  it("client creation is gated behind canCreateClient (consultants never see it)", () => {
    expect(wizard).toMatch(/canCreateClient:\s*boolean/);
    expect(wizard).toMatch(/\{canCreateClient && \(/);
  });
});

describe("client/src/pages/mgd-report-archive.tsx — Delete gated for consultants", () => {
  const archive = read("client/src/pages/mgd-report-archive.tsx");

  it("canDelete is false for the consultant role, and gates the Delete UI", () => {
    expect(archive).toMatch(/canDelete\s*=\s*user\?\.role !== "consultant"/);
    expect(archive).toMatch(/\{canDelete && \(/);
  });
});
