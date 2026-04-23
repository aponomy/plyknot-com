import { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle } from "../../components/ui/card";

function useTheme() {
  const [theme, setThemeState] = useState<"dark" | "light">(() => {
    return document.documentElement.classList.contains("light") ? "light" : "dark";
  });

  function setTheme(t: "dark" | "light") {
    setThemeState(t);
    if (t === "light") {
      document.documentElement.classList.add("light");
    } else {
      document.documentElement.classList.remove("light");
    }
    localStorage.setItem("plyknot-theme", t);
  }

  useEffect(() => {
    const saved = localStorage.getItem("plyknot-theme") as "dark" | "light" | null;
    if (saved) setTheme(saved);
  }, []);

  return [theme, setTheme] as const;
}

export function SettingsPanel() {
  const [theme, setTheme] = useTheme();
  const [notifications, setNotifications] = useState(true);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Appearance</CardTitle>
        </CardHeader>
        <div className="flex items-center justify-between text-sm">
          <div>
            <p>Theme</p>
            <p className="text-xs text-[var(--muted-foreground)]">Color scheme</p>
          </div>
          <div className="flex gap-1">
            <button
              onClick={() => setTheme("dark")}
              className={`text-xs px-3 py-1.5 rounded-md transition-colors ${theme === "dark" ? "bg-[var(--primary)] text-[var(--primary-foreground)]" : "bg-[var(--muted)] text-[var(--muted-foreground)]"}`}
            >
              Dark
            </button>
            <button
              onClick={() => setTheme("light")}
              className={`text-xs px-3 py-1.5 rounded-md transition-colors ${theme === "light" ? "bg-[var(--primary)] text-[var(--primary-foreground)]" : "bg-[var(--muted)] text-[var(--muted-foreground)]"}`}
            >
              Light
            </button>
          </div>
        </div>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Notifications</CardTitle>
        </CardHeader>
        <div className="flex items-center justify-between text-sm">
          <div>
            <p>Email notifications</p>
            <p className="text-xs text-[var(--muted-foreground)]">Review queue alerts and embargo expiries</p>
          </div>
          <button
            onClick={() => setNotifications(!notifications)}
            className={`relative w-10 h-5 rounded-full transition-colors ${notifications ? "bg-[var(--primary)]" : "bg-[var(--muted)]"}`}
          >
            <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${notifications ? "left-5" : "left-0.5"}`} />
          </button>
        </div>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Data sources</CardTitle>
        </CardHeader>
        <div className="flex items-center justify-between text-sm">
          <div>
            <p>Default universe</p>
            <p className="text-xs text-[var(--muted-foreground)]">Default on Universe page</p>
          </div>
          <select className="px-2 py-1 rounded-md bg-[var(--muted)] border border-[var(--border)] text-xs text-[var(--foreground)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)]">
            <option>plyknot.com</option>
            <option>plyknot.org</option>
          </select>
        </div>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>API</CardTitle>
        </CardHeader>
        <div className="space-y-3 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-[var(--muted-foreground)]">Hub endpoint</span>
            <span className="font-mono text-xs">hub.plyknot.com</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[var(--muted-foreground)]">API version</span>
            <span className="font-mono text-xs">v1</span>
          </div>
        </div>
      </Card>
    </div>
  );
}
