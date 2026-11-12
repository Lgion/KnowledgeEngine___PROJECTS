---
stepsCompleted: [1, 2, 3, 4]
inputDocuments:
  - '_bmad-output/planning-artifacts/prd.md'
  - '_bmad-output/planning-artifacts/architecture.md'
  - '_bmad-output/planning-artifacts/ux-design-specification.md'
workflowType: 'epics'
status: 'complete'
completedAt: '2026-02-08T18:18:03Z'
---

# frontend_react - Epic Breakdown

## Overview

This document provides the complete epic and story breakdown for frontend_react, decomposing the requirements from the PRD, UX Design if it exists, and Architecture requirements into implementable stories.

## Requirements Inventory

### Functional Requirements

FR1: L'utilisateur peut importer des fichiers JSON locaux.
FR2: L'utilisateur peut importer des paquets Anki (.apkg) convertis en bundles locaux.
FR3: Le système crée des bundles encapsulant source, stats et layers personnalisés.
FR4: L'utilisateur peut exporter ses bundles au format JSON enrichi.
FR5: Le système valide l'intégrité de la source et génère un rapport de diagnostic.
FR6: Le système calcule les intervalles de répétition selon la fenêtre glissante (dernières 10 réponses).
FR7: Le système classifie les items (Lacune, Moyen, Expert) dynamiquement.
FR8: Le système protège le statut "Expert" contre les faux-positifs d'échec isolés.
FR9: L'utilisateur peut prioriser les items (Découverte vs Révision) lors de la session.
FR10: L'utilisateur peut lancer un quiz en Vue Classique avec feedback.
FR11: L'utilisateur peut lancer un quiz en Mode Arcade (Jauge de stress).
FR12: L'utilisateur peut mapper dynamiquement les champs Question/Réponse.
FR13: L'utilisateur dispose d'un bouton de manipulation d'item omniprésent.
FR14: L'utilisateur peut ajouter des mnémotechniques persistantes à chaque item.
FR15: L'utilisateur peut consulter ses items "Lacunes Graves" séparément.
FR16: Le système détecte les items sémantiquement confus.

### NonFunctional Requirements

NFR1: Framerate de 60 FPS constant en mode Arcade.
NFR2: Calcul SRS < 200ms pour un bundle de 10 000 items.
NFR3: LCP au chargement initial < 1.5 seconde.
NFR4: Chiffrement TLS 1.3 pour toutes les communications Cloud.
NFR5: Mode "Offline-First" avec intégrité garantie lors de la synchro Cloud.
NFR6: Isolation des données privées sur la Marketplace.

### Additional Requirements

- **Starter Template**: `npx create-next-app@latest ./ --typescript --tailwind --eslint --app --src-dir --import-alias "@/*"`
- **Technical Stack**: Next.js 15+, TypeScript, Tailwind CSS, Shadcn UI, Dexie.js, Zustand, Zod.
- **Offline Experience**: Progressive Web App (PWA) focus, IndexedDB for storage (Offline-First).
- **Performance**: Zero Latency (< 100ms), 60 FPS animations (Framer Motion), Web Workers for DHTML rendering.
- **Architecture Pattern**: Shadow-Overlay (Immutable Source + Mutable Overlay), Recursive Bundle Ingestion.
- **Code Standards**: Prefix naming convention (`srv_`, `db_`, `st_`, `io_`), Logic-free UI components, Schema-First with Zod.
- **UX Interaction**: "Exploratory Validation Loop" (Post-choice discovery), Mobile-First ergonomics, Slate Tech Design System.
- **Design Tokens**: Variables for SRS states (Expert, Medium, Lacuna).

### FR Coverage Map

FR1: Epic 1 - Importation JSON locaux
FR2: Epic 1 - Importation Anki (.apkg)
FR3: Epic 1 - Création de bundles (Source, Stats, Layers)
FR4: Epic 5 - Exportation de bundles (JSON enrichi)
FR5: Epic 1 - Validation d'intégrité et rapport de diagnostic
FR6: Epic 2 - Calcul SRS (Sliding Window 10)
FR7: Epic 2 - Classification dynamique (Lacune, Moyen, Expert)
FR8: Epic 2 - Protection du statut "Expert" (Faux-positifs)
FR9: Epic 2 - Priorisation (Découverte vs Révision)
FR10: Epic 2 - Quiz Vue Classique avec feedback
FR11: Epic 4 - Quiz Mode Arcade (Jauge de stress)
FR12: Epic 1 - Mapping dynamique Question/Réponse
FR13: Epic 3 - Bouton de manipulation omniprésent
FR14: Epic 3 - Ajout de mnémotechniques persistantes
FR15: Epic 3 - Consultation des "Lacunes Graves"
FR16: Epic 4 - Détection des items sémantiquement confus

## Epic List

### Epic 1: Fondations & Ingestion (Le socle du savoir)
L'utilisateur peut importer ses premières données (JSON/Anki), mapper les champs et créer son premier Bundle local persistant avec rapport de diagnostic.
**FRs covered:** FR1, FR2, FR3, FR5, FR12

