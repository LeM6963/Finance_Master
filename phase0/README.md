# Phase 0 — Décisions & fondations

Livrables à valider **avant** d'écrire le reste de l'app (cf. roadmap, gate Phase 0 :
*schéma gelé, persistance prouvée, design choisi*).

| Fichier | Rôle |
|---|---|
| `store.js` | Couche de persistance : `window.storage` → repli mémoire → export/import JSON. Jamais `localStorage`. |
| `store.test.js` | Preuve automatisée (Node) — **20/20** : survit au rechargement, repli, export/import, validation. |
| `persistence-proof.html` | Preuve navigateur : double-clic, le compteur survit au Cmd/Ctrl+R (backend durable). |
| `schema.js` | Schéma de données gelé pour les 6 types de contenu + état utilisateur + personnalisation, avec exemples réels corrigés. |
| `mockup.html` | Maquette visuelle unique (direction moderne, FR/EN, clair/sombre, tooltips de termes EN). |

---

## 1. Architecture retenue

Option **B → C** de la roadmap : on développe en **bloc de données séparé + moteurs data-driven**, livrable d'abord en **fichier autonome** (HTML+JS inline, ouvrable au double-clic et hébergeable tel quel), pensé pour migrer sans douleur vers un petit projet Vite quand le volume de contenu l'exigera. Le contenu ne touche jamais la logique.

## 2. Persistance — prouvée

