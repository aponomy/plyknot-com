#!/usr/bin/env node
/**
 * PDB × AlphaFold ingestion pipeline.
 *
 * Downloads experimental structures from PDB, predicted structures from AlphaFold,
 * computes structural comparison metrics, and writes JSONL coupling entries +
 * entity entries to universe/data/ for the Hub to consume.
 *
 * Usage:
 *   npx tsx apps/hub/scripts/ingest-pdb.ts                    # default 100 proteins
 *   npx tsx apps/hub/scripts/ingest-pdb.ts --limit 10         # small test batch
 *   npx tsx apps/hub/scripts/ingest-pdb.ts --targets targets.txt  # custom list
 *
 * Output:
 *   universe/data/couplings/alphafold/batch-NNN.jsonl
 *   universe/data/entities/proteins.jsonl (appended)
 */

import { writeFileSync, appendFileSync, readFileSync, existsSync, mkdirSync } from 'node:fs';
import { resolve, join } from 'node:path';

// ── SDK imports ─────────────────────────────────────────────────────────────
import { searchRCSB, downloadPDBCif, downloadAlphaFoldCif } from '../../../packages/sdk/src/fetchers/index.js';
import { fetchSIFTSMapping, fallbackMapping } from '../../../packages/sdk/src/fetchers/sifts.js';
import { delay } from '../../../packages/sdk/src/fetchers/http.js';
import { parseMmCIF, extractResidues, isHoloStructure } from '../../../packages/sdk/src/parsers/index.js';
import { computeLDDT } from '../../../packages/sdk/src/comparison/lddt.js';
import { computeSidechainRMSD } from '../../../packages/sdk/src/comparison/rmsd.js';
import { computeQ3 } from '../../../packages/sdk/src/comparison/q3.js';
import { computeDisorderAgreement } from '../../../packages/sdk/src/comparison/disorder.js';
import { computeContactPrecision } from '../../../packages/sdk/src/comparison/contacts.js';
import { computeBindingSiteRMSD } from '../../../packages/sdk/src/comparison/binding-site.js';
import { buildAlignedPairs } from '../../../packages/sdk/src/comparison/align.js';
import type { ComparisonResult, ProteinPair } from '../../../packages/sdk/src/types.js';

// ── Config ──────────────────────────────────────────────────────────────────

const ROOT = resolve(process.cwd());
const OUT_DIR = join(ROOT, 'universe/data/couplings/alphafold');
const ENTITIES_FILE = join(ROOT, 'universe/data/entities/proteins.jsonl');
const RATE_LIMIT_MS = 250;

// Parse args
let LIMIT = 100;
let targetsFile = '';
for (let i = 2; i < process.argv.length; i++) {
  if (process.argv[i] === '--limit' && process.argv[i + 1]) LIMIT = parseInt(process.argv[++i]);
  if (process.argv[i] === '--targets' && process.argv[i + 1]) targetsFile = process.argv[++i];
}

// ── Drug target UniProt IDs ─────────────────────────────────────────────────
// 100 well-known drug targets — these are the proteins pharma cares about

