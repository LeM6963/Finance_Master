/*
 * schema.js — Frozen data schema for the PE/IB interview-prep platform (Phase 0, §2).
 *
 * "Lock the JSON shape for: module, flashcard, qcm, exercise, caseStudy,
 *  glossaryTerm. Every item carries id, level (1–5), topic, tags[], difficulty,
 *  and a source flag. Search, spaced repetition, recommendations, and the
 *  dashboard all read off these fields — get them right once."
 *
 * This file is the single source of truth for content shape. It is 100%
 * data-driven: engines (SRS, QCM, Excel, case) and the dashboard read these
 * fields and never hard-code content. Content is produced to match this shape.
 *
 * Design pillars baked into the schema
 * ------------------------------------
 *  • BILINGUAL: every learner-facing string is a `Loc` = { fr, en }. English
 *    technical terms are NOT translated inside text — they are wrapped with
 *    {{term:leverage}} markers that the UI renders with a glossary tooltip.
 *  • SOURCING HONESTY: every item carries `source.flag`
 *    (VERIFIED | APPROXIMATE | EXEMPLE_PEDAGOGIQUE) and an optional `correction`
 *    note when the dataroom was wrong ("corrigé : la source indiquait X…").
 *  • PERSONALIZATION: userProfile + multiple revisionPaths + generator presets
 *    let the learner compose level, order, intensity, and training filters.
 *  • PROGRESS lives in user state (store.js), never inside content — so a
 *    language switch or content update never wipes progress.
 *
 * Enums are kept as plain string unions (documented below) to stay JSON-clean.
 */

// ============================================================================
// 0. PRIMITIVES
// ============================================================================

/**
 * @typedef {Object} Loc  Localized string. English technical terms inside the
 *   text stay in English and are marked `{{term:leverage}}` for tooltips.
 * @property {string} fr
 * @property {string} en
 */

/**
 * TOPIC — primary domain. Drives mastery bars, recommendations, filters.
 * @typedef {('M&A'|'LBO'|'DCF'|'WACC'|'Valuation'|'LevFin'|'Restructuring'
 *   |'VC'|'ECM'|'DCM'|'Accounting'|'ProjectFinance'|'Excel'|'Markets'|'Fit')} Topic
 */

/**
 * SOURCE FLAG — mandatory honesty marker on every real-world figure/claim.
 * @typedef {('VERIFIED'|'APPROXIMATE'|'EXEMPLE_PEDAGOGIQUE')} SourceFlag
 */

/**
 * @typedef {Object} Source
 * @property {SourceFlag} flag
 * @property {string} [ref]   Citation: dataroom path or external URL/author.
 */

/**
 * @typedef {Object} Correction  Logged when a dataroom fact was wrong.
 * @property {Loc} note         e.g. "corrigé : la source indiquait 2,1x ; valeur exacte ≈ 1,9x".
 * @property {('error'|'outdated'|'mislabelled'|'ambiguous')} kind
 * @property {boolean} [needsReview]  true → surface to the user, don't decide silently.
 */

/**
 * COMMON ENVELOPE — every content item embeds these fields.
 * @typedef {Object} Meta
 * @property {string} id            Stable unique id, e.g. "fc.lbo.leverage.001".
 * @property {('module'|'flashcard'|'qcm'|'exercise'|'caseStudy'|'glossaryTerm')} type
 * @property {1|2|3|4|5} level      Débutant→Expert (maps to the 5-level curriculum).
 * @property {Topic} topic          Primary topic.
 * @property {string[]} tags        Cross-cutting tags for search/recos (e.g. ["LBO","MoM","Excel"]).
 * @property {1|2|3|4|5} difficulty 1=easy … 5=MD-grade.
 * @property {Source} source
 * @property {Correction} [correction]
 * @property {string[]} [glossaryRefs]  Glossary term ids referenced by this item.
 * @property {string} [moduleId]    Owning module (for flashcard/qcm/exercise/case).
 */

// ============================================================================
// 1. MODULE — a course unit. Template: contexte → concepts → exemple chiffré
//    → exercice → pièges d'entretien (Phase 1 content template).
// ============================================================================
/**
 * @typedef {Meta & Object} Module
 * @property {Loc} title
 * @property {Loc} objective              One-line learning objective.
 * @property {number} estMinutes
 * @property {string[]} prerequisites     moduleIds.
 * @property {Object} content
 * @property {Loc} content.contexte
 * @property {{heading:Loc, body:Loc}[]} content.concepts   body = light markdown.
 * @property {{title:Loc, body:Loc, figures?:Figure[]}} content.exempleChiffre
 * @property {Loc[]} content.piegesEntretien                Interview gotchas.
 * @property {Loc} [content.synthese]                       Printable fiche summary.
 * @property {Object} owns
 * @property {string[]} owns.flashcardIds
 * @property {string[]} owns.qcmIds
 * @property {string[]} owns.exerciseIds
 * @property {string[]} owns.caseStudyIds
 */

