# Story 3-1-bouton-de-manipulation-contextuel-post-choix: done

Status: done

## Story

As a Learner,
I want to access the manipulation button only after making my choice and before moving to the next item,
So that I can amend my knowledge during the validation phase without breaking the initial reflection flow.

## Acceptance Criteria

1. **Given** an active quiz prompt with no answer given
2. **When** the user has not yet made a choice
3. **Then** the manipulation button is invisible or disabled
4. **When** the user selects an answer (correct or incorrect)
5. **Then** the manipulation button appears simultaneously with the "Fiche" and "Next" buttons
6. **When** the user clicks the button, a drawer (Sheet) or overlay opens for editing
7. **When** the user proceeds to the next item, the button disappears until the next choice

## Tasks / Subtasks

- [x] UI: Implement the Manipulation Button in `QuizControls` (AC: 1-5)
  - [x] Add a manipulation button (e.g., using `Settings2` or `PenLine` icon) in the discovery phase UI.
  - [x] Ensure it only appears when `phase === 'discovery'`.
  - [x] Style it to fit the "Slate Tech" glassmorphism aesthetic.
- [x] UI: Implement the Item Manipulation Drawer/Sheet (AC: 6)
  - [x] Create a bottom drawer or side sheet for item editing.
  - [x] Use `framer-motion` for smooth slide-in/out transitions.
  - [x] Add a "Cancel" or "Close" button.
- [x] Logic: Phase Synchronization (AC: 7)
  - [x] Verify the button is reset and hidden when moving to the next entry (`phase` resets to `answering`).
- [x] Validation & Polish
  - [x] Ensure keyboard accessibility (optional shortcut?).
  - [x] Verify layout doesn't break on mobile.

## Dev Notes

- **Architecture**: Stick to `st_quiz.ts` for phase monitoring.
- **Components**: Place the button reasonably in the `QuizControls` layout.
- **Animations**: Use the established `AnimatePresence` patterns from `QuizView.tsx`.
- **Note**: The actual field editing (Notes/Mnemonics) will be fully functional in Story 3.2, but the trigger and empty drawer belong here.

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 3.1]
- [Source: _bmad-output/planning-artifacts/prd.md#Experience Interface]
- [Context: Story 2.4 implementation of discovery phase]

## Dev Agent Record

### Agent Model Used
Antigravity (Claude 3.5 Sonnet variant)

### Debug Log References

### Completion Notes List

### File List
- `next/src/components/features/quiz/QuizView.tsx` (Modified: Added Manipulation Button, EditDrawer, keyboard shortcuts, and refactored failure logic)

## Dev Agent Record (Review Follow-up)
- **Resolved review finding [Medium]**: Added "Edit" label to manipulation button for better affordance.
- **Resolved review finding [Medium]**: Added 'e' keyboard shortcut for the edit drawer.
- **Resolved review finding [Low]**: Refactored `isFailure` logic into a reusable hook `useIsFailure`.
- **SSR Safety**: Restored hydration guard for date rendering.
