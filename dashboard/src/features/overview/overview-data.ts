/* Static content for the Research Overview page. */

export interface BasicItem {
  id: string;
  title: string;
  group: string;
  summary: string;
  html: string;
}

export interface SchemaItem {
  id: string;
  title: string;
  group: string;
  summary: string;
  svg: string;
}

// ── Foundations ───────────────────────────────────────────────────────

export const BASICS: BasicItem[] = [
  { id: "why", title: "Why", group: "Foundations",
    summary: "Why Plyknot Exists",
    html: `<p>Every scientific field produces measurements that disagree. The Hubble constant ranges from 67 to 74 km/s/Mpc. Radiologists disagree on 25% of chest X-ray labels. AlphaFold and ESMFold predict different structures for the same protein.</p>
<p>Yet there is <strong>no system</strong> that tracks where these disagreements are, how deep they go, or whether they share hidden causes. Plyknot is that system.</p>` },
  { id: "what", title: "What", group: "Foundations",
    summary: "What Plyknot Is",
    html: `<p>A <strong>computable epistemology framework</strong> that treats measurement disagreement as data, not noise.</p>
<p>An entity-component system where <em>structural absence</em> (no measurement exists) is distinct from zero. One codebase, zero dependencies, same <code>run_evaluation()</code> call across physics, biology, medical imaging, materials science, drug discovery, and text.</p>` },
  { id: "how", title: "How", group: "Foundations",
    summary: "How It Works",
    html: `<p><strong>1. Record:</strong> <code>measure()</code> for empirical observations, <code>predict()</code> for model outputs. Each creates a coupling.</p>
<p><strong>2. Analyze:</strong> Convergence, speciation, measurer correlation, echo chamber guard.</p>
<p><strong>3. Discover:</strong> Marker passing propagates cracks through the dependency graph, revealing cross-domain vulnerabilities.</p>` },
  { id: "when", title: "When", group: "Foundations",
    summary: "Timeline & Milestones",
    html: `<p><strong>2026 Q2:</strong> Patent filing, foundation tests, PyPI publication, flagship preprint</p>
<p><strong>2026 Q3:</strong> Hub deployment, Echo Chamber Map launch, bioRxiv</p>
<p><strong>2026 Q4:</strong> Discovery Factory operations, commercial products</p>
<p><strong>2027:</strong> Private hubs, enterprise customers</p>` },
  { id: "ecs", title: "ECS Architecture", group: "Foundations",
    summary: "Entity-Component-System: sparse Maps where absence = non-existence",
    html: `<p>Entities are bare integer IDs. Properties are entries in typed Maps. If an entity has no entry in the mass Map, it has <strong>no mass</strong> &mdash; not zero mass. The gravity system iterates over the mass Map; a photon is invisible to gravity because it is not there.</p>
<p>The technique is old (game engines, Lattice QCD, LAMMPS); the interpretation &mdash; structural absence in the data structure corresponds to structural absence in physics &mdash; is new.</p>` },
  { id: "three-tiers", title: "Three Tiers", group: "Foundations",
    summary: "Coupling Map + Inference Graph + Registry",
    html: `<p><strong>Coupling Map:</strong> stores values (numbers produced by instruments, compared for convergence).</p>
<p><strong>Inference Graph:</strong> stores <code>depends</code> (operational chain from signal to value &mdash; integer IDs, no strings).</p>
<p><strong>Registry / Phone Book:</strong> stores labels (human-readable names, translations). The core never reads the registry. Ontology enters the core only when someone turns a concept into a prediction.</p>` },
  { id: "ontological-load", title: "Ontological Load", group: "Foundations",
    summary: "The degree to which the brain constructs the measured object",
    html: `<p>A photon detector is one step from signal to value &mdash; low ontological load. A clinical trial involves protocols, interpretive committees, statistical corrections &mdash; high ontological load. A democracy survey measures something that exists almost entirely in the brain &mdash; maximum load.</p>
<p>Ontological load increases along both the inference level axis (signal&rarr;hypothesis) and the complexity level axis (particles&rarr;social). The convergence map makes this gradient visible.</p>` },
  { id: "vocab-partition", title: "Vocabulary Partition", group: "Foundations",
    summary: "Operational vs. theoretical: only mechanisms in depends[]",
    html: `<p>The <code>depends</code> array may only reference <strong>operational mechanisms</strong> &mdash; physical processes, instrument designs, computational steps. Theoretical commitments (dark matter, isotropic universe) are excluded. This is enforced at runtime: <code>TheoreticalPartitionError</code> fires if a non-operational identifier enters <code>depends</code>.</p>
<p>Theories are registry labels whose prediction pipelines produce coupling entries. They do not touch the inference graph.</p>` },
  { id: "graph-event", title: "GraphEvent", group: "Foundations",
    summary: "Append-only event log for every change",
    html: `<p>Every mutation to the graph &mdash; new entity, new coupling, status change, dependency edit &mdash; is recorded as an immutable <code>GraphEvent</code> with timestamp, actor, and before/after state. The log is append-only; nothing is deleted.</p>
<p>This gives full reproducibility: any past state can be reconstructed from the event stream.</p>` },
];

