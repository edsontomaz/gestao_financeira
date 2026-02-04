import { Switch, Route, Link, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme-provider";
import { ThemeToggle } from "@/components/theme-toggle";
import { ProfileProvider } from "@/contexts/profile-context";
import { ProfileSelector } from "@/components/profile-selector";
import { InstallPWAPrompt } from "@/components/install-pwa-prompt";
import Resumo from "@/pages/resumo";
import NovaTransacao from "@/pages/nova-transacao";
import Historico from "@/pages/historico";
import NotFound from "@/pages/not-found";
import { Wallet, BarChart3, PlusCircle, History } from "lucide-react";
import { cn } from "@/lib/utils";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Resumo} />
      <Route path="/nova-transacao" component={NovaTransacao} />
      <Route path="/historico" component={Historico} />
      <Route component={NotFound} />
    </Switch>
  );
}

function Header() {
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-14 items-center justify-between px-4 max-w-7xl">
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-primary text-primary-foreground">
            <Wallet className="h-5 w-5" />
          </div>
          <span className="font-bold text-lg">FinanceApp</span>
        </div>
        <div className="flex items-center gap-2">
          <ProfileSelector />
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}

function BottomNav() {
  const [location] = useLocation();

  const navItems = [
    { href: "/", label: "Resumo", icon: BarChart3 },
    { href: "/nova-transacao", label: "Nova", icon: PlusCircle },
    { href: "/historico", label: "Histórico", icon: History },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto max-w-7xl">
        <div className="flex items-center justify-around h-16">
          {navItems.map((item) => {
            const isActive = location === item.href;
            return (
              <Link key={item.href} href={item.href}>
                <a
                  className={cn(
                    "flex flex-col items-center gap-1 px-4 py-2 rounded-lg transition-colors",
                    isActive
                      ? "text-primary"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                  data-testid={`nav-${item.label.toLowerCase()}`}
                >
                  <item.icon className={cn("h-5 w-5", isActive && "text-primary")} />
                  <span className="text-xs font-medium">{item.label}</span>
                </a>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}

function App() {
  return (
    <ThemeProvider defaultTheme="system" storageKey="finance-app-theme">
      <QueryClientProvider client={queryClient}>
        <ProfileProvider>
          <TooltipProvider>
            <div className="min-h-screen bg-background pb-20">
              <Header />
              <Router />
              <BottomNav />
            </div>
            <Toaster />
            <InstallPWAPrompt />
          </TooltipProvider>
        </ProfileProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

export default App;
