import { Button } from "@/components/ui/button";
import { useRole, type ViewMode } from "@/contexts/role-context";
import { BarChart3, Briefcase } from "lucide-react";
import { useLocation } from "wouter";

export function ViewModeToggle() {
  const { viewMode, setViewMode } = useRole();
  const [, navigate] = useLocation();

  const handleSwitch = (newMode: ViewMode) => {
    setViewMode(newMode);
    if (newMode === "management") {
      navigate("/management");
    } else {
      navigate("/admin");
    }
  };

  if (viewMode === "counsellor") {
    return (
      <Button 
        variant="outline" 
        size="sm" 
        onClick={() => handleSwitch("management")}
        data-testid="button-switch-management"
      >
        <BarChart3 className="w-4 h-4 mr-2" />
        Management View
      </Button>
    );
  }

  return (
    <Button 
      variant="outline" 
      size="sm" 
      onClick={() => handleSwitch("counsellor")}
      data-testid="button-switch-counsellor"
    >
      <Briefcase className="w-4 h-4 mr-2" />
      Back to Counsellor View
    </Button>
  );
}
