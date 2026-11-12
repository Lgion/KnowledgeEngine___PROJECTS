# Story 3-2-ajout-de-mnemotechniques-notes-custom-layer: done

Status: done

## Story

As a Creator,
I want to add personal notes or images (mnemonics) to an item,
So that I can facilitate long-term memorization.

## Acceptance Criteria

1. **Given** the item editing interface (Edit Drawer)
2. **When** I add a note in the dedicated field and click "Save"
3. **Then** the data is saved in the `CustomEntries` table linked to the source ID/entry ID
4. **And** the note is immediately displayed during subsequent appearances of the item (Question & Discovery phase)
5. **And** the UI provides visual feedback confirming the save was successful

## Tasks / Subtasks

- [x] Store: Add `updateEntry` Action to `st_quiz.ts` (AC: 3)
  - [x] Implement an action to update a specific `CustomEntry` in the store and DB.
- [x] UI: Enable Field Editing in `EditDrawer` (AC: 1-2)
  - [x] Unlock the textarea in `EditDrawer`.
  - [x] Bind state to the textarea for local editing.
  - [x] Implement the "Save Changes" button trigger.
- [x] UI: Display Notes in Quiz View (AC: 4)
  - [x] Ensure `QuizCard` and "Fiche" display the updated notes from `customLayers.notes`.
- [x] Validation & Polish (AC: 5)
  - [x] Add a success toast or animation upon saving.
  - [x] Verify persistence after refreshing the session.

## Dev Notes

- **Persistence**: Use `await db.customEntries.put(updatedEntry)` to sync with Dexie.
- **State**: The `st_quiz.ts` store should reflect the updated entry so the UI re-renders immediately.
- **Schema**: Data goes into `customLayers: { notes: string }`.

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 3.2]
- [Source: next/src/schemas/zod_models.ts#CustomEntrySchema]

## Dev Agent Record

### Agent Model Used
Antigravity (Claude 3.5 Sonnet variant)

### Debug Log References

### Completion Notes List

### File List
- `next/src/stores/st_quiz.ts` (Modified: Added `updateEntryNotes` action with `isLoading` support)
- `next/src/components/features/quiz/QuizView.tsx` (Modified: Refactored `EditDrawer` for UX protection and architectural compliance)

## Dev Agent Record (Review Follow-up)
- **Resolved review finding [Medium]**: Added backdrop click protection and "Unsaved Changes" confirmation.
- **Resolved review finding [Medium]**: Refactored state synchronization using a keyed content component, removing `useEffect` anti-pattern.
- **Resolved review finding [Low]**: Added `isLoading` state sync to `updateEntryNotes`.
- **Resolved review finding [Low]**: Added `Cmd+Enter` (and `Ctrl+Enter`) shortcut for saving notes.
