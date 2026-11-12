# Story 4.1: Mode de Jeu Arcade (Pression Temporelle)

Status: done

## Story

As a Learner,
I want to test my knowledge in a mode where time is limited by a stress gauge,
So that I can validate that my response is instinctive and not resulting from long deduction.

## Acceptance Criteria

1. **Given** the Arcade mode selected
2. **When** the quiz starts, a stress gauge (ArcadeIndicator) empties progressively
3. **Then** if I answer correctly before the end of the gauge, I earn a score bonus
4. **And** the gauge animation is smooth (constant 60 FPS).

## Tasks / Subtasks

- [x] Store: Add `Arcade` State to `st_quiz.ts` (AC: 1, 3)
  - [x] Add `mode: 'classic' | 'arcade'` to store.
  - [x] Implement a timer/gauge logic that depletes over time.
- [x] UI: Create `ArcadeIndicator` Component (AC: 2, 4)
  - [x] Implement a visual stress gauge using `framer-motion`.
  - [x] Integrate it into the `QuizView`.
- [x] Logic: Arcade Bonus & Success Conditions (AC: 3)
  - [x] Implement score bonus calculation based on remaining time.
  - [x] Handle "Time's Up" scenario (automatic incorrect or reveal).
- [x] Validation & Polish (AC: 4)
  - [x] Ensure 60 FPS performance.
  - [x] Test transitions between items in Arcade mode.

## Dev Notes

- **Animations**: Use `motion.div` with `animate` for the gauge.
- **Timing**: Use `requestAnimationFrame` or a highly efficient interval for the gauge decrement if needed, but `framer-motion` durations are usually sufficient.
- **SRS integration**: Arcade results should impact SRS stats just like classic results, but potentially with a "Reflex" weight.

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 4.1]
- [UX Spec: Arcade Mode visual feedback]

## Dev Agent Record

### Agent Model Used
Antigravity (Claude 3.5 Sonnet variant)

### Debug Log References

### Completion Notes List
- Added `mode` and `arcadeTimer` to `st_quiz.ts`.
- Implemented `tickArcadeTimer` for smooth state updates.
- Created `ArcadeIndicator` with 60fps refresh via `requestAnimationFrame`.
- Updated `LibraryView` with mode selection buttons.
- Updated `QuizView` and `QuizSummary` for bonus score feedback.

### File List
- `next/src/stores/st_quiz.ts` (Modified: Added Arcade state and actions)
- `next/src/components/features/quiz/ArcadeIndicator.tsx` (Created: Stress gauge component)
- `next/src/components/features/quiz/QuizView.tsx` (Modified: Integrated Arcade UI)
- `next/src/components/features/library/LibraryView.tsx` (Modified: Added mode selection)
- `next/src/stores/st_arcade.test.ts` (Created: Store tests for Arcade mode)

## Dev Agent Record (Review Follow-up)

### Issues Addressed
1. **Race Condition (Critical)**: Added `isLoading` guard and proper state syncing in `tickArcadeTimer`.
2. **Jarring Transition (High)**: Implemented a visual `TimeoutOverlay` in `QuizView.tsx`.
3. **Timer Ticking Post-Reveal (High)**: Timer now stops immediately when the answer is revealed.
4. **Accessibility (Medium)**: Added `aria-live="assertive"` to time-critical alerts.
5. **Bonus Logic (Medium)**: Upgraded from linear to quadratic bonus calculation to better reward speed.
6. **Hardcoded Constants (Low)**: Introduced `QUIZ_MODES` constant object.

### Verification
- Ran `npm test src/stores/st_arcade.test.ts` -> **Passes (5/5)**.
- Ran `npm run build` -> **Success**.
