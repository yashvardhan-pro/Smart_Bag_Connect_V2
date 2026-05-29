import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useBluetooth } from "@/hooks/use-bluetooth";
import { AlertOverlay } from "@/components/alert-overlay";
import { NavHeader, BottomNav } from "@/components/nav-header";

// Pages
import Dashboard from "@/pages/dashboard";
import TimetablePage from "@/pages/timetable";
import AlertsPage from "@/pages/alerts";
import SettingsPage from "@/pages/settings";
import LocationPage from "@/pages/location";
import NotFound from "@/pages/not-found";

function Router() {
  const bluetooth = useBluetooth();

  return (
    <>
      <AlertOverlay 
        isOpen={bluetooth.isAlerting} 
        type={bluetooth.alertType}
        onDismiss={bluetooth.stopAlarm} 
      />
      
      <NavHeader 
        status={bluetooth.status} 
        onConnect={bluetooth.connect} 
        onDisconnect={bluetooth.disconnect} 
      />

      <main className="max-w-md mx-auto px-4 pt-20 min-h-screen">
        <Switch>
          <Route path="/">
            <Dashboard bluetooth={bluetooth} />
          </Route>
          <Route path="/timetable">
            <TimetablePage bluetooth={bluetooth} />
          </Route>
          <Route path="/alerts">
            <AlertsPage />
          </Route>
          <Route path="/settings">
            <SettingsPage bluetooth={bluetooth} />
          </Route>
          <Route path="/location">
            <LocationPage bluetooth={bluetooth} />
          </Route>
          <Route component={NotFound} />
        </Switch>
      </main>

      <BottomNav
        status={bluetooth.status}
        onConnect={bluetooth.connect}
        onDisconnect={bluetooth.disconnect}
      />
    </>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
