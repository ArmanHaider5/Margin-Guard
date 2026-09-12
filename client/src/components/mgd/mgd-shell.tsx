// ─────────────────────────────────────────────────────────────────────────────
// MGD SHELL — shared page shell for the MGD product surface
//
// Milestone A of the MGD white-theme redesign. Provides the persistent left
// sidebar, top header bar, and user/account area every MGD page will render
// inside — layout/chrome only. Does NOT restyle any page's own content; a
// page rendered inside this shell keeps its existing internal markup and
// styling until its own milestone.
//
// Built entirely on the existing shadcn sidebar primitive
// (client/src/components/ui/sidebar.tsx) and the existing semantic design
// tokens (client/src/index.css / tailwind.config.ts) — no new design-token
// system, no new authentication mechanism. Logout reuses the same
// GET /api/logout + window.location.href redirect already used elsewhere
// (see server/frontend/mgd/mgd-dashboard.tsx and
// client/src/components/auth-header.tsx).
// ─────────────────────────────────────────────────────────────────────────────

import type { ReactNode, ElementType } from "react";
import { Link, useLocation } from "wouter";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { useAuth } from "@/hooks/useAuth";
import {
  Home,
  FilePlus,
  FileText,
  BookOpen,
  TrendingUp,
  Settings,
  LogOut,
} from "lucide-react";
import type { User } from "@shared/schema";

// ── Navigation ────────────────────────────────────────────────────────────────
// Only real, existing MGD destinations get an `href`. Knowledge Library,
// Industry Insights, and Settings have no MGD-specific route today (the only
// existing "/admin/knowledge" page is the older RCI root-cause knowledge
// library — a different system, not an MGD destination — so it is
// deliberately NOT wired up here rather than mislabeling it). Per the
// milestone brief, these three stay visible but inert ("Soon") instead of
// linking to an invented or incorrect route. /mgd/run is intentionally
// absent — it is an internal/developer tool, not part of this navigation.

interface NavItem {
  label: string;
  icon:  ElementType;
  href?: string; // absent = destination not yet resolved
}

const NAV_ITEMS: NavItem[] = [
  { label: "Home",              icon: Home,       href: "/" },
  { label: "New Diagnostic",    icon: FilePlus,   href: "/mgd/diagnostic" },
  { label: "My Reports",        icon: FileText,   href: "/mgd/reports" },
  { label: "Knowledge Library", icon: BookOpen },
  { label: "Industry Insights", icon: TrendingUp },
  { label: "Settings",          icon: Settings },
];

function initials(user?: User | null): string {
  if (!user) return "?";
  const f = user.firstName?.[0] ?? "";
  const l = user.lastName?.[0] ?? "";
  if (f || l) return (f + l).toUpperCase();
  return (user.email?.[0] ?? "?").toUpperCase();
}

function displayName(user?: User | null): string {
  if (!user) return "Account";
  const name = [user.firstName, user.lastName].filter(Boolean).join(" ").trim();
  return name || user.email || "Account";
}

// ── Shell ─────────────────────────────────────────────────────────────────────

export function MGDShell({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  const { user } = useAuth();

  return (
    <SidebarProvider>
      <Sidebar collapsible="offcanvas">
        <SidebarHeader className="px-4 py-4">
          <Link href="/" data-testid="link-mgd-shell-brand">
            <div className="flex items-baseline gap-2 cursor-pointer">
              <span className="font-serif text-lg font-semibold text-sidebar-foreground">MGD</span>
              <span className="text-[11px] leading-tight text-muted-foreground">
                Margin Guard<br />Diagnostics
              </span>
            </div>
          </Link>
        </SidebarHeader>

        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarMenu>
                {NAV_ITEMS.map(item => {
                  const Icon = item.icon;

                  if (!item.href) {
                    return (
                      <SidebarMenuItem key={item.label}>
                        <SidebarMenuButton
                          disabled
                          className="cursor-not-allowed opacity-50"
                          title="Destination not yet available"
                          data-testid={`nav-mgd-${item.label.toLowerCase().replace(/\s+/g, "-")}-unresolved`}
                        >
                          <Icon />
                          <span>{item.label}</span>
                          <span className="ml-auto text-[10px] text-muted-foreground">Soon</span>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  }

                  const isActive = location === item.href;
                  return (
                    <SidebarMenuItem key={item.label}>
                      <SidebarMenuButton
                        asChild
                        isActive={isActive}
                        data-testid={`nav-mgd-${item.label.toLowerCase().replace(/\s+/g, "-")}`}
                      >
                        <Link href={item.href}>
                          <Icon />
                          <span>{item.label}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>

        <SidebarFooter className="border-t border-sidebar-border px-3 py-3">
          <div className="flex items-center gap-2 px-1 py-1">
            <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
              {initials(user)}
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-medium text-sidebar-foreground">
                {displayName(user)}
              </div>
            </div>
            <button
              onClick={() => { window.location.href = "/api/logout"; }}
              className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              title="Log out"
              data-testid="button-mgd-shell-logout"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </SidebarFooter>
      </Sidebar>

      <SidebarInset>
        <header className="flex h-14 flex-shrink-0 items-center gap-3 border-b border-border bg-background px-4">
          <SidebarTrigger data-testid="button-mgd-shell-sidebar-toggle" />
          <span className="text-sm font-medium text-foreground">Margin Guard Diagnostics</span>
        </header>
        <main className="flex-1 overflow-y-auto bg-background">
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}

export default MGDShell;
