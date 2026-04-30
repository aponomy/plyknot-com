/* SVG diagram content for the Schema section of the Overview page. */

export interface SchemaEntry {
  id: string;
  title: string;
  group: string;
  summary: string;
  svg: string;
}

function fourField(title: string, xLabel: string, yLabel: string, tl: string, tr: string, bl: string, br: string): string {
  return `<svg viewBox="0 0 500 340" xmlns="http://www.w3.org/2000/svg" class="w-full max-w-lg">
  <text x="250" y="24" text-anchor="middle" font-size="14" font-weight="600" fill="currentColor">${title}</text>
  <line x1="60" y1="45" x2="60" y2="320" stroke="var(--border)" stroke-width="1.5"/>
  <line x1="60" y1="320" x2="490" y2="320" stroke="var(--border)" stroke-width="1.5"/>
  <text x="30" y="185" text-anchor="middle" font-size="11" fill="var(--muted-foreground)" transform="rotate(-90,30,185)">${yLabel}</text>
  <text x="275" y="338" text-anchor="middle" font-size="11" fill="var(--muted-foreground)">${xLabel}</text>
  <rect x="65" y="50" width="207" height="130" rx="6" fill="var(--primary)" fill-opacity="0.08" stroke="var(--primary)" stroke-width="1.5"/>
  <text x="168" y="115" text-anchor="middle" font-size="11" font-weight="600" fill="var(--primary)">${tl}</text>
  <rect x="278" y="50" width="207" height="130" rx="6" fill="var(--muted)" fill-opacity="0.5" stroke="var(--border)" stroke-width="1"/>
  <text x="381" y="115" text-anchor="middle" font-size="11" fill="var(--muted-foreground)">${tr}</text>
  <rect x="65" y="186" width="207" height="130" rx="6" fill="var(--muted)" fill-opacity="0.5" stroke="var(--border)" stroke-width="1"/>
  <text x="168" y="251" text-anchor="middle" font-size="11" fill="var(--muted-foreground)">${bl}</text>
  <rect x="278" y="186" width="207" height="130" rx="6" fill="var(--muted)" fill-opacity="0.5" stroke="var(--border)" stroke-width="1"/>
  <text x="381" y="251" text-anchor="middle" font-size="11" fill="var(--muted-foreground)">${br}</text>
</svg>`;
}

const pipelineSvg = `<svg viewBox="0 0 800 200" xmlns="http://www.w3.org/2000/svg" class="w-full max-w-3xl">
  <defs><marker id="arr" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto"><path d="M0,0 L8,3 L0,6" fill="var(--muted-foreground)"/></marker></defs>
  <rect x="10" y="30" width="150" height="140" rx="8" fill="var(--muted)" stroke="var(--border)" stroke-width="1.5"/>
  <text x="85" y="60" text-anchor="middle" font-size="13" font-weight="600" fill="currentColor">Sources</text>
  <text x="85" y="82" text-anchor="middle" font-size="11" fill="var(--muted-foreground)">papers</text>
  <text x="85" y="98" text-anchor="middle" font-size="11" fill="var(--muted-foreground)">databases</text>
  <text x="85" y="114" text-anchor="middle" font-size="11" fill="var(--muted-foreground)">models</text>
  <text x="85" y="130" text-anchor="middle" font-size="11" fill="var(--muted-foreground)">sensors</text>
  <line x1="165" y1="100" x2="210" y2="100" stroke="var(--muted-foreground)" stroke-width="1.5" marker-end="url(#arr)"/>
  <rect x="215" y="30" width="160" height="140" rx="8" fill="var(--primary)" fill-opacity="0.08" stroke="var(--primary)" stroke-width="1.5"/>
  <text x="295" y="58" text-anchor="middle" font-size="13" font-weight="600" fill="var(--primary)">Record</text>
  <text x="295" y="82" text-anchor="middle" font-size="12" fill="var(--primary)" font-family="monospace">measure()</text>
  <text x="295" y="102" text-anchor="middle" font-size="12" fill="var(--primary)" font-family="monospace">predict()</text>
  <rect x="235" y="115" width="120" height="24" rx="4" fill="var(--primary)" fill-opacity="0.1"/>
  <text x="295" y="132" text-anchor="middle" font-size="10" fill="var(--primary)">Coupling Map</text>
  <line x1="380" y1="100" x2="425" y2="100" stroke="var(--muted-foreground)" stroke-width="1.5" marker-end="url(#arr)"/>
  <rect x="430" y="30" width="160" height="140" rx="8" fill="var(--color-success)" fill-opacity="0.08" stroke="var(--color-success)" stroke-width="1.5"/>
  <text x="510" y="58" text-anchor="middle" font-size="13" font-weight="600" fill="var(--color-success)">Analyze</text>
  <text x="510" y="80" text-anchor="middle" font-size="11" fill="var(--muted-foreground)">convergence</text>
  <text x="510" y="96" text-anchor="middle" font-size="11" fill="var(--muted-foreground)">speciation</text>
  <text x="510" y="112" text-anchor="middle" font-size="11" fill="var(--muted-foreground)">correlation</text>
  <text x="510" y="128" text-anchor="middle" font-size="11" fill="var(--muted-foreground)">echo chamber</text>
  <line x1="595" y1="100" x2="640" y2="100" stroke="var(--muted-foreground)" stroke-width="1.5" marker-end="url(#arr)"/>
  <rect x="645" y="30" width="145" height="140" rx="8" fill="var(--color-danger)" fill-opacity="0.08" stroke="var(--color-danger)" stroke-width="1.5"/>
  <text x="718" y="58" text-anchor="middle" font-size="13" font-weight="600" fill="var(--color-danger)">Discover</text>
  <text x="718" y="82" text-anchor="middle" font-size="11" fill="var(--muted-foreground)">cracks</text>
  <text x="718" y="98" text-anchor="middle" font-size="11" fill="var(--muted-foreground)">echo chambers</text>
  <text x="718" y="114" text-anchor="middle" font-size="11" fill="var(--muted-foreground)">hidden species</text>
  <text x="718" y="130" text-anchor="middle" font-size="11" fill="var(--muted-foreground)">vulnerabilities</text>
</svg>`;