const DRUG_TARGETS: ProteinPair[] = [
  // Kinases
  { uniprotId: 'P00533', pdbId: '', name: 'EGFR' },
  { uniprotId: 'P04637', pdbId: '', name: 'TP53' },
  { uniprotId: 'P01112', pdbId: '', name: 'KRAS' },
  { uniprotId: 'P06239', pdbId: '', name: 'LCK' },
  { uniprotId: 'P00519', pdbId: '', name: 'ABL1 (BCR-ABL)' },
  { uniprotId: 'P24941', pdbId: '', name: 'CDK2' },
  { uniprotId: 'P15056', pdbId: '', name: 'BRAF' },
  { uniprotId: 'Q16539', pdbId: '', name: 'MAPK14 (p38α)' },
  { uniprotId: 'P45983', pdbId: '', name: 'JNK1' },
  { uniprotId: 'Q13315', pdbId: '', name: 'ATM' },
  { uniprotId: 'P06493', pdbId: '', name: 'CDK1' },
  { uniprotId: 'P11362', pdbId: '', name: 'FGFR1' },
  { uniprotId: 'P35968', pdbId: '', name: 'VEGFR2 (KDR)' },
  { uniprotId: 'P08581', pdbId: '', name: 'MET' },
  { uniprotId: 'P04629', pdbId: '', name: 'NTRK1 (TrkA)' },
  // Proteases
  { uniprotId: 'P07339', pdbId: '', name: 'Cathepsin D' },
  { uniprotId: 'P07858', pdbId: '', name: 'Cathepsin B' },
  { uniprotId: 'P56817', pdbId: '', name: 'BACE1' },
  { uniprotId: 'P00760', pdbId: '', name: 'Trypsin (bovine)' },
  { uniprotId: 'P00766', pdbId: '', name: 'Chymotrypsinogen A' },
  // Apoptosis regulators
  { uniprotId: 'Q07820', pdbId: '', name: 'MCL-1' },
  { uniprotId: 'P10415', pdbId: '', name: 'BCL-2' },
  { uniprotId: 'Q07812', pdbId: '', name: 'BAX' },
  { uniprotId: 'O14727', pdbId: '', name: 'XIAP' },
  // GPCRs
  { uniprotId: 'P08172', pdbId: '', name: 'CHRM2 (M2 muscarinic)' },
  { uniprotId: 'P07550', pdbId: '', name: 'ADRB2 (β2-adrenergic)' },
  { uniprotId: 'P35372', pdbId: '', name: 'OPRM1 (μ-opioid)' },
  { uniprotId: 'P28223', pdbId: '', name: 'HTR2A (5-HT2A)' },
  { uniprotId: 'P21554', pdbId: '', name: 'CNR1 (CB1)' },
  // Nuclear receptors
  { uniprotId: 'P10275', pdbId: '', name: 'AR (androgen receptor)' },
  { uniprotId: 'P03372', pdbId: '', name: 'ESR1 (estrogen receptor α)' },
  { uniprotId: 'Q92731', pdbId: '', name: 'ESR2 (estrogen receptor β)' },
  { uniprotId: 'P37231', pdbId: '', name: 'PPARγ' },
  // Ion channels
  { uniprotId: 'P35499', pdbId: '', name: 'SCN4A (Nav1.4)' },
  { uniprotId: 'Q12809', pdbId: '', name: 'KCNH2 (hERG)' },
  // Enzymes
  { uniprotId: 'P27338', pdbId: '', name: 'MAO-B' },
  { uniprotId: 'P23219', pdbId: '', name: 'COX-1 (PTGS1)' },
  { uniprotId: 'P35354', pdbId: '', name: 'COX-2 (PTGS2)' },
  { uniprotId: 'O60885', pdbId: '', name: 'BRD4' },
  { uniprotId: 'P49841', pdbId: '', name: 'GSK3B' },
  // Immune targets
  { uniprotId: 'P01375', pdbId: '', name: 'TNFα' },
  { uniprotId: 'P05362', pdbId: '', name: 'ICAM-1' },
  { uniprotId: 'Q9NZQ7', pdbId: '', name: 'PD-L1 (CD274)' },
  // Viral
  { uniprotId: 'P04585', pdbId: '', name: 'HIV-1 protease (Pol)' },
  { uniprotId: 'P0DTD1', pdbId: '', name: 'SARS-CoV-2 Mpro (nsp5)' },
  // Other drug targets
  { uniprotId: 'P09211', pdbId: '', name: 'GSTP1' },
  { uniprotId: 'P00918', pdbId: '', name: 'CA-II (carbonic anhydrase)' },
  { uniprotId: 'P16050', pdbId: '', name: '15-LOX' },
  { uniprotId: 'P07900', pdbId: '', name: 'HSP90α' },
  { uniprotId: 'P10636', pdbId: '', name: 'MAPT (Tau)' },
];

// ── Property IDs (integer concept identifiers) ─────────────────────────────

const PROP = {
  BACKBONE_LDDT: '200',
  SIDECHAIN_ACCURACY: '201',
  DISORDER_AGREEMENT: '202',
  SECONDARY_STRUCT: '203',
  CONTACT_PRECISION: '204',
  BINDING_SITE: '205',
  RESOLUTION: '206',
  N_RESIDUES: '207',
} as const;

