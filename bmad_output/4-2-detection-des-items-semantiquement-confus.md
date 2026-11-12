# Story 4.2: Détection des Items Sémantiquement Confus

Status: done

## Story

As a Learner,
I want the system to automatically identify items that I confuse with each other,
So that I can conduct targeted differentiation work.

## Acceptance Criteria

1. **Given** the user's error history
2. **When** the system detects a recurring pattern of failure for items with high semantic or visual similarity
3. **Then** these items are marked as "Confused" in the metadata/dashboard
4. **And** a specific alert message is displayed during the next pass of these items ("Warning: Often confused with [Other Item]").

## Tasks / Subtasks

- [x] **Logic: Similarity & Confusion Engine (`srv_confusion.ts`)**
  - [x] Implement a utility to find "Candidate Confusions" (similar answers/prompts) for a failed item.
  - [x] Add a mechanism in `submitAnswer` to track if a failure correlates with a potential confusion.
- [x] **Store: Update `st_quiz.ts` and `CustomEntry` Schema**
  - [x] Support storage of confusion links in item metadata.
  - [x] Add an action to explicitly link a confusion during the "Discovery" phase.
- [x] **UI: Confusion Alert in QuizView**
  - [x] implement a "Confusion Ribbon" or alert in `QuizCard` when an item has known confusion links.
  - [x] Add a "Confused with?" button in the Discovery phase to allow manual or semi-automatic linking.
- [x] **Validation**
  - [x] Verify that confused items are easier to differentiate via the added alerts.
  - [x] Ensure the detection logic doesn't impact performance (NFR2).

## Dev Notes

- **Detection Strategy**: In a self-graded system, we'll use a "Did you confuse this with...?" suggestion list when an item is graded 0 or 1.
- **Data Structure**: `metadata: { confusedWith: { [entryId: string]: count } }`.
- **UI**: Slate Tech style - subtle warning icons (lucide-react `AlertOctagon` or `GitCompare`).

## Dev Agent Record

### Agent Model Used
Antigravity (Claude 3.5 Sonnet variant)

### Implementation Plan
1. Create `srv_confusion.ts` for fuzzy matching/similarity.
2. Update `st_quiz.ts` to handle confusion state.
3. Add "Confusion Linker" UI to the discovery phase of `QuizView`.
4. Add "Confusion Alert" UI to the answering phase of `QuizView`.

### Completion Notes
- Created `srv_confusion.ts` for string similarity (Levenshtein).
- Implemented automatic suggestion of confused items on failure.
- Added UI ribbon for historical confusion warnings.
- Added UI suggestion grid in the discovery phase.
- Verified with unit tests (`srv_confusion.test.ts` and `st_confusion.test.ts`).

### File List
- `next/src/services/srv_confusion.ts`
- `next/src/services/srv_confusion.test.ts`
- `next/src/stores/st_confusion.test.ts`
- `next/src/stores/st_quiz.ts` (Modified)
- `next/src/components/features/quiz/QuizView.tsx` (Modified)

### Change Log
- 2026-02-11: Initial story creation and planning.
