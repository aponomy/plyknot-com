export interface Market {
  id: string;
  name: string;
  status: "active" | "exploring" | "planned";
  size: string;
  manager: string;
  products: string[];
  summary: string;
  strategy: string;
  actions: string[];
}

export const MARKETS: Market[] = [
  {
    id: "pharma", name: "Pharma", status: "active",
    size: "$1.5T industry", manager: "Vacant",
    products: ["Echo Chamber Map", "Drug Target Validator"],
    summary: "Drug target validation, compound prioritization, binding affinity verification",
    strategy: "Enter via computational chemistry leads at top-20 pharma. Echo Chamber Map as free hook, upsell to private hubs.",
    actions: ["Identify 5 pharma comp chem leads", "Build AlphaFold echo chamber demo", "Prepare binding affinity case study"],
  },
  {
    id: "medical-ai", name: "Medical AI", status: "active",
    size: "$20B by 2028", manager: "Vacant",
    products: ["Echo Chamber Map", "AI Act Compliance Kit"],
    summary: "Model reliability audits, EU AI Act compliance, ground truth validation",
    strategy: "EU AI Act enforcement (Aug 2, 2026) creates urgent demand. CXR evaluator as proof-of-concept.",
    actions: ["Package CXR findings as compliance demo", "Map EU AI Act requirements to Plyknot", "Target 3 medical device companies"],
  },
  {
    id: "materials", name: "Materials Science", status: "active",
    size: "$5B computational", manager: "Vacant",
    products: ["Echo Chamber Map", "DFT Cross-Check"],
    summary: "DFT convergence tracking, experimental-computational echo chamber detection",
    strategy: "Satellite 3 data (70.5% DFT rejection rate) is the hook. Target national labs and materials databases.",
    actions: ["Publish Satellite 3 preprint", "Contact Materials Project team", "Demo DFT divergence dashboard"],
  },
  {
    id: "biotech", name: "Biotech", status: "active",
    size: "$600B industry", manager: "Vacant",
    products: ["Echo Chamber Map"],
    summary: "Protein structure reliability, AlphaFold validation, conformational analysis",
    strategy: "Satellite 4 findings (754 echo chambers) are compelling. Target structural biology labs.",
    actions: ["Package AlphaFold findings", "Demo speciation for CDK2", "Target 3 biotech structural biology teams"],
  },
  {
    id: "finance", name: "Finance", status: "exploring",
    size: "$30B fintech analytics", manager: "Vacant",
    products: ["Plyknot Cybernetics", "Predictor Decay Monitor"],
    summary: "Reflexive-drift detection, predictor decay monitoring, quant model validation",
    strategy: "McLean-Pontiff thesis validates approach. High-margin, long sales cycle. Need quant team partnership.",
    actions: ["Complete DCOI test on McLean-Pontiff", "Build predictor decay demo", "Identify 3 quant fund contacts"],
  },
  {
    id: "regulatory", name: "Regulatory & Compliance", status: "exploring",
    size: "$15B GRC market", manager: "Vacant",
    products: ["AI Act Compliance Kit", "Cybernetics"],
    summary: "AI model compliance, regulatory reporting, audit trail generation",
    strategy: "EU AI Act creates regulatory demand. Position as infrastructure for model validation, not a checklist.",
    actions: ["Map Article 9 to echo chamber detection", "Build compliance report template", "Target 3 consultancies"],
  },
  {
    id: "legal-ip", name: "Legal & IP", status: "active",
    size: "$800B legal services", manager: "Vacant",
    products: ["Patent FTO", "Concept Distance"],
    summary: "Patent prosecution, prior art analysis, claim comparison",
    strategy: "Patent FTO pipeline already working (Stage 1 complete). Target patent law firms and in-house IP teams.",
    actions: ["Run 10 more FTO smoke tests", "Package demo for attorneys", "Price at $5-15K per analysis"],
  },
  {
    id: "media", name: "Media & Journalism", status: "planned",
    size: "$180B media", manager: "Vacant",
    products: ["News Value"],
    summary: "News significance scoring, information echo chamber detection",
    strategy: "API-based, target news orgs and fact-checking outfits. Low-cost entry.",
    actions: ["Build news scoring API", "Demo on 100 recent stories", "Contact 3 fact-checking orgs"],
  },
  {
    id: "academic", name: "Academic Publishing", status: "planned",
    size: "$28B publishing", manager: "Vacant",
    products: ["Replication Risk Score"],
    summary: "Replication risk scoring, citation echo chamber detection",
    strategy: "Target journal editors and funding agencies. Natural extension of core framework.",
    actions: ["Build scoring prototype", "Validate against known replication failures", "Contact 2 editors"],
  },
  {
    id: "text-nlp", name: "Text Analysis & NLP", status: "planned",
    size: "$40B NLP market", manager: "Vacant",
    products: ["Concept Distance"],
    summary: "Semantic comparison, translation QA, policy analysis",
    strategy: "Target legal teams, policy analysts, and translation firms.",
    actions: ["Build Concept Distance API", "Demo on legal contracts", "Target 3 legal tech companies"],
  },
  {
    id: "ai-ml", name: "AI / ML Infrastructure", status: "planned",
    size: "$50B MLOps", manager: "Vacant",
    products: ["Plyknot ML"],
    summary: "Transparent ML, model convergence tracking",
    strategy: "Long-term (12-18 mo). Position as 'ML that explains where predictions disagree with evidence.'",
    actions: ["Publish design document", "Build minimal prototype", "Present at ML meetup"],
  },
  {
    id: "defense", name: "Defense & Intelligence", status: "planned",
    size: "$100B+ analytics", manager: "Vacant",
    products: ["OSINT Convergence Map"],
    summary: "Cross-source intelligence validation, OSINT echo chamber detection",
    strategy: "Long procurement cycle. Need defense contractor partnership or government grant.",
    actions: ["Build OSINT demo on public sources", "Explore defense innovation programs"],
  },
  {
    id: "climate", name: "Climate Science", status: "planned",
    size: "$2B analytics", manager: "Vacant",
    products: ["GCM Divergence Tracker"],
    summary: "GCM divergence tracking, climate consensus validation",
    strategy: "Grant-funded market. Target climate research labs, not policymakers.",
    actions: ["Identify top 5 GCM datasets", "Build divergence prototype", "Contact 2 climate labs"],
  },
  {
    id: "education", name: "Education", status: "planned",
    size: "$7T industry", manager: "Vacant",
    products: ["Concept Distance"],
    summary: "Curriculum validation, textbook claim verification",
    strategy: "Low-margin, high-volume. Target educational publishers and curriculum boards.",
    actions: ["Build textbook claim checker", "Demo on 10 misconceptions", "Contact 1 publisher"],
  },
  {
    id: "supply-chain", name: "Supply Chain QA", status: "planned",
    size: "$15B quality mgmt", manager: "Vacant",
    products: ["Lab Convergence Monitor"],
    summary: "Cross-lab measurement agreement, calibration drift detection",
    strategy: "Target manufacturing with multi-lab QA. Detects systematic calibration drift.",
    actions: ["Identify 3 industries", "Build cross-lab demo", "Contact QA managers"],
  },
  {
    id: "insurance", name: "Insurance & Actuarial", status: "planned",
    size: "$6T industry", manager: "Vacant",
    products: ["Predictor Decay Monitor"],
    summary: "Actuarial model herding detection, risk model validation",
    strategy: "Detect when risk models herd. Target reinsurers and actuarial consultancies.",
    actions: ["Build model comparison demo", "Contact 2 reinsurers", "Explore Solvency II angle"],
  },
];
