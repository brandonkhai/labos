/**
 * Starter templates for common biomedical assays.
 *
 * Each template pre-fills the UploadPage metadata form and drops a protocol
 * checklist into Notes. The user can edit any field before running analysis —
 * templates are a starting point, not a constraint.
 */

export interface ExperimentTemplate {
  id: string;
  name: string;
  /** 1-sentence blurb shown in the picker. */
  blurb: string;
  /** Filled into the metadata form. */
  metadata: {
    type: string;
    model?: string;
    conditions?: string;
    timepoints?: string;
  };
  /** Seeded into the Notes field as a protocol checklist. */
  protocol: string;
}

export const EXPERIMENT_TEMPLATES: ExperimentTemplate[] = [
  {
    id: 'blank',
    name: 'Blank',
    blurb: 'Start from nothing.',
    metadata: { type: '' },
    protocol: '',
  },
  {
    id: 'western',
    name: 'Western blot',
    blurb: 'SDS-PAGE + immunoblot for a target protein.',
    metadata: {
      type: 'Western blot',
      model: '',
      conditions: '+/- treatment, loading control',
    },
    protocol: [
      'Lysed cells with RIPA + protease inhibitors, on ice, 20 min.',
      'Cleared at 14k × g, 10 min, 4 °C.',
      'BCA quantification; loaded 20 µg / lane.',
      'Ran 4–12% Bis-Tris at 120 V, 90 min.',
      'Transferred to PVDF (0.45 µm) at 100 V, 60 min, 4 °C.',
      'Blocked 5% milk in TBST, 1 h, RT.',
      'Primary antibody: __, 1:__, 4 °C overnight.',
      'Secondary: __-HRP, 1:__, RT, 1 h.',
      'ECL + chemiluminescent imaging. Stripped and reprobed for loading control.',
    ].join('\n'),
  },
  {
    id: 'qpcr',
    name: 'RT-qPCR',
    blurb: 'Transcript quantification with a reference gene.',
    metadata: {
      type: 'RT-qPCR',
      model: '',
      conditions: 'target + reference gene, ± treatment',
      timepoints: '0, __ h',
    },
    protocol: [
      'Extracted RNA (Trizol/column), DNase-treated, QC on Nanodrop / Bioanalyzer.',
      'cDNA synthesis with random hexamers from 500 ng RNA.',
      'qPCR in triplicate, 10 µL reactions, SYBR Green / probe mix.',
      'Cycling: 95 °C 10 min; 40× (95 °C 15 s, 60 °C 60 s); melt curve.',
      'Normalized to reference gene via ΔΔCt.',
    ].join('\n'),
  },
  {
    id: 'elisa',
    name: 'ELISA',
    blurb: 'Quantitative protein detection with a standard curve.',
    metadata: {
      type: 'ELISA',
      conditions: 'serial-diluted standard + samples in duplicate',
    },
    protocol: [
      'Coated plate with capture antibody overnight at 4 °C.',
      'Blocked with 1% BSA in PBS-T, 1 h, RT.',
      'Added standards + samples (duplicate), 2 h, RT.',
      'Detection antibody 1 h, streptavidin-HRP 30 min, TMB substrate.',
      'Stopped with 2 N H2SO4; read at 450 nm (ref 570 nm).',
      'Standard curve: 4-parameter logistic; back-calculated unknowns.',
    ].join('\n'),
  },
  {
    id: 'flow',
    name: 'Flow cytometry',
    blurb: 'Single-cell marker panel.',
    metadata: {
      type: 'Flow cytometry',
      conditions: 'panel: __, controls: FMO + isotype',
    },
    protocol: [
      'Dissociated to single-cell suspension, counted to 1e6 / tube.',
      'Stained viability dye 15 min, RT.',
      'Surface stain 20 min, 4 °C, dark, in FACS buffer.',
      'Washed 2× with FACS buffer.',
      'Fixed with 2% PFA (optional) before acquisition.',
      'Acquired 50k events / sample; gated FSC/SSC → singlets → live → subsets.',
    ].join('\n'),
  },
  {
    id: 'cellculture',
    name: 'Cell culture passage',
    blurb: 'Routine split + log.',
    metadata: {
      type: 'Cell culture',
      model: '',
      conditions: 'passage #__, seed density __ cells / cm²',
    },
    protocol: [
      'Confluency at passage: __%.',
      'PBS wash, trypsin 3–5 min until detached.',
      'Quenched with full media, centrifuged 300 × g, 5 min.',
      'Counted (trypan / automated). Viability: __%.',
      'Seeded at __ cells / cm² in fresh media. Incubator 37 °C, 5% CO2.',
    ].join('\n'),
  },
  {
    id: 'cloning',
    name: 'Cloning (restriction / Gibson)',
    blurb: 'Plasmid construction.',
    metadata: {
      type: 'Molecular cloning',
      conditions: 'vector: __, insert: __',
    },
    protocol: [
      'Vector: linearized with __ (single/double digest) or PCR-amplified.',
      'Insert: amplified with primers __ / __ at __ °C annealing.',
      'Gel-purified both fragments.',
      'Assembly: __ (T4 ligation / Gibson / In-Fusion) at __ °C for __ min.',
      'Transformed DH5α, plated on LB + __ antibiotic.',
      'Screened __ colonies by colony PCR; sequence-verified miniprep(s).',
    ].join('\n'),
  },
  {
    id: 'imaging',
    name: 'Fluorescence imaging',
    blurb: 'Live or fixed cell imaging.',
    metadata: {
      type: 'Fluorescence microscopy',
      conditions: 'fluorophores: __',
    },
    protocol: [
      'Fixed (4% PFA, 15 min) or imaged live in phenol-red-free media.',
      'Permeabilized (0.1% Triton, 10 min) if IF.',
      'Blocked 1 h with 3% BSA, primary 1 h, secondary + Hoechst 30 min.',
      'Mounted with __ . Z-stacks at __ µm step, __× objective.',
      'Acquired on __ scope; consistent exposure across conditions.',
    ].join('\n'),
  },
];
