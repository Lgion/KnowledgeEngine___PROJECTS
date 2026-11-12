---
project_name: 'knowledge-engine'
user_name: 'Mr_Quiz'
date: '2026-11-13T06:45:00Z'
status: 'active'
---

# Project Context for AI Agents

_Critical rules and architecture patterns for Knowledge Engine (`knowledge-engine`)._

---

## Technology Stack & Versions

- **Framework**: Next.js 15 (App Router, `src/` directory, Turbopack/SWC)
- **UI**: React 19, TypeScript 5, Tailwind CSS v4 (`@tailwindcss/postcss`), `framer-motion`, `lucide-react`
- **Local Persistence (Offline-First)**: Dexie.js v4 (`KnowledgeEngineDB` in `src/services/db_client.ts`)
- **State Management**: Zustand v5 (`src/stores/st_quiz.ts`)
- **Validation**: Zod v3 (`src/schemas/zod_models.ts`)
- **AI**: Google GenAI SDK `@google/genai` (`gemini-4-hydrogen` / `gemini-4-argon`, server-side only in `src/app/api/**`)
- **Auth & Cloud Sync**: Clerk (`@clerk/nextjs` v6) + MongoDB v6 (`src/lib/mongodb.ts`)
- **Ingestion / Export**: `jszip` + `sql.js` (client-side `.apkg`), `pdf-parse` / multimodal Gemini PDF, `jspdf` + `jspdf-autotable`
- **Testing**: Vitest v3 + `jsdom` + `fake-indexeddb`

---

## Architecture & Naming Conventions

- **Data Model (Immutable Source + Mutable Overlay)**:
  - `Source` (`db.sources`): baseline immutable raw data + `metadata.mapping` (`promptField`, `answerField: string[]`, `tipFields?: string[]`).
  - `CustomEntry` (`db.customEntries`): mutable overlay with `stats` (`SRSStats` including `isReflexVerified`), `customLayers` (`notes`, `rawData`, `aiHint`, etc.), and `metadata` (`isDeepGap`, `confusions`, `aiConfusionPatterns`).
- **Directory & File Prefixes**:
  - `src/app/api/**`: Next.js Route Handlers (AI, PDF ingest, MongoDB sync, Marketplace).
  - `src/services/srv_*.ts`: Domain services (`srv_srs.ts`, `srv_bundle.ts`, `srv_confusion.ts`, `srv_sync.ts`, `srv_ai.ts`).
  - `src/services/io_*.ts`: Import/export/promotion services (`io_ingestion.ts`, `io_anki.ts`, `io_export.ts`, `io_freeze.ts`).
  - `src/stores/st_*.ts`: Zustand stores (`st_quiz.ts`).
  - `src/schemas/zod_models.ts`: Canonical Zod schemas and inferred TypeScript types.
  - `src/components/features/**` & `src/components/shared/**`: Client components (`"use client"`).

---

## Critical Implementation Rules

- **Strict TypeScript**: Share canonical types (`QuizSessionConfig`, `CustomEntry`, `Source`, `SRSStats`) instead of duplicating interfaces across components and stores.
- **Security**: Never commit real API keys or DB credentials into `.env.example` or source files. Keep `GEMINI_API_KEY` and `MONGODB_URI` strictly server-side in `src/app/api/**`.
- **Quiz Store Integrity**:
  - `startSession` and `nextEntry` are async (`await` them in callers and tests).
  - Arcade mode activates when `mode === 'arcade'` OR `config.difficulty !== 'easy'` (`timerDuration !== null`).
  - Keep atomic Zustand selectors (`useShallow` when returning objects) to preserve 60 FPS in Arcade mode.
- **Verification**: Run `npm run typecheck`, `npm test`, and `npm run build` before considering changes complete.
