import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useRole, type UserRole } from "@/contexts/role-context";
import { User, Briefcase, Eye } from "lucide-react";

/**
 * Temporary role toggle for internal testing only.
 * Only visible to consultants. Will be removed later.
 */
export function RoleSwitcher() {
  const { userRole, setUserRole, isConsultant } = useRole();

  const isViewingAsClient = userRole === "client";

  const handleToggle = (checked: boolean) => {
    setUserRole(checked ? "client" : "consultant");
  };

  return (
    <div className="flex items-center gap-3 p-2 border rounded-md bg-muted/30 border-dashed border-amber-500/50">
      <Eye className="w-4 h-4 text-amber-600" />
      <Label 
        htmlFor="client-view-toggle" 
        className="text-xs text-muted-foreground cursor-pointer"
      >
        View as Client
      </Label>
      <Switch
        id="client-view-toggle"
        checked={isViewingAsClient}
        onCheckedChange={handleToggle}
        data-testid="switch-view-as-client"
      />
      {isViewingAsClient && (
        <Badge variant="outline" className="text-xs bg-amber-50 dark:bg-amber-950 border-amber-300">
          Client Preview
        </Badge>
      )}
    </div>
  );
}

export function RoleBadge() {
  const { userRole } = useRole();
  
  return (
    <Badge variant="outline" className="text-xs" data-testid="badge-current-role">
      {userRole === "consultant" ? (
        <>
          <Briefcase className="w-3 h-3 mr-1" />
          Consultant View
        </>
      ) : (
        <>
          <User className="w-3 h-3 mr-1" />
          Client View
        </>
      )}
    </Badge>
  );
}
