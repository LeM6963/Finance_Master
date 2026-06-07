# Content production contract — PE/IB platform

You produce **one JSON file** of structured pedagogical content for a gamified PE/IB
interview-prep web app. The JSON is consumed verbatim by data-driven engines, so it
**must parse** and match this contract exactly.

## Output
Write a single UTF-8 JSON file to the path you are given. Top-level shape:

```json
{ "modules": [], "flashcards": [], "qcm": [], "exercises": [], "cases": [], "glossary": [] }
```
Only include the arrays you are asked to produce; omit others or leave them `[]`.
**After writing, validate**: `node -e "JSON.parse(require('fs').readFileSync('PATH','utf8'));console.log('OK')"` and fix until it prints OK.

## Universal rules
- **Bilingual**: every learner-facing string is an object `{"fr": "...", "en": "..."}` (call this `Loc`). Never a bare string for visible text. FR and EN must both be complete and natural — not machine-literal.
- **English technical terms stay in English** even inside French text, wrapped in double brackets so the UI can attach a glossary tooltip: `[[leverage]]`, `[[accretion/dilution]]`, `[[Enterprise Value]]`, `[[free cash flow]]`. Wrap the FIRST occurrence in a passage; don't wrap every single repeat. Unknown terms render as plain styled text, so wrapping is safe.
- **Sourcing flag on every item**: `"source": {"flag": "...", "ref": "..."}` where flag ∈
  - `VERIFIED` — standard finance fact or a figure confirmed from the dataroom / an authoritative source.
  - `APPROXIMATE` — order-of-magnitude (e.g. "leverage mid-cap FR ~4,5–5,5x").
  - `EXEMPLE_PEDAGOGIQUE` — invented illustrative numbers.
  - Never present a fabricated precise figure as fact. When unsure, use APPROXIMATE.