// ── Verbs ────────────────────────────────────────────────────────────

export const VERBS: BasicItem[] = [
  { id: "verb-measure", title: "measure()", group: "Verbs",
    summary: "Record an empirical observation",
    html: `<p><code>measure(measurer, entity, property, value)</code></p>
<p>The foundational verb. Records what an instrument, lab, or human observer actually saw. A measurement is a fact &mdash; a physical interaction between an instrument and a target. Multiple measurers on the same target drives convergence detection.</p>` },
  { id: "verb-predict", title: "predict()", group: "Verbs",
    summary: "Record a model prediction",
    html: `<p><code>predict(pipeline, entity, property, value)</code></p>
<p>Structurally identical to <code>measure()</code> but tagged as prediction. A prediction is a <em>claim about what a measurement would produce</em>. When measure and predict disagree, it reveals where theory and observation diverge. Predictions share training data more often than measurements share instruments &mdash; echo chamber guard weighs them differently.</p>` },
  { id: "verb-describe", title: "describe()", group: "Verbs",
    summary: "Render entity across all measurers",
    html: `<p><code>describe(entity) &rarr; DescribeResult</code></p>
<p>Two independent channels: <strong>predicate frequency</strong> (what verbs/relations appear, sensory vs cognitive) and <strong>embedding distance</strong> (vector space position). Returns convergence status across channels. The holographic view: the entity IS its convergence pattern.</p>` },
  { id: "verb-lens", title: "lens()", group: "Verbs",
    summary: "Read target through another frame",
    html: `<p><code>lens(target, frame) &rarr; LensReading</code></p>
<p>Extracts target's predicates twice &mdash; once free, once conditioned on frame's predicate signature. Returns <strong>strain</strong> (mean intensity delta), <strong>lensed predicates</strong>, and <strong>residue</strong> (what frame couldn't reach). Unifies shear detection, grounded extraction, measurer correlation, and prior-art comparison. Residue becomes a first-class definition of novelty.</p>` },
  { id: "verb-act", title: "act()", group: "Verbs",
    summary: "Reflexive action in cybernetic domains",
    html: `<p><code>act(agent, target, intervention)</code></p>
<p>For reflexive domains where measurement changes the measured. When a trading model acts on a prediction, the market shifts. The act() verb couples the intervention back into the measurement graph so drift, decay, and loop-gain become computable. Uses bitemporal event log and sigma-propagation. Patent-protected, Solarplexor AB.</p>` },
];

// ── Core Primitives ──────────────────────────────────────────────────

