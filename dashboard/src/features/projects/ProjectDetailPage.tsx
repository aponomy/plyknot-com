import { useParams, Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { getProject } from "../../lib/mock-data";
import { CrackResolutionDetail } from "./CrackResolutionDetail";
import { ExtractionBatchDetail } from "./ExtractionBatchDetail";
import { SurveillanceDetail } from "./SurveillanceDetail";

export function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const project = id ? getProject(id) : undefined;

  if (!project) {
    return (
      <div className="space-y-4 max-w-6xl">
        <Link to="/projects" className="text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)] flex items-center gap-1">
          <ArrowLeft size={14} /> Projects
        </Link>
        <p className="text-sm text-[var(--muted-foreground)]">Project not found: {id}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-6xl">
      <div className="flex items-center gap-2 text-sm text-[var(--muted-foreground)]">
        <Link to="/projects" className="flex items-center gap-1 hover:text-[var(--foreground)] transition-colors">
          <ArrowLeft size={14} />
          Projects
        </Link>
        <span>/</span>
        <span className="text-[var(--foreground)]">{project.name}</span>
      </div>

      {project.kind === "crack-resolution" && <CrackResolutionDetail project={project} />}
      {project.kind === "extraction-batch" && <ExtractionBatchDetail project={project} />}
      {project.kind === "surveillance" && <SurveillanceDetail project={project} />}
      {project.kind === "opening-extension" && <CrackResolutionDetail project={project} />}
    </div>
  );
}