const layersSvg = `<svg viewBox="0 0 600 240" xmlns="http://www.w3.org/2000/svg" class="w-full max-w-2xl">
  <text x="300" y="24" text-anchor="middle" font-size="14" font-weight="600" fill="currentColor">Three-Layer Architecture</text>
  <rect x="50" y="40" width="500" height="50" rx="6" fill="var(--color-danger)" fill-opacity="0.08" stroke="var(--color-danger)" stroke-width="1.5"/>
  <text x="70" y="62" font-size="12" font-weight="600" fill="var(--color-danger)">Layer 3 - LLM Queries (read-only)</text>
  <text x="70" y="78" font-size="10" fill="var(--muted-foreground)">Natural language questions answered from the coupling map</text>
  <rect x="50" y="100" width="500" height="50" rx="6" fill="var(--primary)" fill-opacity="0.08" stroke="var(--primary)" stroke-width="1.5"/>
  <text x="70" y="122" font-size="12" font-weight="600" fill="var(--primary)">Layer 2 - Deterministic Analysis</text>
  <text x="70" y="138" font-size="10" fill="var(--muted-foreground)">Convergence, speciation, marker passing, echo chamber guard</text>
  <rect x="50" y="160" width="500" height="50" rx="6" fill="var(--color-success)" fill-opacity="0.08" stroke="var(--color-success)" stroke-width="1.5"/>
  <text x="70" y="182" font-size="12" font-weight="600" fill="var(--color-success)">Layer 1 - Coupling Values</text>
  <text x="70" y="198" font-size="10" fill="var(--muted-foreground)">(measurer, entity, property, value) tuples. The atomic data layer.</text>
  <text x="300" y="232" text-anchor="middle" font-size="10" fill="var(--muted-foreground)">Each layer reads only from the layer below. No upward writes.</text>
</svg>`;

const levelsSvg = `<svg viewBox="0 0 600 330" xmlns="http://www.w3.org/2000/svg" class="w-full max-w-2xl">
  <text x="10" y="24" font-size="14" font-weight="600" fill="currentColor">Complexity Levels</text>
  ${[
    ["L0", "Single measurement", "var(--muted-foreground)", 60],
    ["L1", "Repeated (same instrument)", "var(--muted-foreground)", 100],
    ["L2", "Multiple independent instruments", "var(--primary)", 160],
    ["L3", "Systematic speciation", "var(--primary)", 220],
    ["L4", "Cross-domain analogy", "#7c3aed", 300],
    ["L5", "Meta-theoretical claims", "var(--color-danger)", 360],
  ].map(([label, desc, color, width], i) => {
    const y = 40 + i * 48;
    return `<rect x="50" y="${y}" width="${width}" height="32" rx="4" fill="${color}" fill-opacity="0.12" stroke="${color}" stroke-width="1.5"/>
  <text x="60" y="${(y as number) + 21}" font-size="12" font-weight="700" fill="${color}">${label}</text>
  <text x="${70 + (width as number)}" y="${(y as number) + 21}" font-size="11" fill="var(--muted-foreground)">${desc}</text>`;
  }).join("\n  ")}
</svg>`;