### Epic 2: Moteur d'Apprentissage "Slate Tech" (Le cœur du quiz)
L'utilisateur peut lancer un quiz classique fluide avec feedback immédiat, piloté par l'algorithme "Sliding Window" et la classification dynamique des items.
**FRs covered:** FR6, FR7, FR8, FR9, FR10

### Epic 3: Manipulation & Personnalisation (Le pouvoir du créateur)
L'utilisateur peut annoter ses connaissances via des mnémotechniques et manipuler les items en cours de session pour enrichir durablement son Bundle (Custom Layer).
**FRs covered:** FR13, FR14, FR15

### Epic 4: Expertise & Arcade (Le stress constructif)
L'utilisateur valide son niveau "Expert" sous pression temporelle et bénéficie d'une détection automatique des confusions cognitives.
**FRs covered:** FR11, FR16

### Epic 5: Écosystème Polymorphe (La récursivité)
L'utilisateur peut boucler le cycle de connaissance en exportant ses bundles enrichis ou en les "figeant" pour créer de nouvelles bases de référence.
**FRs covered:** FR4

## Epic 1: Fondations & Ingestion (Le socle du savoir)

L'utilisateur peut importer ses premières données (JSON/Anki), mapper les champs et créer son premier Bundle local persistant avec rapport de diagnostic.

### Story 1.1: Initialisation du Projet & Setup Dexie

As a System Architect,
I want to initialize the Next.js project and configure the Dexie.js client,
So that I have a clean codebase and a functional persistence layer.

**Acceptance Criteria:**

**Given** a new project directory
**When** I run the Next.js initialization command as specified in architecture
**Then** the project skeleton is created with TypeScript, Tailwind, and App Router
**And** the `db_client.ts` instance is configured with `Sources` and `CustomEntries` tables.

### Story 1.2: Importation & Validation JSON (Source)

As a Learner,
I want to import a local JSON file and validate its integrity via Zod,
So that I can ensure my data is compatible with the engine.

**Acceptance Criteria:**

**Given** a valid JSON source file
**When** I select the file via the import interface
**Then** the system validates the content using a dedicated Zod schema (`io_ingestion.ts`)
**And** a diagnostic report is displayed confirming success or listing errors.

### Story 1.3: Création de Bundle avec Mapping Dynamique

As a Creator,
I want to map JSON fields (Question/Answer) and create a persistent Bundle,
So that I can transform my raw source into an interactive learning tool.

**Acceptance Criteria:**

**Given** a validated JSON source
**When** I choose the fields to use for the prompt and the answer
**Then** a new entry is created in the `Sources` table
**And** a linked entry is initialized in `CustomEntries` to store future SRS stats.

### Story 1.4: Ingestion de Paquets Anki (.apkg)

As a Power User,
I want to import an existing Anki package,
So that I don't lose my historical data and complex cards.

**Acceptance Criteria:**

**Given** an `.apkg` file
**When** I import it into the system
**Then** the system extracts the SQLite content from the package
**And** the cards are converted into bundle items compatible with our architecture.

## Epic 2: Moteur d'Apprentissage "Slate Tech" (Le cœur du quiz)

L'utilisateur peut lancer un quiz classique fluide avec feedback immédiat, piloté par l'algorithme "Sliding Window" et la classification dynamique des items.

### Story 2.1: Algorithme Sliding Window (Service Logic)

As a Developer,
I want to implement the SRS calculation algorithm based on the last 10 attempts in a dedicated service (`srv_srs.ts`),
So that I can guarantee a weighted and balanced distribution of knowledge.

**Acceptance Criteria:**

**Given** a set of items with their recent histories
**When** the engine requests the next item
**Then** the algorithm returns the priority item based on the sliding window
**And** the calculation is performed in less than 200ms for 10,000 items (NFR2).

### Story 2.2: Store de Session de Quiz (Zustand)

As a Learner,
I want my quiz state (current item, score, timer) to be managed reactively and performantly,
So that I experience no visual latency during transitions.

**Acceptance Criteria:**

**Given** a started quiz session
**When** I validate an answer
**Then** the `st_quiz.ts` store updates the state instantaneously (< 100ms)
**And** atomic selectors prevent unnecessary re-rendering of the entire page.

### Story 2.3: Interface Quiz "Slate Tech" (Vue Classique)

As a Learner,
I want a clean interface displaying the central item and response options,
So that I can fully focus on my learning.

**Acceptance Criteria:**

**Given** the Slate Tech theme configured
**When** I am on the quiz screen
**Then** the item is displayed in a minimalist way without visual distractions
**And** the tap zones for answers are at least 44px (UX Spec).

### Story 2.4: Loop de Validation Exploratoire (Feedback & Discovery)

As a Learner,
I want to be able to explore explanations after my choice and consult the "Fiche",
So that I can transform every error into a documentary opportunity.

**Acceptance Criteria:**