- **Corrections**: when the dataroom was wrong, set `"correction": {"kind":"error|outdated|mislabelled|ambiguous", "needsReview": false, "note": {"fr":"corrigé : la source indiquait X, la valeur exacte est Y", "en":"corrected: ..."}}`. Otherwise omit `correction` or set it `null`.
- **European anchoring**: prefer European/French references (Hivest, Ardian, Eurazeo, PAI Partners, Tikehau, Bridgepoint, EQT, Cinven), French market orders of magnitude (mid-cap FR leverage 4,5–5,5x; M&A fees 1–2%; tax IS France ~25%). US examples are fine when relevant but don't make everything KKR/Blackstone.
- **Accuracy bar**: French corporate tax ~25% (not 33%); US federal corporate tax 21% since the 2017 TCJA (the BIWS dataroom's 40% is outdated — if you cite it, correct it). WACC = E/V·Re + D/V·Rd·(1−T). CAPM Re = Rf + β·(Rm−Rf). Unlevered β = βL/(1+(1−T)·D/E). MoM = exit equity / entry equity, where exit equity = exit EV − exit net debt. IRR = MoM^(1/n) − 1 for a single in/out. Terminal value (Gordon) = FCF·(1+g)/(WACC−g).
- **No stubs**: no "TODO", no "lorem ipsum", no empty bodies. Every concept body is a real paragraph; every QCM has a real explanation.

## Field shapes

### module
```json
{
  "id": "mod.l3.dcf",                      // unique, dot-namespaced, stable
  "type": "module",
  "level": 3,                               // 1..5
  "topic": "DCF",                           // see Topic enum below
  "tags": ["DCF","WACC","valuation"],
  "difficulty": 3,                          // 1..5
  "source": {"flag":"VERIFIED","ref":"BIWS DCF guide + Vernimmen"},
  "title": {"fr":"...","en":"..."},
  "objective": {"fr":"En une phrase, ce que l'apprenant saura faire.","en":"..."},
  "estMinutes": 14,
  "prerequisites": ["mod.l2.tvm"],          // moduleIds, may be []
  "content": {
    "contexte": {"fr":"2-4 phrases : pourquoi ce sujet compte en deal/entretien.","en":"..."},
    "concepts": [
      {"heading": {"fr":"...","en":"..."}, "body": {"fr":"Paragraphe(s). Peut contenir [[termes EN]].","en":"..."}}
    ],
    "exempleChiffre": {
      "title": {"fr":"Exemple chiffré","en":"Worked example"},
      "body": {"fr":"Calcul détaillé étape par étape.","en":"..."},
      "figures": [ {"caption":{"fr":"","en":""}, "columns":["",""], "rows":[["",""]]} ]   // optional
    },
    "piegesEntretien": [ {"fr":"Le piège classique en entretien…","en":"..."} ],
    "synthese": {"fr":"Fiche de synthèse imprimable, 3-6 puces clés.","en":"..."}
  },
  "glossaryRefs": ["wacc","capm","terminal-value"]
}
```
Aim for **3–6 concepts** per module, **1 worked example with at least one figure table where numeric**, **3–6 interview gotchas**.

### flashcard
```json
{ "id":"fc.l3.dcf.001","type":"flashcard","level":3,"topic":"DCF","tags":["WACC"],"difficulty":3,
  "source":{"flag":"VERIFIED"},"moduleId":"mod.l3.dcf",
  "front":{"fr":"Question concise.","en":"..."}, "back":{"fr":"Réponse précise, 1-4 phrases.","en":"..."},
  "hint": null }
```

### qcm
```json
{ "id":"qcm.l3.dcf.001","type":"qcm","level":3,"topic":"DCF","tags":["WACC"],"difficulty":3,
  "source":{"flag":"VERIFIED"},"moduleId":"mod.l3.dcf",
  "stem":{"fr":"Énoncé.","en":"..."}, "multi": false,
  "options":[
    {"id":"a","text":{"fr":"...","en":"..."},"correct":false,"why":{"fr":"pourquoi faux","en":"..."}},
    {"id":"b","text":{"fr":"...","en":"..."},"correct":true,"why":{"fr":"pourquoi juste","en":"..."}},
    {"id":"c","text":{"fr":"...","en":"..."},"correct":false},
    {"id":"d","text":{"fr":"...","en":"..."},"correct":false}
  ],
  "explanation":{"fr":"Explication globale.","en":"..."},
  "workings": {"fr":"Le calcul, si numérique.","en":"..."} }
```
3–4 options, exactly the correct ones flagged. Include at least some `multi:true` items where natural. Make distractors plausible (classic mistakes).

### exercise (Excel mini-spreadsheet — graded by the engine)
```json
{ "id":"xl.lbo.mom","type":"exercise","level":3,"topic":"Excel","tags":["LBO","MoM"],"difficulty":3,
  "source":{"flag":"EXEMPLE_PEDAGOGIQUE"},"moduleId":"mod.l4.lbo5",
  "kind":"spreadsheet",
  "prompt":{"fr":"Consigne claire de ce qu'il faut remplir.","en":"..."},
  "grid":{ "rows":6, "cols":3, "cells":{
    "A1":{"role":"label","label":"EV sortie"}, "B1":{"role":"input","value":415,"numFmt":"#,##0"},
    "A4":{"role":"label","label":"MoM"}, "B4":{"role":"formula","formula":"=B1/B3","numFmt":"0.0x"}
  }},
  "checks":[ {"cell":"B4","expected":1.915,"tolerance":0.05,"hint":{"fr":"MoM = equity sortie / entrée","en":"..."}} ],
  "solution":{"fr":"Corrigé pas à pas.","en":"..."} }
```
Cell `role` ∈ input(blue)|formula(black)|link(green)|check(red)|label. The learner fills cells whose role is `formula` (their formula must reproduce `expected`); `input`/`label` cells are given/locked. The engine evaluates `=SUM`, `=IF`, `=NPV`, `=IRR`, `=AVERAGE`, `=MIN`, `=MAX`, `=ABS`, `=IFERROR`, `=ROUND`, `=PMT`, arithmetic `+ - * / ^`, comparisons, and ranges like `A1:A10`. Keep grids ≤ ~12×8.

### case (staged deal walkthrough)
```json
{ "id":"case.lbo.sponsor","type":"caseStudy","level":4,"topic":"LBO","tags":["LBO"],"difficulty":4,
  "source":{"flag":"EXEMPLE_PEDAGOGIQUE"},
  "title":{"fr":"...","en":"..."}, "dealType":"LBO-sponsor", "realDeal": false,
  "scenario":{"fr":"Mise en situation riche (secteur, taille, sponsor).","en":"..."},
  "data":[ {"caption":{"fr":"P&L","en":"P&L"},"columns":["","Y0","Y1"],"rows":[["CA",100,120]]} ],
  "stages":[
    {"prompt":{"fr":"Étape 1…","en":"..."},
     "guidedQuestions":[{"fr":"...","en":"..."}],
     "reveal":{"fr":"Réponse modèle chiffrée.","en":"..."}}
  ] }
```
4–7 stages, each with a numeric reveal where relevant.

### glossary
```json
{ "id":"gl.leverage","type":"glossaryTerm","level":1,"topic":"LBO","tags":["LevFin"],"difficulty":1,
  "source":{"flag":"VERIFIED"},
  "term":"leverage", "aliases":["effet de levier","gearing"],
  "definition":{"fr":"Explication claire en français.","en":"Clear English explanation."},
  "related":["gl.equity","gl.unitranche"] }
```
The `[[leverage]]` markers in text are matched (case-insensitively) against `term` and `aliases`, so make aliases generous.

## Topic enum (use exactly one as `topic`)
`M&A`, `LBO`, `DCF`, `WACC`, `Valuation`, `LevFin`, `Restructuring`, `VC`, `ECM`, `DCM`, `Accounting`, `ProjectFinance`, `Excel`, `Markets`, `Fit`

## Quality bar (every item)
- Distinguish **quoi / pourquoi / comment l'utiliser en deal**.
- Real European orders of magnitude; classic interview gotchas surfaced.
- FR and EN both polished. JSON valid. IDs unique within your file and matching the namespace you're given.