const domainsSvg = `<svg viewBox="0 0 600 210" xmlns="http://www.w3.org/2000/svg" class="w-full max-w-2xl">
  <text x="10" y="24" font-size="14" font-weight="600" fill="currentColor">Domain Coverage (same code, same API)</text>
  ${[
    ["Cosmology", "Hubble tension", "var(--primary)"],
    ["Structural Bio", "AlphaFold echo chambers", "#7c3aed"],
    ["Medical Imaging", "CXR ground truth", "var(--color-danger)"],
    ["Materials", "DFT cross-database", "var(--color-warning)"],
    ["Drug Discovery", "Binding affinity", "var(--color-success)"],
    ["Text / NLP", "Paper extraction", "#0891b2"],
    ["Emotion Phys", "Cross-method", "var(--muted-foreground)"],
  ].map(([name, desc, color], i) => {
    const col = i % 4, row = Math.floor(i / 4);
    const x = 10 + col * 148, y = 40 + row * 80;
    return `<rect x="${x}" y="${y}" width="140" height="65" rx="6" fill="${color}" fill-opacity="0.08" stroke="${color}" stroke-width="1.5"/>
  <text x="${x + 10}" y="${y + 22}" font-size="11" font-weight="600" fill="${color}">${name}</text>
  <text x="${x + 10}" y="${y + 40}" font-size="9" fill="var(--muted-foreground)">${desc}</text>
  <text x="${x + 10}" y="${y + 54}" font-size="9" fill="var(--muted-foreground)">25-50% divergence</text>`;
  }).join("\n  ")}
</svg>`;

export const SCHEMAS: SchemaEntry[] = [
  { id: "schema-pipeline", title: "Framework Pipeline", group: "Concepts", summary: "Sources -> measure/predict -> Analysis -> Discovery", svg: pipelineSvg },
  { id: "schema-layers", title: "Three-Layer Architecture", group: "Concepts", summary: "L1: Values, L2: Analysis, L3: LLM Queries", svg: layersSvg },
  { id: "schema-levels", title: "Complexity Levels (L0-L5)", group: "Concepts", summary: "Single measurement through meta-theory", svg: levelsSvg },
  { id: "schema-domains", title: "Domain Coverage", group: "Validation", summary: "7 domains, same code, 25-50% divergence", svg: domainsSvg },
  {
    id: "schema-vs-ai", title: "Plyknot vs AI Scientists", group: "Comparisons",
    summary: "Reference state vs output generation",
    svg: fourField("Plyknot vs AI Scientists", "Domain Specificity", "Data Foundation",
      "PLYKNOT", "Specialized Databases", "AI Scientists (Sakana, Google)", "Traditional Domain Tools"),
  },
  {
    id: "schema-vs-ml", title: "Plyknot vs Statistical ML", group: "Comparisons",
    summary: "Structural dependencies vs correlation",
    svg: fourField("Plyknot vs Statistical ML", "Approach to Agreement", "What It Tracks",
      "PLYKNOT", "Bayesian ML", "Ensemble Methods", "Standard ML"),
  },
  {
    id: "schema-vs-kg", title: "Plyknot vs Knowledge Graphs", group: "Comparisons",
    summary: "Measurement-first vs claim-first",
    svg: fourField("Plyknot vs Knowledge Graphs", "World Assumption", "Data Entry",
      "PLYKNOT", "Wikidata / DBpedia", "Lab Notebooks", "SQL Databases"),
  },
  {
    id: "schema-vs-meta", title: "Plyknot vs Meta-Analysis", group: "Comparisons",
    summary: "Operational dependencies vs statistical pooling",
    svg: fourField("Plyknot vs Meta-Analysis", "Cross-Domain Scope", "Dependency Awareness",
      "PLYKNOT", "Cochrane / PRISMA", "Causal Inference (DAGs)", "Systematic Reviews"),
  },
  {
    id: "schema-vs-repro", title: "Plyknot vs Reproducibility Tools", group: "Comparisons",
    summary: "Continuous convergence vs binary replicate/fail",
    svg: fourField("Plyknot vs Reproducibility", "Temporal Model", "What It Measures",
      "PLYKNOT", "Center for Open Science", "ReproZip / DVC", "Retraction Watch"),
  },
];
