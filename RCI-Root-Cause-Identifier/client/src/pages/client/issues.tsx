import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { 
  Search,
  Filter,
  ChevronLeft,
  AlertTriangle,
  Lightbulb,
  Shield,
  DollarSign,
  Calendar
} from "lucide-react";
import type { AnalysisFinding, FourMCategory } from "@shared/schema";

interface IssueWithContext extends AnalysisFinding {
  analysisId: string;
  analysisTitle: string;
  analysisDate: Date | null;
}

const fourMColors = {
  Money: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100",
  Materials: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100",
  Manpower: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100",
  Machinery: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-100",
};

const severityColors = {
  critical: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100",
  high: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-100",
  medium: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100",
  low: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-100",
};

const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };

export default function ClientIssues() {
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [severityFilter, setSeverityFilter] = useState<string>("all");
  const [selectedIssue, setSelectedIssue] = useState<IssueWithContext | null>(null);

  const { data: issues, isLoading, error } = useQuery<IssueWithContext[]>({
    queryKey: ["/api/client/issues"],
  });

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="flex gap-4">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-10 w-32" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="space-y-4">
          {[1, 2, 3, 4, 5].map(i => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <Card className="p-8 text-center">
          <AlertTriangle className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <h2 className="text-xl font-semibold mb-2">Unable to Load Issues</h2>
          <p className="text-muted-foreground">
            {error instanceof Error ? error.message : "Please try again later."}
          </p>
        </Card>
      </div>
    );
  }

  const allIssues = issues || [];

  const filteredIssues = allIssues
    .filter(issue => {
      const matchesSearch = searchTerm === "" || 
        issue.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        issue.description.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = categoryFilter === "all" || issue.fourMCategory === categoryFilter;
      const matchesSeverity = severityFilter === "all" || issue.severity === severityFilter;
      return matchesSearch && matchesCategory && matchesSeverity;
    })
    .sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

  const categoryStats = {
    Money: allIssues.filter(i => i.fourMCategory === "Money").length,
    Materials: allIssues.filter(i => i.fourMCategory === "Materials").length,
    Manpower: allIssues.filter(i => i.fourMCategory === "Manpower").length,
    Machinery: allIssues.filter(i => i.fourMCategory === "Machinery").length,
  };

  return (
    <div className="p-6 space-y-6" data-testid="client-issues-page">
      <div className="flex items-center gap-4">
        <Link href="/client">
          <Button variant="ghost" size="sm" data-testid="button-back">
            <ChevronLeft className="w-4 h-4 mr-1" />
            Back
          </Button>
        </Link>
        <h1 className="text-2xl font-bold">All Issues</h1>
        <Badge variant="secondary" className="ml-auto">
          {filteredIssues.length} of {allIssues.length} issues
        </Badge>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {(Object.entries(categoryStats) as [FourMCategory, number][]).map(([category, count]) => (
          <Card 
            key={category}
            className={`cursor-pointer hover-elevate ${categoryFilter === category ? 'ring-2 ring-primary' : ''}`}
            onClick={() => setCategoryFilter(categoryFilter === category ? "all" : category)}
            data-testid={`filter-category-${category.toLowerCase()}`}
          >
            <CardContent className="p-4 text-center">
              <div className={`w-10 h-10 mx-auto rounded-full flex items-center justify-center mb-2 ${fourMColors[category]}`}>
                {category === "Money" && <DollarSign className="w-5 h-5" />}
                {category === "Materials" && <Shield className="w-5 h-5" />}
                {category === "Manpower" && <Lightbulb className="w-5 h-5" />}
                {category === "Machinery" && <AlertTriangle className="w-5 h-5" />}
              </div>
              <div className="text-2xl font-bold">{count}</div>
              <div className="text-xs text-muted-foreground">{category}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex flex-wrap gap-4">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search issues..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
            data-testid="input-search-issues"
          />
        </div>
        <Select value={severityFilter} onValueChange={setSeverityFilter}>
          <SelectTrigger className="w-[150px]" data-testid="select-severity-filter">
            <Filter className="w-4 h-4 mr-2" />
            <SelectValue placeholder="Severity" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Severities</SelectItem>
            <SelectItem value="critical">Critical</SelectItem>
            <SelectItem value="high">High</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="low">Low</SelectItem>
          </SelectContent>
        </Select>
        {(categoryFilter !== "all" || severityFilter !== "all") && (
          <Button 
            variant="ghost" 
            onClick={() => { setCategoryFilter("all"); setSeverityFilter("all"); }}
            data-testid="button-clear-filters"
          >
            Clear Filters
          </Button>
        )}
      </div>

      {filteredIssues.length === 0 ? (
        <Card className="p-8 text-center">
          <Search className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <h2 className="text-lg font-semibold mb-2">No Issues Found</h2>
          <p className="text-muted-foreground">
            {allIssues.length === 0 
              ? "No issues have been identified yet."
              : "Try adjusting your search or filters."}
          </p>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredIssues.map((issue, index) => (
            <Card 
              key={`${issue.analysisId}-${issue.id || index}`}
              className="hover-elevate cursor-pointer"
              onClick={() => setSelectedIssue(issue)}
              data-testid={`card-issue-${issue.id || index}`}
            >
              <CardContent className="p-4">
                <div className="flex items-start gap-4">
                  <div className={`w-1 h-full min-h-[60px] rounded-full ${
                    issue.severity === "critical" ? "bg-red-500" :
                    issue.severity === "high" ? "bg-orange-500" :
                    issue.severity === "medium" ? "bg-yellow-500" : "bg-gray-400"
                  }`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 flex-wrap">
                      <h3 className="font-medium" data-testid={`text-issue-title-${issue.id || index}`}>
                        {issue.title}
                      </h3>
                      <div className="flex gap-2 flex-shrink-0">
                        <Badge className={fourMColors[issue.fourMCategory]} variant="secondary">
                          {issue.fourMCategory}
                        </Badge>
                        <Badge className={severityColors[issue.severity]} variant="secondary">
                          {issue.severity}
                        </Badge>
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                      {issue.description}
                    </p>
                    <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {issue.analysisDate 
                          ? new Date(issue.analysisDate).toLocaleDateString()
                          : "N/A"}
                      </span>
                      <span>From: {issue.analysisTitle}</span>
                      {issue.estimatedCostImpact && (
                        <span className="text-green-600 font-medium">
                          Impact: {issue.estimatedCostImpact}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={!!selectedIssue} onOpenChange={() => setSelectedIssue(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          {selectedIssue && (
            <>
              <DialogHeader>
                <div className="flex items-start justify-between gap-4">
                  <DialogTitle className="text-xl">{selectedIssue.title}</DialogTitle>
                  <div className="flex gap-2 flex-shrink-0">
                    <Badge className={fourMColors[selectedIssue.fourMCategory]}>
                      {selectedIssue.fourMCategory}
                    </Badge>
                    <Badge className={severityColors[selectedIssue.severity]}>
                      {selectedIssue.severity}
                    </Badge>
                  </div>
                </div>
              </DialogHeader>
              
              <div className="space-y-6 mt-4">
                <div>
                  <h4 className="font-semibold text-sm text-muted-foreground mb-2">Description</h4>
                  <p className="text-sm">{selectedIssue.description}</p>
                </div>

                {selectedIssue.estimatedCostImpact && (
                  <div className="p-4 bg-green-50 dark:bg-green-950 rounded-lg">
                    <h4 className="font-semibold text-sm text-green-800 dark:text-green-200 mb-1">
                      Estimated Impact
                    </h4>
                    <p className="text-green-700 dark:text-green-300 font-medium">
                      {selectedIssue.estimatedCostImpact}
                    </p>
                  </div>
                )}

                {selectedIssue.causes && selectedIssue.causes.length > 0 && (
                  <div>
                    <h4 className="font-semibold text-sm text-muted-foreground mb-2">Root Causes</h4>
                    <ul className="space-y-2">
                      {selectedIssue.causes.map((cause, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm">
                          <span className="text-red-500 mt-1">•</span>
                          <span>{cause}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {selectedIssue.solutions && selectedIssue.solutions.length > 0 && (
                  <div>
                    <h4 className="font-semibold text-sm text-muted-foreground mb-2">
                      Recommended Solutions
                    </h4>
                    <ul className="space-y-2">
                      {selectedIssue.solutions.map((solution, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm">
                          <span className="text-green-500 mt-1">✓</span>
                          <span>{solution}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {selectedIssue.preventionSteps && selectedIssue.preventionSteps.length > 0 && (
                  <div>
                    <h4 className="font-semibold text-sm text-muted-foreground mb-2">
                      Prevention Steps
                    </h4>
                    <ul className="space-y-2">
                      {selectedIssue.preventionSteps.map((step, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm">
                          <Shield className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
                          <span>{step}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {selectedIssue.evidence && selectedIssue.evidence.length > 0 && (
                  <div>
                    <h4 className="font-semibold text-sm text-muted-foreground mb-2">Evidence</h4>
                    <div className="bg-muted p-3 rounded-lg">
                      <ul className="space-y-1 text-sm">
                        {selectedIssue.evidence.map((ev, i) => (
                          <li key={i} className="text-muted-foreground">• {ev}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}

                <div className="text-xs text-muted-foreground pt-4 border-t">
                  <p>From analysis: {selectedIssue.analysisTitle}</p>
                  <p>Date: {selectedIssue.analysisDate 
                    ? new Date(selectedIssue.analysisDate).toLocaleDateString()
                    : "N/A"}</p>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
