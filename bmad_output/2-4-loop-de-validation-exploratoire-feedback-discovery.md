# Story 2.4: Loop de Validation Exploratoire (Feedback & Discovery)

Status: done

## Story

As a Learner,
I want to be able to explore explanations after my choice and consult the "Fiche",
So that I can transform every error into a documentary opportunity.

## Acceptance Criteria

1. **Given** a response given by the user
2. **When** the state transitions to the post-choice phase
3. **Then** the current card remains visible.
4. **And** the "Show Details" (Fiche) and "Next (Enter)" buttons appear.
5. **And** a tap on "Fiche" toggles the display of supplementary metadata/notes.
6. **And** clicking "Next" (or Enter key) triggers the transition to the next item in the queue.
7. **And** if available, wrong choice details are highlighted during this phase. [Verified: Red theme applied on Grade < 3]

## Tasks / Subtasks

- [x] State Management Enhancement (`st_quiz.ts`)
  - [x] Implement a `phase` state: `answering` | `discovery`.
  - [x] Update `submitAnswer` to transition to `discovery` instead of auto-advancing.
  - [x] Add a `nextEntry` action to handle queue progression.
  - [x] Store `lastQuality` for contextual UI updates.
- [x] UI Component Updates (`QuizView.tsx`)
  - [x] Implement the "Post-Choice" overlay/controls.
  - [x] Add a "Fiche" toggle to reveal item metadata (Custom Layers/Original Details).
  - [x] Implement the "Next" button logic and keyboard listener (`Enter`).
  - [x] Add conditional highlighting for "Forgot/Hard" choices (AC-7).
- [x] Polish & Feedback
  - [x] Add smooth transitions between answering and discovery phases.
  - [x] Ensure "Fiche" content is responsive and readable.
  - [x] Fixed hydration warnings for date rendering.

## Dev Notes

- **Architecture**: Follow the `st_` (Zustand) -> `srv_` (Logic) -> `View` (React) pipeline.
- **Components**: The "Fiche" shows answer and custom notes (e.g. mnemonics). Highlighted in ROSE for failures.
- **Shortcuts**: `Enter` / `Space` reveals answer, then `Enter` / button for "Next".

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 2.4]
- [Source: _bmad-output/planning-artifacts/prd.md#Experience Interface]

## Dev Agent Record

### Agent Model Used
Antigravity (Claude 3.5 Sonnet variant)

### Debug Log References
- Fixed lint error: "Error: Calling setState synchronously within an effect" by using `key={entry?.id}` on `QuizControls`.
- Fixed JSX quote escaping issues.
- Fixed `any` type usage in `io_anki.ts` for SQL.js integration.
- **Code Review Fix**: Implemented AC-7 conditional themes in Discovery phase.
- **Code Review Fix**: Abstracted Mastery labeling logic from component.
- **Code Review Fix**: Resolved hydration mismatch risk for `toLocaleDateString`.

### Completion Notes List
- Successful implementation of the Exploratory Validation Loop.
- Red-Green-Refactor cycle followed with `st_quiz_phase.test.ts`.
- Adversarial Code Review issues addressed and verified.

### File List
- `next/src/stores/st_quiz.ts` (Modified: Phased logic + lastQuality store)
- `next/src/components/features/quiz/QuizView.tsx` (Modified: Discovery UI + AC-7 fix)
- `next/src/stores/st_quiz.test.ts` (Modified: Phased test sync)
- `next/src/stores/st_quiz_phase.test.ts` (Created: New phase validation)
- `next/src/services/io_anki.ts` (Modified: Linting & SSR safety)
- `next/src/app/page.tsx` (Modified: Dynamic imports for SSR)
- `next/src/components/features/library/ImportSource.tsx` (Modified: SSR safety)
- `next/src/app/globals.css` (Modified: Animation/Glassmorphism tokens)
- `next/src/app/layout.tsx` (Modified: Root configuration)
