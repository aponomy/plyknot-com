export interface Product {
  id: string;
  name: string;
  status: "active" | "pipeline" | "idea";
  summary: string;
  markets: string[];
  arr: string;
  users: string;
  stage: string;
  detail: string;
}

export const PRODUCTS: Product[] = [
  {
    id: "echo-chamber-map", name: "Echo Chamber Map", status: "active",
    summary: "Public convergence state of science",
    markets: ["Pharma", "Medical AI", "Materials", "Biotech"],
    arr: "$0", users: "0", stage: "Pre-launch (2026 Q3)",
    detail: "The flagship product. Public coupling map showing where science converges and where it cracks. Free tier converts to paid batch API on plyknot.com. The ONLY product that matters in 2026.",
  },
  {
    id: "patent-fto", name: "Patent FTO", status: "active",
    summary: "Patent freedom-to-operate analysis",
    markets: ["Legal & IP"],
    arr: "$0", users: "0", stage: "Stage 1 complete",
    detail: "Claims and prior art as entities, multi-model distance via measure(), convergence signals for safe/high-risk spots. Smoke test passed on Claim 20 vs Palantir US 11,714,792.",
  },
  {
    id: "cybernetics", name: "Plyknot Cybernetics", status: "pipeline",
    summary: "Reflexive measurement for deployed models",
    markets: ["Finance", "Regulatory"],
    arr: "$0", users: "0", stage: "Patent filing (mid-May PRV)",
    detail: "act() verb for reflexive domains. Tracks loop-gain, reflexive drift, and decay in deployed models. Patent-protected, Solarplexor AB.",
  },
  {
    id: "concept-distance", name: "Concept Distance", status: "pipeline",
    summary: "Two-text concept comparison SaaS",
    markets: ["Text/NLP", "Legal & IP", "Education"],
    arr: "$0", users: "0", stage: "Blocked on Canvas",
    detail: "Decomposed distance report along named semantic dimensions. Target: comparative literature, translation QA, policy analysis.",
  },
  {
    id: "news-value", name: "News Value", status: "pipeline",
    summary: "Lensing-based news significance scoring",
    markets: ["Media"],
    arr: "$0", users: "0", stage: "Synthesis complete",
    detail: "Uses lens() to score stories by how much they crack existing convergence. Higher crack = higher news value.",
  },
  {
    id: "plyknot-ml", name: "Plyknot ML (Transparent)", status: "pipeline",
    summary: "ML with operationalist inductive bias",
    markets: ["AI/ML"],
    arr: "$0", users: "0", stage: "Foundation design (12-18 mo)",
    detail: "Typed-hypergraph ML with Plyknot inductive bias. GNN + contrastive learning, autoregressive transformer for verb-sequence prediction.",
  },
  // Gap products
  {
    id: "compliance-auditor", name: "AI Act Compliance Kit", status: "idea",
    summary: "Automated EU AI Act compliance documentation",
    markets: ["Regulatory", "Medical AI"],
    arr: "$0", users: "0", stage: "Idea",
    detail: "GAP: Generates model validation reports using echo chamber detection. Targets EU AI Act enforcement (Aug 2, 2026). Natural extension of Echo Chamber Map.",
  },
  {
    id: "drug-target-validator", name: "Drug Target Validator", status: "idea",
    summary: "Binding affinity echo chamber detection",
    markets: ["Pharma"],
    arr: "$0", users: "0", stage: "Idea",
    detail: "GAP: Pharma-specific tool validating drug-protein binding predictions across methods. Detects when binding affinity consensus is echo chamber from shared force fields.",
  },
  {
    id: "dft-crosscheck", name: "DFT Cross-Check", status: "idea",
    summary: "Automated DFT cross-database validation",
    markets: ["Materials"],
    arr: "$0", users: "0", stage: "Idea",
    detail: "GAP: Convergence tracking across Materials Project, AFLOW, OQMD. Satellite 3 shows 70.5% rejection rate.",
  },
  {
    id: "predictor-decay", name: "Predictor Decay Monitor", status: "idea",
    summary: "Detect when financial predictors lose edge",
    markets: ["Finance", "Insurance"],
    arr: "$0", users: "0", stage: "Idea",
    detail: "GAP: McLean-Pontiff thesis via act(). Monitors 97+ stock-return predictors for reflexive decay.",
  },
  {
    id: "replication-risk", name: "Replication Risk Score", status: "idea",
    summary: "Score papers by echo chamber exposure",
    markets: ["Academic"],
    arr: "$0", users: "0", stage: "Idea",
    detail: "GAP: Analyzes citation networks, shared datasets, methodological dependencies. Target: journal editors, funding agencies.",
  },
  {
    id: "osint-convergence", name: "OSINT Convergence Map", status: "idea",
    summary: "Cross-source intelligence validation",
    markets: ["Defense"],
    arr: "$0", users: "0", stage: "Idea",
    detail: "GAP: Multiple OSINT sources as measurers, claims as entities. Detects single-source amplification.",
  },
  {
    id: "climate-validator", name: "GCM Divergence Tracker", status: "idea",
    summary: "Track where climate models disagree",
    markets: ["Climate"],
    arr: "$0", users: "0", stage: "Idea",
    detail: "GAP: GCMs as measurers, climate variables as properties. Where climate science has genuine uncertainty vs echo chamber.",
  },
  {
    id: "supply-chain-qa", name: "Lab Convergence Monitor", status: "idea",
    summary: "Cross-lab measurement agreement tracking",
    markets: ["Supply Chain"],
    arr: "$0", users: "0", stage: "Idea",
    detail: "GAP: Labs as measurers, product properties as targets. Detects calibration drift before QA failures.",
  },
];
