import { lazy, Suspense } from "react";
import { Routes, Route, Navigate, Outlet } from "react-router-dom";
import { Shell } from "./Shell";
import { useAuth } from "../lib/auth";
import { LoginPage } from "../features/auth/LoginPage";

const UniversePage = lazy(() => import("../features/universe/UniversePage").then((m) => ({ default: m.UniversePage })));
const ProjectsPage = lazy(() => import("../features/projects/ProjectsPage").then((m) => ({ default: m.ProjectsPage })));
const ProjectDetailPage = lazy(() => import("../features/projects/ProjectDetailPage").then((m) => ({ default: m.ProjectDetailPage })));
const FactoryPage = lazy(() => import("../features/factory/FactoryPage").then((m) => ({ default: m.FactoryPage })));
const FindingsPage = lazy(() => import("../features/findings/FindingsPage").then((m) => ({ default: m.FindingsPage })));
const PublicationsPage = lazy(() => import("../features/publications/PublicationsPage").then((m) => ({ default: m.PublicationsPage })));
const AccessControlPage = lazy(() => import("../features/settings/AccessControlPage").then((m) => ({ default: m.AccessControlPage })));
const TrackerPage = lazy(() => import("../features/tracker/TrackerPage").then((m) => ({ default: m.TrackerPage })));

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
            <Route path="projects" element={<ProjectsPage />} />
            <Route path="projects/:id" element={<ProjectDetailPage />} />
            <Route path="factory" element={<FactoryPage />} />
            <Route path="findings" element={<FindingsPage />} />
            <Route path="publications" element={<PublicationsPage />} />
            <Route path="tracker" element={<TrackerPage />} />
            <Route path="settings/access" element={<AccessControlPage />} />
          </Route>
        </Route>
      </Routes>
    </Suspense>
  );
}
