import React, { useState, useEffect } from 'react';
import { Search, ChevronDown, ChevronUp, Zap, BookOpen, FlaskConical, HelpCircle, BookMarked } from 'lucide-react';
import { useLab, XP } from '@/src/lib/context';
import { EXPERIMENT_TEMPLATES } from '@/src/lib/experimentTemplates';
import { cn } from '@/src/lib/utils';

// ── Types ────────────────────────────────────────────

type Tab = 'protocols' | 'glossary' | 'mentor' | 'vocab';

// ── Glossary data ────────────────────────────────────

const GLOSSARY: Array<{
  term: string;
  category: string;
  what: string;
  how: string;
  mistakes: string;
  whenToUse: string;
}> = [
  {
    term: 'Western Blot',
    category: 'Protein',
    what: 'A technique to detect specific proteins in a sample using antibodies after separating proteins by size on a gel.',
    how: 'Proteins are denatured in SDS, run through a polyacrylamide gel (separates by size), transferred to a membrane, then probed with a primary antibody and a secondary antibody linked to a reporter enzyme.',
    mistakes: 'Forgetting to include a loading control (like β-actin or GAPDH), inadequate blocking leading to high background, and expired antibodies.',
    whenToUse: 'When you want to know if a protein is present and roughly how much of it there is compared to a control.',
  },
  {
    term: 'RT-qPCR',
    category: 'RNA',
    what: 'Reverse Transcription quantitative PCR — measures how much of a specific mRNA transcript is present in a sample.',
    how: 'mRNA is first reverse-transcribed into cDNA, then amplified using primers specific to your gene of interest. The amount of product at each cycle is measured in real time using fluorescent dyes (SYBR Green or TaqMan probes). Results are normalized to a housekeeping gene (e.g., GAPDH, ACTB) using the ΔΔCt method.',
    mistakes: 'Skipping DNase treatment (genomic DNA contamination), bad RNA quality (low RIN score), not running triplicates, and using a housekeeping gene that actually changes under your conditions.',
    whenToUse: 'When you want to measure gene expression changes at the mRNA level (e.g., after drug treatment or knockdown).',
  },
  {
    term: 'ELISA',
    category: 'Protein',
    what: 'Enzyme-Linked Immunosorbent Assay — a plate-based technique to quantify a specific protein using antibodies and a color-producing enzyme reaction.',
    how: 'A capture antibody is coated onto a plate, your sample is added, then a detection antibody (linked to an enzyme like HRP) is used. Adding a substrate (like TMB) produces color proportional to protein amount. A standard curve lets you calculate exact concentrations.',
    mistakes: 'Pipetting inaccuracies between wells, not running samples in duplicate, letting the plate dry out, and mixing up the stop solution timing.',
    whenToUse: 'When you need to quantify a secreted protein (like a cytokine) or detect something in serum/supernatant with high sensitivity.',
  },
  {
    term: 'Flow Cytometry',
    category: 'Cell Biology',
    what: 'A method to analyze thousands of individual cells per second based on their physical properties and fluorescent markers.',
    how: 'Cells in suspension pass single-file through a laser beam. Detectors measure scattered light (cell size and complexity) and fluorescence from antibodies or dyes bound to the cells. Each event is one cell, giving you population-level data.',
    mistakes: 'Not setting up compensation for spectral overlap between fluorophores, skipping FMO controls, running too many cells per second causing doublets, and analyzing dead cells.',
    whenToUse: 'When you want to identify and quantify cell populations by surface markers, measure intracellular proteins, or sort live cells.',
  },
  {
    term: 'PCR',
    category: 'Molecular Biology',
    what: 'Polymerase Chain Reaction — amplifies a specific DNA sequence exponentially using thermocycling.',
    how: 'A thermocycler denatures DNA (melting), anneals primers to flanking sequences, and a DNA polymerase extends new strands. This is repeated ~30 times, doubling product each cycle.',
    mistakes: 'Primer dimers (primers annealing to each other), wrong annealing temperature, non-specific bands from low-specificity primers, and contamination.',
    whenToUse: 'Colony screening, genotyping, amplifying inserts for cloning, or confirming CRISPR edits.',
  },
  {
    term: 'CRISPR-Cas9',
    category: 'Genome Editing',
    what: 'A programmable molecular scissors system that makes precise cuts in DNA at a target sequence guided by a short RNA.',
    how: 'A guide RNA (gRNA) matches your target sequence (20 nt + a PAM site like NGG). The Cas9 protein binds the gRNA and cuts both strands of DNA. The cell repairs the break — either by NHEJ (creating insertions/deletions) or HDR (precise edits using a template).',
    mistakes: 'Off-target cuts (need validation by sequencing), poor gRNA design, not checking for PAM sites, and not verifying edits in clones by sequencing.',
    whenToUse: 'When you want to knock out a gene, introduce a specific mutation, or tag an endogenous protein.',
  },
  {
    term: 'Immunofluorescence (IF)',
    category: 'Imaging',
    what: 'A technique to visualize specific proteins in fixed cells or tissue sections using fluorescently labeled antibodies.',
    how: 'Cells are fixed (to preserve structure), permeabilized (for intracellular targets), blocked (to prevent non-specific binding), then incubated with a primary antibody against the protein of interest and a fluorescent secondary antibody. Nuclei are typically stained with DAPI/Hoechst.',
    mistakes: 'Over-permeabilization destroying antigen structure, primary antibody concentration too high (high background), mounting without antifade, and not using secondary-only controls.',
    whenToUse: 'When you want to see where a protein is located inside or on a cell (subcellular localization).',
  },
  {
    term: 'Lentiviral Transduction',
    category: 'Cell Biology',
    what: 'A method to stably introduce a gene into cells using a modified HIV-based viral vector.',
    how: 'Lentiviral particles (produced in HEK293T cells with packaging plasmids) are added to target cells. The virus enters, reverse-transcribes its RNA genome, and integrates into the host genome. Cells that integrated the construct are selected using a drug resistance gene (e.g., puromycin).',
    mistakes: 'Using too high MOI causing toxicity, not tittering your virus, skipping selection, and forgetting biosafety protocols for BSL-2 work.',
    whenToUse: 'When you need stable, long-term expression of a gene (or shRNA for knockdown) in dividing cells.',
  },
  {
    term: 'siRNA Knockdown',
    category: 'RNA',
    what: 'Small interfering RNAs that silence specific genes by triggering degradation of complementary mRNA.',
    how: 'Synthetic siRNA duplexes are transfected into cells (using lipid nanoparticles or electroporation). The cell\'s RISC complex uses the antisense strand to find and cleave complementary mRNA, reducing protein expression for ~3–7 days.',
    mistakes: 'Incomplete knockdown (check efficiency by qPCR/Western), off-target silencing, and forgetting a scramble/non-targeting control siRNA.',
    whenToUse: 'When you want transient knockdown of a gene without permanent genome editing. Good for initial validation before CRISPR.',
  },
  {
    term: 'Cell Viability Assays',
    category: 'Cell Biology',
    what: 'Tests to measure what fraction of cells in a sample are alive after a treatment.',
    how: 'Common methods: (1) Trypan blue exclusion (dead cells take up dye), (2) MTT/MTS/resazurin assays (metabolically active cells reduce the dye, read by absorbance), (3) ATP-based assays (CellTiter-Glo — dead cells have no ATP), (4) Annexin V + PI staining for apoptosis by flow.',
    mistakes: 'Not seeding equal cell numbers in controls vs. treated wells, letting cells over-grow in MTT assays, and confusing cytostatic (growth stopped) vs. cytotoxic (cells dying) effects.',
    whenToUse: 'Dose-response curves (IC50), drug screening, or confirming your treatment conditions aren\'t killing cells non-specifically.',
  },
];

