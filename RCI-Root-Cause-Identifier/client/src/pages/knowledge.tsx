import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { AuthHeader } from "@/components/auth-header";
import { 
  BookOpen, Library, BarChart3, Home, Plus, Search, Star, Trash2, Edit, 
  DollarSign, Package, Users, Wrench, ChevronRight, AlertCircle, TrendingUp,
  Building2
} from "lucide-react";
import { 
  type ProblemLibraryEntry, 
  type CustomProblem,
  type DiagnosticCategory,
  type FourMCategory,
  type ManagementIndicator,
  diagnosticCategories,
  fourMCategoryColors,
  categoryToIndicator 
} from "@shared/schema";
import { type IndustryProblem, type Industry, industryLabels } from "@shared/industry-problems";

const fourMIcons: Record<FourMCategory, typeof DollarSign> = {
  Money: DollarSign,
  Materials: Package,
  Manpower: Users,
  Machinery: Wrench,
};

interface KnowledgeInsights {
  totalCustomProblems: number;
  totalDiagnoses: number;
  topCategories: { category: string; count: number }[];
  thisMonthDiagnoses: number;
}

interface IndustriesResponse {
  industries: { id: string; label: string; problemCount: number }[];
  totalProblems: number;
}

export default function Knowledge() {
  const [activeTab, setActiveTab] = useState("catalog");
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [industryFilter, setIndustryFilter] = useState<string>("all");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const { toast } = useToast();

  const { data: catalog, isLoading: catalogLoading } = useQuery<ProblemLibraryEntry[]>({
    queryKey: ["/api/knowledge/catalog"],
  });

  const { data: customProblems, isLoading: customLoading } = useQuery<CustomProblem[]>({
    queryKey: ["/api/knowledge/custom"],
  });

  const { data: insights, isLoading: insightsLoading } = useQuery<KnowledgeInsights>({
    queryKey: ["/api/knowledge/insights"],
  });

  const { data: industriesData, isLoading: industriesLoading } = useQuery<IndustriesResponse>({
    queryKey: ["/api/industries"],
  });

  const { data: industryProblems, isLoading: industryProblemsLoading } = useQuery<IndustryProblem[]>({
    queryKey: ["/api/industry-problems"],
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/knowledge/custom/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/knowledge/custom"] });
      queryClient.invalidateQueries({ queryKey: ["/api/knowledge/insights"] });
      toast({ title: "Problem deleted", description: "Custom problem removed from your library" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to delete problem", variant: "destructive" });
    },
  });

  const favoriteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("POST", `/api/knowledge/custom/${id}/favorite`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/knowledge/custom"] });
    },
  });

  const filteredCatalog = catalog?.filter(problem => {
    const matchesSearch = searchQuery === "" || 
      problem.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      problem.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = categoryFilter === "all" || problem.diagnosticCategory === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const filteredCustom = customProblems?.filter(problem => {
    const matchesSearch = searchQuery === "" || 
      problem.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      problem.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = categoryFilter === "all" || problem.diagnosticCategory === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const filteredIndustryProblems = industryProblems?.filter(problem => {
    const matchesSearch = searchQuery === "" || 
      problem.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      problem.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesIndustry = industryFilter === "all" || problem.industry === industryFilter;
    return matchesSearch && matchesIndustry;
  });

  const getCategoryLabel = (categoryId: string) => {
    const cat = diagnosticCategories.find(c => c.id === categoryId);
    return cat?.label || categoryId;
  };

  const getIndustryLabel = (industryId: string) => {
    return industryLabels[industryId as Industry] || industryId;
  };

  return (
    <div className="min-h-screen bg-background">
      <AuthHeader />
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-6">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="space-y-1">
              <h1 className="text-2xl font-semibold text-foreground" data-testid="text-title">
                Knowledge Base
              </h1>
              <p className="text-sm text-muted-foreground">
                Browse the RCI problem library and manage your custom knowledge
              </p>
            </div>
            <Link href="/">
              <Button variant="outline" size="default" data-testid="button-home">
                <Home className="w-4 h-4 mr-2" />
                Home
              </Button>
            </Link>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="catalog" className="flex items-center gap-2" data-testid="tab-catalog">
                <BookOpen className="w-4 h-4" />
                <span className="hidden sm:inline">RCI Catalog</span>
                <span className="sm:hidden">Catalog</span>
              </TabsTrigger>
              <TabsTrigger value="industry" className="flex items-center gap-2" data-testid="tab-industry">
                <Building2 className="w-4 h-4" />
                <span className="hidden sm:inline">Industry Problems</span>
                <span className="sm:hidden">Industry</span>
              </TabsTrigger>
              <TabsTrigger value="custom" className="flex items-center gap-2" data-testid="tab-custom">
                <Library className="w-4 h-4" />
                <span className="hidden sm:inline">My Library</span>
                <span className="sm:hidden">My Library</span>
              </TabsTrigger>
              <TabsTrigger value="insights" className="flex items-center gap-2" data-testid="tab-insights">
                <BarChart3 className="w-4 h-4" />
                <span className="hidden sm:inline">Usage Insights</span>
                <span className="sm:hidden">Insights</span>
              </TabsTrigger>
            </TabsList>

            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search problems..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                  data-testid="input-search"
                />
              </div>
              {activeTab === "industry" ? (
                <Select value={industryFilter} onValueChange={setIndustryFilter}>
                  <SelectTrigger className="w-full sm:w-[240px]" data-testid="select-industry-filter">
                    <SelectValue placeholder="Filter by industry" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Industries ({industriesData?.totalProblems || 0})</SelectItem>
                    {industriesData?.industries.map(ind => (
                      <SelectItem key={ind.id} value={ind.id}>
                        {ind.label} ({ind.problemCount})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger className="w-full sm:w-[200px]" data-testid="select-category-filter">
                    <SelectValue placeholder="Filter by category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {diagnosticCategories.map(cat => (
                      <SelectItem key={cat.id} value={cat.id}>{cat.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            <TabsContent value="catalog" className="space-y-4">
              {catalogLoading && (
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <Card key={i}>
                      <CardContent className="p-6">
                        <div className="space-y-3">
                          <Skeleton className="h-6 w-3/4" />
                          <Skeleton className="h-4 w-full" />
                          <div className="flex gap-2">
                            <Skeleton className="h-6 w-20" />
                            <Skeleton className="h-6 w-20" />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}

              {!catalogLoading && filteredCatalog && filteredCatalog.length === 0 && (
                <Card className="p-8">
                  <div className="text-center space-y-4">
                    <BookOpen className="w-12 h-12 text-muted-foreground mx-auto" />
                    <p className="text-muted-foreground" data-testid="text-no-results">
                      No problems found matching your search
                    </p>
                  </div>
                </Card>
              )}

              {!catalogLoading && filteredCatalog && filteredCatalog.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">
                    Showing {filteredCatalog.length} of {catalog?.length} problems in the RCI catalog
                  </p>
                  <Accordion type="single" collapsible className="space-y-2">
                    {filteredCatalog.map((problem) => {
                      const FourMIcon = fourMIcons[problem.dominantM];
                      const colors = fourMCategoryColors[problem.dominantM];
                      return (
                        <AccordionItem key={problem.id} value={problem.id} className="border rounded-lg px-4">
                          <AccordionTrigger className="hover:no-underline py-4" data-testid={`accordion-problem-${problem.id}`}>
                            <div className="flex items-start gap-4 text-left w-full pr-4">
                              <div className={`p-2 rounded-lg ${colors.bg}`}>
                                <FourMIcon className={`w-4 h-4 ${colors.text}`} />
                              </div>
                              <div className="flex-1 space-y-1">
                                <h3 className="font-medium text-foreground">{problem.title}</h3>
                                <p className="text-sm text-muted-foreground line-clamp-1">{problem.description}</p>
                                <div className="flex flex-wrap gap-2">
                                  <Badge variant="outline" className={`${colors.bg} ${colors.text} ${colors.border}`}>
                                    {problem.dominantM}
                                  </Badge>
                                  <Badge variant="secondary" className="text-xs">
                                    {getCategoryLabel(problem.diagnosticCategory)}
                                  </Badge>
                                </div>
                              </div>
                            </div>
                          </AccordionTrigger>
                          <AccordionContent className="pb-4">
                            <div className="pl-14 space-y-4">
                              <div>
                                <h4 className="font-medium text-sm mb-2">Common Causes</h4>
                                <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                                  {problem.commonCauses.map((cause, i) => (
                                    <li key={i}>{cause}</li>
                                  ))}
                                </ul>
                              </div>
                              <div>
                                <h4 className="font-medium text-sm mb-2">Recommended Actions</h4>
                                <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                                  {problem.recommendedActions.map((action, i) => (
                                    <li key={i}>{action}</li>
                                  ))}
                                </ul>
                              </div>
                              <div>
                                <h4 className="font-medium text-sm mb-2">Prevention Steps</h4>
                                <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                                  {problem.preventionSteps.map((step, i) => (
                                    <li key={i}>{step}</li>
                                  ))}
                                </ul>
                              </div>
                              {problem.impactNotes && (
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                                  {problem.impactNotes.cost && (
                                    <Card className="p-3 bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800">
                                      <p className="text-xs text-red-600 dark:text-red-400 font-medium">Cost Impact</p>
                                      <p className="text-sm text-red-700 dark:text-red-300">{problem.impactNotes.cost}</p>
                                    </Card>
                                  )}
                                  {problem.impactNotes.time && (
                                    <Card className="p-3 bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800">
                                      <p className="text-xs text-amber-600 dark:text-amber-400 font-medium">Time Impact</p>
                                      <p className="text-sm text-amber-700 dark:text-amber-300">{problem.impactNotes.time}</p>
                                    </Card>
                                  )}
                                  {problem.impactNotes.efficiency && (
                                    <Card className="p-3 bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
                                      <p className="text-xs text-blue-600 dark:text-blue-400 font-medium">Efficiency Impact</p>
                                      <p className="text-sm text-blue-700 dark:text-blue-300">{problem.impactNotes.efficiency}</p>
                                    </Card>
                                  )}
                                </div>
                              )}
                            </div>
                          </AccordionContent>
                        </AccordionItem>
                      );
                    })}
                  </Accordion>
                </div>
              )}
            </TabsContent>

            <TabsContent value="industry" className="space-y-4">
              {industryProblemsLoading && (
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <Card key={i}>
                      <CardContent className="p-6">
                        <div className="space-y-3">
                          <Skeleton className="h-6 w-3/4" />
                          <Skeleton className="h-4 w-full" />
                          <div className="flex gap-2">
                            <Skeleton className="h-6 w-20" />
                            <Skeleton className="h-6 w-20" />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}

              {!industryProblemsLoading && filteredIndustryProblems && filteredIndustryProblems.length === 0 && (
                <Card className="p-8">
                  <div className="text-center space-y-4">
                    <Building2 className="w-12 h-12 text-muted-foreground mx-auto" />
                    <p className="text-muted-foreground" data-testid="text-no-industry-results">
                      No problems found matching your search
                    </p>
                  </div>
                </Card>
              )}

              {!industryProblemsLoading && filteredIndustryProblems && filteredIndustryProblems.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">
                    Showing {filteredIndustryProblems.length} of {industryProblems?.length} industry-specific problems
                  </p>
                  <Accordion type="single" collapsible className="space-y-2">
                    {filteredIndustryProblems.map((problem) => {
                      const primaryM = problem.dominantM[0];
                      const FourMIcon = fourMIcons[primaryM];
                      const colors = fourMCategoryColors[primaryM];
                      return (
                        <AccordionItem key={problem.id} value={problem.id} className="border rounded-lg px-4">
                          <AccordionTrigger className="hover:no-underline py-4" data-testid={`accordion-industry-${problem.id}`}>
                            <div className="flex items-start gap-4 text-left w-full pr-4">
                              <div className={`p-2 rounded-lg ${colors.bg}`}>
                                <FourMIcon className={`w-4 h-4 ${colors.text}`} />
                              </div>
                              <div className="flex-1 space-y-1">
                                <h3 className="font-medium text-foreground">{problem.title}</h3>
                                <p className="text-sm text-muted-foreground line-clamp-1">{problem.description}</p>
                                <div className="flex flex-wrap gap-2">
                                  {problem.dominantM.map((m) => {
                                    const mColors = fourMCategoryColors[m];
                                    return (
                                      <Badge key={m} variant="outline" className={`${mColors.bg} ${mColors.text} ${mColors.border}`}>
                                        {m}
                                      </Badge>
                                    );
                                  })}
                                  <Badge variant="secondary" className="text-xs">
                                    {getIndustryLabel(problem.industry)}
                                  </Badge>
                                </div>
                              </div>
                            </div>
                          </AccordionTrigger>
                          <AccordionContent className="pb-4">
                            <div className="pl-14 space-y-4">
                              <div>
                                <h4 className="font-medium text-sm mb-2">Common Causes</h4>
                                <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                                  {problem.commonCauses.map((cause, i) => (
                                    <li key={i}>{cause}</li>
                                  ))}
                                </ul>
                              </div>
                              <div>
                                <h4 className="font-medium text-sm mb-2">Solutions</h4>
                                <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                                  {problem.solutions.map((solution, i) => (
                                    <li key={i}>{solution}</li>
                                  ))}
                                </ul>
                              </div>
                              <div>
                                <h4 className="font-medium text-sm mb-2">Prevention Steps</h4>
                                <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                                  {problem.preventionSteps.map((step, i) => (
                                    <li key={i}>{step}</li>
                                  ))}
                                </ul>
                              </div>
                              <div className="pt-2">
                                <Badge variant="outline" className="text-xs">
                                  Indicator: {problem.indicator}
                                </Badge>
                              </div>
                            </div>
                          </AccordionContent>
                        </AccordionItem>
                      );
                    })}
                  </Accordion>
                </div>
              )}
            </TabsContent>

            <TabsContent value="custom" className="space-y-4">
              <div className="flex justify-between items-center">
                <p className="text-sm text-muted-foreground">
                  {customProblems?.length || 0} custom problems in your library
                </p>
                <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                  <DialogTrigger asChild>
                    <Button size="default" data-testid="button-add-problem">
                      <Plus className="w-4 h-4 mr-2" />
                      Add Problem
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>Add Custom Problem</DialogTitle>
                    </DialogHeader>
                    <AddProblemForm onSuccess={() => setIsAddDialogOpen(false)} />
                  </DialogContent>
                </Dialog>
              </div>

              {customLoading && (
                <div className="space-y-4">
                  {[1, 2].map((i) => (
                    <Card key={i}>
                      <CardContent className="p-6">
                        <div className="space-y-3">
                          <Skeleton className="h-6 w-3/4" />
                          <Skeleton className="h-4 w-full" />
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}

              {!customLoading && (!filteredCustom || filteredCustom.length === 0) && (
                <Card className="p-8">
                  <div className="text-center space-y-4">
                    <Library className="w-12 h-12 text-muted-foreground mx-auto" />
                    <div className="space-y-2">
                      <h2 className="text-lg font-medium text-card-foreground" data-testid="text-empty-custom">
                        {searchQuery || categoryFilter !== "all" ? "No matching problems" : "Your library is empty"}
                      </h2>
                      <p className="text-sm text-muted-foreground">
                        {searchQuery || categoryFilter !== "all" 
                          ? "Try adjusting your search or filters"
                          : "Add your own business problems based on your consulting experience"}
                      </p>
                    </div>
                  </div>
                </Card>
              )}

              {!customLoading && filteredCustom && filteredCustom.length > 0 && (
                <div className="space-y-4">
                  {filteredCustom.map((problem) => {
                    const FourMIcon = fourMIcons[problem.dominantM];
                    const colors = fourMCategoryColors[problem.dominantM];
                    return (
                      <Card key={problem.id} className="p-6" data-testid={`card-custom-${problem.id}`}>
                        <div className="flex items-start gap-4">
                          <div className={`p-2 rounded-lg ${colors.bg}`}>
                            <FourMIcon className={`w-5 h-5 ${colors.text}`} />
                          </div>
                          <div className="flex-1 space-y-2">
                            <div className="flex items-start justify-between gap-2">
                              <h3 className="font-medium text-foreground">{problem.title}</h3>
                              <div className="flex items-center gap-1">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => favoriteMutation.mutate(problem.id)}
                                  data-testid={`button-favorite-${problem.id}`}
                                >
                                  <Star className={`w-4 h-4 ${problem.isFavorite ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground'}`} />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => {
                                    if (confirm("Are you sure you want to delete this problem?")) {
                                      deleteMutation.mutate(problem.id);
                                    }
                                  }}
                                  data-testid={`button-delete-${problem.id}`}
                                >
                                  <Trash2 className="w-4 h-4 text-muted-foreground hover:text-destructive" />
                                </Button>
                              </div>
                            </div>
                            <p className="text-sm text-muted-foreground">{problem.description}</p>
                            <div className="flex flex-wrap gap-2">
                              <Badge variant="outline" className={`${colors.bg} ${colors.text} ${colors.border}`}>
                                {problem.dominantM}
                              </Badge>
                              <Badge variant="secondary" className="text-xs">
                                {getCategoryLabel(problem.diagnosticCategory)}
                              </Badge>
                              {problem.tags?.map((tag, i) => (
                                <Badge key={i} variant="outline" className="text-xs">
                                  {tag}
                                </Badge>
                              ))}
                            </div>
                            <div className="pt-2 space-y-2">
                              <div>
                                <p className="text-xs font-medium text-muted-foreground mb-1">Common Causes:</p>
                                <p className="text-sm">{problem.commonCauses.join(", ")}</p>
                              </div>
                              <div>
                                <p className="text-xs font-medium text-muted-foreground mb-1">Recommendations:</p>
                                <p className="text-sm">{problem.recommendedActions.join(", ")}</p>
                              </div>
                            </div>
                          </div>
                        </div>
                      </Card>
                    );
                  })}
                </div>
              )}
            </TabsContent>

            <TabsContent value="insights" className="space-y-6">
              {insightsLoading && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {[1, 2, 3, 4].map((i) => (
                    <Card key={i}>
                      <CardContent className="p-6">
                        <Skeleton className="h-8 w-16 mb-2" />
                        <Skeleton className="h-4 w-24" />
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}

              {!insightsLoading && insights && (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <Card>
                      <CardContent className="p-6">
                        <div className="flex items-center gap-4">
                          <div className="p-3 rounded-lg bg-primary/10">
                            <BarChart3 className="w-6 h-6 text-primary" />
                          </div>
                          <div>
                            <p className="text-2xl font-bold" data-testid="text-total-diagnoses">{insights.totalDiagnoses}</p>
                            <p className="text-sm text-muted-foreground">Total Diagnoses</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-6">
                        <div className="flex items-center gap-4">
                          <div className="p-3 rounded-lg bg-emerald-500/10">
                            <TrendingUp className="w-6 h-6 text-emerald-500" />
                          </div>
                          <div>
                            <p className="text-2xl font-bold" data-testid="text-month-diagnoses">{insights.thisMonthDiagnoses}</p>
                            <p className="text-sm text-muted-foreground">This Month</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-6">
                        <div className="flex items-center gap-4">
                          <div className="p-3 rounded-lg bg-blue-500/10">
                            <Library className="w-6 h-6 text-blue-500" />
                          </div>
                          <div>
                            <p className="text-2xl font-bold" data-testid="text-custom-count">{insights.totalCustomProblems}</p>
                            <p className="text-sm text-muted-foreground">Custom Problems</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-6">
                        <div className="flex items-center gap-4">
                          <div className="p-3 rounded-lg bg-amber-500/10">
                            <BookOpen className="w-6 h-6 text-amber-500" />
                          </div>
                          <div>
                            <p className="text-2xl font-bold" data-testid="text-catalog-count">{catalog?.length || 80}</p>
                            <p className="text-sm text-muted-foreground">RCI Catalog</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {insights.topCategories.length > 0 && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">Most Diagnosed Categories</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          {insights.topCategories.map((cat, index) => {
                            const category = diagnosticCategories.find(c => c.id === cat.category);
                            const colors = category ? fourMCategoryColors[category.primaryM] : fourMCategoryColors.Manpower;
                            const maxCount = insights.topCategories[0]?.count || 1;
                            const percentage = (cat.count / maxCount) * 100;
                            
                            return (
                              <div key={cat.category} className="space-y-2">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    <Badge variant="outline" className={`${colors.bg} ${colors.text} ${colors.border}`}>
                                      {category?.primaryM || "Unknown"}
                                    </Badge>
                                    <span className="text-sm font-medium">
                                      {getCategoryLabel(cat.category)}
                                    </span>
                                  </div>
                                  <span className="text-sm text-muted-foreground">{cat.count} diagnoses</span>
                                </div>
                                <div className="h-2 bg-muted rounded-full overflow-hidden">
                                  <div 
                                    className={`h-full ${colors.bg} transition-all duration-500`}
                                    style={{ width: `${percentage}%` }}
                                  />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {insights.topCategories.length === 0 && (
                    <Card className="p-8">
                      <div className="text-center space-y-4">
                        <BarChart3 className="w-12 h-12 text-muted-foreground mx-auto" />
                        <div className="space-y-2">
                          <h2 className="text-lg font-medium" data-testid="text-no-insights">No insights yet</h2>
                          <p className="text-sm text-muted-foreground">
                            Start diagnosing problems to see usage patterns
                          </p>
                        </div>
                        <Link href="/diagnose">
                          <Button size="default" data-testid="button-start-diagnosis">
                            Start Diagnosis
                          </Button>
                        </Link>
                      </div>
                    </Card>
                  )}
                </>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}

function AddProblemForm({ onSuccess }: { onSuccess: () => void }) {
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    diagnosticCategory: "" as DiagnosticCategory | "",
    dominantM: "" as FourMCategory | "",
    commonCauses: [""],
    recommendedActions: [""],
    preventionSteps: [""],
    impactCost: "",
    impactTime: "",
    impactEfficiency: "",
    tags: "",
  });
  const { toast } = useToast();

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const indicator = data.dominantM ? categoryToIndicator[data.dominantM as FourMCategory] : "Money Indicator";
      
      await apiRequest("POST", "/api/knowledge/custom", {
        title: data.title,
        description: data.description,
        diagnosticCategory: data.diagnosticCategory,
        dominantM: data.dominantM,
        indicator,
        commonCauses: data.commonCauses.filter(c => c.trim()),
        recommendedActions: data.recommendedActions.filter(a => a.trim()),
        preventionSteps: data.preventionSteps.filter(s => s.trim()),
        impactCost: data.impactCost || undefined,
        impactTime: data.impactTime || undefined,
        impactEfficiency: data.impactEfficiency || undefined,
        tags: data.tags ? data.tags.split(",").map(t => t.trim()).filter(Boolean) : undefined,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/knowledge/custom"] });
      queryClient.invalidateQueries({ queryKey: ["/api/knowledge/insights"] });
      toast({ title: "Problem added", description: "Your custom problem has been saved to your library" });
      onSuccess();
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message || "Failed to add problem", variant: "destructive" });
    },
  });

  const handleArrayChange = (field: "commonCauses" | "recommendedActions" | "preventionSteps", index: number, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: prev[field].map((item, i) => i === index ? value : item),
    }));
  };

  const addArrayItem = (field: "commonCauses" | "recommendedActions" | "preventionSteps") => {
    setFormData(prev => ({
      ...prev,
      [field]: [...prev[field], ""],
    }));
  };

  const removeArrayItem = (field: "commonCauses" | "recommendedActions" | "preventionSteps", index: number) => {
    setFormData(prev => ({
      ...prev,
      [field]: prev[field].filter((_, i) => i !== index),
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title || !formData.description || !formData.diagnosticCategory || !formData.dominantM) {
      toast({ title: "Missing fields", description: "Please fill in all required fields", variant: "destructive" });
      return;
    }
    if (formData.commonCauses.filter(c => c.trim()).length === 0) {
      toast({ title: "Missing causes", description: "Add at least one common cause", variant: "destructive" });
      return;
    }
    if (formData.recommendedActions.filter(a => a.trim()).length === 0) {
      toast({ title: "Missing actions", description: "Add at least one recommended action", variant: "destructive" });
      return;
    }
    if (formData.preventionSteps.filter(s => s.trim()).length === 0) {
      toast({ title: "Missing prevention", description: "Add at least one prevention step", variant: "destructive" });
      return;
    }
    createMutation.mutate(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="title">Problem Title *</Label>
          <Input
            id="title"
            value={formData.title}
            onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
            placeholder="e.g., High Employee Turnover"
            data-testid="input-title"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">Description *</Label>
          <Textarea
            id="description"
            value={formData.description}
            onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
            placeholder="Describe the problem and its symptoms..."
            rows={3}
            data-testid="input-description"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Diagnostic Category *</Label>
            <Select 
              value={formData.diagnosticCategory} 
              onValueChange={(value) => setFormData(prev => ({ ...prev, diagnosticCategory: value as DiagnosticCategory }))}
            >
              <SelectTrigger data-testid="select-category">
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                {diagnosticCategories.map(cat => (
                  <SelectItem key={cat.id} value={cat.id}>{cat.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Primary 4M Category *</Label>
            <Select 
              value={formData.dominantM} 
              onValueChange={(value) => setFormData(prev => ({ ...prev, dominantM: value as FourMCategory }))}
            >
              <SelectTrigger data-testid="select-4m">
                <SelectValue placeholder="Select 4M" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Money">Money</SelectItem>
                <SelectItem value="Materials">Materials</SelectItem>
                <SelectItem value="Manpower">Manpower</SelectItem>
                <SelectItem value="Machinery">Machinery</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-2">
          <Label>Common Causes *</Label>
          {formData.commonCauses.map((cause, index) => (
            <div key={index} className="flex gap-2">
              <Input
                value={cause}
                onChange={(e) => handleArrayChange("commonCauses", index, e.target.value)}
                placeholder={`Cause ${index + 1}`}
                data-testid={`input-cause-${index}`}
              />
              {formData.commonCauses.length > 1 && (
                <Button type="button" variant="outline" size="icon" onClick={() => removeArrayItem("commonCauses", index)}>
                  <Trash2 className="w-4 h-4" />
                </Button>
              )}
            </div>
          ))}
          <Button type="button" variant="outline" size="sm" onClick={() => addArrayItem("commonCauses")}>
            <Plus className="w-4 h-4 mr-2" /> Add Cause
          </Button>
        </div>

        <div className="space-y-2">
          <Label>Recommended Actions *</Label>
          {formData.recommendedActions.map((action, index) => (
            <div key={index} className="flex gap-2">
              <Input
                value={action}
                onChange={(e) => handleArrayChange("recommendedActions", index, e.target.value)}
                placeholder={`Action ${index + 1}`}
                data-testid={`input-action-${index}`}
              />
              {formData.recommendedActions.length > 1 && (
                <Button type="button" variant="outline" size="icon" onClick={() => removeArrayItem("recommendedActions", index)}>
                  <Trash2 className="w-4 h-4" />
                </Button>
              )}
            </div>
          ))}
          <Button type="button" variant="outline" size="sm" onClick={() => addArrayItem("recommendedActions")}>
            <Plus className="w-4 h-4 mr-2" /> Add Action
          </Button>
        </div>

        <div className="space-y-2">
          <Label>Prevention Steps *</Label>
          {formData.preventionSteps.map((step, index) => (
            <div key={index} className="flex gap-2">
              <Input
                value={step}
                onChange={(e) => handleArrayChange("preventionSteps", index, e.target.value)}
                placeholder={`Step ${index + 1}`}
                data-testid={`input-prevention-${index}`}
              />
              {formData.preventionSteps.length > 1 && (
                <Button type="button" variant="outline" size="icon" onClick={() => removeArrayItem("preventionSteps", index)}>
                  <Trash2 className="w-4 h-4" />
                </Button>
              )}
            </div>
          ))}
          <Button type="button" variant="outline" size="sm" onClick={() => addArrayItem("preventionSteps")}>
            <Plus className="w-4 h-4 mr-2" /> Add Step
          </Button>
        </div>

        <div className="space-y-2">
          <Label>Estimated Impact (Optional)</Label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Input
              value={formData.impactCost}
              onChange={(e) => setFormData(prev => ({ ...prev, impactCost: e.target.value }))}
              placeholder="Cost impact"
              data-testid="input-impact-cost"
            />
            <Input
              value={formData.impactTime}
              onChange={(e) => setFormData(prev => ({ ...prev, impactTime: e.target.value }))}
              placeholder="Time impact"
              data-testid="input-impact-time"
            />
            <Input
              value={formData.impactEfficiency}
              onChange={(e) => setFormData(prev => ({ ...prev, impactEfficiency: e.target.value }))}
              placeholder="Efficiency impact"
              data-testid="input-impact-efficiency"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="tags">Tags (comma-separated, optional)</Label>
          <Input
            id="tags"
            value={formData.tags}
            onChange={(e) => setFormData(prev => ({ ...prev, tags: e.target.value }))}
            placeholder="e.g., retail, urgent, seasonal"
            data-testid="input-tags"
          />
        </div>
      </div>

      <div className="flex justify-end gap-2">
        <Button type="submit" disabled={createMutation.isPending} data-testid="button-submit">
          {createMutation.isPending ? "Adding..." : "Add Problem"}
        </Button>
      </div>
    </form>
  );
}