/**
 * @typedef {Object} Figure  A small table/figure rendered inline.
 * @property {Loc} [caption]
 * @property {string[]} columns
 * @property {(string|number)[][]} rows
 */

// ============================================================================
// 2. FLASHCARD — front/back. SRS scheduling lives in user state, not here.
// ============================================================================
/**
 * @typedef {Meta & Object} Flashcard
 * @property {Loc} front
 * @property {Loc} back
 * @property {Loc} [hint]
 */

// ============================================================================
// 3. QCM — single/multi answer with per-option + overall explanations.
// ============================================================================
/**
 * @typedef {Meta & Object} Qcm
 * @property {Loc} stem
 * @property {boolean} multi                  true = multiple correct answers.
 * @property {QcmOption[]} options
 * @property {Loc} explanation                Overall "why".
 * @property {Loc} [workings]                 Show-the-math when numeric.
 */
/**
 * @typedef {Object} QcmOption
 * @property {string} id                      "a","b",…
 * @property {Loc} text
 * @property {boolean} correct
 * @property {Loc} [why]                      Per-option feedback.
 */

// ============================================================================
// 4. EXERCISE — Excel-like drill graded by the mini-spreadsheet engine.
//    Engine evaluates =SUM,=IF,=NPV,=IRR and A1:A10 refs against `expected`.
//    Colour convention: blue=input, black=formula, green=link, red=check.
// ============================================================================
/**
 * @typedef {Meta & Object} Exercise
 * @property {('spreadsheet'|'shortcut-gauntlet'|'spot-the-sin')} kind
 * @property {Loc} prompt
 * @property {Object} [grid]                  For kind=spreadsheet.
 * @property {number} grid.rows
 * @property {number} grid.cols
 * @property {Object.<string,Cell>} grid.cells   Keyed by ref "A1","B2",…
 * @property {Check[]} [checks]               Cells graded against expected outputs.
 * @property {Loc} solution                   Worked explanation revealed on attempt.
 * @property {Object} [shortcut]              For kind=shortcut-gauntlet.
 * @property {{comboWin:string, comboMac:string, action:Loc}[]} shortcut.steps
 * @property {Object} [spotTheSin]            For kind=spot-the-sin.
 * @property {{cell:string, sin:Loc}[]} spotTheSin.flaws
 */
/**
 * @typedef {Object} Cell
 * @property {string|number} [value]          Hardcoded value (blue input).
 * @property {string} [formula]               e.g. "=NPV(B1,C2:C6)" (black).
 * @property {('input'|'formula'|'link'|'check'|'label')} role  → colour convention.
 * @property {boolean} [locked]               Given cell (not learner-editable).
 * @property {string} [label]                 For label cells.
 * @property {string} [numFmt]                "0.0", "0.0%", "#,##0", "0.0x".
 */
/**
 * @typedef {Object} Check
 * @property {string} cell
 * @property {number} expected
 * @property {number} [tolerance]             Absolute tolerance (default 0.01).
 * @property {Loc} [hint]                     Shown when wrong.
 */

// ============================================================================
// 5. CASE STUDY — staged deal walkthrough, reveal-on-attempt.
// ============================================================================
/**
 * @typedef {Meta & Object} CaseStudy
 * @property {Loc} title
 * @property {('LBO-sponsor'|'build-up'|'public-to-private'|'distressed'|'IPO'|'merger')} dealType
 * @property {boolean} realDeal                true=real deal, false=exercise.
 * @property {Loc} scenario                    Setup.
 * @property {Figure[]} [data]                 Provided deal data (corrected dataroom).
 * @property {CaseStage[]} stages
 */
/**
 * @typedef {Object} CaseStage
 * @property {Loc} prompt
 * @property {Loc[]} guidedQuestions
 * @property {Loc} reveal                       Model answer revealed after attempt.
 * @property {{cell?:string, expected?:number}[]} [checks]  Optional numeric checks.
 */

// ============================================================================
// 6. GLOSSARY TERM — English technical terms kept as-is, explained in FR/EN.
// ============================================================================
/**
 * @typedef {Meta & Object} GlossaryTerm
 * @property {string} term                      The English term, displayed as-is ("leverage").
 * @property {string[]} [aliases]               ["effet de levier"] for search only.
 * @property {Loc} definition                   FR explanation when UI is FR; EN when EN.
 * @property {string[]} [related]               Other glossary ids.
 */

