import { useState, useRef, useEffect } from "react";
import { Outlet, NavLink, useLocation, useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import {
  Globe,
  Factory,
  Workflow,
  ListChecks,
  CalendarRange,
  Shield,
  Settings,
  LogOut,
  User,
  ChevronDown,
  X,
  Sparkles,
} from "lucide-react";
import { cn } from "../lib/utils";
import { useAuth } from "../lib/auth";
import { CommandPalette } from "../components/CommandPalette";
import { AlertDrawer } from "../components/AlertDrawer";
import { ConnectionStatus } from "../components/ConnectionStatus";
import { ActiveAgents } from "../components/ActiveAgents";
import { ProfilePanel } from "../features/settings/ProfilePanel";
import { SettingsPanel } from "../features/settings/SettingsPanel";
import { AgentPanel } from "../components/agent/AgentPanel";

const navItems = [
  { to: "/", icon: Globe, label: "Universe" },
  { to: "/factory", icon: Factory, label: "Factory" },
  { to: "/process", icon: Workflow, label: "Process" },
  { to: "/tracker", icon: ListChecks, label: "Tracker" },
  { to: "/timeline", icon: CalendarRange, label: "Timeline" },
] as const;

function NavRail() {
  const location = useLocation();

  return (
    <nav className="flex flex-col items-center w-14 shrink-0 border-r border-[var(--border)] bg-[var(--card)] py-4 gap-1">
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

      <div className="mt-auto flex flex-col items-center gap-1">
        <NavLink
          to="/settings/access"
          title="Access control"
          className={cn(
            "flex items-center justify-center w-10 h-10 rounded-lg transition-colors",
            location.pathname.startsWith("/settings")
              ? "bg-[var(--muted)] text-[var(--foreground)]"
              : "text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--muted)]",
          )}
        >
          <Shield size={20} />
        </NavLink>
      </div>
    </nav>
  );
}

type DrawerTab = "profile" | "settings";

function UserMenu() {
  const { user, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [drawerTab, setDrawerTab] = useState<DrawerTab | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    if (menuOpen) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [menuOpen]);

  if (!user) return null;

  const initials = user.name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  function openDrawer(tab: DrawerTab) {
    setMenuOpen(false);
    setDrawerTab(tab);
  }

  return (
    <>
      {/* Trigger + dropdown */}
      <div ref={menuRef} className="relative">
        <button
          onClick={() => setMenuOpen((o) => !o)}
          className="flex items-center gap-2 px-2 py-1 rounded-md hover:bg-[var(--muted)] transition-colors"
        >
          <Avatar src={user.avatarUrl} initials={initials} size={24} />
          <span className="text-xs hidden sm:inline">{user.name}</span>
          <ChevronDown size={12} className="text-[var(--muted-foreground)]" />
        </button>

        {menuOpen && (
          <div className="absolute right-0 top-full mt-1 w-56 rounded-xl border border-[var(--border)] bg-[var(--card)] shadow-xl z-50 py-1 overflow-hidden">
            <div className="flex items-center gap-3 px-3 py-2.5 border-b border-[var(--border)]">
              <Avatar src={user.avatarUrl} initials={initials} size={32} />
              <div>
                <p className="text-sm font-medium">{user.name}</p>
                <p className="text-xs text-[var(--muted-foreground)]">@{user.login}</p>
              </div>
            </div>

            <MenuItem icon={<User size={14} />} label="Profile" onClick={() => openDrawer("profile")} />
            <MenuItem icon={<Settings size={14} />} label="Settings" onClick={() => openDrawer("settings")} />
            <MenuItem icon={<Shield size={14} />} label="Access control" onClick={() => { navigate("/settings/access"); setMenuOpen(false); }} />

            <div className="h-px bg-[var(--border)] my-1" />

            <MenuItem icon={<LogOut size={14} />} label="Sign out" onClick={() => { logout(); setMenuOpen(false); }} danger />
          </div>
        )}
      </div>

      {/* Right-side drawer */}
      <AnimatePresence>
        {drawerTab !== null && (
          <>
            <motion.div
              key="backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-black/40"
              onClick={() => setDrawerTab(null)}
            />
            <motion.aside
              key="drawer"
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              className="fixed top-0 right-0 bottom-0 z-50 w-full max-w-md border-l border-[var(--border)] bg-[var(--card)] shadow-2xl flex flex-col"
            >
              {/* Drawer header with tabs */}
              <div className="flex items-center justify-between px-4 h-12 border-b border-[var(--border)] shrink-0">
                <div className="flex items-center gap-1">
                  <DrawerTabButton active={drawerTab === "profile"} onClick={() => setDrawerTab("profile")}>
                    Profile
                  </DrawerTabButton>
                  <DrawerTabButton active={drawerTab === "settings"} onClick={() => setDrawerTab("settings")}>
                    Settings
                  </DrawerTabButton>
                </div>
                <button
                  onClick={() => setDrawerTab(null)}
                  className="w-7 h-7 flex items-center justify-center rounded-md text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--muted)] transition-colors"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Drawer content */}
              <div className="flex-1 overflow-y-auto p-4">
                {drawerTab === "profile" && <ProfilePanel />}
                {drawerTab === "settings" && <SettingsPanel />}
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}

function DrawerTabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "px-3 py-1.5 text-xs font-medium rounded-md transition-colors",
        active
          ? "bg-[var(--muted)] text-[var(--foreground)]"
          : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]",
      )}
    >
      {children}
    </button>
  );
}