// ── Entity ID allocator ─────────────────────────────────────────────────────

let nextEntityId = 1000; // Start above existing entities (0-999 reserved)
const entityMap = new Map<string, number>(); // key → entityId

function getOrCreateEntity(key: string, name: string, tags: string[]): number {
  if (entityMap.has(key)) return entityMap.get(key)!;
  const id = nextEntityId++;
  entityMap.set(key, id);
  newEntities.push({ id, name, tags });
  return id;
}

const newEntities: Array<{ id: number; name: string; tags: string[] }> = [];

// ── Main pipeline ───────────────────────────────────────────────────────────

interface CouplingEntry {
  entityA: number;
  entityB: number;
  property: string;
  value: number;
  method: string;
  sigma?: number;
  source: string;
  provenance?: { doi?: string; url?: string; notes?: string };
}

async function compareStructures(
  pdbId: string,
  uniprotId: string,
  pdbCif: string,
  afCif: string,
): Promise<ComparisonResult | null> {
  const pdbParsed = parseMmCIF(pdbCif);
  const afParsed = parseMmCIF(afCif);
  if (pdbParsed.atoms.length === 0 || afParsed.atoms.length === 0) return null;

  const afRes = extractResidues(afParsed.atoms);
  if (afRes.length < 10) return null;

  // Try SIFTS first — it knows which PDB chain maps to the UniProt ID
  const pdbChains = [...new Set(pdbParsed.atoms.filter(a => !a.isHet).map(a => a.chainId))];

  // Strategy 1: SIFTS mapping (most reliable)
  const siftsResult = await fetchSIFTSMapping(pdbId, uniprotId, pdbChains[0] ?? 'A');
  if (siftsResult && siftsResult.mapping.size >= 10) {
    const pdbRes = extractResidues(pdbParsed.atoms, siftsResult.siftsChain);
    const aligned = buildAlignedPairs(pdbRes, afRes, siftsResult.mapping);
    if (aligned.length >= 10) {
      return computeMetrics(pdbId, uniprotId, pdbParsed, pdbRes, afRes, siftsResult.mapping);
    }
  }

  // Strategy 2: Try each PDB chain with fallback alignment
  // Pick the chain that gives the most aligned residues
  let bestMapping: Map<number, number> | null = null;
  let bestChain = '';
  let bestAligned = 0;

  for (const chain of pdbChains) {
    const pdbRes = extractResidues(pdbParsed.atoms, chain);
    if (pdbRes.length < 10) continue;

    const mapping = fallbackMapping(pdbRes, afRes);
    const aligned = buildAlignedPairs(pdbRes, afRes, mapping);
    if (aligned.length > bestAligned) {
      bestAligned = aligned.length;
      bestMapping = mapping;
      bestChain = chain;
    }
  }

  if (!bestMapping || bestAligned < 10) return null;

  const pdbRes = extractResidues(pdbParsed.atoms, bestChain);
  return computeMetrics(pdbId, uniprotId, pdbParsed, pdbRes, afRes, bestMapping);
}

function computeMetrics(
  pdbId: string,
  uniprotId: string,
  pdbParsed: ReturnType<typeof parseMmCIF>,
  pdbRes: ReturnType<typeof extractResidues>,
  afRes: ReturnType<typeof extractResidues>,
  mapping: Map<number, number>,
): ComparisonResult {
  const lddt = computeLDDT(pdbRes, afRes, mapping);
  const sidechainRMSD = computeSidechainRMSD(pdbRes, afRes, mapping);
  const disorderAgreement = computeDisorderAgreement(pdbRes, afRes, mapping);
  const q3 = computeQ3(pdbRes, afRes, mapping);
  const contactPrecision = computeContactPrecision(pdbRes, afRes, mapping);
  const isHolo = isHoloStructure(pdbParsed.atoms);
  const bindingSiteRMSD = isHolo ? computeBindingSiteRMSD(pdbParsed.atoms, pdbRes, afRes, mapping) : undefined;

  return {
    uniprotId, pdbId,
    nResiduesCompared: mapping.size,
    lddt, sidechainRMSD, disorderAgreement,
    secondaryStructureQ3: q3, contactPrecision,
    bindingSiteRMSD, isHolo,
  };
}

