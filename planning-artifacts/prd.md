---
project_name: 'frontend_react'
user_name: 'Mr_Quiz'
date: '2026-02-08T10:11:25Z'
stepsCompleted: ['step-01-init', 'step-02-discovery', 'step-03-success', 'step-04-journeys', 'step-05-domain', 'step-06-innovation', 'step-07-project-type', 'step-08-scoping', 'step-09-functional', 'step-10-nonfunctional', 'step-11-polish']
inputDocuments: 
  - '_bmad-output/project-context.md'
  - 'uploaded_media_0_1770449968854.png'
  - 'uploaded_media_1_1770449968854.png'
documentCounts:
  briefCount: 0
  researchCount: 0
  brainstormingCount: 0
  projectDocsCount: 1
  mediaCount: 2
classification:
  projectType: 'Web App / Knowledge Engine'
  domain: 'EdTech / Ingénierie de la Connaissance'
  complexity: 'High'
  projectContext: 'Brownfield'
workflowType: 'prd'
---

# Product Requirements Document - frontend_react (Knowledge Engine)

## Executive Summary
Le projet "Knowledge Engine" vise à créer un écosystème d'apprentissage avancé remédiant à la stagnation des systèmes SRS traditionnels. En combinant un algorithme de distribution à fenêtre glissante pondérée et une architecture de "Knowledge Bundles" personnalisables, l'application offre une progression fluide et sans blocage. Destinée aux power users (langues, sciences), elle supporte l'import massif (JSON, Anki) et propose des modes de jeu polymorphiques (Classique, Arcade) pour valider la maîtrise sous stress.

## Success Criteria

### User Success
- **Exposition Équilibrée** : Tous les items d'une liste sont vus selon une fréquence pondérée par la performance récente.
- **Progression Fluide** : Introduction constante de nouveaux items sans blocage par des items anciens restés en échec.

### Technical Success
- **Stabilité Algorithmique** : Maintien d'un faible écart-type de l'exposition globale tout en priorisant les items en difficulté.
- **Fiabilité des Données** : Classification et audit de sources JSON/Anki avec diagnostic de qualité automatique.

### Measurable Outcomes
- **Rétention Quotidienne** : L'équilibrage SRS réduit la fatigue cognitive et favorise l'engagement sur le long terme.
- **Distribution Équitable** : Taux d'apparition des items tendant vers l'équilibre avec un biais contrôlé vers les échecs récents.

## Product Scope

### Phase 1: MVP (Moteur de base & Persistance Locale)
- Import JSON/Anki local et création de "Bundles".
- Moteur SRS "Sliding Window" et persistance IndexedDB.
- Interface de quiz "Vue Classique" avec feedback immédiat.

### Phase 2: Growth (Cloud & Arcade)
- Synchronisation MongoDB Atlas pour la pérennité des données.
- Marketplace de Bundles : partage, prévisualisation et clonage.
- Mode Arcade : Validation du niveau "Expert" par la vitesse de réponse.

### Phase 3: Vision (Intelligence)
- Wizard de transformation et d'enrichissement automatique de sources.
- IA Générative pour la création d'explications et d'items pédagogiques.

## User Journeys

### Marc (Apprenant - Complexité Progressive)
Marc importe un vocabulaire simple. Le moteur identifie la source en "Raw-List". Il lance son quiz immédiatement. Il est surpris par la fluidité du système qui "sait" quand lui remontrer un mot difficile sans jamais le bloquer sur les mêmes termes.

### Léa (Créatrice - Knowledge Architect)
Léa possède un paquet Anki complexe (.apkg). Elle l'importe, obtient un diagnostic de qualité de 85%, et utilise les outils de manipulation pour ajouter des mnémotechniques personnelles. Elle publie ensuite ce bundle enrichi sur la marketplace pour sa communauté.

## Domain-Specific Requirements

### Logique SRS "Sliding Window"
- **Pondération Récente** : La réapparition d'un item est dictée par la performance sur les **10 dernières apparitions**. Un succès sur les 3, 5 et 10 derniers coups réduit drastiquement la fréquence.
- **Classes d'Assimilation** : 
  - *Pro/Expert* : État quasi-figé. Échec ponctuel non-dégradant (protection inattention).
  - *Lacune Grave* : Échecs récurrents (>7/10), ciblage prioritaire par l'audit.

### Architecture Knowledge Bundles
- **Source Original** : Fichier source (lecture seule).
- **Custom Layers** : Modifications utilisateur, notes et mnémotechniques persistées séparément.
- **Domain Stats** : Données de fréquences statistiques et métadonnées de performance utilisateur.

## Innovation & Novel Patterns
- **Virtualised Social Cloning** : "Branching" de source distante vers un bundle local permettant des mises à jour non-destructives.
- **Stress-Based Expert Validation** : Intégration de la vélocité de réponse (Mode Arcade) dans la matrice de maîtrise.
- **Dynamic Exposition Audit** : Comparaison temps-réel entre performances locales et statistiques mondiales.

## Technical & Platform Requirements
- **Framework** : Next.js (Hybrid Rendering & API Routes).
- **Stockage** : Stratégie hybride (IndexedDB pour l'offline / MongoDB Atlas pour le Cloud Sync).
- **Performance** : 60 FPS constant requis pour le Mode Arcade.
- **Compatibilité** : Support WebAssembly (SQLite) pour l'import Anki client-side.

## Functional Requirements

### Data Management
- FR1: L'utilisateur peut importer des fichiers JSON locaux.
- FR2: L'utilisateur peut importer des paquets Anki (.apkg) convertis en bundles locaux.
- FR3: Le système crée des bundles encapsulant source, stats et layers personnalisés.
- FR4: L'utilisateur peut exporter ses bundles au format JSON enrichi.
- FR5: Le système valide l'intégrité de la source et génère un rapport de diagnostic.

### Learning Engine
- FR6: Le système calcule les intervalles de répétition selon la fenêtre glissante (dernières 10 réponses).
- FR7: Le système classifie les items (Lacune, Moyen, Expert) dynamiquement.
- FR8: Le système protège le statut "Expert" contre les faux-positifs d'échec isolés.
- FR9: L'utilisateur peut prioriser les items (Découverte vs Révision) lors de la session.

### Experience Interface
- FR10: L'utilisateur peut lancer un quiz en Vue Classique avec feedback.
- FR11: L'utilisateur peut lancer un quiz en Mode Arcade (Jauge de stress).
- FR12: L'utilisateur peut mapper dynamiquement les champs Question/Réponse.
- FR13: L'utilisateur dispose d'un bouton de manipulation d'item omniprésent.

### Power Tools
- FR14: L'utilisateur peut ajouter des mnémotechniques persistantes à chaque item.
- FR15: L'utilisateur peut consulter ses items "Lacunes Graves" séparément.
- FR16: Le système détecte les items sémantiquement confus.

## Non-Functional Requirements

### Performance
- NFR1: Framerate de 60 FPS constant en mode Arcade.
- NFR2: Calcul SRS < 200ms pour un bundle de 10 000 items.
- NFR3: LCP au chargement initial < 1.5 seconde.

### Sécurité & Fiabilité
- NFR4: Chiffrement TLS 1.3 pour toutes les communications Cloud.
- NFR5: Mode "Offline-First" avec intégrité garantie lors de la synchro Cloud.
- NFR6: Isolation des données privées sur la Marketplace.
