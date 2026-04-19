import { Outlet, NavLink, useLocation } from "react-router-dom";
import {
  Home,
  Globe,
  FolderKanban,
  Factory,
  FileInput,
  ClipboardCheck,
  Settings,
} from "lucide-react";
import { cn } from "../lib/utils";
import { CommandPalette } from "../components/CommandPalette";

const navItems = [
  { to: "/", icon: Home, label: "Home" },
  { to: "/universe", icon: Globe, label: "Universe" },
  { to: "/projects", icon: FolderKanban, label: "Projects" },
  { to: "/factory", icon: Factory, label: "Factory" },
  { to: "/extraction", icon: FileInput, label: "Extraction" },
  { to: "/review", icon: ClipboardCheck, label: "Review" },
] as const;

function NavRail() {
  const location = useLocation();

  return (
    <nav className="flex flex-col items-center w-14 shrink-0 border-r border-[var(--border)] bg-[var(--card)] py-4 gap-1">
      {/* Logo */}
      <div className="mb-4 text-lg font-bold text-[var(--primary)]">▲</div>

      {navItems.map(({ to, icon: Icon, label }) => {
        const active =
          to === "/" ? location.pathname === "/" : location.pathname.startsWith(to);
        return (
          <NavLink
            key={to}
            to={to}
            title={label}
            className={cn(
              "flex items-center justify-center w-10 h-10 rounded-lg transition-colors",
              active
                ? "bg-[var(--muted)] text-[var(--foreground)]"
                : "text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--muted)]",
            )}
          >
            <Icon size={20} />
          </NavLink>
        );
      })}

      <div className="mt-auto">
        <button
          title="Settings"
          className="flex items-center justify-center w-10 h-10 rounded-lg text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--muted)] transition-colors"
        >
          <Settings size={20} />
        </button>
      </div>
    </nav>
  );
}

function TopBar() {
  return (
    <header className="flex items-center h-12 px-4 border-b border-[var(--border)] bg-[var(--card)] shrink-0">
      <span className="text-sm font-semibold tracking-tight">plyknot</span>

      <button className="ml-4 flex items-center gap-2 px-3 py-1.5 rounded-md bg-[var(--muted)] text-xs text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors">
        <span>⌘K</span>
        <span className="hidden sm:inline">Search / command</span>
      </button>

      <div className="ml-auto flex items-center gap-3 text-sm text-[var(--muted-foreground)]">
        <span className="text-xs">Klas</span>
      </div>
    </header>
  );
}

export function Shell() {
  return (
    <div className="flex h-screen overflow-hidden">
      <NavRail />
      <div className="flex flex-col flex-1 min-w-0">
        <TopBar />
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
      <CommandPalette />
    </div>
  );
}
