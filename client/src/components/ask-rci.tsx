/**
 * Ask Margin Guard Component
 * 
 * The primary AI diagnostic entry point for RCI.
 * Consultants describe client problems here to initiate root cause analysis.
 * This is the front door to the AI brain - focused, uncluttered, action-oriented.
 */

import { useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Brain } from "lucide-react";

const industries = [
  { value: "construction", label: "Construction" },
  { value: "fnb_full_service", label: "F&B - Full Service Restaurant" },
  { value: "fnb_qsr", label: "F&B - Quick Service Restaurant (QSR)" },
  { value: "fnb_fast_food", label: "F&B - Fast Food Chain" },
  { value: "fnb_franchise", label: "F&B - Franchise" },
  { value: "fnb_independent", label: "F&B - Independent Restaurant" },
  { value: "healthcare", label: "Healthcare, Hospitals & Pharmacies" },
  { value: "hospitality", label: "Hospitality" },
  { value: "hotels_airbnb", label: "Hotels & Airbnb" },
  { value: "logistics", label: "Logistics" },
  { value: "manufacturing", label: "Manufacturing" },
  { value: "oil_gas", label: "Oil & Gas" },
  { value: "property_development", label: "Property Development" },
];

const contextOptions = [
  { id: "money", label: "Money" },
  { id: "material", label: "Material" },
  { id: "manpower", label: "Manpower" },
  { id: "machinery", label: "Machinery" },
];

interface AskRCIProps {
  onAnalyze?: (data: {
    problem: string;
    industry: string;
    context: string[];
  }) => void;
}

export function AskRCI({ onAnalyze }: AskRCIProps) {
  const [problem, setProblem] = useState("");
  const [industry, setIndustry] = useState("");
  const [selectedContext, setSelectedContext] = useState<string[]>([]);

  const handleContextChange = (contextId: string, checked: boolean) => {
    if (checked) {
      setSelectedContext((prev) => [...prev, contextId]);
    } else {
      setSelectedContext((prev) => prev.filter((id) => id !== contextId));
    }
  };

  const handleSubmit = () => {
    if (!problem.trim() || !industry) return;
    
    onAnalyze?.({
      problem: problem.trim(),
      industry,
      context: selectedContext,
    });
  };

  const isValid = problem.trim().length > 0 && industry.length > 0;

  return (
    <div className="w-full max-w-3xl mx-auto" data-testid="ask-rci-container">
      <div className="flex items-center gap-3 mb-6">
        <Brain className="w-8 h-8 text-foreground" />
        <h2 className="text-2xl font-semibold tracking-tight">Ask Margin Guard</h2>
      </div>

      <div className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="problem" className="text-base font-medium">
            Describe the problem you are observing
          </Label>
          <Textarea
            id="problem"
            value={problem}
            onChange={(e) => setProblem(e.target.value)}
            placeholder="e.g., Our manufacturing costs increased 23% over the last quarter but production output remained flat. We need to understand the root cause."
            className="min-h-[140px] text-base resize-none"
            data-testid="input-problem"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="industry" className="text-base font-medium">
            Industry
          </Label>
          <Select value={industry} onValueChange={setIndustry}>
            <SelectTrigger id="industry" className="w-full" data-testid="select-industry">
              <SelectValue placeholder="Select client industry" />
            </SelectTrigger>
            <SelectContent>
              {industries.map((ind) => (
                <SelectItem key={ind.value} value={ind.value}>
                  {ind.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-3">
          <Label className="text-base font-medium">Context</Label>
          <div className="flex flex-wrap gap-6">
            {contextOptions.map((option) => (
              <div key={option.id} className="flex items-center space-x-2">
                <Checkbox
                  id={option.id}
                  checked={selectedContext.includes(option.id)}
                  onCheckedChange={(checked) =>
                    handleContextChange(option.id, checked === true)
                  }
                  data-testid={`checkbox-${option.id}`}
                />
                <Label
                  htmlFor={option.id}
                  className="text-sm font-normal cursor-pointer"
                >
                  {option.label}
                </Label>
              </div>
            ))}
          </div>
        </div>

        <div className="pt-4">
          <Button
            onClick={handleSubmit}
            disabled={!isValid}
            size="lg"
            className="w-full sm:w-auto"
            data-testid="button-analyze"
          >
            <Brain className="w-5 h-5 mr-2" />
            Analyze with Margin Guard Brain
          </Button>
        </div>
      </div>
    </div>
  );
}
