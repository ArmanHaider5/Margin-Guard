import { useState } from "react";
import { useLocation } from "wouter";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, ArrowRight, Loader2, Search, ListChecks } from "lucide-react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { diagnosticCategories, followUpQuestions, fourMCategoryColors, type AnalyzeSymptomRequest, type AnalyzeSymptomResponse, type DiagnosticCategory, type ProblemLibraryEntry } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { AuthHeader } from "@/components/auth-header";

type QuestionKey = keyof typeof followUpQuestions;

const questionFlow: QuestionKey[] = ["timing", "staffChanges", "processChanges", "workload", "equipment", "supplier"];

export default function Diagnose() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  
  // Input mode: "describe" = free text, "library" = select from problem library
  const [inputMode, setInputMode] = useState<"describe" | "library">("describe");
  
  // Step tracking
  const [step, setStep] = useState(0);
  // Step 0: Input mode selection + category
  // Step 1: Problem description (describe mode) OR problem selection (library mode)
  // Step 2-7: Follow-up questions
  
  // Form state
  const [selectedCategory, setSelectedCategory] = useState<DiagnosticCategory | "">("");
  const [symptomDescription, setSymptomDescription] = useState("");
  const [selectedProblemId, setSelectedProblemId] = useState<string>("");
  const [responses, setResponses] = useState<Record<string, string>>({});

  // Fetch problems for selected category - fetch as soon as category is selected
  // so data is ready when user switches to library tab
  const { data: problems, isLoading: problemsLoading } = useQuery<ProblemLibraryEntry[]>({
    queryKey: ["problems", selectedCategory],
    queryFn: async () => {
      const res = await fetch(`/api/problems?category=${selectedCategory}`);
      if (!res.ok) throw new Error("Failed to fetch problems");
      return res.json();
    },
    enabled: !!selectedCategory,
  });

  const totalSteps = 2 + questionFlow.length;
  const progress = ((step + 1) / totalSteps) * 100;

  const analyzeMutation = useMutation({
    mutationFn: async (data: AnalyzeSymptomRequest) => {
      const response = await apiRequest("POST", "/api/analyze", data);
      return await response.json() as AnalyzeSymptomResponse;
    },
    onSuccess: (data) => {
      setLocation(`/results/${data.sessionId}`);
    },
    onError: (error) => {
      console.error("Analysis error:", error);
      toast({
        title: "Analysis Failed",
        description: "We couldn't analyze your problem. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleNext = () => {
    if (step === 0 && !selectedCategory) return;
    
    if (step === 1) {
      if (inputMode === "describe" && !symptomDescription.trim()) return;
      if (inputMode === "library" && !selectedProblemId) return;
    }
    
    if (step >= 2 && step < totalSteps) {
      const currentQuestionIndex = step - 2;
      const questionKey = questionFlow[currentQuestionIndex];
      if (!responses[questionKey]) return;
    }

    if (step === totalSteps - 1) {
      // Get symptom text - either from description or selected problem
      let symptom = symptomDescription;
      if (inputMode === "library" && selectedProblemId && problems) {
        const selectedProblem = problems.find(p => p.id === selectedProblemId);
        symptom = selectedProblem?.description || symptomDescription;
      }

      const onset = responses.timing || "gradual";
      
      analyzeMutation.mutate({
        symptom,
        symptomCategory: selectedCategory,
        diagnosticCategory: selectedCategory,
        selectedProblemId: inputMode === "library" ? selectedProblemId : undefined,
        onset,
        responses,
      });
    } else {
      setStep(step + 1);
    }
  };

  const handlePrevious = () => {
    if (step > 0) {
      setStep(step - 1);
    }
  };

  const handleBack = () => {
    setLocation("/");
  };

  const handleAnswerChange = (questionKey: string, value: string) => {
    setResponses(prev => ({ ...prev, [questionKey]: value }));
  };

  const canProceed = () => {
    if (step === 0) return selectedCategory !== "";
    if (step === 1) {
      if (inputMode === "describe") return symptomDescription.trim() !== "";
      return selectedProblemId !== "";
    }
    if (step >= 2) {
      const currentQuestionIndex = step - 2;
      const questionKey = questionFlow[currentQuestionIndex];
      return responses[questionKey] !== undefined;
    }
    return true;
  };

  // Determine which stage we're in for the 3-step progress indicator
  const getStage = () => {
    if (step <= 1) return 1; // Symptom stage
    if (step < totalSteps - 1) return 2; // Analysis stage
    return 3; // Results stage
  };

  const currentStage = getStage();
  const selectedCategoryData = diagnosticCategories.find(c => c.id === selectedCategory);

  return (
    <div className="min-h-screen bg-background">
      <AuthHeader />
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="space-y-6">
          {/* Progress Header with 3-Step Indicator */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Button
                variant="ghost"
                size="sm"
                onClick={step === 0 ? handleBack : handlePrevious}
                disabled={analyzeMutation.isPending}
                data-testid="button-back"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                {step === 0 ? "Home" : "Previous"}
              </Button>
              <Badge variant="secondary" className="text-xs" data-testid="text-step-counter">
                Step {step + 1} of {totalSteps}
              </Badge>
            </div>

            {/* 3-Step Progress Indicator */}
            <div className="flex items-center justify-center gap-2" data-testid="progress-indicator">
              <div className="flex items-center gap-2">
                <div className={`flex items-center justify-center w-8 h-8 rounded-full text-xs font-medium ${currentStage >= 1 ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`} data-testid="progress-step-1">
                  1
                </div>
                <span className={`text-xs font-medium ${currentStage >= 1 ? 'text-foreground' : 'text-muted-foreground'}`}>Symptom</span>
              </div>
              <div className={`h-px w-12 ${currentStage >= 2 ? 'bg-primary' : 'bg-border'}`}></div>
              <div className="flex items-center gap-2">
                <div className={`flex items-center justify-center w-8 h-8 rounded-full text-xs font-medium ${currentStage >= 2 ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`} data-testid="progress-step-2">
                  2
                </div>
                <span className={`text-xs font-medium ${currentStage >= 2 ? 'text-foreground' : 'text-muted-foreground'}`}>Analysis</span>
              </div>
              <div className={`h-px w-12 ${currentStage >= 3 ? 'bg-primary' : 'bg-border'}`}></div>
              <div className="flex items-center gap-2">
                <div className={`flex items-center justify-center w-8 h-8 rounded-full text-xs font-medium ${currentStage >= 3 ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`} data-testid="progress-step-3">
                  3
                </div>
                <span className={`text-xs font-medium ${currentStage >= 3 ? 'text-foreground' : 'text-muted-foreground'}`}>Results</span>
              </div>
            </div>
            <Progress value={progress} className="h-2" />
          </div>

          {/* Question Card */}
          <Card className="p-6">
            <div className="space-y-6">
              {/* Step 0: Category Selection */}
              {step === 0 && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <h2 className="text-lg font-medium text-card-foreground leading-relaxed" data-testid="text-question">
                      What area of your business is affected?
                    </h2>
                    <p className="text-sm text-muted-foreground">
                      Select the category that best describes your problem area
                    </p>
                  </div>
                  <RadioGroup value={selectedCategory} onValueChange={(v) => setSelectedCategory(v as DiagnosticCategory)}>
                    <div className="space-y-3">
                      {diagnosticCategories.map((category) => (
                        <div key={category.id} className="flex items-start space-x-3" data-testid={`radio-category-${category.id}`}>
                          <RadioGroupItem value={category.id} id={category.id} className="mt-1" />
                          <Label htmlFor={category.id} className="flex-1 cursor-pointer">
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-medium">{category.label}</span>
                                <Badge 
                                  variant="outline" 
                                  className={`text-xs ${fourMCategoryColors[category.primaryM].bg} ${fourMCategoryColors[category.primaryM].text} ${fourMCategoryColors[category.primaryM].border}`}
                                >
                                  {category.indicator}
                                </Badge>
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {category.description}
                              </div>
                            </div>
                          </Label>
                        </div>
                      ))}
                    </div>
                  </RadioGroup>
                </div>
              )}

              {/* Step 1: Problem Input - Dual Mode */}
              {step === 1 && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <h2 className="text-lg font-medium text-card-foreground leading-relaxed" data-testid="text-question">
                      Tell us about your problem
                    </h2>
                    <p className="text-sm text-muted-foreground">
                      You can describe your problem in your own words, or select from common issues we've seen
                    </p>
                  </div>

                  <Tabs value={inputMode} onValueChange={(v) => setInputMode(v as "describe" | "library")} className="w-full">
                    <TabsList className="grid w-full grid-cols-2">
                      <TabsTrigger value="describe" className="flex items-center gap-2" data-testid="tab-describe">
                        <Search className="w-4 h-4" />
                        Describe Problem
                      </TabsTrigger>
                      <TabsTrigger value="library" className="flex items-center gap-2" data-testid="tab-library">
                        <ListChecks className="w-4 h-4" />
                        Select from List
                      </TabsTrigger>
                    </TabsList>

                    <TabsContent value="describe" className="mt-4">
                      <div className="space-y-2">
                        <Label className="text-sm font-medium">Describe what's happening</Label>
                        <Textarea
                          placeholder="Example: Our production output dropped by 20% over the past two weeks and we can't figure out why..."
                          value={symptomDescription}
                          onChange={(e) => setSymptomDescription(e.target.value)}
                          className="min-h-[120px] text-base"
                          data-testid="input-symptom"
                        />
                      </div>
                    </TabsContent>

                    <TabsContent value="library" className="mt-4">
                      <div className="space-y-3">
                        <Label className="text-sm font-medium">
                          Common {selectedCategoryData?.label || ""} Problems
                        </Label>
                        {problemsLoading ? (
                          <div className="text-sm text-muted-foreground py-4 text-center flex items-center justify-center gap-2">
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Loading problems...
                          </div>
                        ) : problems && problems.length > 0 ? (
                          <RadioGroup value={selectedProblemId} onValueChange={setSelectedProblemId}>
                            <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2" data-testid="problem-list">
                              {problems.map((problem) => (
                                <div 
                                  key={problem.id} 
                                  className="flex items-start space-x-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                                  data-testid={`radio-problem-${problem.id}`}
                                >
                                  <RadioGroupItem value={problem.id} id={problem.id} className="mt-1" />
                                  <Label htmlFor={problem.id} className="flex-1 cursor-pointer">
                                    <div className="space-y-1">
                                      <div className="text-sm font-medium">{problem.title}</div>
                                      <div className="text-xs text-muted-foreground line-clamp-2">
                                        {problem.description}
                                      </div>
                                    </div>
                                  </Label>
                                </div>
                              ))}
                            </div>
                          </RadioGroup>
                        ) : (
                          <div className="text-sm text-muted-foreground py-4 text-center">
                            No problems found for this category
                          </div>
                        )}
                      </div>
                    </TabsContent>
                  </Tabs>
                </div>
              )}

              {/* Steps 2+: Follow-up Questions */}
              {step >= 2 && step < totalSteps && (() => {
                const currentQuestionIndex = step - 2;
                const questionKey = questionFlow[currentQuestionIndex];
                const question = followUpQuestions[questionKey];
                
                return (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <h2 className="text-lg font-medium text-card-foreground leading-relaxed" data-testid="text-question">
                        {question.question}
                      </h2>
                    </div>
                    <RadioGroup 
                      value={responses[questionKey] || ""} 
                      onValueChange={(value) => handleAnswerChange(questionKey, value)}
                    >
                      <div className="space-y-3">
                        {question.options.map((option) => (
                          <div key={option.value} className="flex items-start space-x-3" data-testid={`radio-${questionKey}-${option.value}`}>
                            <RadioGroupItem value={option.value} id={`${questionKey}-${option.value}`} className="mt-1" />
                            <Label htmlFor={`${questionKey}-${option.value}`} className="flex-1 cursor-pointer">
                              <div className="text-sm font-medium">{option.label}</div>
                            </Label>
                          </div>
                        ))}
                      </div>
                    </RadioGroup>
                  </div>
                );
              })()}
            </div>
          </Card>

          {/* Navigation */}
          <div className="flex justify-end">
            <Button
              onClick={handleNext}
              disabled={!canProceed() || analyzeMutation.isPending}
              size="default"
              data-testid="button-next"
            >
              {analyzeMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Analyzing...
                </>
              ) : step === totalSteps - 1 ? (
                "Analyze My Problem"
              ) : (
                <>
                  Next
                  <ArrowRight className="w-4 h-4 ml-2" />
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
