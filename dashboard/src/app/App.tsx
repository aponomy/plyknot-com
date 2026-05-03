import { lazy, Suspense } from "react";
import { Routes, Route, Navigate, Outlet } from "react-router-dom";
import { Shell } from "./Shell";
import { useAuth } from "../lib/auth";
import { LoginPage } from "../features/auth/LoginPage";

const UniversePage = lazy(() => import("../features/universe/UniversePage").then((m) => ({ default: m.UniversePage })));
const FactoryPage = lazy(() => import("../features/factory/FactoryPage").then((m) => ({ default: m.FactoryPage })));
const ProcessPage = lazy(() => import("../features/process/ProcessPage").then((m) => ({ default: m.ProcessPage })));
const ProjectDetailPage = lazy(() => import("../features/projects/ProjectDetailPage").then((m) => ({ default: m.ProjectDetailPage })));
const TrackerPage = lazy(() => import("../features/tracker/TrackerPage").then((m) => ({ default: m.TrackerPage })));
const AccessControlPage = lazy(() => import("../features/settings/AccessControlPage").then((m) => ({ default: m.AccessControlPage })));
const NetworkPage = lazy(() => import("../features/network/NetworkPage").then((m) => ({ default: m.NetworkPage })));

function PageLoader() {
  return (
    <div className="flex items-center justify-center h-32 text-sm text-[var(--muted-foreground)]">
      Loading…
    </div>
  );
}

function RequireAuth() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--background)]">
        <p className="text-sm text-[var(--muted-foreground)]">Loading…</p>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}

export function App() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route path="login" element={<LoginPage />} />
        <Route element={<RequireAuth />}>
          <Route element={<Shell />}>
            <Route index element={<UniversePage />} />
            <Route path="factory" element={<FactoryPage />} />
            <Route path="process" element={<ProcessPage />} />
            <Route path="process/:id" element={<ProjectDetailPage />} />
            <Route path="research" element={<TrackerPage />} />
            <Route path="network" element={<NetworkPage />} />
            <Route path="settings/access" element={<AccessControlPage />} />
            {/* Legacy redirects */}
            <Route path="tracker" element={<Navigate to="/research" replace />} />
            <Route path="timeline" element={<Navigate to="/research" replace />} />
            <Route path="products" element={<Navigate to="/research" replace />} />
            <Route path="markets" element={<Navigate to="/research" replace />} />
            <Route path="projects" element={<Navigate to="/process" replace />} />
            <Route path="projects/:id" element={<Navigate to="/process" replace />} />
            <Route path="findings" element={<Navigate to="/process" replace />} />
            <Route path="publications" element={<Navigate to="/process" replace />} />
          </Route>
        </Route>
      </Routes>
    </Suspense>
  );
}
