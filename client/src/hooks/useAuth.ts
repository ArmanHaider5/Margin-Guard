import { useQuery } from "@tanstack/react-query";
import type { User } from "@shared/schema";

export function useAuth() {
  const { data: user, isLoading, error } = useQuery<User | null>({
    queryKey: ["/api/auth/user"],
    retry: false,
    staleTime: 5 * 60 * 1000,
  });

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
    // MGD product surface (dashboard, diagnostic wizard, reports) is
    // available to admin AND consultant roles. The rest of /admin/* and
    // /management/* stays admin-only — this is not a general "is staff"
    // check. Mirrors server/system/routes.ts's isAdminOrConsultant guard.
    canAccessMGD: user?.role === "admin" || user?.role === "consultant",
    error,
  };
}
