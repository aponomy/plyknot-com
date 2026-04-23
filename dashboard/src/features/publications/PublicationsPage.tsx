import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card } from "../../components/ui/card";
import { KpiCard } from "../../components/ui/kpi-card";
import { cn } from "../../lib/utils";
import { fetchPublications, type Publication, type PublicationTrack } from "../../lib/hub-api";

type FilterTrack = "all" | PublicationTrack;

const trackIcon: Record<PublicationTrack, string> = {
  paper: "📄",
  patent: "⚖",
  "customer-report": "📊",
};

const trackLabel: Record<PublicationTrack, string> = {
  paper: "Paper",
  patent: "Patent",
  "customer-report": "Customer report",
};

const paperStatuses = ["draft", "pass-1", "pass-2", "validated", "submitted", "published"];
const patentStatuses = ["assessment", "provisional-filed", "full-filed", "granted", "abandoned"];
const reportStatuses = ["draft", "review", "delivered"];

function statusPipeline(track: PublicationTrack, current: string) {
  const steps = track === "paper" ? paperStatuses : track === "patent" ? patentStatuses : reportStatuses;
  const idx = steps.indexOf(current);
  return { steps, idx };
}

export function PublicationsPage() {
  const [filter, setFilter] = useState<FilterTrack>("all");

  const { data, isLoading, isError } = useQuery({
    queryKey: ["publications"],
    queryFn: () => fetchPublications(),
    retry: false,
  });

  const publications = data?.publications ?? [];
  const filtered = filter === "all" ? publications : publications.filter((p) => p.track === filter);

  const papers = publications.filter((p) => p.track === "paper").length;
  const patents = publications.filter((p) => p.track === "patent").length;
  const reports = publications.filter((p) => p.track === "customer-report").length;

  return (
    <div className="space-y-6 max-w-6xl">
      <h1 className="text-lg font-semibold">Publications</h1>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard title="All" value={publications.length} active={filter === "all"} onClick={() => setFilter("all")} />
        <KpiCard title="Papers" value={papers} active={filter === "paper"} onClick={() => setFilter("paper")} />
        <KpiCard title="Patents" value={patents} active={filter === "patent"} onClick={() => setFilter("patent")} />
        <KpiCard title="Customer reports" value={reports} active={filter === "customer-report"} onClick={() => setFilter("customer-report")} />
      </div>

      {isLoading && (
        <Card><div className="h-24 flex items-center justify-center text-sm text-[var(--muted-foreground)]">Loading publications…</div></Card>
      )}

      {isError && (
        <Card>
          <div className="flex items-center gap-2 p-3 text-xs text-[var(--muted-foreground)]">
            <span className="w-2 h-2 rounded-full bg-[var(--color-warning)]" />
            Could not load publications. Check hub.plyknot.com authentication.
          </div>
        </Card>
      )}

      {!isLoading && filtered.length === 0 && !isError && (
        <Card><p className="text-sm text-[var(--muted-foreground)]">No publications yet.</p></Card>
      )}

      {filtered.map((pub) => (
        <PublicationCard key={pub.id} pub={pub} />
      ))}
    </div>
  );
}

function PublicationCard({ pub }: { pub: Publication }) {
  const { steps, idx } = statusPipeline(pub.track, pub.status);

  return (
    <Card>
      {/* Header */}
      <div className="flex items-center gap-2 mb-2">
        <span className="text-base">{trackIcon[pub.track]}</span>
        <span className="text-[10px] text-[var(--muted-foreground)] uppercase tracking-wider">{trackLabel[pub.track]}</span>
        <span className="text-xs px-1.5 py-0.5 rounded bg-[color:var(--color-accent)]/10 text-[var(--color-accent)]">{pub.status}</span>
      </div>

      {/* Title */}
      <h3 className="text-sm font-medium mb-2">{pub.title}</h3>

      {/* Status pipeline */}
      <div className="flex items-center gap-0.5 mb-3">
        {steps.map((step, i) => (
          <div key={step} className="flex items-center gap-0.5">
            <div
              title={step}
              className={cn(
                "h-1.5 rounded-full transition-all",
                i <= idx ? "bg-[var(--primary)]" : "bg-[var(--muted)]",
                i === idx ? "w-8" : "w-4",
              )}
            />
          </div>
        ))}
        <span className="text-[10px] text-[var(--muted-foreground)] ml-2">
          {idx + 1}/{steps.length}
        </span>
      </div>

      {/* Track-specific details */}
      <div className="grid grid-cols-2 gap-3 text-xs">
        {pub.paper_data && (
          <>
            {pub.paper_data.target_venue && <Field label="Venue" value={pub.paper_data.target_venue} />}
            {pub.paper_data.word_count && <Field label="Words" value={pub.paper_data.word_count.toLocaleString()} mono />}
            {pub.paper_data.doi && <Field label="DOI" value={pub.paper_data.doi} mono />}
            {pub.paper_data.arxiv_id && <Field label="arXiv" value={pub.paper_data.arxiv_id} mono />}
            {pub.paper_data.validator_issues != null && (
              <Field
                label="Validator"
                value={pub.paper_data.validator_issues === 0 ? "✓ clean" : `${pub.paper_data.validator_issues} issues`}
              />
            )}
          </>
        )}
        {pub.patent_data && (
          <>
            {pub.patent_data.filing_jurisdiction && <Field label="Jurisdiction" value={pub.patent_data.filing_jurisdiction} />}
            {pub.patent_data.provisional_filing_date && <Field label="Provisional filed" value={pub.patent_data.provisional_filing_date} />}
            {pub.patent_data.embargo_until && <Field label="Embargoed until" value={pub.patent_data.embargo_until} />}
            {pub.patent_data.claims && <Field label="Claims" value={`${pub.patent_data.claims.length} drafted`} />}
          </>
        )}
        {pub.report_data && (
          <>
            {pub.report_data.scope && <Field label="Scope" value={pub.report_data.scope} />}
            {pub.report_data.delivered_at && <Field label="Delivered" value={pub.report_data.delivered_at} />}
          </>
        )}
      </div>

      {/* Source findings */}
      {pub.finding_ids.length > 0 && (
        <div className="flex items-center gap-1.5 mt-3 text-[10px] text-[var(--muted-foreground)]">
          <span>From:</span>
          {pub.finding_ids.map((id) => (
            <span key={id} className="font-mono px-1.5 py-0.5 rounded bg-[var(--muted)]">{id}</span>
          ))}
        </div>
      )}
    </Card>
  );
}

function Field({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <p className="text-[var(--muted-foreground)]">{label}</p>
      <p className={mono ? "font-mono" : ""}>{value}</p>
    </div>
  );
}
