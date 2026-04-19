import React from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useApp } from "../context/AppContext";
import { LayoutDashboard, Users, BellRing, LogOut, Languages, Pill } from "lucide-react";
import { Button } from "./ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "./ui/dropdown-menu";

const Layout = ({ children }) => {
  const { user, logout, t, lang, setLang } = useApp();
  const location = useLocation();
  const navigate = useNavigate();

  const navItems = [
    { path: "/dashboard", label: t("nav_dashboard"), icon: LayoutDashboard, testId: "nav-dashboard" },
    { path: "/patients", label: t("nav_patients"), icon: Users, testId: "nav-patients" },
    { path: "/reminders", label: t("nav_reminders"), icon: BellRing, testId: "nav-reminders" },
  ];

  return (
    <div className="min-h-screen bg-clinic-bg flex">
      {/* Sidebar */}
      <aside className="hidden md:flex w-64 flex-col bg-clinic-surface border-r border-clinic-border">
        <div className="px-6 py-7 border-b border-clinic-border">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-clinic-primary flex items-center justify-center">
              <Pill className="w-5 h-5 text-clinic-bg" strokeWidth={2} />
            </div>
            <div>
              <div className="font-heading font-bold text-clinic-text text-lg leading-none">ClinicPulse</div>
              <div className="text-[10px] uppercase tracking-[0.2em] text-clinic-muted mt-1">Care Reminders</div>
            </div>
          </div>
        </div>
        <nav className="flex-1 px-3 py-5 space-y-1">
          {navItems.map((item) => {
            const active = location.pathname.startsWith(item.path);
            const Icon = item.icon;
            return (
              <button
                key={item.path}
                data-testid={item.testId}
                onClick={() => navigate(item.path)}
                className={`sidebar-link w-full text-left flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium ${
                  active ? "active" : "text-clinic-muted"
                }`}
              >
                <Icon className="w-[18px] h-[18px]" strokeWidth={1.8} />
                {item.label}
              </button>
            );
          })}
        </nav>
        <div className="p-4 border-t border-clinic-border">
          <div className="flex items-center gap-3 px-2 py-2">
            {user?.picture ? (
              <img src={user.picture} alt={user.name} className="w-9 h-9 rounded-full object-cover border border-clinic-border" />
            ) : (
              <div className="w-9 h-9 rounded-full bg-clinic-secondary flex items-center justify-center text-clinic-text font-medium">
                {user?.name?.[0] || "U"}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-clinic-text truncate">{user?.name}</div>
              <div className="text-xs text-clinic-muted truncate">{user?.email}</div>
            </div>
          </div>
          <Button
            data-testid="logout-btn"
            variant="ghost"
            className="w-full mt-2 justify-start text-clinic-muted hover:text-clinic-text hover:bg-clinic-tint"
            onClick={logout}
          >
            <LogOut className="w-4 h-4 mr-2" /> {t("logout")}
          </Button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 flex flex-col min-w-0">
        <header className="h-16 border-b border-clinic-border bg-clinic-surface flex items-center justify-between px-6 sticky top-0 z-10">
          <div className="flex items-center gap-3 md:hidden">
            <div className="w-8 h-8 rounded-lg bg-clinic-primary flex items-center justify-center">
              <Pill className="w-4 h-4 text-clinic-bg" />
            </div>
            <span className="font-heading font-bold text-clinic-text">ClinicPulse</span>
          </div>
          <div className="flex-1"></div>
          <div className="flex items-center gap-3">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  data-testid="lang-switcher"
                  variant="outline"
                  className="border-clinic-border text-clinic-text hover:bg-clinic-tint"
                >
                  <Languages className="w-4 h-4 mr-2" />
                  {lang === "en" ? "EN" : "हिं"}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="bg-clinic-surface border-clinic-border">
                <DropdownMenuLabel>{t("language")}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem data-testid="lang-en" onClick={() => setLang("en")}>
                  English {lang === "en" && "✓"}
                </DropdownMenuItem>
                <DropdownMenuItem data-testid="lang-hi" onClick={() => setLang("hi")}>
                  हिंदी {lang === "hi" && "✓"}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>
        {/* Mobile nav */}
        <div className="md:hidden flex border-b border-clinic-border bg-clinic-surface">
          {navItems.map((item) => {
            const active = location.pathname.startsWith(item.path);
            const Icon = item.icon;
            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className={`flex-1 flex flex-col items-center py-2 text-xs ${active ? "text-clinic-primary" : "text-clinic-muted"}`}
              >
                <Icon className="w-5 h-5 mb-1" />
                {item.label}
              </button>
            );
          })}
        </div>
        <div className="flex-1 p-6 sm:p-8 animate-fade-in-up">{children}</div>
      </main>
    </div>
  );
};

export default Layout;
