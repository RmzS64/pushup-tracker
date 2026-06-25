import { ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { Activity, History, LayoutDashboard, Sun, Moon } from "lucide-react";
import { useTheme } from "@/hooks/use-theme";
import { Button } from "@/components/ui/button";

export function Layout({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  const { theme, toggleTheme } = useTheme();

  const navItems = [
    { href: "/", label: "Главная", icon: LayoutDashboard },
    { href: "/history", label: "История", icon: History },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto max-w-2xl flex h-14 items-center justify-between px-4">
          <Link href="/" className="flex items-center gap-2 transition-opacity hover:opacity-80">
            <div className="bg-primary text-primary-foreground p-1.5 rounded-md">
              <Activity className="w-4 h-4" />
            </div>
            <span className="font-display font-bold text-lg tracking-tight">Трекер</span>
          </Link>
          <nav className="flex items-center gap-1">
            {navItems.map((item) => {
              const isActive = location === item.href;
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-secondary text-secondary-foreground"
                      : "text-muted-foreground hover:bg-secondary/50 hover:text-foreground"
                  }`}
                  data-testid={`nav-${item.href === "/" ? "dashboard" : "history"}`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleTheme}
              className="ml-1 h-9 w-9 rounded-lg"
              data-testid="button-toggle-theme"
              aria-label="Переключить тему"
            >
              {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </Button>
          </nav>
        </div>
      </header>
      <main className="flex-1 mx-auto w-full max-w-2xl px-4 py-5">
        {children}
      </main>
    </div>
  );
}
