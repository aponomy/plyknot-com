import { Routes, Route } from "react-router-dom";
import { Shell } from "./Shell";
import { HomePage } from "../features/home/HomePage";
import { ProjectsPage } from "../features/projects/ProjectsPage";
import { ProjectDetailPage } from "../features/projects/ProjectDetailPage";
import { FactoryPage } from "../features/factory/FactoryPage";
import { ExtractionPage } from "../features/extraction/ExtractionPage";
import { ReviewPage } from "../features/review/ReviewPage";
import { UniversePage } from "../features/universe/UniversePage";

export function App() {
  return (
    <Routes>
      <Route element={<Shell />}>
        <Route index element={<HomePage />} />
        <Route path="universe" element={<UniversePage />} />
        <Route path="projects" element={<ProjectsPage />} />
        <Route path="projects/:id" element={<ProjectDetailPage />} />
        <Route path="factory" element={<FactoryPage />} />
        <Route path="extraction" element={<ExtractionPage />} />
        <Route path="review" element={<ReviewPage />} />
      </Route>
    </Routes>
  );
}