function resultToCouplings(result: ComparisonResult): CouplingEntry[] {
  const proteinId = getOrCreateEntity(`protein:${result.uniprotId}`, result.uniprotId, ['protein', 'uniprot']);
  const instrumentId = getOrCreateEntity(`xray:${result.pdbId}`, `XRay:${result.pdbId}`, ['instrument', 'x-ray']);
  const afId = getOrCreateEntity('alphafold-v4', 'AlphaFold-v4', ['predictor', 'neural-network']);

  const pdbUrl = `https://www.rcsb.org/structure/${result.pdbId}`;
  const entries: CouplingEntry[] = [];

  // PDB measurements (self-reference values)
  entries.push({
    entityA: instrumentId, entityB: proteinId, property: PROP.BACKBONE_LDDT,
    value: 100, method: 'self-reference', source: 'measurement',
    provenance: { url: pdbUrl },
  });
  entries.push({
    entityA: instrumentId, entityB: proteinId, property: PROP.SIDECHAIN_ACCURACY,
    value: 0, method: 'self-reference', source: 'measurement',
    provenance: { url: pdbUrl },
  });
  entries.push({
    entityA: instrumentId, entityB: proteinId, property: PROP.N_RESIDUES,
    value: result.nResiduesCompared, method: 'residue-count', source: 'measurement',
    provenance: { url: pdbUrl },
  });

  // AlphaFold predictions
  entries.push({
    entityA: afId, entityB: proteinId, property: PROP.BACKBONE_LDDT,
    value: result.lddt, method: 'AF2-vs-XRay', source: 'prediction',
    provenance: { url: `https://alphafold.ebi.ac.uk/entry/${result.uniprotId}` },
  });
  entries.push({
    entityA: afId, entityB: proteinId, property: PROP.SIDECHAIN_ACCURACY,
    value: result.sidechainRMSD, method: 'AF2-vs-XRay', source: 'prediction',
  });
  entries.push({
    entityA: afId, entityB: proteinId, property: PROP.DISORDER_AGREEMENT,
    value: result.disorderAgreement, method: 'AF2-vs-XRay', source: 'prediction',
  });
  entries.push({
    entityA: afId, entityB: proteinId, property: PROP.SECONDARY_STRUCT,
    value: result.secondaryStructureQ3, method: 'AF2-vs-XRay', source: 'prediction',
  });
  entries.push({
    entityA: afId, entityB: proteinId, property: PROP.CONTACT_PRECISION,
    value: result.contactPrecision, method: 'AF2-vs-XRay', source: 'prediction',
  });

  if (result.isHolo && result.bindingSiteRMSD !== undefined) {
    entries.push({
      entityA: afId, entityB: proteinId, property: PROP.BINDING_SITE,
      value: result.bindingSiteRMSD, method: 'AF2-vs-holo', source: 'prediction',
    });
  }

  return entries;
}