- Détection défensive de `window.storage` (plusieurs formes d'API tolérées), repli **mémoire** si absente/inutilisable, **export/import JSON** pour la portabilité entre machines.
- « Survit au rechargement » prouvé deux fois : en Node (une instance fraîche relit le même backing-store) et en navigateur (`persistence-proof.html`).
- La **progression vit dans `UserState`**, jamais dans le contenu → un changement de **langue/thème** ou une mise à jour de contenu ne l'efface pas.

```bash
node phase0/store.test.js   # → 20 passed, 0 failed
```

## 3. Schéma de données (résumé)

Enveloppe commune à tout item : `id, type, level (1–5), topic, tags[], difficulty (1–5), source.flag, correction?, glossaryRefs[]`.

- **6 types** : `module` (contexte→concepts→exemple chiffré→exercice→pièges), `flashcard`, `qcm` (single/multi + explications par option), `exercise` (mini-tableur évaluant `=SUM/=IF/=NPV/=IRR` + refs `A1:A10`, convention de couleurs bleu/noir/vert/rouge), `caseStudy` (étapes, reveal-on-attempt), `glossaryTerm` (terme EN conservé, explication FR/EN).
- **Bilingue** : tout texte = `Loc {fr,en}` ; les termes techniques EN restent en anglais dans le texte, marqués `{{term:leverage}}` et rendus avec tooltip glossaire.
- **Sourcing** : `flag ∈ {VERIFIED, APPROXIMATE, EXEMPLE_PEDAGOGIQUE}` + `correction.note` quand la dataroom était fausse, `needsReview:true` pour les cas ambigus à te remonter.
- **Personnalisation** : `Profile` (auto-éval + diagnostic + objectifs + points faibles), **`RevisionPath[]`** (plusieurs parcours réordonnables, intensité réglable), **`GeneratorPreset[]`** (génère QCM/flashcards/cases filtrés par thème, niveau, difficulté, tags, longueur de session, deals réels vs exercices).
- **Gamification** : `xp`, `rank` (stagiaire→analyst→associate→vp→director→md), `streak`, `mastery` par topic, `badges`, objectif quotidien — tout persisté.

## 4. Synthèse dataroom (lue intégralement via le connecteur Drive)

**Bien couvert :** Accounting/3-statements, DCF/WACC, Valuation/multiples, bridge EqV↔EV, LBO (BIWS paper-LBO + WSO modèle complet), Project finance (London Fox), cours FR de finance d'entreprise (108 p.), banque de QCM London Fox (14 thèmes).
**Moyen :** LevFin (dans le LBO), Restructuring (section 400-Q), M&A merger models (pas de modèle dédié), Excel (templates, certains cassés).
**Vide/absent dans la dataroom** → à compléter via le web en Phase 6 : dossiers *Valuation_Methods, ECM_DCM, Venture_Capital, Transaction_Services* vides ; *Articles_News, Podcasts_Videos* vides ; **VC absent, ECM/DCM ténus**.

### Journal des corrections (signalées dans l'app)

| # | Source | Erreur | Correction |
|---|---|---|---|
| 1 | LBO Paper – Bridgepoint | MoM annoncé **2,1x** | Oubli de la dette nette à la sortie : 415 − 32 = 383 ; 383/200 ≈ **1,9x** |
| 2 | BP_Airbus_Model.xlsx | Modèle cassé (CA = 0 → marges absurdes, DSCR=ICR, trésorerie −70) | À reconstruire, ne pas recopier comme corrigé |
| 3 | Guides BIWS | Taux d'IS **40 %** | Périmé : **21 %** US depuis la TCJA (2018) ; à présenter comme illustratif |
| 4 | Entrainement_analyse / Template Graphiques | `#NAME?` / `#VALUE!` | Noms de fonctions FR (SI, MOYENNE…) sous locale EN ; à relocaliser |
| 5 | Cours 1.2 | `Effet de levier = RA − Rd` | Incomplet : il manque le facteur `× D/E` |

### Cas ambigus — **à trancher par toi** (non décidés en silence)
- **ROCE (Beta+) corrigé** : OCR du PDF illisible (mojibake dans le bloc de formules). Je propose de reconstruire le pont ROE→ROCE depuis des sources de référence — **OK pour toi ?**
- **Eiffagios IV** : chiffres de graphiques peu fiables à l'OCR (marché 62→72 Md$, part 26→35 %, EBITDA 2,9→5,6). À vérifier sur le `.xlsx` source — **veux-tu que je les confirme avant usage ?**
- **WSO PE Guide** : le `.xlsx` est protégé par mot de passe (présent en clair dans `MDP.txt`). Contenu lu pour la pédagogie ; **je n'inclurai pas le fichier protégé tel quel** dans l'app — confirme que c'est le bon arbitrage.

## 5. Aperçu du curriculum (pour la Phase 1, à valider ensuite)

5 niveaux, ~6–10 modules chacun (cible ≥30). Esquisse :
1. **Débutant** — culture financière, lecture des 3 états, vocabulaire (glossaire EN).
2. **Fondamentaux** — compte de résultat / bilan / flux liés, EBITDA→FCF, ratios, bridge EqV↔EV.
3. **Intermédiaire** — DCF/WACC/CAPM, multiples & comps, **track Excel** (raccourcis, INDEX/MATCH, NPV/IRR, tables de sensibilité).
4. **Avancé** — LBO (paper→modèle, sources/uses, tranches de dette, paydown, MoM/IRR), M&A & accretion/dilution, Project finance (DSCR/LLCR).
5. **Expert / MD** — restructuring & distressed, build-up & public-to-private, négociation, *deal judgment*, ECM/DCM & VC (complétés via le web).

> La **maquette** (`mockup.html`) illustre le tableau de bord (XP, série, échelle de rang, file SM-2, maîtrise par thème, succès) et un aperçu des surfaces d'entraînement (flashcard, QCM avec la correction 1,9x, tooltip de terme EN).

## 6. Ce que j'ai vérifié
- ✅ Persistance : 20/20 en Node ; survit au rechargement (durable) ; export/import round-trip ; repli mémoire ; rejet du JSON invalide. Aucun `localStorage`/`sessionStorage`.
- ✅ Bilingue dans la maquette : bascule FR/EN **sans rien réinitialiser** (la progression vit dans `UserState`) ; les termes EN restent affichés en anglais avec explication au survol.
- ✅ Thème clair/sombre, clair par défaut ; responsive mobile.
- ✅ Schéma `schema.js` se charge sans erreur et porte des **exemples réels corrigés** (la correction Bridgepoint 1,9x est encodée bout-à-bout : QCM + exercice tableur).
- ✅ Toute affirmation chiffrée non certaine est marquée `APPROXIMATE`/`EXEMPLE_PEDAGOGIQUE` ; corrections journalisées ; cas ambigus listés ci-dessus plutôt que tranchés.
- ⏳ Non encore fait (volontairement — attend ta validation) : moteurs (SRS, QCM, tableur, case), contenu des 30+ modules, gamification complète.

## 7. Ce dont j'ai besoin de toi
1. **Valides-tu le schéma** (`schema.js`) et **la direction visuelle** (`mockup.html`) ? Quoi affiner ?
2. **Arbitrages** sur les 3 cas ambigus du §4.
3. **Accent couleur** : l'orange chaud (#E8743B) te convient-il, ou tu préfères une autre couleur motivante ?

Une fois validé → Phase 1 (curriculum gelé), puis vertical slice (1 module complet de bout en bout).
