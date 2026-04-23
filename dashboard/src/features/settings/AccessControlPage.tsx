import { Card, CardHeader, CardTitle } from "../../components/ui/card";
import { cn } from "../../lib/utils";

type AccessLevel = "full" | "read-only" | "limited" | "metadata" | "summary" | "drafts" | "tenant" | "—";

const personas = ["Klas", "Coordinator", "Partnerships", "Advisory", "Customer"] as const;

const views = [
  "Home",
  "Universe",
  "Projects list",
  "Project detail",
  "Factory",
  "Extraction",
  "Review queue",
  "Rendering",
  "Audit",
] as const;

const matrix: Record<typeof views[number], Record<typeof personas[number], AccessLevel>> = {
  "Home":           { Klas: "full", Coordinator: "full", Partnerships: "limited", Advisory: "limited", Customer: "tenant" },
  "Universe":       { Klas: "full", Coordinator: "full", Partnerships: "full", Advisory: "full", Customer: "full" },
  "Projects list":  { Klas: "full", Coordinator: "full", Partnerships: "metadata", Advisory: "metadata", Customer: "tenant" },
  "Project detail": { Klas: "full", Coordinator: "full", Partnerships: "summary", Advisory: "summary", Customer: "tenant" },
  "Factory":        { Klas: "full", Coordinator: "read-only", Partnerships: "—", Advisory: "—", Customer: "tenant" },
  "Extraction":     { Klas: "full", Coordinator: "full", Partnerships: "read-only", Advisory: "read-only", Customer: "—" },
  "Review queue":   { Klas: "full", Coordinator: "full", Partnerships: "—", Advisory: "—", Customer: "tenant" },
  "Rendering":      { Klas: "full", Coordinator: "full", Partnerships: "drafts", Advisory: "—", Customer: "tenant" },
  "Audit":          { Klas: "full", Coordinator: "full", Partnerships: "—", Advisory: "read-only", Customer: "tenant" },
};

const levelColor: Record<AccessLevel, string> = {
  "full": "bg-[color:var(--color-success)]/10 text-[var(--color-success)]",
  "read-only": "bg-[color:var(--color-accent)]/10 text-[var(--color-accent)]",
  "limited": "bg-[color:var(--color-warning)]/10 text-[var(--color-warning)]",
  "metadata": "bg-[color:var(--color-warning)]/10 text-[var(--color-warning)]",
  "summary": "bg-[color:var(--color-warning)]/10 text-[var(--color-warning)]",
  "drafts": "bg-[color:var(--color-accent)]/10 text-[var(--color-accent)]",
  "tenant": "bg-[var(--muted)] text-[var(--muted-foreground)]",
  "—": "",
};

export function AccessControlPage() {
  return (
    <div className="space-y-6 max-w-6xl">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">Access control</h1>
        <span className="text-xs text-[var(--muted-foreground)]">{personas.length} personas · {views.length} views</span>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Persona × View matrix</CardTitle>
        </CardHeader>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-[var(--muted-foreground)] border-b border-[var(--border)]">
                <th className="text-left py-2 font-medium pr-4">View</th>
                {personas.map((p) => (
                  <th key={p} className="text-center py-2 font-medium px-2">{p}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {views.map((view) => (
                <tr key={view} className="hover:bg-[var(--muted)] transition-colors">
                  <td className="py-2.5 pr-4 font-medium">{view}</td>
                  {personas.map((persona) => {
                    const level = matrix[view][persona];
                    return (
                      <td key={persona} className="py-2.5 text-center px-2">
                        {level === "—" ? (
                          <span className="text-xs text-[var(--muted-foreground)]">—</span>
                        ) : (
                          <span className={cn("text-[10px] font-medium px-1.5 py-0.5 rounded", levelColor[level])}>
                            {level}
                          </span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Persona descriptions */}
      <Card>
        <CardHeader>
          <CardTitle>Personas</CardTitle>
        </CardHeader>
        <div className="divide-y divide-[var(--border)]">
          <PersonaRow
            name="Klas (founder)"
            phase="Now"
            description="Total situational awareness. Full access to everything."
          />
          <PersonaRow
            name="Research coordinator"
            phase="Phase 2+"
            description="Triages automated output, reviews extraction conflicts, approves deltas."
          />
          <PersonaRow
            name="Strategic partnerships"
            phase="Phase 2+"
            description="Presents state to grant reviewers, pharma customers, advisory board."
          />
          <PersonaRow
            name="Advisory board member"
            phase="Phase 2+"
            description="Domain expert in quarterly calls. Sees cracks in their field."
          />
          <PersonaRow
            name="Customer operator"
            phase="Phase 3+"
            description="Enterprise customer, tenant-scoped. Sees only their portfolio."
          />
        </div>
      </Card>

      {/* Access levels legend */}
      <Card>
        <CardHeader>
          <CardTitle>Access levels</CardTitle>
        </CardHeader>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 text-sm">
          <div>
            <span className={cn("text-[10px] font-medium px-1.5 py-0.5 rounded", levelColor["full"])}>full</span>
            <p className="text-xs text-[var(--muted-foreground)] mt-1">Read + write + approve</p>
          </div>
          <div>
            <span className={cn("text-[10px] font-medium px-1.5 py-0.5 rounded", levelColor["read-only"])}>read-only</span>
            <p className="text-xs text-[var(--muted-foreground)] mt-1">View data, no actions</p>
          </div>
          <div>
            <span className={cn("text-[10px] font-medium px-1.5 py-0.5 rounded", levelColor["limited"])}>limited / metadata / summary</span>
            <p className="text-xs text-[var(--muted-foreground)] mt-1">Subset of fields visible</p>
          </div>
          <div>
            <span className={cn("text-[10px] font-medium px-1.5 py-0.5 rounded", levelColor["tenant"])}>tenant</span>
            <p className="text-xs text-[var(--muted-foreground)] mt-1">Scoped to customer's data</p>
          </div>
        </div>
      </Card>
    </div>
  );
}

function PersonaRow({ name, phase, description }: { name: string; phase: string; description: string }) {
  return (
    <div className="py-2.5 first:pt-0 last:pb-0">
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium">{name}</span>
        <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--muted)] text-[var(--muted-foreground)]">{phase}</span>
      </div>
      <p className="text-xs text-[var(--muted-foreground)] mt-0.5">{description}</p>
    </div>
  );
}