// ── Mentor Questions ─────────────────────────────────

const MENTOR_QUESTIONS: Array<{ category: string; emoji: string; questions: string[] }> = [
  {
    category: 'Starting a new experiment',
    emoji: '🚀',
    questions: [
      'What controls should I include for this experiment?',
      'Has this been done in the lab before? Are there existing protocols I should use?',
      'What would a positive result look like? What about a negative result?',
      'Are there any known pitfalls or things that commonly go wrong with this technique?',
      'What sample size / number of replicates do I need for the result to be statistically meaningful?',
      'Should I run a pilot experiment first before scaling up?',
      'What time commitment does this experiment require — can I start it on a Thursday?',
    ],
  },
  {
    category: 'When something goes wrong',
    emoji: '🔧',
    questions: [
      'My result looks completely different from what I expected — where should I start troubleshooting?',
      'Could this be a reagent issue? How do I test that without wasting more samples?',
      'Is it worth repeating this experiment as-is, or should I change something first?',
      'Could the problem be in how I set up my controls rather than in the experimental condition?',
      'Should I be worried about batch effects between my cell passages/reagent lots?',
      'At what point do we decide this approach isn\'t working and pivot?',
    ],
  },
  {
    category: 'Understanding your data',
    emoji: '📊',
    questions: [
      'Is this difference I see statistically significant? What test should I use?',
      'How do I know if this is biologically meaningful vs. just statistically significant?',
      'What is the best way to visualize this data for a figure?',
      'Should I normalize my data, and if so, to what?',
      'What would you expect this result to look like if the hypothesis is wrong?',
      'Are there any confounds or alternative explanations I should rule out?',
    ],
  },
  {
    category: 'Growing in the lab',
    emoji: '🌱',
    questions: [
      'What papers should I read to understand the context of what we\'re working on?',
      'Are there lab meetings, journal clubs, or seminars I should be attending?',
      'How do I find out about upcoming seminars from other labs in the department?',
      'What does a good lab notebook look like — can I see an example?',
      'How should I prioritize my time when I have multiple ongoing experiments?',
      'Is there a technique I should learn next that would make me more useful to the lab?',
    ],
  },
  {
    category: 'Career & the future',
    emoji: '🎓',
    questions: [
      'Could I potentially be included as an author on a paper coming from this project?',
      'What skills or experiences do I need to strengthen my applications for MD-PhD / grad school / research positions?',
      'Are there conferences where I could present this work, even as a poster?',
      'Would you be willing to write a letter of recommendation for me?',
      'What do you wish you had known at my stage of training?',
    ],
  },
];

