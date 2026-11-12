# Story 2.3: Interface Quiz "Slate Tech" (Vue Classique)

Status: done

## Story

As a Learner,
I want a clean interface displaying the central card and grading options,
So that I can fully focus on my learning without visual clutter.

## Acceptance Criteria

1. **Given** an active quiz session
2. **When** I am on a question
3. **Then** I see the "Prompt" field in a central, premium card.
4. **And** I can click "Reveal" to see the "Answer" field.
5. **And** once revealed, I see 6 grading buttons (0 to 5) with empathetic labels.
6. **And** a progress bar shows my advancement in the current session.
7. **And** smooth transitions (animations) occur between questions.
8. **And** when the session finishes, a summary screen displays my score and session stats.

## Tasks / Subtasks

- [x] UI Component Development (`QuizView.tsx`)
  - [x] Implement the central card with Framer Motion for transitions.
  - [x] Implement the Grading Button group (0-5).
  - [x] Implement the Progress Bar component.
- [x] Logic Integration
  - [x] Connect the UI to `useQuizStore`.
  - [x] Handle keyboard shortcuts (Space to reveal, 0-5 for grading).
- [x] Summary Screen
  - [x] Design and implement the post-quiz recap (Stats, Mastery progress).
- [x] Polish & Aesthetics
  - [x] Apply "Slate Tech" design tokens (Glassmorphism, subtle micro-animations).

## Dev Notes

- **Animations**: Use `framer-motion` (already in dependencies) for card flips or slide-outs.
- **Accessibility**: ARIA labels for grading buttons and keyboard focus.
- **Shortcuts**: `Space`/`Enter` = Reveal, `0-5` = Grading.

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 2.3]
- [Source: _bmad-output/planning-artifacts/prd.md#Experience Interface]

## Dev Agent Record

### Agent Model Used

Antigravity (Claude 3.5 Sonnet)

### Debug Log References

- Dashboard SPA Shell implemented in `page.tsx`.
- Library list and Start Quiz logic integrated.
- Premium Quiz UI with Framer Motion transitions.
- Keyboard shortcuts (Space/0-5) verified.
- Build and lint passing.
- **Code Review Fixes**: Empathetic labels, ARIA accessibility, mastery progress indicator, and visual loading feedback.

### Completion Notes List

- Implemented `QuizView.tsx`, `LibraryView.tsx`, and updated `ImportSource.tsx`.
- Applied "Slate Tech" design system (Outfit/Inter fonts, rounded-3xl, glassmorphism).
- Integrated `framer-motion` for all view transitions and card flips.
- Added summary screen with accuracy and mastery stats.

### File List

- `next/src/components/features/quiz/QuizView.tsx`
- `next/src/components/features/library/LibraryView.tsx`
- `next/src/components/features/library/ImportSource.tsx` (Redesign)
- `next/src/app/page.tsx` (App Shell)
- `next/src/app/layout.tsx` (Typography upgrade)
- `next/src/app/globals.css` (Premium tokens)
- `next/src/services/io_anki.ts` (CDN/Build fix)
