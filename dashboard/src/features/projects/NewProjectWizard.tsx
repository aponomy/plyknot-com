import { useState } from "react";
import { X } from "lucide-react";
import type { ProjectKind } from "../../lib/mock-data";

interface NewProjectWizardProps {
  open: boolean;
  onClose: () => void;
}

const kinds: { value: ProjectKind; icon: string; label: string; description: string }[] = [
  { value: "crack-resolution", icon: "◈", label: "Crack resolution", description: "Investigate a specific σ-tension" },
  { value: "opening-extension", icon: "◌", label: "Opening extension", description: "Extend a measurer-correlation cluster" },
  { value: "extraction-batch", icon: "□", label: "Extraction batch", description: "Ingest literature by scope" },
  { value: "surveillance", icon: "⬡", label: "Surveillance", description: "Scheduled echo-chamber scan" },
];

export function NewProjectWizard({ open, onClose }: NewProjectWizardProps) {
  const [step, setStep] = useState(0);
  const [kind, setKind] = useState<ProjectKind | null>(null);
  const [name, setName] = useState("");
  const [budget, setBudget] = useState("200");

  if (!open) return null;

  function handleClose() {
    setStep(0);
    setKind(null);
    setName("");
    setBudget("200");
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* backdrop */}
      <div className="absolute inset-0 bg-black/60" onClick={handleClose} />

      {/* dialog */}
      <div className="relative w-full max-w-lg rounded-xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-xl">
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
        >
          <X size={16} />
        </button>

        {step === 0 && (
          <>
            <h2 className="text-base font-semibold mb-1">New project</h2>
            <p className="text-xs text-[var(--muted-foreground)] mb-4">What kind of project?</p>
            <div className="space-y-2">
              {kinds.map((k) => (
                <button
                  key={k.value}
                  onClick={() => { setKind(k.value); setStep(1); }}
                  className={`w-full flex items-center gap-3 p-3 rounded-lg border transition-colors text-left ${
                    kind === k.value
                      ? "border-[var(--primary)] bg-[var(--primary)]/5"
                      : "border-[var(--border)] hover:border-[var(--muted-foreground)] hover:bg-[var(--muted)]"
                  }`}
                >
                  <span className="text-lg font-mono w-6 text-center">{k.icon}</span>
                  <div>
                    <p className="text-sm font-medium">{k.label}</p>
                    <p className="text-xs text-[var(--muted-foreground)]">{k.description}</p>
                  </div>
                </button>
              ))}
            </div>
          </>
        )}

        {step === 1 && kind && (
          <>
            <h2 className="text-base font-semibold mb-1">
              New {kinds.find((k) => k.value === kind)?.label?.toLowerCase()}
            </h2>
            <p className="text-xs text-[var(--muted-foreground)] mb-4">Configure your project</p>

            <div className="space-y-4">
              <div>
                <label className="text-xs text-[var(--muted-foreground)] block mb-1">Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. mcl1-literature-2024-2026"
                  className="w-full px-3 py-2 rounded-md bg-[var(--background)] border border-[var(--border)] text-sm text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)]"
                />
              </div>

              <div>
                <label className="text-xs text-[var(--muted-foreground)] block mb-1">Budget (USD)</label>
                <input
                  type="number"
                  value={budget}
                  onChange={(e) => setBudget(e.target.value)}
                  className="w-full px-3 py-2 rounded-md bg-[var(--background)] border border-[var(--border)] text-sm font-mono text-[var(--foreground)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)]"
                />
              </div>

              {kind === "extraction-batch" && (
                <>
                  <div>
                    <label className="text-xs text-[var(--muted-foreground)] block mb-1">Topic keywords</label>
                    <input
                      type="text"
                      placeholder="e.g. MCL-1, BH3 mimetic"
                      className="w-full px-3 py-2 rounded-md bg-[var(--background)] border border-[var(--border)] text-sm text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)]"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-[var(--muted-foreground)] block mb-1">Target paper count</label>
                    <input
                      type="number"
                      defaultValue={500}
                      className="w-full px-3 py-2 rounded-md bg-[var(--background)] border border-[var(--border)] text-sm font-mono text-[var(--foreground)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)]"
                    />
                  </div>
                </>
              )}

              {kind === "crack-resolution" && (
                <div>
                  <label className="text-xs text-[var(--muted-foreground)] block mb-1">Crack IDs</label>
                  <input
                    type="text"
                    placeholder="e.g. alphafold-binding-site"
                    className="w-full px-3 py-2 rounded-md bg-[var(--background)] border border-[var(--border)] text-sm font-mono text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)]"
                  />
                </div>
              )}

              {kind === "surveillance" && (
                <div>
                  <label className="text-xs text-[var(--muted-foreground)] block mb-1">Schedule</label>
                  <select className="w-full px-3 py-2 rounded-md bg-[var(--background)] border border-[var(--border)] text-sm text-[var(--foreground)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)]">
                    <option>daily</option>
                    <option>weekly</option>
                    <option>monthly</option>
                  </select>
                </div>
              )}
            </div>

            <div className="flex justify-between mt-6">
              <button
                onClick={() => setStep(0)}
                className="text-xs px-3 py-1.5 rounded-md border border-[var(--border)] text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors"
              >
                Back
              </button>
              <button
                disabled={!name.trim()}
                onClick={handleClose}
                className="text-xs px-4 py-1.5 rounded-md bg-[var(--primary)] text-[var(--primary-foreground)] hover:opacity-90 transition-opacity disabled:opacity-40"
              >
                Create
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
