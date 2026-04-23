import { Card, CardHeader, CardTitle } from "../../components/ui/card";
import { useAuth } from "../../lib/auth";

export function ProfilePanel() {
  const { user } = useAuth();

  if (!user) return null;

  const initials = user.name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="space-y-4">
      <Card>
        <div className="flex items-center gap-4">
          <div
            className="rounded-full bg-[var(--primary)] flex items-center justify-center text-[var(--primary-foreground)] font-medium shrink-0"
            style={{ width: "56px", height: "56px", fontSize: "20px" }}
          >
            {initials}
          </div>
          <div>
            <p className="text-base font-semibold">{user.name}</p>
            <p className="text-sm text-[var(--muted-foreground)]">@{user.login}</p>
            {user.email && (
              <p className="text-xs text-[var(--muted-foreground)]">{user.email}</p>
            )}
          </div>
        </div>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Account</CardTitle>
        </CardHeader>
        <div className="space-y-3 text-sm">
          <Row label="Authentication" value="GitHub OAuth" />
          <Row label="Organization" value="plyknot" mono />
          <Row label="Role" value="Owner" />
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

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-[var(--muted-foreground)]">{label}</span>
      <span className={mono ? "font-mono text-xs" : ""}>{value}</span>
    </div>
  );
}
