import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppLayout } from "@/components/layout/AppLayout";
import Dashboard from "@/pages/Dashboard";
import FarmsList from "@/pages/FarmsList";
import FarmDashboard from "@/pages/FarmDashboard";
import HouseDetail from "@/pages/HouseDetail";
import CycleForm from "@/pages/CycleForm";
import CycleDetail from "@/pages/CycleDetail";
import PerformanceReport from "@/pages/PerformanceReport";
import NotFound from "@/pages/not-found";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function Router() {
  return (
    <AppLayout>
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/farms" component={FarmsList} />
        <Route path="/farms/:farmId" component={FarmDashboard} />
        <Route path="/farms/:farmId/houses/:houseId/report" component={PerformanceReport} />
        <Route path="/farms/:farmId/houses/:houseId" component={HouseDetail} />
        <Route path="/cycles/new" component={CycleForm} />
        <Route path="/cycles/:cycleId/edit" component={CycleForm} />
        <Route path="/cycles/:cycleId" component={CycleDetail} />
        <Route component={NotFound} />
      </Switch>
    </AppLayout>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
