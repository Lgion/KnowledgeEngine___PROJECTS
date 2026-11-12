---
stepsCompleted: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14]
inputDocuments:
  - '_bmad-output/planning-artifacts/prd.md'
  - '_bmad-output/project-context.md'
---

# UX Design Specification frontend_react

**Author:** Mr_Quiz
**Date:** 2026-02-08T10:17:00Z

---

<!-- UX design content will be appended sequentially through collaborative workflow steps -->

## Executive Summary

### Project Vision
Le projet "Knowledge Engine" (frontend_react) vise à redéfinir l'apprentissage par répétition espacée (SRS) en éliminant l'inertie des algorithmes classiques. L'expérience doit donner une sensation de fluidité, de contrôle et de progression continue, que l'utilisateur soit un apprenant occasionnel ou un architecte de données complexes.

### Target Users
- **Apprenants (Power Users)** : Utilisateurs exigeant une efficacité maximale, sensibles à la fatigue cognitive, cherchant une progression sans friction.
- **Créateurs (Knowledge Architects)** : Utilisateurs experts manipulant des sources volumineuses (Anki/JSON), nécessitant des outils de diagnostic et de personnalisation (layers) puissants mais accessibles.

### Key Design Challenges
- **Transparence de l'Algorithme** : Rendre l'algorithme "Sliding Window" intuitif sans exposer la complexité mathématique.
- **Bouton de Manipulation Contextuel** : Maintenir un accès constant à l'édition d'items sans briser le "Flow" du quiz.
- **Feedback Mode Arcade** : Communiquer visuellement la pression du temps et la validation de l'expertise par le stress sans générer d'anxiété négative.

### Design Opportunities
- **Visualisation de Progression** : Créer des indicateurs de réussite basés sur la performance récente (fenêtre 3/5/10) plutôt que sur un score global abstrait.
- **Modularité des Bundles** : Utiliser une esthétique de "couches" (layers) pour renforcer le concept de personnalisation non-destructive.

## Core User Experience

### Defining Experience
L'expérience centrale est celle du **Flow d'Apprentissage**. Le système doit s'effacer derrière la connaissance, créant un état d'immersion où la validation d'une réponse et la transition vers l'item suivant sont quasi-instantanées. Le "Knowledge Engine" ne doit pas être ressenti comme un outil, mais comme une extension de la mémoire de l'utilisateur.

### Platform Strategy
- **Mobile-First / PWA** : Priorité absolue à l'ergonomie mobile (zones de tap larges, navigation au pouce) avec une expérience de type application native.
- **Hybride Input** : Optimisation tactile par défaut, tout en conservant des raccourcis clavier pour la version desktop.
- **Offline-First** : Utilisation d'IndexedDB pour garantir que le quiz et la consultation de la source restent fonctionnels sans connexion internet.

### Effortless Interactions
- **Ingestion Intelligente** : Parsing automatique des fichiers JSON/Anki sans configuration complexe requise de la part de l'utilisateur.
- **Édition Contextuelle** : Modification immédiate des items via le "Bouton de Manipulation" sans interrompre la session de quiz.
- **Navigation au Clavier** : Utilisation intensive de raccourcis pour une vitesse d'exécution maximale.

### Critical Success Moments
- **L'Aha! Moment** : Réussir un item classé comme "Lacune Grave" au moment optimal suggéré par l'algorithme.
- **La Validation d'Expertise** : Atteindre le statut "Expert" via le mode Arcade, validant la maîtrise sous pression temporelle.

### Experience Principles
1. **Réaction Instantanée (Zero Latency)** : Latence < 100ms pour toutes les interactions de quiz.
2. **Focus Minimaliste** : Élimination de toute distraction visuelle pendant l'apprentissage actif.
3. **Transparence Algorithmique** : Compréhension intuitive de la progression sans exposition de la complexité mathématique.
4. **Souveraineté des Données** : Sentiment de pleine possession des bundles grâce à la persistance locale et au cloud sync invisible.

