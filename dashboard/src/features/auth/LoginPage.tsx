import { Navigate } from "react-router-dom";
import { useAuth } from "../../lib/auth";

export function LoginPage() {
  const { user, isLoading, login } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--background)]">
        <p className="text-sm text-[var(--muted-foreground)]">Loading…</p>
      </div>
    );
  }

  if (user) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--background)]">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="text-3xl font-bold text-[var(--primary)] mb-2">▲</div>
          <h1 className="text-xl font-semibold">plyknot.com</h1>
          <p className="text-sm text-[var(--muted-foreground)] mt-1">
            Research factory dashboard
          </p>
        </div>

        <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-6">
          <p className="text-sm text-[var(--muted-foreground)] mb-4 text-center">
            Sign in with your GitHub account to continue.
            <br />
            <span className="text-xs">Requires <code className="text-[var(--foreground)] bg-[var(--muted)] px-1 py-0.5 rounded font-mono text-[10px]">plyknot</code> org membership.</span>
          </p>

          <button
            onClick={login}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-[var(--foreground)] text-[var(--background)] text-sm font-medium hover:opacity-90 transition-opacity"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
            </svg>
            Sign in with GitHub
          </button>
        </div>

        <p className="text-[10px] text-[var(--muted-foreground)] text-center mt-4">
          Solarplexor AB · app.plyknot.com
        </p>
      </div>
    </div>
  );
}
