import { createContext, useContext, useState, useEffect, type ReactNode } from "react";

export type UserRole = "consultant" | "client";
export type ViewMode = "counsellor" | "management";

interface RoleContextType {
  userRole: UserRole;
  setUserRole: (role: UserRole) => void;
  isConsultant: boolean;
  isClient: boolean;
  viewMode: ViewMode;
  setViewMode: (view: ViewMode) => void;
  isCounsellorView: boolean;
  isManagementView: boolean;
}

const STORAGE_KEY = "rci-view-mode";

const RoleContext = createContext<RoleContextType | null>(null);

export function RoleProvider({ children }: { children: ReactNode }) {
  const [userRole, setUserRole] = useState<UserRole>("consultant");
  const [viewMode, setViewModeState] = useState<ViewMode>(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored === "counsellor" || stored === "management") {
        return stored;
      }
    }
    return "counsellor";
  });

  const setViewMode = (view: ViewMode) => {
    setViewModeState(view);
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEY, view);
    }
  };

  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEY, viewMode);
    }
  }, [viewMode]);

  const value: RoleContextType = {
    userRole,
    setUserRole,
    isConsultant: userRole === "consultant",
    isClient: userRole === "client",
    viewMode,
    setViewMode,
    isCounsellorView: viewMode === "counsellor",
    isManagementView: viewMode === "management",
  };

  return (
    <RoleContext.Provider value={value}>
      {children}
    </RoleContext.Provider>
  );
}

export function useRole() {
  const context = useContext(RoleContext);
  if (!context) {
    throw new Error("useRole must be used within a RoleProvider");
  }
  return context;
}
