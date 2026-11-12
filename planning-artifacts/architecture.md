---
stepsCompleted: [1, 2, 3, 4, 5, 6, 7, 8]
inputDocuments:
  - '_bmad-output/planning-artifacts/prd.md'
  - '_bmad-output/planning-artifacts/ux-design-specification.md'
  - '_bmad-output/project-context.md'
workflowType: 'architecture'
project_name: 'frontend_react'
user_name: 'Mr_Quiz'
date: '2026-02-08T16:07:55Z'
lastStep: 8
status: 'complete'
completedAt: '2026-02-08T17:45:02Z'
---

# Architecture Decision Document

_This document builds collaboratively through step-by-step discovery. Sections are appended as we work through each architectural decision together._

## Project Context Analysis

### Requirements Overview

**Functional Requirements:**
L'architecture doit supporter l'ingestion de sources variées (JSON, Anki), la gestion de bundles récursifs, et un moteur de quiz hybride (Classique/Arcade). La gestion des "Layers" personnalisés est le composant fonctionnel le plus critique.

**Non-Functional Requirements:**
- **Performance** : Réactivité instantanée (< 100ms) et fluidité mobile-first.
- **Persistance** : Stratégie robuste Offline-First via IndexedDB.
- **Modularité** : Distinction stricte entre la Source Originale (Immutable) et le Custom Data (Mutable).

**Scale & Complexity:**
- Primary domain: Web App / Knowledge Engine (PWA)
- Complexity level: Medium-High
- Estimated architectural components: ~6 (Ingestion, SRS Engine, Local DB, Quiz UI, Source Editor, Sync Layer)

### Technical Constraints & Dependencies
- Utilisation de Next.js (React).
- Zéro dépendance serveur critique (Client-side heavy).
- Support des fiches techniques DHTML polymorphes.

### Cross-Cutting Concerns Identified
- **State Management** : Synchronisation entre le Custom Data et les statistiques SRS en temps réel.
- **Data Sovereignty** : Chiffrement local possible et exportabilité totale.
- **Accessibility** : Conformité WCAG AA sur tous les dispositifs.

## Starter Template Evaluation

### Primary Technology Domain
Web Application Progressive (PWA) / Knowledge Engine bâti sur Next.js.

### Selected Starter: Next.js standard with Shadcn UI & PWA focus

**Rationale for Selection:**
L'application nécessite un contrôle total sur le cycle de vie client-side (IndexedDB, PWA, 60 FPS). Le starter Next.js officiel combiné à Shadcn UI permet d'établir une base propre tout en gardant la main sur les optimisations critiques de performance mobile exigées par la spécification UX (Slate Tech).

**Initialization Command:**
```bash
npx create-next-app@latest ./ --typescript --tailwind --eslint --app --src-dir --import-alias "@/*"
```

### Architectural Decisions Provided by Starter:
- **Language & Runtime** : TypeScript strict pour une gestion typée des couches de données (Source vs Custom).
- **Styling Solution** : Tailwind CSS pour une flexibilité maximale et une performance optimale au rendu (Slate Tech semantics).
- **Build Tooling** : SWC (Next.js default) pour des builds ultra-rapides.
- **Code Organization** : Architecture `src/` avec App Router pour une séparation nette des préoccupations entre routeurs, composants et services de données.

## Core Architectural Decisions

### Decision Priority Analysis

**Critical Decisions (Block Implementation):**
- **Persistance locale** : Choix de Dexie.js (IndexedDB) pour garantir l'Offline-First et la souveraineté des données.
- **Gestion d'état** : Choix de Zustand pour le moteur de quiz et les interactions temps-réel (Arcade).

**Important Decisions (Shape Architecture):**
- **Pattern Polymorphe** : Architecture en "Layers" (Immutable Source + Mutable Overlay) pour permettre la récursivité des Bundles.
- **Communication** : Pipeline de transformation DHTML local utilisant des Web Workers pour ne pas bloquer le thread principal lors des rendus lourds.

### Data Architecture
- **Engine** : **Dexie.js**. Utilisation pour sa rapidité d'indexation et son support natif de TypeScript.
- **Modeling** : Séparation stricte entre les tables `Sources` (Read-only) et `CustomEntries` (Mutable notes, scores SRS).
- **Validation** : Zod pour la validation des schémas JSON lors de l'ingestion.

### State Management
- **Moteur Quiz** : **Zustand**. Store dédié pour la session de quiz (gestion de la "Sliding Window", timer Arcade, et scoring).
- **UI State** : React Context/Shadcn UI pour les états de surface (drawer ouvert, préférences de thème).

### Decision Impact Analysis

**Implementation Sequence:**
1. Initialisation de la base de données Dexie et des schémas.
2. Implémentation du service d'ingestion (Source -> Custom Data).
3. Développement du store Zustand pour le moteur de quiz.

**Cross-Component Dependencies:**
Le moteur SRS (Zustand) dépend directement de la persistance Dexie. L'UI (React) observe le store Zustand pour garantir la fluidité exigée par la spécification UX (Slate Tech).

## Implementation Patterns & Consistency Rules

### Layered Data Lifecycle (Recursive Architecture)
- **Source (Immutable)** : Chargée en lecture seule. Flag `isSystemSource` requis pour protéger les données d'origine.
- **CustomOverlay (Mutable)** : Stocke les deltas (notes, scores, métadonnées). Clé `SourceID` obligatoire pour maintenir le lien père-fils.
- **Recursive Freeze** : Processus atomique de fusion (Source + Overlay -> NewSource) permettant l'héritage infini des connaissances.

