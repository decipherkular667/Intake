import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import HealthSurvey from "@/pages/health-survey";
import FoodDiary from "@/pages/food-diary";
import Insights from "@/pages/insights";
import BottomNavigation from "@/components/layout/bottom-navigation";
import TopBar from "@/components/layout/top-bar";

function Router() {
  return (
    <Switch>
      <Route path="/" component={HealthSurvey} />
      <Route path="/health" component={HealthSurvey} />
      <Route path="/diary" component={FoodDiary} />
      <Route path="/insights" component={Insights} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <div className="max-w-md mx-auto bg-white min-h-screen shadow-lg relative">
          <TopBar />
          <main className="pb-20" id="main-content">
            <Router />
          </main>
          <BottomNavigation />
        </div>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