**Given** a response given by the user
**When** the state transitions to the post-choice phase
**Then** the "Fiche" and "Next" buttons appear over the interface
**And** a tap on a wrong answer displays its metadata if available (Speculation).

## Epic 3: Manipulation & Personnalisation (Le pouvoir du créateur)

L'utilisateur peut annoter ses connaissances via des mnémotechniques et manipuler les items en cours de session pour enrichir durablement son Bundle (Custom Layer).

### Story 3.1: Bouton de Manipulation Contextuel (Post-Choix)

As a Learner,
I want to access the manipulation button only after making my choice and before moving to the next item,
So that I can amend my knowledge during the validation phase without breaking the initial reflection flow.

**Acceptance Criteria:**

**Given** an active quiz prompt with no answer given
**When** the user has not yet made a choice
**Then** the manipulation button is invisible or disabled
**When** the user selects an answer (correct or incorrect)
**Then** the manipulation button appears simultaneously with the "Fiche" and "Next" buttons
**When** the user clicks the button, a drawer (Sheet) opens for editing
**When** the user proceeds to the next item, the button disappears until the next choice.

### Story 3.2: Ajout de Mnémotechniques & Notes (Custom Layer)

As a Creator,
I want to add personal notes or images (mnemonics) to an item,
So that I can facilitate long-term memorization.

**Acceptance Criteria:**

**Given** the item editing interface
**When** I add a note in the dedicated field
**Then** the data is saved in the `CustomEntries` table linked to the source ID
**And** the note is immediately displayed during subsequent appearances of the item.

### Story 3.3: Dashboard des "Lacunes Graves"

As a Learner,
I want to consult the list of items with more than 7 errors in the last 10 attempts,
So that I can conduct targeted audit and correction work on my weak points.

**Acceptance Criteria:**

**Given** the main dashboard
**When** I select the "Lacunes Graves" view
**Then** the system filters `CustomEntries` according to the algorithmic criterion (failure > 70%)
**And** I can directly access the editing of these items to simplify or annotate them.

## Epic 4: Expertise & Arcade (Le stress constructif)

L'utilisateur valide son niveau "Expert" sous pression temporelle et bénéficie d'une détection automatique des confusions cognitives.

### Story 4.1: Mode de Jeu Arcade (Pression Temporelle)

As a Learner,
I want to test my knowledge in a mode where time is limited by a stress gauge,
So that I can validate that my response is instinctive and not resulting from long deduction.

**Acceptance Criteria:**

**Given** the Arcade mode selected
**When** the quiz starts, a stress gauge (ArcadeIndicator) empties progressively
**Then** if I answer correctly before the end of the gauge, I earn a score bonus
**And** the gauge animation is smooth (constant 60 FPS).

### Story 4.2: Détection des Items Sémantiquement Confus

As a Learner,
I want the system to automatically identify items that I confuse with each other,
So that I can conduct targeted differentiation work.

**Acceptance Criteria:**

**Given** the user's error history
**When** the system detects that answer A is systematically given for prompt B (and vice versa)
**Then** these items are marked as "Confused" in the dashboard
**And** a specific alert message is displayed during the next pass of these items.

### Story 4.3: Statut "Expert" - Validation par la Vélocité

As a Power User,
I want my "Expert" status to be validated only if my response speed is below a defined threshold (e.g., 1.5s),
So that I can guarantee "reflex-type" memorization.

**Acceptance Criteria:**

**Given** an item already classified as "Medium" or "Expert"
**When** I answer correctly in Arcade mode within the allotted time
**Then** the system confirms the "Expert - Reflex Verified" status
**And** this status protects the item against score degradation due to isolated inattention.

## Epic 5: Écosystème Polymorphe (La récursivité)

L'utilisateur peut boucler le cycle de connaissance en exportant ses bundles enrichis ou en les "figeant" pour créer de nouvelles bases de référence.

### Story 5.1: Exportation du Bundle Enrichi (Full JSON)

As a Creator,
I want to export my bundle including the original source, my notes, and performance statistics in a single JSON file,
So that I can backup my work or share it with other users.

**Acceptance Criteria:**

**Given** an active bundle with personalized data
**When** I click "Export Bundle"
**Then** the system generates a structured JSON file containing the corresponding `Sources` and `CustomEntries` tables
**And** the exported file is compatible with the import service (`io_ingestion.ts`).

### Story 5.2: Mécanisme de "Freeze" (Promotion en Source)

As a Knowledge Architect,
I want to promote my Custom Data (modified, updated, or transformed copy) to the rank of a new immutable "Original Source",
So that I can stabilize my iterations and create a new reference base for future personalizations.

**Acceptance Criteria:**

**Given** a bundle where `CustomEntries` contains a transformed/updated version of the original data
**When** I trigger the "Freeze as New Source" action
**Then** the system detaches the object from the current bundle and saves it in the `Sources` table as an autonomous entity
**And** this new source can now be used to generate other child bundles (recursivity)
**And** the associated HTML files (Fiche) are linked to this new source.
