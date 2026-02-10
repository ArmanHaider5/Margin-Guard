import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { industries, type Industry } from "@shared/schema";
import { 
  Calendar, 
  ShoppingBag, 
  Truck, 
  Building2,
  ArrowRight,
  Loader2
} from "lucide-react";

const industryIcons: Record<Industry, typeof Calendar> = {
  event_management: Calendar,
  retail: ShoppingBag,
  logistics: Truck,
  other: Building2,
};

export default function Onboarding() {
  const { toast } = useToast();
  const [selectedIndustry, setSelectedIndustry] = useState<Industry | "">("");
  const [companyName, setCompanyName] = useState("");

  const updateProfileMutation = useMutation({
    mutationFn: async (data: { industry: Industry; companyName: string }) => {
      const response = await apiRequest("PATCH", "/api/auth/user/profile", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      toast({
        title: "Welcome to RCI!",
        description: "Your profile has been set up. Let's start diagnosing.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to save your profile. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = () => {
    if (!selectedIndustry) {
      toast({
        title: "Select an industry",
        description: "Please choose your industry to continue.",
        variant: "destructive",
      });
      return;
    }
    updateProfileMutation.mutate({ 
      industry: selectedIndustry, 
      companyName: companyName.trim() || "My Business" 
    });
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl" data-testid="text-onboarding-title">
            Welcome to RCI
          </CardTitle>
          <CardDescription data-testid="text-onboarding-description">
            Tell us about your business so we can tailor our diagnosis to your industry
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-3">
            <Label htmlFor="companyName">Business Name (optional)</Label>
            <Input
              id="companyName"
              placeholder="e.g., My Event Company"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              data-testid="input-company-name"
            />
          </div>

          <div className="space-y-3">
            <Label>What industry are you in?</Label>
            <RadioGroup
              value={selectedIndustry}
              onValueChange={(value) => setSelectedIndustry(value as Industry)}
              className="grid grid-cols-1 gap-3"
              data-testid="radio-group-industry"
            >
              {industries.map((industry) => {
                const Icon = industryIcons[industry.id];
                return (
                  <div key={industry.id}>
                    <RadioGroupItem
                      value={industry.id}
                      id={industry.id}
                      className="peer sr-only"
                    />
                    <Label
                      htmlFor={industry.id}
                      className="flex items-center gap-4 rounded-lg border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary cursor-pointer transition-colors"
                      data-testid={`radio-industry-${industry.id}`}
                    >
                      <div className="w-10 h-10 rounded-md bg-muted flex items-center justify-center shrink-0">
                        <Icon className="w-5 h-5" />
                      </div>
                      <div className="flex-1">
                        <div className="font-medium">{industry.label}</div>
                        <div className="text-sm text-muted-foreground">{industry.description}</div>
                      </div>
                    </Label>
                  </div>
                );
              })}
            </RadioGroup>
          </div>

          <Button 
            className="w-full" 
            size="lg"
            onClick={handleSubmit}
            disabled={!selectedIndustry || updateProfileMutation.isPending}
            data-testid="button-continue"
          >
            {updateProfileMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Setting up...
              </>
            ) : (
              <>
                Continue to Dashboard
                <ArrowRight className="ml-2 h-4 w-4" />
              </>
            )}
          </Button>

          <p className="text-xs text-center text-muted-foreground">
            You can change these settings later in your profile
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