### Architecture Decision Records (ADR) - Synthèse
- **ADR-001 (Storage)** : Adoption de **Dexie.js** pour sa robustesse Offline-First, son typage strict et son système de migration, garantissant la performance sur mobile.
- **ADR-002 (State)** : Utilisation de **Zustand** pour isoler le moteur SRS de la couche UI, permettant des interactions à 60 FPS (zéro re-render global inutile).
- **ADR-003 (Data Strategy)** : Pattern **Shadow-Overlay**. Séparation physique des données système et utilisateur pour faciliter la synchronisation et la sauvegarde locale.

### Performance & State Patterns
- **Atomic Selectors** : Sélection granulaire dans Zustand (`useQuiz(s => s.timer)`) pour minimiser l'impact visuel des calculs temps-réel.
- **Off-Main-Thread Processing** : Parsing JSON complexe et rendu DHTML délégés à des Web Workers via le pattern Command/Worker.
- **Non-blocking I/O** : Throttling intelligent des écritures Dexie (500ms) pendant les phases de quiz intense pour éviter les saccades d'interface.

### Technical Guardrails & Consistency
- **Logic-Free Components** : L'UI doit rester une pure fonction de l'état. Toute logique métier ou calcul SRS est banni des composants React.
- **Prefix Directory Strategy** : 
  - `srv_` : Services métier (logique pure).
  - `db_` : Services d'accès Dexie.
  - `st_` : Stores Zustand.
  - `io_` : Pipeline d'ingestion/import/export.
- **Validated Data Pipeline** : `Dexie (Cold) <-> Service (Logic) <-> Zustand (Hot) <-> React UI`.
- **Schema-First Approach** : Toute modification de structure nécessite une mise à jour synchrone du schéma **Zod** (Validation) et Dexie (Persistance).

## Project Structure & Boundaries

### Complete Project Directory Structure
L'architecture suit une séparation stricte entre la **Vue (React)**, l'**État (Zustand)** et la **Persistance (Dexie)** via une couche de **Services** isolée.

```text
frontend_react/
├── public/                 # Assets statiques & Service Worker PWA
├── src/
│   ├── app/                # Next.js App Router (Routes & Layouts)
│   ├── components/
│   │   ├── ui/             # Composants Shadcn (Atomes)
│   │   └── features/       # Quiz, Library, Editor (Organes métier)
│   ├── hooks/              # useQuiz, useHaptics, useSRS
│   ├── services/           # COUCHE MÉTIER PRÉFIXÉE
│   │   ├── db_client.ts    # Dexie instance
│   │   ├── srv_srs.ts      # Logique de calcul SRS
│   │   ├── io_ingestion.ts # Transformation Source -> Custom
│   │   └── io_export.ts    # Logic de Freeze/Recursivity
│   ├── stores/             # Zustand (st_quiz, st_settings)
│   ├── types/              # index.d.ts (Polymorphic types)
│   ├── schemas/            # zod_models.ts (Data Validation)
│   └── workers/            # render.worker.ts (Off-thread processing)
├── tests/                  # Unit & Integration tests
└── docs/architecture/      # ADRs et diagrammes techniques
```

### Architectural Boundaries
- **API Boundaries** : Exclusivement locales via IndexedDB. Pas de dépendance réseau bloquante.
- **Component Boundaries** : Les composants de `features/` sont découplés et communiquent uniquement via les stores Zustand (`st_`) ou les services métier (`srv_`).
- **Data Boundaries** : Cloisonnement strict entre `Sources` (Read-only) et `CustomEntries` (Writable).

### Requirements to Structure Mapping
- **Moteur Quiz** : `src/services/srv_srs.ts` & `src/stores/st_quiz.ts`.
- **Système Polymorphe** : `src/services/io_export.ts` (Logic de Freeze).
- **Offline Sync** : Prêt pour extension dans `src/services/srv_sync.ts` (Post-MVP).

## Architecture Validation Results

### Coherence Validation ✅
- **Decision Compatibility** : Le choix de Dexie.js (Persistance) et Zustand (État) est validé par le panel d'experts comme étant le plus performant pour un usage Offline-First mobile.
- **Pattern Consistency** : Les préfixes de nommage (`srv_`, `db_`, `st_`) assurent une clarté totale pour les agents IA.
- **Structure Alignment** : L'arborescence `src/services/` isolée supporte parfaitement le pattern de "Logic-Free Components".

### Requirements Coverage Validation ✅
- **Epic/Feature Coverage** : Le moteur SRS, le système de bundles récursifs et l'interface Slate Tech sont tous couverts par des services spécifiques.
- **Non-Functional Requirements** : Les 60 FPS sont garantis par l'utilisation de Web Workers et de sélecteurs atomiques Zustand. L'Offline-First est nativement géré par Dexie.

### Implementation Readiness Validation ✅
- **Decision Completeness** : Tous les choix critiques (DB, État, Polymorphisme) sont actés et documentés via ADR.
- **Structure Completeness** : L'arborescence est définie jusqu'au niveau des services métier.

### Architecture Completeness Checklist
- [x] Analyse du contexte et de la complexité (Medium-High)
- [x] Stack technique Next.js 15+ / TypeScript
- [x] Persistance locale via Dexie.js et Schémas Zod
- [x] Gestion d'état performante via Zustand
- [x] Patterns de cohérence et règles de nommage IA
- [x] Structure de projet et frontières claires

### Architecture Readiness Assessment
**Overall Status** : READY FOR IMPLEMENTATION
**Confidence Level** : HIGH

**Points Forts** : Architecture orientée performance, souveraineté des données totale, et structure facilitant le travail multi-agents.

### Implementation Handoff
**Première Priorité** : Initialisation du projet via le starter command :
```bash
npx create-next-app@latest ./ --typescript --tailwind --eslint --app --src-dir --import-alias "@/*"
```
Suivie du setup de Dexie et de la définition des schémas Zod initiaux.
