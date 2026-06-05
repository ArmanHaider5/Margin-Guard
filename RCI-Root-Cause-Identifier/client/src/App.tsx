import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import { RoleProvider } from "@/contexts/role-context";
import Landing from "@/pages/landing";
import Home from "@/pages/home";
import Diagnose from "@/pages/diagnose";
import Results from "@/pages/results";
import History from "@/pages/history";
import Knowledge from "@/pages/knowledge";
import Onboarding from "@/pages/onboarding";
import NotFound from "@/pages/not-found";
import AdminDashboard from "@/pages/admin/dashboard";
import AdminClients from "@/pages/admin/clients";
import ClientForm from "@/pages/admin/client-form";
import ClientDetail from "@/pages/admin/client-detail";
import AnalysisResults from "@/pages/admin/analysis-results";
import AdminKnowledge from "@/pages/admin/knowledge";
import CasesPage from "@/pages/admin/cases";
import CaseDetailPage from "@/pages/admin/case-detail";
import DocumentDetail from "@/pages/admin/document-detail";
import ManagementDashboard from "@/pages/management/dashboard";
import ManagementClientDetail from "@/pages/management/client-detail";
import ManagementCaseDetail from "@/pages/management/case-detail";
import ClientDiagnosticsNew from "@/pages/clients/diagnostics-new";
import ClientDashboard from "@/pages/client/dashboard";
import ClientIssues from "@/pages/client/issues";
import ClientAnalysisDetail from "@/pages/client/analysis-detail";
import MGDDashboard from "../../server/frontend/mgd/mgd-dashboard";
import MGDReportPage from "@/pages/mgd-report-page";
import MGDReportViewer from "@/pages/mgd-report-viewer";
import MGDRunnerPage from "@/pages/mgd-runner-page";
import MGDPresentationMode from "@/pages/mgd-presentation-mode";
import MGDReportArchive from "@/pages/mgd-report-archive";
import MGDDiagnosticWizard from "@/pages/mgd-diagnostic-wizard";
import { Loader2 } from "lucide-react";

function Router() {
  const { user, isLoading, isAuthenticated } = useAuth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen" data-testid="loading-spinner">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <Switch>
        <Route path="/" component={Landing} />
        <Route path="/demo" component={Diagnose} />
        <Route component={Landing} />
      </Switch>
    );
  }

  if (user && !user.onboardingComplete) {
    return (
      <Switch>
        <Route path="/" component={Onboarding} />
        <Route component={Onboarding} />
      </Switch>
    );
  }

  // Admin routes - for users with admin role
  if (user?.role === "admin") {
    return (
      <Switch>
        {/* Counsellor View (full access) */}
        <Route path="/" component={MGDDashboard} />
        <Route path="/admin" component={MGDDashboard} />
        <Route path="/admin/clients" component={AdminClients} />
        <Route path="/admin/clients/new" component={ClientForm} />
        <Route path="/admin/clients/:id/edit" component={ClientForm} />
        <Route path="/admin/clients/:id" component={ClientDetail} />
        <Route path="/clients/:clientId/diagnostics/new" component={ClientDiagnosticsNew} />
        <Route path="/admin/analyses/:id" component={AnalysisResults} />
        <Route path="/admin/knowledge" component={AdminKnowledge} />
        <Route path="/admin/cases" component={CasesPage} />
        <Route path="/admin/cases/:id" component={CaseDetailPage} />
        <Route path="/admin/documents/:id" component={DocumentDetail} />
        <Route path="/mgd" component={MGDDashboard} />
        <Route path="/mgd/reports" component={MGDReportArchive} />
        <Route path="/mgd/report" component={MGDReportViewer} />
        <Route path="/mgd/diagnostic" component={MGDDiagnosticWizard} />
        <Route path="/mgd/run" component={MGDRunnerPage} />
        <Route path="/mgd/present" component={MGDPresentationMode} />
        
        {/* Management View (read-only summary) */}
        <Route path="/management" component={ManagementDashboard} />
        <Route path="/management/clients/:id" component={ManagementClientDetail} />
        <Route path="/management/cases/:id" component={ManagementCaseDetail} />
        
        <Route path="/demo" component={Diagnose} />
        <Route path="/results/:sessionId" component={Results} />
        <Route path="/history" component={History} />
        <Route component={NotFound} />
      </Switch>
    );
  }

  // Client routes - for regular users (paying clients)
  return (
    <Switch>
      <Route path="/" component={ClientDashboard} />
      <Route path="/client" component={ClientDashboard} />
      <Route path="/client/issues" component={ClientIssues} />
      <Route path="/client/analyses/:id" component={ClientAnalysisDetail} />
      <Route path="/demo" component={Diagnose} />
      <Route path="/results/:sessionId" component={Results} />
      <Route path="/history" component={History} />
      <Route path="/knowledge" component={Knowledge} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <RoleProvider>
          <Toaster />
          <Router />
        </RoleProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
