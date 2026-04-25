# Canvas patch 1 — Two-tier measurement

*Drop-in addition to `canvas-architecture-design.md`. Insert as a new subsection under §6 (Phenomenological Canvas), between the existing Lensing Strain specification and the Event Horizon transition specification, or as a fresh §6.x. Cross-reference from §3 (convergence statuses) and from the patent-FTO synthesis document at `notes/synthesis/patent-fto/patent-fto-protocol.md`.*

---

## §6.x Two-tier measurement (binary primary + conditional continuous secondary)

Some domains the framework operates in admit strict-rule boundaries that no continuous-distance measurement can capture. The clearest example is patent law, where anticipation under EPC Art. 54 / 35 USC §102 is an all-elements boolean test — a reference either discloses every element of a claim or it does not, and a 0.001 cosine distance plus one missing element is still no anticipation. Similar strict-rule boundaries appear in regulatory thresholds (clinical eligibility cutoffs, contamination limits, statistical-significance gates), in materials phase transitions (a system either crosses the order-parameter discontinuity or it does not), and in compliance audits (a system either satisfies a standard's mandatory clause or it fails certification).

The framework already has the right primitive for these strict-rule boundaries: structural absence. A claim element is either disclosed in a reference or it is absent, the same way a photon has no clock entry. Absence is the verdict, not a missing data point.

Strict-rule domains nevertheless admit continuous secondary tests that examine *near-miss* cases. Patent law's obviousness rejection under EPC Art. 56 / 35 USC §103 asks whether the absent element has a functional equivalent in the cited reference. Regulatory frameworks often ask whether a borderline case is "substantially equivalent" to a passing case. Materials applications ask how close a system is to a transition. The continuous test is not a relaxation of the boolean primary test; it is a separate test with its own threshold and its own legal or scientific consequences.

The architecture handles this through strict two-tier measurement. **Tier 1** is the boolean structural-absence test, rendered through the framework's existing convergence-status vocabulary (●/◐/◆/◈) on a property whose values are constrained to 0.0 or 1.0. **Tier 2** is a continuous test on a separate property, triggered automatically on every entry that converges absent on Tier 1. The Tier 2 property has its own threshold (defaulting to 0.6 for patent obviousness; domain-specific elsewhere) and its own convergence vocabulary.

The verdict aggregation reports both tiers separately. A target is verdict-clean iff every Tier 1 entry converges absent AND every triggered Tier 2 entry converges below threshold. A target is verdict-failed iff any Tier 1 entry converges present (the strict-rule failure) OR any triggered Tier 2 entry converges above threshold (the near-miss failure). A target is at ◐ tension if any Tier 1 or Tier 2 entry sits in the disagreement band.

Two architectural notes. First, the trigger logic — Tier 2 fires only on Tier 1 absence — preserves the strict-rule primacy. A Tier 2 score has no meaning unless Tier 1 has already cleared the strict-rule check; reporting the two together would conflate distinct legal or scientific tests. Second, the substrate-overlap discipline applies to both tiers identically. Cross-substrate convergence on Tier 2 is required to render a Tier 2 verdict, the same way it is required for Tier 1.

The patent-FTO workspace is the first concrete instantiation of this pattern in the framework's current operating set. The pattern itself is general; subsequent strict-rule domains (regulatory compliance audits, eligibility-gated clinical scoring, certification testing) inherit the architecture without modification.
