import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  DollarSign, 
  Package, 
  Users, 
  Settings,
  ArrowRight,
  CheckCircle,
  Target,
  TrendingUp,
  Shield
} from "lucide-react";

const fourMCategories = [
  { 
    icon: DollarSign, 
    label: "Money", 
    description: "Financial control & cash flow",
    color: "text-emerald-600 dark:text-emerald-400",
    bg: "bg-emerald-100 dark:bg-emerald-900/30"
  },
  { 
    icon: Package, 
    label: "Materials", 
    description: "Inventory & supply chain",
    color: "text-amber-600 dark:text-amber-400",
    bg: "bg-amber-100 dark:bg-amber-900/30"
  },
  { 
    icon: Users, 
    label: "Manpower", 
    description: "Staff & productivity",
    color: "text-blue-600 dark:text-blue-400",
    bg: "bg-blue-100 dark:bg-blue-900/30"
  },
  { 
    icon: Settings, 
    label: "Machinery", 
    description: "Equipment & efficiency",
    color: "text-purple-600 dark:text-purple-400",
    bg: "bg-purple-100 dark:bg-purple-900/30"
  },
];

const benefits = [
  { icon: Target, title: "Identify Root Causes", description: "Get to the heart of recurring problems using the proven 4M framework" },
  { icon: TrendingUp, title: "Prevent Recurrence", description: "Implement solutions that stop problems from happening again" },
  { icon: Shield, title: "40+ Years Experience", description: "Built on decades of hands-on SME consulting expertise" },
];

export default function Landing() {
  const handleLogin = () => {
    window.location.href = "/api/login";
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-md bg-primary flex items-center justify-center">
              <Target className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="font-semibold text-lg" data-testid="text-logo">RCI</span>
          </div>
          <Button onClick={handleLogin} data-testid="button-login">
            Log In
          </Button>
        </div>
      </header>

      <main>
        <section className="py-16 md:py-24">
          <div className="container mx-auto px-4">
            <div className="max-w-3xl mx-auto text-center">
              <Badge variant="secondary" className="mb-4" data-testid="badge-tagline">
                Root Cause Identifier for SMEs
              </Badge>
              <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-6" data-testid="text-headline">
                Stop Solving the Same Problems Over and Over
              </h1>
              <p className="text-xl text-muted-foreground mb-8" data-testid="text-subheadline">
                RCI helps SME owners identify the real root causes of operational problems 
                and implement solutions that prevent them from recurring.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button size="lg" onClick={handleLogin} data-testid="button-get-started">
                  Get Started Free
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </div>
            </div>
          </div>
        </section>

        <section className="py-16 bg-muted/50">
          <div className="container mx-auto px-4">
            <h2 className="text-2xl md:text-3xl font-bold text-center mb-4" data-testid="text-framework-title">
              The 4M Framework
            </h2>
            <p className="text-center text-muted-foreground mb-10 max-w-2xl mx-auto">
              Every business problem has a root cause. Our proven 4M framework helps you 
              identify which area needs attention.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {fourMCategories.map((category) => (
                <Card key={category.label} className="hover-elevate" data-testid={`card-4m-${category.label.toLowerCase()}`}>
                  <CardContent className="pt-6">
                    <div className={`w-12 h-12 rounded-lg ${category.bg} flex items-center justify-center mb-4`}>
                      <category.icon className={`w-6 h-6 ${category.color}`} />
                    </div>
                    <h3 className="font-semibold text-lg mb-1">{category.label}</h3>
                    <p className="text-sm text-muted-foreground">{category.description}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        <section className="py-16">
          <div className="container mx-auto px-4">
            <h2 className="text-2xl md:text-3xl font-bold text-center mb-10" data-testid="text-benefits-title">
              Why SME Owners Choose RCI
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {benefits.map((benefit) => (
                <div key={benefit.title} className="text-center" data-testid={`benefit-${benefit.title.toLowerCase().replace(/\s+/g, '-')}`}>
                  <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                    <benefit.icon className="w-7 h-7 text-primary" />
                  </div>
                  <h3 className="font-semibold text-lg mb-2">{benefit.title}</h3>
                  <p className="text-muted-foreground">{benefit.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="py-16 bg-primary text-primary-foreground">
          <div className="container mx-auto px-4 text-center">
            <h2 className="text-2xl md:text-3xl font-bold mb-4" data-testid="text-cta-title">
              Ready to Find Your Root Causes?
            </h2>
            <p className="text-primary-foreground/80 mb-8 max-w-xl mx-auto">
              Join hundreds of SME owners who are already using RCI to solve problems 
              and prevent them from happening again.
            </p>
            <Button 
              size="lg" 
              variant="secondary" 
              onClick={handleLogin}
              data-testid="button-cta-login"
            >
              Start Your Free Diagnosis
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </div>
        </section>
      </main>

      <footer className="border-t py-8">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <p data-testid="text-footer">Built on 40+ years of SME consulting experience</p>
        </div>
      </footer>
    </div>
  );
}