// ── Lab Vocab ────────────────────────────────────────

const LAB_VOCAB: Array<{ term: string; definition: string; example?: string }> = [
  { term: 'Confluent', definition: 'Cells that have grown to cover the entire surface of a plate or flask. ~100% confluent = full coverage. Most cell lines should be passaged at 70–90% to prevent contact inhibition and overgrowth.', example: '"The HeLas are 80% confluent — split them 1:3 before tomorrow."' },
  { term: 'Passage number', definition: 'How many times cells have been split since they were first thawed from cryostorage. Low passage = cells behave more like the original tissue; high passage = cells may have accumulated mutations or changed behavior.', example: '"Use P5–P10 for these experiments; above P15 the cells start behaving strangely."' },
  { term: 'Technical vs. biological replicate', definition: 'Technical replicates: the same sample run multiple times (shows assay reproducibility). Biological replicates: independent experiments with independently derived samples (shows the effect is real, not a fluke). Journals want biological replicates; n=3 means 3 independent experiments.', },
  { term: 'Positive control', definition: 'A sample you know should give a positive result — confirms your assay is working. If your positive control fails, something went wrong with the assay itself, not the experimental sample.' },
  { term: 'Negative control', definition: 'A sample that should give no signal — used to detect background, contamination, or non-specific signal. Example: secondary antibody only (no primary) in an IF experiment.' },
  { term: 'FMO control', definition: 'Fluorescence Minus One — a flow cytometry control where all antibodies except one are included. Helps set accurate gates by showing the spread of fluorescence from the other channels into the channel of interest.' },
  { term: 'MOI', definition: 'Multiplicity of Infection — the ratio of infectious viral particles to cells in a transduction experiment. MOI = 1 means one virus per cell. Too high → cytotoxicity; too low → insufficient infection.' },
  { term: 'Transient vs. stable expression', definition: 'Transient: a gene is expressed temporarily after transfection, typically lasting a few days. Stable: the gene integrates into the genome (e.g., via lentivirus) and is expressed in all daughter cells indefinitely.' },
  { term: 'p-value', definition: 'The probability of observing your result (or something more extreme) if the null hypothesis is true. A p < 0.05 threshold means there\'s less than a 5% chance the result happened by chance. Does NOT measure effect size or biological importance.', },
  { term: 'Western blot stripping', definition: 'A process to remove antibodies from a membrane so it can be re-probed with a different antibody. Useful for detecting multiple proteins on the same blot, especially for comparing a protein of interest to a loading control.' },
  { term: 'Transfection efficiency', definition: 'The percentage of cells that successfully take up and express a transfected plasmid or nucleic acid. Varies by cell type; check with a GFP control plasmid.' },
  { term: 'ΔΔCt method', definition: 'The standard way to quantify RT-qPCR results. ΔCt = Ct(gene of interest) − Ct(reference gene). ΔΔCt = ΔCt(treated) − ΔCt(control). Fold change = 2^(−ΔΔCt). Assumes similar amplification efficiency between gene and reference.' },
];

