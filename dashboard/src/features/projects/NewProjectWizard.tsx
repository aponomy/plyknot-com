import { useState, useRef, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X, ChevronDown, Upload, FileText } from "lucide-react";
import { toast } from "sonner";
import { cn } from "../../lib/utils";
import type { ProjectKind } from "../../lib/mock-data";

interface NewProjectWizardProps {
  open: boolean;
  onClose: () => void;
}

const kinds: { value: ProjectKind; icon: string; label: string; description: string }[] = [
  { value: "investigation", icon: "◇", label: "Investigation", description: "Open-ended research — may become a crack, opening, or report" },
  { value: "crack-resolution", icon: "◈", label: "Crack resolution", description: "Investigate a specific σ-tension" },
  { value: "opening-extension", icon: "◌", label: "Opening extension", description: "Extend a measurer-correlation cluster" },
  { value: "extraction-batch", icon: "□", label: "Extraction batch", description: "Ingest literature by scope" },
  { value: "surveillance", icon: "⬡", label: "Surveillance", description: "Scheduled echo-chamber scan" },
];

const VENUES = [
  "bioRxiv", "arXiv", "medRxiv",
  "Nature", "Science", "Cell",
  "PNAS", "Sci. Adv.", "J. Med. Chem.",
  "J. Biol. Chem.", "ACS Chem. Biol.", "Nat. Chem. Biol.",
];

const inputClass = "w-full px-3 py-2 rounded-md bg-[var(--background)] border border-[var(--border)] text-sm text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)]";