## Desired Emotional Response

### Primary Emotional Goals
- **Calme et Focus** : L'utilisateur doit se sentir dans une "bulle" d'apprentissage, libéré de l'anxiété liée à la gestion de la connaissance.
- **Sentiment de Puissance (Empowered)** : Ressentir l'extension de sa mémoire grâce à une maîtrise technique croissante.
- **Confiance Totale** : Sentiment d'être épaulé par un système expert, invisible mais infaillible.

### Emotional Journey Mapping
- **Découverte (Import)** : Sentiment de soulagement et de curiosité devant la facilité d'ingestion des données.
- **Pendant le Quiz** : État de "Flow" et concentration profonde, perte de la notion du temps.
- **Achèvement/Maîtrise** : Fierté et accomplissement lors du passage au statut "Expert".
- **Erreur** : Sentiment d'apprentissage constructif plutôt que de frustration ou de pénalité.

### Micro-Emotions
- **Confidence** : Design épuré éliminant toute hésitation visuelle.
- **Delight** : Micro-interactions fluides et élégantes lors des transitions.
- **Sérénité** : Absence d'indicateurs de stress (hors mode Arcade) pour favoriser les sessions longues.

### Design Implications
- **Esthétique de Précision** : Palette de couleurs sobres (bleus profonds, gris doux) et typographie moderne ultra-lisible.
- **Feedback Doux** : Animations fluides et sons feutrés pour confirmer les actions sans agression.
- **Espaces Favorisant le Focus** : Utilisation généreuse du vide (whitespace) pour centrer l'attention sur l'item d'étude.

### Emotional Design Principles
1. **Élégance de l'Expertise** : L'interface doit ressembler à un instrument de précision.
2. **Bienveillance de l'Erreur** : Transformer l'échec en une donnée technique utile et non-punitive.
3. **Esthétique du Calme** : Créer un environnement visuel qui favorise la concentration prolongée.

## Design System Foundation

### 1.1 Design System Choice
**Shadcn UI (Radix UI + Tailwind CSS)**.

### Rationale for Selection
- **Précision Technique** : L'esthétique par défaut de Shadcn UI est sobre et professionnelle, correspondant parfaitement à un outil d'expert.
- **Accessibilité Native** : Basé sur Radix UI, il garantit une navigation au clavier exemplaire, primordiale pour les sessions de quiz rapides.
- **Performance** : La combinaison avec Tailwind CSS assure un bundle léger et des performances optimales (60 FPS).
- **Flexibilité** : Permet une personnalisation totale du code source des composants, essentielle pour implémenter des fonctionnalités uniques comme le "Bouton de Manipulation".

### Implementation Approach
Utilisation de la stack **Next.js** avec les composants Radix pour les primitives accessibles et Tailwind CSS pour le stylage utilitaire. Les composants seront importés de manière atomique pour minimiser le poids de l'application.

### Customization Strategy
- **Design Tokens** : Mise en place de variables CSS (ou thèmes Tailwind) pour les états SRS (Expert, Moyen, Lacune).
- **Typographie Focus** : Sélection d'une police sans-serif moderne (ex: Inter ou Outfit) optimisée pour la lecture prolongée.
- **Animations de Flow** : Intégration de Framer Motion pour des transitions fluides entre les items du quiz, renforçant le sentiment de "Zero Latency".

## UX Pattern Analysis & Inspiration

### Inspiring Products Analysis
- **Anki** : Modèle de puissance algorithmique brute, mais à éviter pour son austérité.
- **WaniKani** : Modèle de focus et de progression structurée par niveaux.
- **Obsidian / Logseq** : Modèles d'outils de précision "Keyboard-First" et de gestion de connaissances structurée.
- **Duolingo / Memrise** : Inspirations pour la fluidité des transitions et la gamification légère.