// ============================================================================
// 7. USER STATE — persisted via store.js. Progress is NEVER in content.
//    A language/theme switch or content update must not touch this object.
// ============================================================================
/**
 * @typedef {Object} UserState
 * @property {number} schemaVersion
 * @property {Settings} settings
 * @property {Profile} profile
 * @property {Gamification} game
 * @property {Object.<string,SrsCard>} srs           Keyed by flashcard id.
 * @property {QcmResult[]} qcmHistory
 * @property {string[]} completedSections             "moduleId#sectionIndex".
 * @property {RevisionPath[]} paths                   Multiple personalized roadmaps.
 * @property {GeneratorPreset[]} presets              Saved training generators.
 */
/**
 * @typedef {Object} Settings
 * @property {('fr'|'en')} lang
 * @property {('light'|'dark')} theme
 * @property {number} dailyCardGoal
 * @property {number} dailySectionGoal
 */
/**
 * @typedef {Object} Profile
 * @property {1|2|3|4|5} selfLevel                    Self-assessed.
 * @property {1|2|3|4|5} [diagnosticLevel]            From the diagnostic quiz.
 * @property {Topic[]} goals                          Targeted domains.
 * @property {Topic[]} weakTopics                     Surfaced for recommendations.
 */
/**
 * @typedef {Object} Gamification
 * @property {number} xp
 * @property {RankId} rank                            Derived from xp but cached.
 * @property {Object} streak
 * @property {number} streak.current
 * @property {number} streak.best
 * @property {string} streak.lastActiveDate           ISO date.
 * @property {Object.<Topic,number>} mastery          0..1 per topic.
 * @property {string[]} badges                        Earned badge ids.
 * @property {Object} dailyProgress
 * @property {string} dailyProgress.date
 * @property {number} dailyProgress.cards
 * @property {number} dailyProgress.sections
 */
/** @typedef {('stagiaire'|'analyst'|'associate'|'vp'|'director'|'md')} RankId */
/**
 * @typedef {Object} SrsCard  SM-2 state (Phase 4 flashcard engine).
 * @property {number} ease        Ease factor, starts 2.5.
 * @property {number} interval    Days.
 * @property {number} reps
 * @property {number} lapses
 * @property {string} due         ISO date.
 */
/**
 * @typedef {Object} QcmResult
 * @property {string} qcmId
 * @property {boolean} correct
 * @property {string} at          ISO datetime.
 */
/**
 * @typedef {Object} RevisionPath  A personalized, reorderable roadmap.
 * @property {string} id
 * @property {string} name                    e.g. "Buy-side Associate – 6 semaines".
 * @property {1|2|3|4|5} levelTarget
 * @property {('light'|'standard'|'intense')} intensity
 * @property {string[]} moduleSequence        Ordered moduleIds (user-reorderable).
 * @property {string} createdAt
 */
/**
 * @typedef {Object} GeneratorPreset  Saved training-session generator.
 * @property {string} id
 * @property {string} name
 * @property {('flashcard'|'qcm'|'caseStudy'|'exercise'|'mixed')} mode
 * @property {Topic[]} topics
 * @property {[number,number]} levelRange
 * @property {[number,number]} difficultyRange
 * @property {string[]} tags
 * @property {number} sessionLength           # items or minutes.
 * @property {('realDeals'|'exercises'|'both')} [dealKind]
 */

// ============================================================================
// 8. REAL EXAMPLES — corrected dataroom content proving the schema holds.
// ============================================================================

/** @type {GlossaryTerm} */
const EX_GLOSSARY = {
  id: 'gl.leverage', type: 'glossaryTerm', level: 1, topic: 'LBO',
  tags: ['LBO', 'LevFin'], difficulty: 1, source: { flag: 'VERIFIED', ref: 'dataroom/01_TECHNICAL/.../1.2-Finance-dEntreprise.pdf' },
  term: 'leverage', aliases: ['effet de levier', 'gearing'],
  definition: {
    fr: "Recours à la dette pour financer une acquisition et amplifier le rendement des fonds propres (equity). L'effet joue dans les deux sens : il amplifie aussi les pertes.",
    en: "Use of debt to fund an acquisition and amplify the return on equity. It cuts both ways — it amplifies losses too.",
  },
  related: ['gl.equity', 'gl.unitranche'],
};

