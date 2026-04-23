import { Card, CardHeader, CardTitle } from "../../components/ui/card";
import { useAuth } from "../../lib/auth";

export function ProfilePage() {
  const { user } = useAuth();

  if (!user) return null;

  const initials = user.name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="space-y-6 max-w-2xl">
      <h1 className="text-lg font-semibold">Profile</h1>

      <Card>
        <div className="flex items-center gap-4">
          <div
            className="rounded-full bg-[var(--primary)] flex items-center justify-center text-[var(--primary-foreground)] font-medium shrink-0"
            style={{ width: "64px", height: "64px", fontSize: "24px" }}
          >
            {initials}
          </div>
          <div>
            <p className="text-lg font-semibold">{user.name}</p>
            <p className="text-sm text-[var(--muted-foreground)]">@{user.login}</p>
            {user.email && (
              <p className="text-sm text-[var(--muted-foreground)]">{user.email}</p>
            )}
          </div>
        </div>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Account</CardTitle>
        </CardHeader>
        <div className="space-y-3 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-[var(--muted-foreground)]">Authentication</span>
            <span>GitHub OAuth</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[var(--muted-foreground)]">Organization</span>
            <span className="font-mono text-xs">plyknot</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[var(--muted-foreground)]">Role</span>
            <span>Owner</span>
          </div>
        </div>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Sessions</CardTitle>
        </CardHeader>
        <div className="flex items-center justify-between text-sm">
          <div>
            <p>Current session</p>
            <p className="text-xs text-[var(--muted-foreground)]">macOS · Chrome · Started today</p>
          </div>
          <span className="text-xs px-1.5 py-0.5 rounded bg-[color:var(--color-success)]/10 text-[var(--color-success)]">active</span>
        </div>
      </Card>
    </div>
  );
}
