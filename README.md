# PE/IB Mastery — préparation entretiens Private Equity & Banque d'investissement

Plateforme web **autonome, gamifiée et bilingue (FR/EN)** de révision des entretiens en
finance (M&A, LBO, leveraged finance, ECM, DCM, restructuring, VC, Excel), conçue pour
faire monter l'utilisateur du niveau **Stagiaire** au niveau **Managing Partner**.

## Lancer l'application
Ouvre simplement **`index.html`** — fichier unique, autonome (HTML+CSS+JS inline), qui
fonctionne au double-clic comme en hébergement statique (Netlify / Vercel / GitHub Pages).
Aucun backend, aucune dépendance.

- **Persistance** : `window.storage` (asynchrone) avec **repli mémoire** + **export/import JSON**.
  Jamais `localStorage`/`sessionStorage`. La progression survit au rechargement et reste
  intacte quand on change de langue ou de thème.

## Ce que contient la plateforme
- **38 modules** sur 5 niveaux (Débutant → Fondamentaux → Intermédiaire → Avancé → Expert/MP).
- **228 flashcards** (répétition espacée SM-2), **158 QCM** (avec explications + corrigés chiffrés),
  **6 exercices Excel** (mini-tableur évaluant `=SUM/=IF/=NPV/=IRR` et les plages `A1:A10`),
  **6 case studies** (LBO sponsor, build-up, public-to-private, distressed, IPO, merger),
  **121 termes de glossaire** (termes techniques anglais conservés, expliqués au survol).
- **Gamification** : XP, échelle de rang Stagiaire→MP, séries quotidiennes, maîtrise par thème,
  succès, objectif du jour.
- **Personnalisation** : onboarding, diagnostic de niveau, **parcours de révision multiples**
  (réordonnables, intensité réglable) et **générateur de sessions** (format, thèmes, difficulté,
  longueur).
- **Bilingue** : bascule FR/EN à tout moment sans perte de progression ; les termes techniques
  anglais restent affichés en anglais avec explication FR au survol.
- **Honnêteté des sources** : chaque chiffre porte un drapeau `VÉRIFIÉ` / `APPROX.` / `EXEMPLE`,
  et les erreurs de la dataroom sont corrigées et signalées dans l'app (note « corrigé : … »).

## Architecture (data-driven)
Le contenu est séparé de la logique pour rester maintenable et migrable.

```
content/            # contenu pédagogique en JSON (1 fichier par lot)
  CONTRACT.md       # contrat de schéma suivi par la production de contenu
src/
  app.template.html # l'application (moteurs + UI), avec un marqueur de contenu
  xl.test.js        # tests unitaires du moteur Excel (extrait du template)
build.js            # fusionne content/*.json → index.html, valide, teste les exercices
content-check.js    # QA d'intégrité du contenu (bilingue + références)
index.html          # ARTEFACT LIVRÉ (généré par build.js)
phase0/             # fondations Phase 0 : schéma, persistance prouvée, maquette
```

### Rebuild
```bash
node build.js          # régénère index.html depuis content/*.json (+ validations)
```

## Tests / QA
```bash
node src/xl.test.js        # moteur Excel — 25/25 (=SUM,=IF,=NPV,=IRR, plages, dépendances)
node phase0/store.test.js  # persistance — 20/20 (survit au reload, repli, export/import)
node content-check.js      # intégrité du contenu — 2336+ champs bilingues, références OK
node build.js              # build + valide chaque exercice contre le vrai moteur Excel
```
Un test de rendu headless (jsdom) parcourt toutes les routes et exécute les interactions
clés (complétion de module, bascule FR/EN + thème, réponse QCM, résolution d'exercice,
persistance) : **20/20, 0 erreur runtime**.

## Corrections de la dataroom (signalées dans l'app)
- **LBO Paper – Bridgepoint** : MoM annoncé « 2,1x » → faux (dette nette oubliée à la sortie) → **≈ 1,9x**.
- **BIWS** : taux d'IS 40 % → périmé (US 21 % depuis 2018) ; présenté comme illustratif.
- **« Effet de levier = RA − Rd »** → incomplet (manque le facteur × D/E).
- Modèle Airbus cassé / `#NAME?` (locale FR) → reconstruits.

Voir `phase0/README.md` pour la synthèse Phase 0 et le journal complet des corrections.