export function NewProjectWizard({ open, onClose }: NewProjectWizardProps) {
  const [kind, setKind] = useState<ProjectKind>("investigation");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [budget, setBudget] = useState("200");
  const [venues, setVenues] = useState<Set<string>>(new Set());
  const [papers, setPapers] = useState<{ name: string; type: "doi" | "file" }[]>([]);
  const [paperInput, setPaperInput] = useState("");
  const [kindOpen, setKindOpen] = useState(false);
  const kindRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const allVenuesSelected = venues.size === VENUES.length;
  const selectedKind = kinds.find((k) => k.value === kind) ?? kinds[0];

  // Close kind dropdown on click-away or Esc
  useEffect(() => {
    if (!kindOpen) return;
    function onClickAway(e: MouseEvent) {
      if (kindRef.current && !kindRef.current.contains(e.target as Node)) setKindOpen(false);
    }
    function onEsc(e: KeyboardEvent) {
      if (e.key === "Escape") setKindOpen(false);
    }
    document.addEventListener("mousedown", onClickAway);
    document.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("mousedown", onClickAway);
      document.removeEventListener("keydown", onEsc);
    };
  }, [kindOpen]);

  function handleClose() {
    setKind("investigation");
    setName("");
    setDescription("");
    setBudget("200");
    setVenues(new Set());
    setPapers([]);
    setPaperInput("");
    setKindOpen(false);
    onClose();
  }

  function toggleVenue(v: string) {
    setVenues((prev) => {
      const next = new Set(prev);
      if (next.has(v)) next.delete(v); else next.add(v);
      return next;
    });
  }

  function toggleAllVenues() {
    setVenues(allVenuesSelected ? new Set() : new Set(VENUES));
  }

  function handleCreate() {
    toast.success(`Project "${name}" created`, {
      description: `Kind: ${kind}. Budget: $${budget}.`,
    });
    handleClose();
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-black/40"
            onClick={handleClose}
          />
          <motion.aside
            key="drawer"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            className="fixed top-0 right-0 bottom-0 z-50 w-full max-w-md border-l border-[var(--border)] bg-[var(--card)] shadow-2xl flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 h-12 border-b border-[var(--border)] shrink-0">
              <h2 className="text-sm font-semibold">New project</h2>
              <button
                onClick={handleClose}
                className="w-7 h-7 flex items-center justify-center rounded-md text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--muted)] transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            {/* Form */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {/* Kind dropdown */}
              <div ref={kindRef} className="relative">
                <label className="text-xs text-[var(--muted-foreground)] block mb-1.5">Kind</label>
                <button
                  type="button"
                  onClick={() => setKindOpen((o) => !o)}
                  className="w-full flex items-center gap-2 p-2.5 rounded-lg border border-[var(--border)] bg-[var(--background)] hover:bg-[var(--muted)] transition-colors text-left"
                >
                  <span className="text-base font-mono">{selectedKind.icon}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{selectedKind.label}</p>
                    <p className="text-[10px] text-[var(--muted-foreground)] leading-tight">{selectedKind.description}</p>
                  </div>
                  <ChevronDown size={14} className={cn("text-[var(--muted-foreground)] transition-transform", kindOpen && "rotate-180")} />
                </button>
                {kindOpen && (
                  <div className="absolute left-0 right-0 top-full mt-1 z-10 rounded-lg border border-[var(--border)] bg-[var(--card)] shadow-xl overflow-hidden">
                    {kinds.map((k) => (
                      <button
                        key={k.value}
                        onClick={() => { setKind(k.value); setKindOpen(false); }}
                        className={cn(
                          "w-full flex items-center gap-2 p-2.5 text-left transition-colors",
                          kind === k.value
                            ? "bg-[var(--primary)]/5"
                            : "hover:bg-[var(--muted)]",
                        )}
                      >
                        <span className="text-base font-mono w-6 text-center">{k.icon}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium">{k.label}</p>
                          <p className="text-[10px] text-[var(--muted-foreground)] leading-tight">{k.description}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Name */}
              <div>
                <label className="text-xs text-[var(--muted-foreground)] block mb-1">Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. mcl1-literature-2024-2026"
                  className={inputClass}
                  autoFocus
                />
              </div>

              {/* Description */}
              <div>
                <label className="text-xs text-[var(--muted-foreground)] block mb-1">Description</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="What is this project about? What question are you trying to answer?"
                  rows={3}
                  className={`${inputClass} resize-none`}
                />
              </div>

              {/* Orchestrator Instructions */}
              <div>
                <label className="text-xs text-[var(--muted-foreground)] block mb-1">Orchestrator instructions</label>
                <textarea
                  placeholder="Special instructions for the factory orchestrator, e.g. 'prioritise SPR over ITC data', 'use only open-access papers', 'skip papers before 2023'"
                  rows={2}
                  className={`${inputClass} resize-none text-xs`}
                />
              </div>

              {/* Budget */}
              <div>
                <label className="text-xs text-[var(--muted-foreground)] block mb-1">Budget (USD)</label>
                <input
                  type="number"
                  value={budget}
                  onChange={(e) => setBudget(e.target.value)}
                  className={`${inputClass} font-mono`}
                />
              </div>

              {/* Kind-specific fields */}
              {kind === "crack-resolution" && (
                <div>
                  <label className="text-xs text-[var(--muted-foreground)] block mb-1">Crack IDs</label>
                  <input type="text" placeholder="e.g. alphafold-binding-site" className={`${inputClass} font-mono`} />
                </div>
              )}

              {kind === "extraction-batch" && (
                <>
                  <div>
                    <label className="text-xs text-[var(--muted-foreground)] block mb-1">Topic keywords</label>
                    <input type="text" placeholder="e.g. MCL-1, BH3 mimetic" className={inputClass} />
                  </div>
                  <div>
                    <label className="text-xs text-[var(--muted-foreground)] block mb-1">Target paper count</label>
                    <input type="number" defaultValue={500} className={`${inputClass} font-mono`} />
                  </div>
                  <div>
                    <label className="text-xs text-[var(--muted-foreground)] block mb-1.5">Venues</label>
                    <label className="flex items-center gap-2 mb-2 cursor-pointer text-sm">
                      <input
                        type="checkbox"
                        checked={allVenuesSelected}
                        onChange={toggleAllVenues}
                        className="rounded border-[var(--border)] accent-[var(--primary)]"
                      />
                      <span className={allVenuesSelected ? "text-[var(--foreground)]" : "text-[var(--muted-foreground)]"}>All venues</span>
                    </label>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
                      {VENUES.map((v) => (
                        <label key={v} className="flex items-center gap-2 cursor-pointer text-xs">
                          <input
                            type="checkbox"
                            checked={venues.has(v)}
                            onChange={() => toggleVenue(v)}
                            className="rounded border-[var(--border)] accent-[var(--primary)]"
                          />
                          <span className={venues.has(v) ? "text-[var(--foreground)]" : "text-[var(--muted-foreground)]"}>
                            {v}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-[var(--muted-foreground)] block mb-1.5">Specific paper(s)</label>
                    <p className="text-[10px] text-[var(--muted-foreground)] mb-2">Upload PDF files or add DOIs to include specific papers.</p>

                    {/* Upload button */}
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".pdf,.csv,.txt"
                      multiple
                      className="hidden"
                      onChange={(e) => {
                        const files = e.target.files;
                        if (files) {
                          const newPapers = Array.from(files).map((f) => ({ name: f.name, type: "file" as const }));
                          setPapers((prev) => [...prev, ...newPapers]);
                        }
                        e.target.value = "";
                      }}
                    />
                    <div className="flex gap-2 mb-2">
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="flex items-center gap-1.5 text-xs px-3 py-2 rounded-md border border-dashed border-[var(--border)] text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:border-[var(--muted-foreground)] transition-colors"
                      >
                        <Upload size={13} />
                        Upload files
                      </button>
                    </div>

                    {/* DOI input */}
                    <div className="flex gap-2 mb-2">
                      <input
                        type="text"
                        value={paperInput}
                        onChange={(e) => setPaperInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && paperInput.trim()) {
                            e.preventDefault();
                            setPapers((prev) => [...prev, { name: paperInput.trim(), type: "doi" }]);
                            setPaperInput("");
                          }
                        }}
                        placeholder="or paste a DOI, e.g. 10.1101/2026.04.9081"
                        className={`${inputClass} font-mono text-xs`}
                      />
                      <button
                        type="button"
                        disabled={!paperInput.trim()}
                        onClick={() => {
                          if (paperInput.trim()) {
                            setPapers((prev) => [...prev, { name: paperInput.trim(), type: "doi" }]);
                            setPaperInput("");
                          }
                        }}
                        className="shrink-0 text-xs px-3 py-2 rounded-md bg-[var(--muted)] text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors disabled:opacity-40"
                      >
                        Add
                      </button>
                    </div>

                    {/* Paper list */}
                    {papers.length > 0 && (
                      <div className="space-y-1">
                        {papers.map((p, i) => (
                          <div key={i} className="flex items-center gap-2 text-xs bg-[var(--muted)] rounded-md px-2.5 py-1.5">
                            {p.type === "file" ? <FileText size={12} className="shrink-0 text-[var(--muted-foreground)]" /> : <span className="shrink-0 text-[var(--muted-foreground)]">DOI</span>}
                            <span className="flex-1 truncate font-mono">{p.name}</span>
                            <button
                              onClick={() => setPapers((prev) => prev.filter((_, j) => j !== i))}
                              className="shrink-0 text-[var(--muted-foreground)] hover:text-[var(--color-danger)] transition-colors"
                            >
                              <X size={12} />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              )}

              {kind === "opening-extension" && (
                <div>
                  <label className="text-xs text-[var(--muted-foreground)] block mb-1">Cluster IDs</label>
                  <input type="text" placeholder="e.g. measurer-correlation-spr" className={`${inputClass} font-mono`} />
                </div>
              )}

              {kind === "surveillance" && (
                <>
                  <div>
                    <label className="text-xs text-[var(--muted-foreground)] block mb-1">Schedule</label>
                    <select className={inputClass}>
                      <option>daily</option>
                      <option>weekly</option>
                      <option>monthly</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-[var(--muted-foreground)] block mb-1">Watchlist</label>
                    <input type="text" placeholder="e.g. echo-chamber:cxr-spr" className={`${inputClass} font-mono`} />
                  </div>
                </>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between px-4 py-3 border-t border-[var(--border)] shrink-0">
              <button
                onClick={handleClose}
                className="text-xs px-3 py-1.5 rounded-md border border-[var(--border)] text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors"
              >
                Cancel
              </button>
              <button
                disabled={!name.trim()}
                onClick={handleCreate}
                className="text-xs px-4 py-1.5 rounded-md bg-[var(--primary)] text-[var(--primary-foreground)] hover:opacity-90 transition-opacity disabled:opacity-40"
              >
                Create project
              </button>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