// ── Run ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('═'.repeat(70));
  console.log('  PDB × AlphaFold Ingestion Pipeline');
  console.log('═'.repeat(70));

  mkdirSync(OUT_DIR, { recursive: true });

  // Load targets
  let targets: ProteinPair[];
  if (targetsFile) {
    const lines = readFileSync(targetsFile, 'utf-8').split('\n').filter(l => l.trim());
    targets = lines.map(l => {
      const [uniprotId, name] = l.split('\t');
      return { uniprotId: uniprotId.trim(), pdbId: '', name: name?.trim() ?? uniprotId.trim() };
    });
  } else {
    targets = DRUG_TARGETS.slice(0, LIMIT);
  }

  console.log(`\n  Targets: ${targets.length} proteins`);
  console.log(`  Output: ${OUT_DIR}`);

  // For each target, find best PDB structure and download pair
  const allCouplings: CouplingEntry[] = [];
  let compared = 0;
  let failed = 0;
  let noAf = 0;
  const startTime = Date.now();

  for (let i = 0; i < targets.length; i++) {
    const target = targets[i];
    const progress = `[${i + 1}/${targets.length}]`;

    try {
      // Find PDB candidates for this UniProt ID
      const candidates = await findPDBCandidates(target.uniprotId);
      if (candidates.length === 0) {
        console.log(`  ${progress} ${target.name} (${target.uniprotId}): no PDB structure found`);
        failed++;
        continue;
      }

      // Download AlphaFold structure once
      const afCif = await downloadAlphaFoldCif(target.uniprotId);
      if (!afCif) {
        console.log(`  ${progress} ${target.name}: no AlphaFold structure`);
        noAf++;
        continue;
      }

      // Try PDB candidates until one gives a good comparison
      let result: ComparisonResult | null = null;
      let usedPdbId = '';
      for (const pdbId of candidates.slice(0, 8)) {
        const pdbCif = await downloadPDBCif(pdbId);
        if (!pdbCif) continue;

        result = await compareStructures(pdbId, target.uniprotId, pdbCif, afCif);
        if (result) {
          usedPdbId = pdbId;
          break;
        }
        await delay(100);
      }

      if (!result) {
        console.log(`  ${progress} ${target.name}: ${candidates.length} PDB candidates, none aligned (tried ${Math.min(8, candidates.length)})`);
        failed++;
        continue;
      }

      target.pdbId = usedPdbId;

      // Convert to coupling entries
      const couplings = resultToCouplings(result);
      allCouplings.push(...couplings);
      compared++;

      const holoTag = result.isHolo ? ' [holo]' : '';
      console.log(
        `  ${progress} ${target.name} (${usedPdbId}): lDDT=${result.lddt.toFixed(1)}%, ` +
        `SC-RMSD=${result.sidechainRMSD.toFixed(1)}Å, ` +
        `Q3=${(result.secondaryStructureQ3 * 100).toFixed(0)}%${holoTag} → ${couplings.length} entries`,
      );

      await delay(RATE_LIMIT_MS);
    } catch (err) {
      console.log(`  ${progress} ${target.name}: ERROR ${(err as Error).message}`);
      failed++;
    }
  }

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(0);

  // Write JSONL output
  const batchFile = join(OUT_DIR, `batch-${Date.now()}.jsonl`);
  const jsonl = allCouplings.map(c => JSON.stringify(c)).join('\n');
  writeFileSync(batchFile, jsonl + '\n');

  // Write new entity entries
  if (newEntities.length > 0) {
    const entityJsonl = newEntities.map(e => JSON.stringify(e)).join('\n');
    appendFileSync(ENTITIES_FILE, '\n' + entityJsonl);
  }

  // Summary
  console.log('\n' + '═'.repeat(70));
  console.log(`  DONE in ${elapsed}s`);
  console.log(`  Compared: ${compared} proteins`);
  console.log(`  Failed: ${failed}, No AlphaFold: ${noAf}`);
  console.log(`  Coupling entries: ${allCouplings.length}`);
  console.log(`  New entities: ${newEntities.length}`);
  console.log(`  Output: ${batchFile}`);
  console.log('═'.repeat(70));
}

// ── Helpers ─────────────────────────────────────────────────────────────────

async function findPDBCandidates(uniprotId: string): Promise<string[]> {
  // Query RCSB for structures linked to this UniProt ID
  // Accept both X-ray and cryo-EM; sort by resolution
  const query = {
    query: {
      type: 'terminal',
      service: 'text',
      parameters: {
        attribute: 'rcsb_polymer_entity_container_identifiers.reference_sequence_identifiers.database_accession',
        operator: 'exact_match',
        value: uniprotId,
      },
    },
    request_options: {
      paginate: { start: 0, rows: 15 },
      sort: [{ sort_by: 'rcsb_entry_info.resolution_combined', direction: 'asc' }],
    },
    return_type: 'entry',
  };

  try {
    const resp = await fetch('https://search.rcsb.org/rcsbsearch/v2/query', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(query),
    });
    if (!resp.ok) return [];
    const data = (await resp.json()) as { result_set?: { identifier: string }[] };
    return data.result_set?.map(r => r.identifier) ?? [];
  } catch {
    return [];
  }
}

main().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