### Transferable UX Patterns
- **Navigation Latérale Rétractable** (Style Slack/Obsidian) : Pour la gestion des bundles sans encombrer l'espace de travail.
- **Transitions Fluides sans Rechargement** (Style PWA moderne) : Pour maintenir l'état de "Flow" pendant le quiz.
- **Hiérarchie Visuelle de Maîtrise** (Style WaniKani) : Code couleur dynamique pour identifier l'état d'assimilation d'un item.

### Anti-Patterns to Avoid
- **Surcharge de Configuration Initiale** : Éviter l'accès au moteur avant toute action (Anti-pattern Anki).
- **Latence de Feedback** : Toute réponse doit avoir un retour visuel immédiat (< 100ms).
- **Interruption de Flux** : Bannir les modales bloquantes pendant la session active de quiz.

### Design Inspiration Strategy
- **Adopter** : Le minimalisme des IDEs pour renforcer le sentiment d'expertise technique.
- **Adapter** : Les mécaniques de progression ludiques (jauges, streaks) en les rendant sobres.
- **Éviter** : L'apparence de "Tableur" ou d'outil administratif pour préserver l'engagement cognitif.

## 2. Core User Interaction Deep-Dive

### 2.1 Defining Experience
Le **"Loop de Validation Exploratoire"** (Mode Classique) : Une immersion dans l'étude active où le quiz est une porte d'entrée vers la source. L'utilisateur fait un choix (tap mobile), puis entre dans une phase de spéculation et de vérification. Il peut explorer les feedbacks des mauvaises réponses ou consulter la **Fiche Technique** (vue source) pour lever un doute ou approfondir sa connaissance. Le passage à la suite est un acte conscient de validation.