function MenuItem({ icon, label, onClick, danger }: { icon: React.ReactNode; label: string; onClick: () => void; danger?: boolean }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-2 px-3 py-2 text-sm transition-colors",
        danger
          ? "text-[var(--color-danger)] hover:bg-[color:var(--color-danger)]/5"
          : "text-[var(--foreground)] hover:bg-[var(--muted)]",
      )}
    >
      <span className="text-[var(--muted-foreground)]">{icon}</span>
      {label}
    </button>
  );
}

function TopBar({ onAgentOpen }: { onAgentOpen: () => void }) {
  return (
    <header className="flex items-center h-12 px-4 border-b border-[var(--border)] bg-[var(--card)] shrink-0">
      <span className="text-sm font-semibold tracking-tight">plyknot.com</span>

      <button className="ml-4 flex items-center gap-2 px-3 py-1.5 rounded-md bg-[var(--muted)] text-xs text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors">
        <span>⌘K</span>
        <span className="hidden sm:inline">Search / command</span>
      </button>

      <div className="ml-auto flex items-center gap-1.5">
        <button
          onClick={onAgentOpen}
          title="Agent"
          className="w-8 h-8 flex items-center justify-center rounded-md text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--muted)] transition-colors"
        >
          <Sparkles size={16} />
        </button>
        <ActiveAgents />
        <ConnectionStatus />
        <AlertDrawer />
        <UserMenu />
      </div>
    </header>
  );
}

function Avatar({ src, initials, size }: { src: string; initials: string; size: number }) {
  const [failed, setFailed] = useState(false);
  const px = `${size}px`;

  if (failed || !src) {
    return (
      <div
        className="rounded-full bg-[var(--primary)] flex items-center justify-center text-[var(--primary-foreground)] font-medium shrink-0"
        style={{ width: px, height: px, fontSize: `${Math.round(size * 0.4)}px` }}
      >
        {initials}
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={initials}
      className="rounded-full shrink-0"
      style={{ width: px, height: px }}
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
    />
  );
}

export function Shell() {
  const [agentOpen, setAgentOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden">
      <NavRail />
      <div className="flex flex-col flex-1 min-w-0">
        <TopBar onAgentOpen={() => setAgentOpen((o) => !o)} />
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
      <AgentPanel open={agentOpen} onClose={() => setAgentOpen(false)} />
      <CommandPalette />
    </div>
  );
}