// ── Accordion component ──────────────────────────────

function Accordion({ title, children, defaultOpen = false }: { title: React.ReactNode; children: React.ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-4 py-3 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors text-left"
      >
        <span className="font-semibold text-sm text-slate-800 dark:text-slate-200">{title}</span>
        {open ? <ChevronUp className="w-4 h-4 text-slate-400 shrink-0" /> : <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />}
      </button>
      {open && (
        <div className="px-4 pb-4 pt-2 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800">
          {children}
        </div>
      )}
    </div>
  );
}

// ── Main component ───────────────────────────────────

export function LearnPage() {
  const { awardXP, gamification } = useLab();
  const [tab, setTab] = useState<Tab>('protocols');
  const [glossaryQuery, setGlossaryQuery] = useState('');
  const [vocabQuery, setVocabQuery] = useState('');
  const [xpAwarded, setXPAwarded] = useState(false);

  // Award daily XP once per day on visit
  useEffect(() => {
    if (xpAwarded) return;
    const today = new Date().toISOString().slice(0, 10);
    const lastLearnDate = localStorage.getItem('labos.learnDate');
    if (lastLearnDate !== today) {
      awardXP(XP.LEARN_DAILY);
      localStorage.setItem('labos.learnDate', today);
    }
    setXPAwarded(true);
  }, [awardXP, xpAwarded]);

  const tabs: Array<{ id: Tab; label: string; icon: React.ComponentType<{className?: string}>; emoji: string }> = [
    { id: 'protocols', label: 'Protocols', icon: FlaskConical, emoji: '🧫' },
    { id: 'glossary', label: 'Techniques', icon: BookOpen, emoji: '📖' },
    { id: 'mentor', label: 'Mentor Qs', icon: HelpCircle, emoji: '💬' },
    { id: 'vocab', label: 'Lab Vocab', icon: BookMarked, emoji: '📚' },
  ];

  const filteredGlossary = GLOSSARY.filter((g) => {
    const q = glossaryQuery.toLowerCase();
    return !q || g.term.toLowerCase().includes(q) || g.category.toLowerCase().includes(q) || g.what.toLowerCase().includes(q);
  });

  const filteredVocab = LAB_VOCAB.filter((v) => {
    const q = vocabQuery.toLowerCase();
    return !q || v.term.toLowerCase().includes(q) || v.definition.toLowerCase().includes(q);
  });

  return (
    <div className="space-y-4 animate-slide-up">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-display text-3xl font-900 text-slate-900 dark:text-slate-100">Learn</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-1">
            Protocols, techniques, mentor questions, and lab vocabulary.
            <span className="flex items-center gap-0.5 text-xp-600 font-medium ml-1">
              <Zap className="w-3.5 h-3.5" />+{XP.LEARN_DAILY} XP daily
            </span>
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl overflow-x-auto">
        {tabs.map(({ id, label, emoji }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={cn(
              'flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold whitespace-nowrap transition-colors',
              tab === id
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-sm'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200',
            )}
          >
            <span>{emoji}</span>
            {label}
          </button>
        ))}
      </div>

      {/* ── Protocols tab ─────────────────────── */}
      {tab === 'protocols' && (
        <div className="space-y-3">
          <p className="text-xs text-slate-500 dark:text-slate-400 px-1">
            Step-by-step protocols for the most common assays. Click any card to expand it.
          </p>
          {EXPERIMENT_TEMPLATES.filter((t) => t.id !== 'blank').map((tpl) => (
            <Accordion key={tpl.id} title={
              <span className="flex items-center gap-2">
                <span className="text-base">{templateEmoji(tpl.id)}</span>
                {tpl.name}
                <span className="ml-1 text-xs font-normal text-slate-400">{tpl.blurb}</span>
              </span>
            }>
              {tpl.protocol ? (
                <div className="space-y-2">
                  {tpl.protocol.split('\n').filter(Boolean).map((step, i) => (
                    <div key={i} className="flex gap-3">
                      <div className="w-6 h-6 rounded-full bg-learn-100 dark:bg-learn-950/40 text-learn-600 dark:text-learn-400 text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                        {i + 1}
                      </div>
                      <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">{step}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-400 italic">No protocol steps for this template.</p>
              )}
              {tpl.metadata.conditions && (
                <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Typical conditions</p>
                  <p className="text-sm text-slate-600 dark:text-slate-400">{tpl.metadata.conditions}</p>
                </div>
              )}
            </Accordion>
          ))}
        </div>
      )}

      {/* ── Glossary / Techniques tab ──────────── */}
      {tab === 'glossary' && (
        <div className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search techniques…"
              value={glossaryQuery}
              onChange={(e) => setGlossaryQuery(e.target.value)}
              className="w-full h-10 pl-10 pr-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400 placeholder:text-slate-400"
            />
          </div>
          <div className="space-y-3">
            {filteredGlossary.map((g) => (
              <Accordion key={g.term} title={
                <span className="flex items-center gap-2">
                  {g.term}
                  <span className="px-2 py-0.5 rounded-full bg-learn-100 dark:bg-learn-950/40 text-learn-600 dark:text-learn-400 text-xs font-semibold">
                    {g.category}
                  </span>
                </span>
              }>
                <div className="space-y-3 text-sm">
                  <div>
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">What is it?</p>
                    <p className="text-slate-700 dark:text-slate-300 leading-relaxed">{g.what}</p>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">How it works</p>
                    <p className="text-slate-700 dark:text-slate-300 leading-relaxed">{g.how}</p>
                  </div>
                  <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40 rounded-xl p-3">
                    <p className="text-xs font-bold text-amber-700 dark:text-amber-400 mb-1">⚠️ Common mistakes</p>
                    <p className="text-amber-800 dark:text-amber-300 leading-relaxed">{g.mistakes}</p>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">When to use it</p>
                    <p className="text-slate-700 dark:text-slate-300 leading-relaxed">{g.whenToUse}</p>
                  </div>
                </div>
              </Accordion>
            ))}
            {filteredGlossary.length === 0 && (
              <p className="text-center text-sm text-slate-400 py-8">No techniques match "{glossaryQuery}".</p>
            )}
          </div>
        </div>
      )}

      {/* ── Mentor Questions tab ───────────────── */}
      {tab === 'mentor' && (
        <div className="space-y-3">
          <div className="bg-brand-50 dark:bg-brand-950/20 border border-brand-200 dark:border-brand-900/40 rounded-2xl p-4 flex gap-3">
            <span className="text-2xl shrink-0">💡</span>
            <p className="text-sm text-brand-800 dark:text-brand-300 leading-relaxed">
              Asking good questions is a skill. Use these as starting points — your mentor will appreciate
              that you've thought ahead before coming to them.
            </p>
          </div>
          {MENTOR_QUESTIONS.map((section) => (
            <Accordion key={section.category} title={
              <span className="flex items-center gap-2">
                <span className="text-lg">{section.emoji}</span>
                {section.category}
              </span>
            }>
              <ul className="space-y-2">
                {section.questions.map((q, i) => (
                  <li key={i} className="flex gap-2 text-sm text-slate-700 dark:text-slate-300">
                    <span className="text-brand-500 font-bold shrink-0">→</span>
                    {q}
                  </li>
                ))}
              </ul>
            </Accordion>
          ))}
        </div>
      )}

      {/* ── Lab Vocab tab ──────────────────────── */}
      {tab === 'vocab' && (
        <div className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search vocabulary…"
              value={vocabQuery}
              onChange={(e) => setVocabQuery(e.target.value)}
              className="w-full h-10 pl-10 pr-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400 placeholder:text-slate-400"
            />
          </div>
          <div className="space-y-2">
            {filteredVocab.map((v) => (
              <div key={v.term} className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4">
                <p className="font-bold text-slate-900 dark:text-slate-100 text-sm mb-1">{v.term}</p>
                <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">{v.definition}</p>
                {v.example && (
                  <p className="mt-2 text-xs text-slate-400 italic border-l-2 border-slate-200 dark:border-slate-700 pl-3">
                    {v.example}
                  </p>
                )}
              </div>
            ))}
            {filteredVocab.length === 0 && (
              <p className="text-center text-sm text-slate-400 py-8">No vocab matches "{vocabQuery}".</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function templateEmoji(id: string): string {
  const map: Record<string, string> = {
    western: '🔬',
    qpcr: '📈',
    elisa: '🧫',
    flow: '💧',
    cellculture: '🧬',
    cloning: '🔗',
    imaging: '📸',
  };
  return map[id] || '🧪';
}
