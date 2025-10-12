import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { LanguageProvider } from "@/contexts/language-context";
import { AuthProvider, useAuth } from "@/hooks/use-auth";
import NotFound from "@/pages/not-found";
import HealthSurvey from "@/pages/health-survey";
import FoodDiary from "@/pages/food-diary";
import Insights from "@/pages/insights";
import { Dashboard } from "@/pages/dashboard";
import { AuthPage } from "@/pages/auth";
import BottomNavigation from "@/components/layout/bottom-navigation";
import TopBar from "@/components/layout/top-bar";
import { PWAInstallPrompt } from "@/components/pwa-install-prompt";

function ProtectedRoute({ component: Component, ...props }: any) {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <AuthPage />;
  }

  return <Component {...props} />;
}

function Router() {
  return (
    <Switch>
      <Route path="/auth" component={AuthPage} />
      <Route path="/" component={() => <ProtectedRoute component={Dashboard} />} />
      <Route path="/dashboard" component={() => <ProtectedRoute component={Dashboard} />} />
      <Route path="/health" component={() => <ProtectedRoute component={HealthSurvey} />} />
      <Route path="/diary" component={() => <ProtectedRoute component={FoodDiary} />} />
      <Route path="/insights" component={() => <ProtectedRoute component={Insights} />} />
      <Route component={NotFound} />
    </Switch>
  );
}

function AppLayout() {
  const { isAuthenticated } = useAuth();

  return (
    <div className="max-w-md mx-auto bg-white min-h-screen shadow-lg relative">
      {isAuthenticated && <TopBar />}
      <main className={isAuthenticated ? "pb-20" : ""} id="main-content">
        <Router />
      </main>
      {isAuthenticated && <BottomNavigation />}
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <LanguageProvider>
          <AuthProvider>
            <AppLayout />
            <Toaster />
            <PWAInstallPrompt />
          </AuthProvider>
        </LanguageProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
