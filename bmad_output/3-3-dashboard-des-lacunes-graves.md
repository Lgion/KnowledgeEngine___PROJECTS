# Story 3.3: Dashboard des lacunes graves

Status: done

## Story

As a Learner,
I want to see a list of items I consistently fail (Deep Gaps),
So that I can take corrective action (archiving, renaming, or creating intensive mnemonics).

## Acceptance Criteria

1. **Given** the Library/Dashboard view
2. **When** there are items with `metadata.isDeepGap === true`
3. **Then** a "Lacunae" or "Priority Focus" section is displayed
4. **And** each item shows its prompt, answer, and the number of failed reviews
5. **And** clicking a "Fix" button opens the Edit Drawer for that specific item
6. **And** resolving the gap (improving performance in future sessions) eventually removes the item from this list

## Tasks / Subtasks

- [x] UI: Create `LacunaeSection` Component (AC: 1-4)
  - [x] Implement a specialized list/grid for items marked as `isDeepGap`.
  - [x] Style with a "Warning/Priority" aesthetic (e.g., subtle rose background).
- [x] Logic: Data Retrieval (AC: 2)
  - [x] Add a query to `db_client.ts` or a new hook to fetch `isDeepGap` entries.
- [x] UI: Integrate `EditDrawer` (AC: 5)
  - [x] Allow opening the `EditDrawer` directly from the Lacunae list.
- [x] Validation & Polish (AC: 6)
  - [x] Verify that saving notes via the dashboard persists correctly.
  - [x] Check performance with many lacunae.

## Dev Notes

- **Query**: `db.customEntries.where('metadata.isDeepGap').equals(1).toArray()` (Note: Dexie might need an index for this if performance is an issue, but for now a simple filter is fine).
- **Reusable UI**: The `EditDrawer` should be decoupled or shared between `QuizView` and `LibraryView`.

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 3.3]
- [Context: Story 3.2 persistence logic]

## Dev Agent Record

### Agent Model Used
Antigravity (Claude 3.5 Sonnet variant)

### Debug Log References

### Completion Notes List

### File List
- `next/src/app/page.tsx` (Modified: Integrated navigation and import flow)
- `next/src/services/db_client.ts` (Modified: Added index for `metadata.isDeepGap`, bumped version)
- `next/src/stores/st_quiz.ts` (Modified: Added general `updateEntry` action with multi-window/queue sync support)
- `next/src/components/shared/EditDrawer.tsx` (Created: Shared component with accessibility and crash-protection)
- `next/src/components/features/quiz/QuizView.tsx` (Modified: Used shared `EditDrawer`)
- `next/src/components/features/library/LacunaeSection.tsx` (Created: Anti-flicker loading, accessible section for high-risk items)
- `next/src/components/features/library/LibraryView.tsx` (Modified: Integrated `LacunaeSection`)

## Dev Agent Record (Review Follow-up)
- **Resolved review finding [Critical]**: Fixed crash potential in `EditDrawer` by adding null-checks and mounting guards.
- **Resolved review finding [High]**: Fixed stale data risk by ensuring `updateEntry` synchronizes the active quiz queue.
- **Resolved review finding [Medium]**: Fixed flickering loading state in `LacunaeSection` by checking `isUndefined`.
- **Resolved review finding [Medium]**: Improved accessibility with ARIA labels on all interactive elements.
- **Resolved review finding [Medium]**: Hardened Dexie query safety by standardizing on `1` for boolean indexing.