### 2.2 User Mental Model
L'utilisateur est un **Chercheur-Documentaliste mobile**. Il utilise le quiz pour tester ses hypothèses et la Fiche Technique comme sa référence absolue, qu'elle soit brute (JSON/Anki) ou enrichie (DHTML généré par IA et publié par l'utilisateur).

### 2.3 Success Criteria
- **Latence d'interaction tactile < 100ms**.
- **Accès contextuel à la Fiche** (Source) uniquement après le choix de l'utilisateur.
- **Clarté du Feedback de Spéculation** : Compréhension immédiate de l'erreur via l'interaction post-choix avant validation.

### 2.4 Novel UX Patterns
- **Polymorphic Reference View** : Consultation de la Source (brute ou DHTML) par le bouton "Fiche" qui n'apparaît qu'une fois la réponse donnée.
- **Interaction de Spéculation Post-Choix** : Taper sur une mauvaise réponse après avoir fait son choix pour afficher des explications ciblées.
- **Data Persistence Strategy** : Manipulation (commentaires/notes) spécifique à l'item en cours, accessible uniquement après le choix pour enrichir le Custom Data.

### 2.5 Experience Mechanics (Mobile Flow)
1. **Énoncé** : Affichage centralisé de l'item. Zéro distraction.
2. **Choix (Tap)** : Sélection d'une réponse parmi les options.
3. **Phase d'Exploration & Spéculation (Apparaît après Choice)** : 
   - Affichage du statut (Correct/Incorrect).
   - Apparition du bouton **"Fiche"** pour consulter la source (référence indicative).
   - Apparition du bouton de **Manipulation** pour amender l'item (Custom Data).
   - Possibilité d'explorer les autres options pour voir leurs métadonnées.
4. **Validation Consciente** : Passage à l'item suivant par un second tap sur la **bonne réponse** ou sur le bouton **"Suivant"** (bas-droite).

## Design Direction Decision

### Design Directions Explored
Nous avons exploré trois directions visuelles majeures : 
1. **Slate Tech** (Minimaliste & Technique)
2. **Glass Morph** (Profondeur & Modernité)
3. **Card Deck** (Physique & Ergonomique)

### Chosen Direction
**Slate Tech**.

### Design Rationale
La direction **Slate Tech** a été choisie pour son esthétique d'outil de précision qui s'efface derrière le contenu. Sa sobriété renforce le sentiment d'expertise technique recherché pour le "Knowledge Engine". Elle minimise les distractions visuelles et maximise le focus sur la donnée (JSON/Anki) et la fiche technique, tout en restant extrêmement performante sur mobile.

### Implementation Approach
- **Esthétique** : Bordures fines, couleurs profondes, typographie ultra-lisible.
- **Navigation** : Discrète mais efficace, privilégiant l'espace pour la visualisation des items et de la source.
- **Feedback visuel** : Utilisation parcimonieuse des couleurs sémantiques pour guider la spéculation sans briser le calme visuel de l'interface.

## User Journey Flows

### 1. L'Étude Active (Profil Apprenant)
Ce parcours se concentre sur l'interaction avec le **Custom Data** du Bundle. Le quiz interroge les couches personnalisées ou modifiées, tandis que la **Source Originale** reste accessible en bas de l'écran (Fiche Technique) comme référence consultative.
- **Entrée** : Sélection d'un Bundle et lancement du quiz.
- **Action** : Réponse sur le Custom Data, puis phase de spéculation/exploration.
- **Succès** : Validation et passage à l'item suivant, mise à jour des stats du Custom Data.

### 2. Architectures de Connaissances (Profil Créateur)
Léa utilise le système pour créer de nouvelles structures de savoir. La particularité ici est la **récursivité** : tout **Custom Data** validé peut être figé et servir de **Source Brute** pour un nouveau Bundle, permettant un empilement de couches de connaissances.
- **Entrée** : Importation ou sélection d'un Custom Data existant.
- **Action** : Définition comme "Nouvelle Source" pour un paquet enfant.
- **Succès** : Publication d'un nouveau Bundle prêt pour un nouveau cycle de customisation.

### 3. Flow de Spéculation Arcade
Parcours haute performance où la vitesse de réponse sur le Custom Data valide le statut d'expert.
- **Action** : Réponse Reflexe < 1s.
- **Succès** : Gain de points de stress, blocage de la dégradation du score.

### Journey Patterns
- **Source as Reference** : La source n'est jamais le support direct du quiz, elle est l'ancre de vérité.
- **Polymorphic Layering** : Pattern de navigation permettant de basculer entre la couche active (Custom) et la référence (Source).
- **Data Recursion** : L'interface de création traite les sorties (Custom) comme des entrées potentielles (Source).

### Flow Optimization Principles
- **Effortless Switching** : Le passage de la vue Quiz (Custom) à la vue Fiche (Source) doit être instantané.
- **Non-Destructive Editing** : Toute modification en cours de quiz impacte le Custom Data sans jamais altérer la Source Originale.

## Component Strategy

### Design System Components
Utilisation de **Shadcn UI** (Radix UI + Tailwind CSS) pour les primitives (Buttons, Cards, Sheet, Tabs, Drawers) afin de garantir une accessibilité WCAG et une consistance visuelle "Slate".

### Custom Components
- **Source-Polymorph-Container** : Gestionnaire de rendu hybride (JSON/DHTML) pour la fiche technique. Capable de basculer entre une vue structurée et une vue riche.
- **Exploratory-Response-Grid** : Grille de tap mobile gérant la phase de spéculation et l'affichage de métadonnées post-choix (explication immédiate sur tap d'une mauvaise réponse).
- **Stress-Arcade-Indicator** : Composant SVG animé pour le feedback temporel haute performance en mode Arcade.
- **Overlay-Quick-Editor** : Micro-formulaire de manipulation non-destructif pour le Custom Data, accessible uniquement après le choix de l'utilisateur sur l'item en cours.