export const CONCEPTS: BasicItem[] = [
  { id: "concept-coupling", title: "Coupling", group: "Core Primitives",
    summary: "The atomic unit: (measurer, entity, property, value)",
    html: `<p>A <strong>CouplingEntry</strong> records: which two entities interacted, what property was measured, the value, the method, sigma (uncertainty), source tag (<code>measure</code> or <code>predict</code>), inputs consumed, and timestamp. Everything in Plyknot is computed from couplings.</p>
<p>Key design: absence of a coupling is meaningful &mdash; structural absence, not zero.</p>` },
  { id: "concept-convergence", title: "Convergence", group: "Core Primitives",
    summary: "Independent measurements agree (or disagree)",
    html: `<p>Computed via sigma-tension between measurement distributions. Four states:</p>
<ul><li><strong>Converged</strong> (&bull;) &mdash; independent methods agree within threshold</li>
<li><strong>Tension</strong> (&frac12;) &mdash; borderline, needs more data</li>
<li><strong>Divergent</strong> (&cir;) &mdash; significant disagreement &mdash; a crack</li>
<li><strong>Single</strong> (&compfn;) &mdash; only one measurer, underdetermined</li></ul>` },
  { id: "concept-crack", title: "Crack", group: "Core Primitives",
    summary: "A point of systematic divergence",
    html: `<p>A divergent coupling &mdash; where measurements systematically disagree. Cracks are not bugs; they are the most valuable signals in the system. They reveal where assumptions break, where instruments fail, or where nature has structure that current theory misses. The crack IS the opportunity for discovery.</p>` },
  { id: "concept-structural-absence", title: "Structural Absence", group: "Core Primitives",
    summary: "Missing data is meaningful, not zero",
    html: `<p>If a property has not been measured, it does not exist &mdash; fundamentally different from zero. A CRISPR knockout (gene removed entirely) triggers compensation; RNAi knockdown (gene reduced) does not. Same gene, two categories, two biological consequences. The framework distinguishes them natively.</p>` },
  { id: "concept-inference-levels", title: "Inference Levels", group: "Core Primitives",
    summary: "Signal &rarr; Measurement &rarr; Pattern &rarr; Model &rarr; Hypothesis",
    html: `<p>The vertical axis of the convergence landscape &mdash; how far from raw signal to claim:</p>
<ul><li><strong>Signal:</strong> raw detector output, single observation</li>
<li><strong>Measurement:</strong> calibrated, repeated, with uncertainty</li>
<li><strong>Pattern:</strong> regularity across measurements</li>
<li><strong>Model:</strong> mathematical structure explaining patterns</li>
<li><strong>Hypothesis:</strong> untested prediction from a model</li></ul>
<p>Each level has higher ontological load than the one below it.</p>` },
  { id: "concept-inference-chain", title: "Inference Chain", group: "Core Primitives",
    summary: "Ordered sequence of steps from signal to hypothesis for one entity",
    html: `<p>An <code>InferenceChain</code> tracks a measurement path through all five levels for a single target entity. Each step has a claim, convergence status, sigma tension, and operational dependencies. <code>chain_health()</code> reports the weakest level and worst convergence.</p>
<p>Example: the electron chain runs from cathode ray signal through e/m measurement through QED pattern through Standard Model to grand unification hypothesis.</p>` },
  { id: "concept-depends", title: "Operational Dependencies", group: "Core Primitives",
    summary: "Integer IDs recording what mechanisms an instrument embodies",
    html: `<p>The <code>depends</code> array on each inference step lists the physical/computational mechanisms the instrument traverses to produce its value. Dependencies are <strong>integer IDs</strong> from the registry &mdash; no human language in the core.</p>
<p>This is the substrate for marker passing: when two instruments share a dependency and one cracks, the other is marked vulnerable. Dependencies must be operational (enforced by <code>TheoreticalPartitionError</code>).</p>` },
  { id: "concept-property-def", title: "PropertyDefinition", group: "Core Primitives",
    summary: "Registration of a measurable property with thresholds and envelope",
    html: `<p>Before measurements can be compared, the property must be registered with <code>register_property()</code> specifying: name, unit, convergence thresholds, envelope type (symmetric MAD), and whether the property is circular/self-referential.</p>
<p>Circular properties (where the measurement influences the thing measured) get special treatment in convergence calculations.</p>` },

  // ── Detection ──────────────────────────────────────────────────────
  { id: "concept-echo-chamber", title: "Echo Chamber", group: "Detection",
    summary: "False consensus from shared sources",
    html: `<p>Multiple measurers appear independent but share training data, assumptions, or operational dependencies. Their agreement is not evidence &mdash; it's circular validation. Detected by analyzing the operational dependency graph: if measurers share upstream sources, their convergence is discounted.</p>
<p>Pattern: if all predictions agree but no measurement confirms, that's consensus not convergence &mdash; flagged as unsupported.</p>` },
  { id: "concept-speciation", title: "Speciation", group: "Detection",
    summary: "Hidden sub-populations in data",
    html: `<p>An (entity, property) pair appears divergent but actually contains distinct sub-populations. Detected via Gaussian Mixture Models with BIC (Bayesian Information Criterion) to guard against overfitting. Guards: <code>min_component_size</code>, <code>min_delta_bic</code>, <code>max_components</code>.</p>
<p>Example: CDK2 kinase has 4 distinct DFG conformational states. Without speciation detection, this looks like noise. With it, you recover the biology.</p>` },
  { id: "concept-measurer-correlation", title: "Measurer Correlation", group: "Detection",
    summary: "Systematic crack or opening patterns across a measurer's outputs",
    html: `<p>Analyzes whether a measurer is divergent across multiple properties (<strong>systemic crack</strong> &mdash; framework failure) or converging across multiple properties (<strong>systemic opening</strong> &mdash; reliable instrument).</p>
<p>Example: if ΛCDM predictions crack on H₀, S₈, and dipole amplitude, that's systemic &mdash; it's the framework, not one measurement.</p>` },
  { id: "concept-blind-spots", title: "Blind Spots", group: "Detection",
    summary: "Properties with no measurement or prediction",
    html: `<p><code>find_blind_spots()</code> identifies entities or properties for which no coupling entry exists &mdash; structural absence at the knowledge level. These are the true unknowns: not disputed, not wrong, just unmeasured.</p>` },
  { id: "concept-validation-coverage", title: "Validation Coverage", group: "Detection",
    summary: "Detect asymmetric confirmation",
    html: `<p><code>check_validation_coverage()</code> flags when a property is validated from only one direction or one measurer type. If all your evidence comes from the same kind of instrument, you don't have convergence &mdash; you have repetition. Raises <code>AsymmetricValidationWarning</code>.</p>` },
  { id: "concept-trust-weights", title: "Trust Weights", group: "Detection",
    summary: "Calibration scores for measurers based on track record",
    html: `<p>Each measurer accumulates a <code>TrustWeight</code> reflecting how often its entries land within convergence envelopes. Aggregated across time and properties via <code>aggregate_trust_weights()</code>. Not a prior &mdash; earned from data. A <code>MeasurerProfile</code> summarizes the full history.</p>` },

  // ── Discovery ──────────────────────────────────────────────────────
  { id: "concept-marker-passing", title: "Marker Passing", group: "Discovery",
    summary: "Propagate cracks through the dependency graph",
    html: `<p>Takes a crack in one domain and propagates it through the operational dependency graph. If two domains share an assumption (e.g., both use the same DFT functional), a crack in one marks the other as vulnerable.</p>
<p>Recovers the cosmological principle blind from 1,271 entries with zero false positives. Identifies ΛCDM as a three-property failure from data alone.</p>` },
  { id: "concept-crack-connections", title: "Crack-Connections", group: "Discovery",
    summary: "Shared dependencies where two cracked steps collide",
    html: `<p>When marker passing finds two divergent inference steps sharing a dependency, that's a <strong>crack-connection</strong> &mdash; a signal of shared operational vulnerability. The dependency itself may be the root cause.</p>
<p>This is how Plyknot discovers that a problem in cosmology is structurally connected to a problem in materials science.</p>` },
  { id: "concept-openings", title: "Openings", group: "Discovery",
    summary: "Shared dependencies where converged steps collide",
    html: `<p>When two solid/converged inference steps share a dependency, that's an <strong>opening</strong> &mdash; a potential unification opportunity. The shared mechanism works in both domains. Penning trap identified as a two-property opening from data alone.</p>` },
  { id: "concept-structural-holes", title: "Structural Holes", group: "Discovery",
    summary: "Missing dependency links that should exist",
    html: `<p><code>find_structural_holes()</code> identifies places in the dependency graph where a connection is expected (based on domain structure) but absent. These are research opportunities &mdash; experiments that would close a gap in the inference chain.</p>` },
  { id: "concept-prediction-provenance", title: "Prediction Provenance", group: "Discovery",
    summary: "Which measurements did a prediction pipeline consume?",
    html: `<p>Distinct from operational dependencies: provenance tracks <strong>actual data flow</strong> (which measurement entries a prediction pipeline consumed as inputs), not assumed mechanisms. If a pipeline consumed cracked data, its predictions inherit that vulnerability.</p>` },

  // ── Advanced ───────────────────────────────────────────────────────
  { id: "concept-hologram", title: "Holographic Coupling", group: "Advanced",
    summary: "An entity IS its convergence pattern",
    html: `<p>An entity is not a thing with properties &mdash; it IS the convergence pattern across substrate-independent measurers. There is no "true value" behind the measurements. This unifies five existing primitives: phenomenological mass, operational triangulation, event horizon, fission, and lensing.</p>
<p>Naming the principle gives a single test for future architectural proposals: does this addition preserve the identity between entity and convergence pattern?</p>` },
  { id: "concept-emergence", title: "Emergence", group: "Advanced",
    summary: "The dual of structural absence: new properties appear at composite levels",
    html: `<p>When atomic entities combine into a molecule, the composite gains entries &mdash; surface tension, polarity, boiling point &mdash; that are structurally absent from every constituent. The entries did not become nonzero; they came into existence.</p>
<p>The coupling map measures emergence: if a composite property has both a measurement and a cross-level prediction, <strong>convergence = reducible</strong>, <strong>divergence = irreducible</strong> at the current state of knowledge.</p>` },
  { id: "concept-construct-validity", title: "Construct Validity", group: "Advanced",
    summary: "Does an instrument measure what it claims to measure?",
    html: `<p>Applies identically to physical instruments, embedding models, clinical methods, and LLMs. In Plyknot, construct validity is not assumed &mdash; it is <em>measured</em> by comparing the instrument's outputs against independent instruments on the same target. Embedding models used for grounding are themselves measurement instruments subject to convergence testing.</p>` },
  { id: "concept-complexity-levels", title: "Complexity Levels", group: "Advanced",
    summary: "L0 fundamental &rarr; L5 social: measurer complexity scale",
    html: `<p>Six levels describing operational complexity of what's being measured:</p>
<ul><li><strong>L0:</strong> Fundamental (particles, forces)</li>
<li><strong>L1:</strong> Nuclear/atomic (bound states)</li>
<li><strong>L2:</strong> Molecular/chemical (bonds, reactions)</li>
<li><strong>L3:</strong> Cellular/biological (selection, replication)</li>
<li><strong>L4:</strong> Organismal (development, behavior)</li>
<li><strong>L5:</strong> Social (language, institutions)</li></ul>
<p>A photon detector is L0. A clinical trial is L3-L4. A democracy survey is L5.</p>` },

  // ── Language Interface ─────────────────────────────────────────────
  { id: "concept-grounding", title: "Grounding", group: "Language Interface",
    summary: "Embedding-based mapping from natural language to integer entity IDs",
    html: `<p>A sentence-transformer embeds both the query term and all registry labels into the same vector space; cosine similarity returns ranked candidate entity IDs. The word "well-being" does not IS entity #47 &mdash; it MATCHES entities #47 (cortisol-based, 0.92), #128 (self-reported, 0.78), #203 (economic, 0.65).</p>
<p>The mapping is a query, not a definition &mdash; probabilistic, ranked, disposable. Inverts the Symbol Grounding Problem: grounding is a measurement, not a representational achievement.</p>` },
  { id: "concept-phone-book", title: "Phone Book", group: "Language Interface",
    summary: "Human-readable lookup layer for integer entities",
    html: `<p>Maps string labels (names, aliases, translations) to integer entity IDs. Entries include aliases with provenance tracking. <code>resolve()</code> returns ranked candidates. The core never reads the phone book &mdash; it is a rendering layer for humans and agents.</p>` },
  { id: "concept-signifier-resolution", title: "Signifier Resolution", group: "Language Interface",
    summary: "Recording which phrase maps to which entity &mdash; as a measurement",
    html: `<p>A resolution event (grounder maps phrase &Phi; to entity set with similarity scores at time T) is itself a coupling entry. Multi-resolver agreement, longitudinal drift, and speciation of an overloaded phrase into distinct senses are computed by the existing convergence machinery.</p>` },
  { id: "concept-canonicalization", title: "Canonicalization", group: "Language Interface",
    summary: "Preventing tokenizer-induced duplicates via three-gate fusion",
    html: `<p>Three checks before fusing two signifiers: <strong>string proximity</strong> (edit distance), <strong>coupling identity</strong> (do they have identical measurement patterns?), and <strong>source context</strong> (did they originate from the same extraction?). Prevents "aspirin" and "Aspirin" from registering as distinct entities.</p>` },
  { id: "concept-common-ground", title: "Common Ground", group: "Language Interface",
    summary: "Coupling-map summary provided to extraction steps for disambiguation",
    html: `<p>Before extracting measurements from a new source, the framework compiles a <code>CommonGround</code> summary: what's already known about the concept (measurements, convergence status, depth, related entities). This anchors extraction against existing knowledge, preventing the extractor from inventing disconnected entities.</p>` },

  // ── Measurement Pipelines ──────────────────────────────────────────
  { id: "concept-describe-pipeline", title: "Describe Pipeline", group: "Measurement Pipelines",
    summary: "Text &rarr; coupling entries via two independent channels",
    html: `<p>Converts free text into structured coupling entries through two channels: <strong>predicate frequency</strong> (what verbs/relations appear, classified as sensory or cognitive) and <strong>embedding distance</strong> (vector space position relative to anchors). Cross-channel convergence validates the extraction.</p>` },
  { id: "concept-predicate-extraction", title: "Predicate Extraction", group: "Measurement Pipelines",
    summary: "Sensory vs cognitive predicates from text",
    html: `<p>Classifies predicates in text as <strong>sensory</strong> (see, observe, detect, measure) or <strong>cognitive</strong> (think, believe, infer, hypothesize). The ratio reveals ontological load: physics papers are sensory-heavy; philosophy papers are cognitive-heavy. This is a measurable signal, not a subjective judgment.</p>` },
  { id: "concept-guided-extraction", title: "Guided Extraction (CFG)", group: "Measurement Pipelines",
    summary: "Classifier-free guidance for information extraction",
    html: `<p>Extracts predicates twice &mdash; <strong>unconditioned</strong> (text alone) and <strong>conditioned</strong> (text + Common Ground anchors) &mdash; then blends with a guidance scale. The delta between conditioned and unconditioned reveals <strong>ontological noise</strong>: concepts that appear only because the extractor expected them, not because the text contains them.</p>
<p>Denoising loop iterates until convergence. Anchors for extraction N+1 come from extraction N (self-conditioning).</p>` },
  { id: "concept-concept-distance", title: "Concept Distance", group: "Measurement Pipelines",
    summary: "Decomposed distance between two texts' usage of a concept",
    html: `<p><code>compare_concepts()</code> returns not a scalar but a <strong>decomposed distance report</strong>: which dimensions diverge (mechanism, efficacy, scope), with claim-level evidence and sentence-level citations. Identifies WHERE concepts differ, not just that they differ.</p>` },
  { id: "concept-substrate", title: "Substrate Independence", group: "Measurement Pipelines",
    summary: "Do different LLM tokenizers produce equivalent decompositions?",
    html: `<p>Tests whether two LLM tokenizer architectures produce structurally equivalent predicate extractions. Classifies tokenizer families (Anthropic, OpenAI, Google) and computes <code>substrate_independence_pair()</code>. Satellite 6 finding: tokenizer architecture (not training data) is the operative mechanism.</p>` },

  // ── Canvases ───────────────────────────────────────────────────────
  { id: "concept-canvas-phenom", title: "Phenomenological Canvas", group: "Canvases",
    summary: "What entities and properties exist (measurement-derived space)",
    html: `<p>Projects the coupling map onto a geometric space where entities are positioned based on their measurement patterns. Topology is emergent &mdash; no prior ontological declaration. Two entities close in this space have similar measurement profiles across instruments.</p>` },
  { id: "concept-canvas-operational", title: "Operational Canvas", group: "Canvases",
    summary: "What instruments and mechanisms are involved",
    html: `<p>Projects the dependency graph: which instruments share mechanisms, which form independent validation paths. The operational canvas is the <strong>dependency firewall</strong> &mdash; it shows whether apparent convergence comes from truly independent sources or from shared operational assumptions.</p>` },
  { id: "concept-canvas-epistemic", title: "Epistemic Canvas", group: "Canvases",
    summary: "High-level concepts at the Event Horizon boundary",
    html: `<p>Level 5 concepts (democracy, well-being, consciousness) exist almost entirely in the brain, not in detectors. The Epistemic Canvas traps them inside the <strong>Event Horizon</strong> &mdash; the boundary of what's computable from empirical couplings. They can be discussed, but they cannot cross into computation without being decomposed into measurable components.</p>` },

  // ── Monitors ───────────────────────────────────────────────────────
  { id: "concept-monitor-horizon", title: "Event Horizon Monitor", group: "Monitors",
    summary: "Detects when a Level 5 concept accumulates enough physical couplings",
    html: `<p><code>check_event_horizon()</code> watches for concepts that were purely epistemic (Level 5, linguistic-only) but have accumulated enough independent physical couplings to cross into Levels 0-4. This is concept promotion &mdash; a previously vague notion becoming empirically grounded. Records a <code>TransitionDetected</code> event.</p>` },
  { id: "concept-monitor-shear", title: "Shear Monitor", group: "Monitors",
    summary: "Detects divergence between phenomenological and epistemic canvases",
    html: `<p><code>check_shear()</code> detects when an entity is understood differently by measurement (phenomenological canvas) vs. theory (epistemic canvas). Shear can signal legitimate scientific progress (the theory is advancing beyond current measurements) or transducer degradation (instruments are drifting). Validated in Test 4d (bidirectional same-construct anchors).</p>` },
  { id: "concept-monitor-fission-fusion", title: "Fission / Fusion Monitor", group: "Monitors",
    summary: "Detects speciation splits (fission) or merges (fusion)",
    html: `<p><code>check_fission_fusion()</code> monitors BIC scores for speciation. <strong>Fission:</strong> &Delta;BIC &ge; 10 signals a concept splitting into sub-populations (like CDK2's conformational states). <strong>Fusion:</strong> lobe count decrease signals previously distinct concepts merging. Validated in Experiment D (Hubble constant fusion detection).</p>` },

  // ── Autonomous Systems ─────────────────────────────────────────────
  { id: "concept-agent-roles", title: "Agent Roles", group: "Autonomous Systems",
    summary: "Proposer, Critic, Judge, Planner, Extractor",
    html: `<p>Five specialized agents operate on the coupling map:</p>
<ul><li><strong>Extractor:</strong> reads sources, produces coupling entries</li>
<li><strong>Proposer:</strong> generates hypotheses from cracks</li>
<li><strong>Critic:</strong> challenges hypotheses against the coupling map</li>
<li><strong>Planner:</strong> designs experiments to resolve disagreements</li>
<li><strong>Judge / Archivist:</strong> records results, updates convergence state</li></ul>
<p>All agents are registry entities subject to the same convergence rules as measurements.</p>` },
  { id: "concept-structural-query", title: "Structural Query", group: "Autonomous Systems",
    summary: "Compile a disagreement into a query against the coupling map",
    html: `<p>When Proposer and Critic disagree, the disagreement is compiled into a <code>StructuralQuery</code> that runs against the coupling map. Three outcomes: <strong>resolved</strong> (data exists), <strong>resolvable</strong> (an experiment could settle it), or <strong>research gap</strong> (no path to resolution with current instruments).</p>` },
  { id: "concept-critic-ensemble", title: "Critic Ensemble", group: "Autonomous Systems",
    summary: "Multiple critics with diverse profiles &mdash; disagreement preserved",
    html: `<p><code>evaluate_with_ensemble()</code> runs a proposal through multiple critics with different cognitive-variance profiles. Disagreement between critics is <strong>preserved as an ambiguity marker</strong>, not resolved by vote. If critics disagree, that IS the finding &mdash; it maps to the same convergence logic as disagreeing instruments.</p>` },
  { id: "concept-research-gap", title: "Research Gap", group: "Autonomous Systems",
    summary: "Insufficient data to resolve a disagreement &mdash; triggers experiment planning",
    html: `<p>A <code>ResearchGap</code> is the structural query outcome indicating no path to resolution with current coupling-map data. It triggers the Planner agent to design an experiment that would produce the missing measurements. The gap itself becomes a tracked entity in the coupling map.</p>` },
];

// ── Articles ─────────────────────────────────────────────────────────

export interface ArticleFile {
  id: string;
  title: string;
  group: string;
  status: string;
  summary: string;
  /** Relative path under research/ for fetching via Vite dev server */
  filePath: string;
}

export const ARTICLES: ArticleFile[] = [
  {
    id: "article-popular-v2", title: "Popular Science Article (v2)", group: "Articles", status: "Draft",
    summary: "Science Has No Way to Track Where Its Measurements Disagree. We Built One.",
    filePath: "docs/articles/popular-science-article-v2.md",
  },
  {
    id: "article-popular-v1", title: "Popular Science Article (v1)", group: "Articles", status: "Archive",
    summary: "Earlier draft of the popular science positioning piece.",
    filePath: "docs/articles/popular-science-article.md",
  },
];
