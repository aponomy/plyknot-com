import { useState } from "react";
import { Card, CardHeader, CardTitle } from "../../components/ui/card";

export function SettingsPage() {
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [notifications, setNotifications] = useState(true);

  return (
    <div className="space-y-6 max-w-2xl">
      <h1 className="text-lg font-semibold">Settings</h1>

      <Card>
        <CardHeader>
          <CardTitle>Appearance</CardTitle>
        </CardHeader>
        <div className="space-y-4">
          <div className="flex items-center justify-between text-sm">
            <div>
              <p>Theme</p>
              <p className="text-xs text-[var(--muted-foreground)]">Choose your preferred color scheme</p>
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
        </div>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Notifications</CardTitle>
        </CardHeader>
        <div className="space-y-4">
          <div className="flex items-center justify-between text-sm">
            <div>
              <p>Email notifications</p>
              <p className="text-xs text-[var(--muted-foreground)]">Receive alerts for review queue items and embargo expiries</p>
            </div>
            <button
              onClick={() => setNotifications(!notifications)}
              className={`relative w-10 h-5 rounded-full transition-colors ${notifications ? "bg-[var(--primary)]" : "bg-[var(--muted)]"}`}
            >
              <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${notifications ? "left-5" : "left-0.5"}`} />
            </button>
          </div>
        </div>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Data sources</CardTitle>
        </CardHeader>
        <div className="space-y-3 text-sm">
          <div className="flex items-center justify-between">
            <div>
              <p>Default universe</p>
              <p className="text-xs text-[var(--muted-foreground)]">Which data source to show by default on the Universe page</p>
            </div>
            <select className="px-2 py-1 rounded-md bg-[var(--muted)] border border-[var(--border)] text-xs text-[var(--foreground)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)]">
              <option>plyknot.com</option>
              <option>plyknot.org</option>
            </select>
          </div>
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