### Component Implementation Strategy
Les composants custom seront construits en utilisant les **Design Tokens** de Shadcn (variables CSS pour les couleurs et l'espacement) pour une intégration invisible. Le focus sera mis sur la réponse tactile (animations fluides via Framer Motion) pour simuler une expérience haptique engageante.

### Implementation Roadmap
1. **Phase 1 (Core)** : Quiz View, Item Card, Response Grid (Essentiel pour le MVP).
2. **Phase 2 (Study)** : Polymorphic Source Viewer, Quick Editor (Services pour Marc et Léa).
3. **Phase 3 (Arcade)** : Stress-Arcade-Indicator et optimisations de performance visuelle.

## UX Consistency Patterns

### Button Hierarchy (Contextual)
- **Primary Action (Confirm/Next)** : Remplissage plein (Indigo-600), positionné en bas-droite. C'est l'action finale de l'item.
- **Secondary Discovery Action ("Fiche")** : Masqué par défaut. Apparaît uniquement après le choix de l'utilisateur. Ouvre le tiroir de consultation de la Source.
- **Utility Annotation Action ("Edit/Note")** : Masqué par défaut. Apparaît après le choix. Permet d'ajouter une note ou un commentaire au Custom Data de l'item courant.

### Navigation Patterns
- **Status Quo during Quiz** : Aucun changement de mode (Arcade/Classique) n'est autorisé pendant l'exécution d'un quiz. Le choix se fait exclusivement en phase de paramétrage pré-lancement.
- **Drawer Bottom-Sheet** : Dédié à la "Fiche". Permet de feuilleter la source indicative sans rompre le contexte du quiz.

### Source Editor Logic (Authoring & Transformation)
- **Dedicated Environment** : Espace distinct du quiz où l'auteur prépare ses bundles.
- **Transformation Pipeline** : C'est dans cet éditeur que la Source est convertie en Custom Data optimisé.
- **IA DHTML Generation** : L'auteur utilise l'IA dans l'éditeur pour générer et valider la fiche technique (DHTML) avant de publier le bundle.

### Feedback Patterns
- **Exploratory Error** : Le tap sur une réponse incorrecte (phase post-choix) déclenche l'apparition d'une zone d'explication bleue spécifique à l'option.
- **Seamless Success** : La bonne réponse devient le point d'ancrage visuel pour passer à l'item suivant.

## Responsive Design & Accessibility

### Responsive Strategy
- **Unified Touch Logic (Mobile & Tablet)** : La tablette suit la discipline du mobile. La source (Fiche) est masquée pendant l'énoncé et n'est consultable qu'après le choix utilisateur via un Drawer, préservant l'intégrité de la phase de spéculation.
- **Desktop Paradigm** : Utilisation de l'espace pour l'édition Source/Custom en parallèle (Source Editor). En phase quiz, maintien de la règle de visibilité post-choix.
- **Ergonomie Progressive** : Adaptation des zones de tap selon la densité de l'écran, sans jamais compromettre la visibilité de l'item central.

### Breakpoint Strategy
- **Compact (< 768px)** : Interface verticale optimisée pour une main. Bottom-sheet pour la fiche.
- **Medium/Wide (> 768px)** : Layout aéré, focus central maintenu pour le quiz, interface multi-panneaux pour l'édition de source.

### Accessibility Strategy
- **Compliance** : WCAG 2.1 Niveau AA.
- **Visual** : Ratios de contraste élevés dans le thème Slate Tech, support des tailles de police dynamiques.
- **Motor** : Cibles de tap généreuses (min 44px). Raccourcis clavier (Desktop) alignés sur les actions tactiles (Mobile).
- **Cognitive** : Élimination de la surcharge informationnelle par l'apparition contextuelle et différée des contrôles (Fiche, Edit, Suivant).

### Testing & Verification
- Validation tactile sur simulateurs et devices réels (latence < 100ms).
- Audit automatique d'accessibilité (Lighthouse/Axe).
- Vérification du comportement post-choix sur tous les breakpoints.
