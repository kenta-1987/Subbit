import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Home from "@/pages/Home";
import Plans from "@/pages/Plans";
import Subscribe from "@/pages/Subscribe";
import Login from "@/pages/Login";
import Register from "@/pages/Register";
import ForgotPassword from "@/pages/ForgotPassword";
import ResetPassword from "@/pages/ResetPassword";
import Profile from "@/pages/Profile";
import Dashboard from "./pages/Dashboard";
import AdminTest from "./pages/AdminTest";
import Terms from "@/pages/Terms";
import Privacy from "@/pages/Privacy";
import Help from "@/pages/Help";
import Checkout from "@/pages/Checkout";
import PaymentSuccess from "@/pages/PaymentSuccess";
import AppHeader from "@/components/AppHeader";
import AppFooter from "@/components/AppFooter";
import { InstallPrompt } from "@/components/InstallPrompt";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/plans" component={Plans} />
      <Route path="/subscribe" component={Subscribe} />
      <Route path="/login" component={Login} />
      <Route path="/register" component={Register} />
      <Route path="/forgot-password" component={ForgotPassword} />
      <Route path="/reset-password" component={ResetPassword} />
      <Route path="/profile" component={Profile} />
      <Route path="/dashboard" component={Dashboard} />
      <Route path="/admin" component={AdminTest} />
      <Route path="/help" component={Help} />
      <Route path="/terms" component={Terms} />
      <Route path="/privacy" component={Privacy} />
      <Route path="/checkout" component={Checkout} />
      <Route path="/payment-success" component={PaymentSuccess} />
      {/* Fallback to 404 */}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <div className="flex flex-col min-h-screen">
          <AppHeader />
          <div className="flex-grow">
            <Router />
          </div>
          <AppFooter />
        </div>
        <InstallPrompt />
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