/** @type {Qcm} — the flagship dataroom correction. */
const EX_QCM = {
  id: 'qcm.lbo.bridgepoint.mom', type: 'qcm', level: 3, topic: 'LBO',
  tags: ['LBO', 'MoM', 'net debt'], difficulty: 3,
  source: { flag: 'EXEMPLE_PEDAGOGIQUE', ref: 'dataroom/07_USEFUL_SCREENSHOTS/Case_study/LBO Paper' },
  correction: {
    kind: 'error', needsReview: false,
    note: {
      fr: "corrigé : la source (LBO Paper — Bridgepoint) indiquait un MoM de 2,1x en oubliant de déduire la dette nette à la sortie ; la valeur exacte est ≈ 1,9x.",
      en: "corrected: the source (LBO Paper — Bridgepoint) showed a 2.1x MoM, forgetting to net out exit debt; the correct value is ≈ 1.9x.",
    },
  },
  glossaryRefs: ['gl.equity', 'gl.leverage'],
  stem: {
    fr: "Un sponsor investit 200 M€ d'{{term:equity}}. À la sortie : {{term:EV}} 415 M€, dette nette 32 M€. Quel est le {{term:MoM}} ?",
    en: "A sponsor invests €200m of {{term:equity}}. At exit: {{term:EV}} €415m, net debt €32m. What is the {{term:MoM}}?",
  },
  multi: false,
  options: [
    { id: 'a', text: { fr: '2,1x', en: '2.1x' }, correct: false,
      why: { fr: "Erreur de la source : on a oublié de soustraire la dette nette à la sortie.", en: "The source's mistake: exit net debt wasn't subtracted." } },
    { id: 'b', text: { fr: '≈ 1,9x', en: '≈ 1.9x' }, correct: true },
    { id: 'c', text: { fr: '1,2x', en: '1.2x' }, correct: false },
  ],
  explanation: {
    fr: "MoM = equity de sortie ÷ equity d'entrée. Equity de sortie = EV − dette nette = 415 − 32 = 383. 383 ÷ 200 ≈ 1,9x.",
    en: "MoM = exit equity ÷ entry equity. Exit equity = EV − net debt = 415 − 32 = 383. 383 ÷ 200 ≈ 1.9x.",
  },
  workings: { fr: "415 − 32 = 383 ; 383 / 200 = 1,915 ≈ 1,9x.", en: "415 − 32 = 383; 383 / 200 = 1.915 ≈ 1.9x." },
};

/** @type {Exercise} — Excel engine drill (paydown + MoM), corrected from AirNeo/LBO. */
const EX_EXERCISE = {
  id: 'xl.lbo.mom.basic', type: 'exercise', level: 3, topic: 'Excel',
  tags: ['LBO', 'MoM', 'Excel', 'IRR'], difficulty: 3,
  source: { flag: 'EXEMPLE_PEDAGOGIQUE' },
  kind: 'spreadsheet',
  prompt: {
    fr: "Calcule l'equity de sortie (B4) et le {{term:MoM}} (B5) à partir de l'EV de sortie, de la dette nette et de l'equity injectée.",
    en: "Compute exit equity (B4) and the {{term:MoM}} (B5) from exit EV, net debt and invested equity.",
  },
  grid: {
    rows: 5, cols: 2,
    cells: {
      A1: { role: 'label', label: 'EV sortie' }, B1: { role: 'input', value: 415, numFmt: '#,##0' },
      A2: { role: 'label', label: 'Dette nette' }, B2: { role: 'input', value: 32, numFmt: '#,##0' },
      A3: { role: 'label', label: 'Equity entrée' }, B3: { role: 'input', value: 200, numFmt: '#,##0' },
      A4: { role: 'label', label: 'Equity sortie' }, B4: { role: 'formula', formula: '=B1-B2', numFmt: '#,##0' },
      A5: { role: 'label', label: 'MoM' }, B5: { role: 'formula', formula: '=B4/B3', numFmt: '0.0x' },
    },
  },
  checks: [
    { cell: 'B4', expected: 383 },
    { cell: 'B5', expected: 1.915, tolerance: 0.05, hint: { fr: "MoM = equity sortie / equity entrée.", en: "MoM = exit equity / entry equity." } },
  ],
  solution: {
    fr: "Equity sortie = 415 − 32 = 383. MoM = 383 / 200 ≈ 1,9x. Piège classique : ne pas déduire la dette nette à la sortie.",
    en: "Exit equity = 415 − 32 = 383. MoM = 383 / 200 ≈ 1.9x. Classic trap: forgetting to net out exit debt.",
  },
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { EX_GLOSSARY, EX_QCM, EX_EXERCISE };
}
