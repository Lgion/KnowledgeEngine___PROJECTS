# Story 5.2: Mécanisme de "Freeze" (Promotion en Source)

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a Knowledge Architect,
I want to promote my Custom Data (modified, updated, or transformed copy) to the rank of a new immutable "Original Source",
so that I can stabilize my iterations and create a new reference base for future personalizations.

## Acceptance Criteria

1. **Given** a bundle where `CustomEntries` contains a transformed/updated version of the original data (e.g. with custom notes, corrected prompts/answers)
2. **When** I trigger the "Freeze as New Source" action in the Library
3. **Then** the system packages the current state of all entries into a new immutable `Source` object.
4. **And** this new source is saved in the `sources` table with `type: "custom"`.
5. **And** the new source can be used as a standalone base to create new bundles (recursivity).
6. **And** any associated "Fiche" content (custom notes/layers) is integrated into the new source's `originalData` to become the new baseline.

## Tasks / Subtasks

- [x] **Service: Freeze Logic (`io_freeze.ts`)** (AC: 3, 4, 6)
  - [x] Implement `freezeBundle(sourceId: string, newName: string)` function.
  - [x] Consolidate `CustomEntry` data: merge `prompt`, `answer` and `customLayers.notes` into a new `RawItem` format.
  - [x] Create a new `Source` entry with the consolidated data.
- [x] **UI: Freeze Action in LibraryView** (AC: 2)
  - [x] Add a "Freeze" icon (`Snowflake` from lucide-react) to the bundle cards.
  - [x] Implement a simple naming prompt (default: "[Original Name] (Frozen)").
- [x] **Integration & Recursivity** (AC: 5)
  - [x] Ensure the frozen source appears in the library as an available source for new learning sessions.
  - [x] Verify that "re-importing" or creating a bundle from this frozen source works as expected.

## Dev Notes

- **Architecture Pattern**: promotion of "Overlay" (mutable) to "Source" (immutable).
- **Service Name**: `io_freeze.ts` (following `io_` prefix for data movement).
- **Data Transformation**:
  ```typescript
  const frozenItems = entries.map(e => ({
    prompt: e.prompt,
    answer: e.answer,
    notes: e.customLayers.notes || "",
    // potentially more fields if customLayers grows
  }));
  ```
- **Recursive usage**: A frozen source is just a regular `Source` in Dexie. The existing `ImportSource` or a new "Create Bundle from Source" action should handle it.

### Project Structure Notes

- Service goes to `next/src/services/io_freeze.ts`.
- UI updates in `next/src/components/features/library/LibraryView.tsx`.

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 5.2]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Architecture de Connaissances]

## Dev Agent Record

### Agent Model Used

Antigravity (Claude 3.5 Sonnet variant)

### Debug Log References

### Completion Notes List

- Implemented `freezeBundle` service in `io_freeze.ts`.
- Integrated Freeze action in `LibraryView` with `Snowflake` icon.
- Added `SourceCard` sub-component to handle different source states (Pure Source vs Active Bundle).
- Implemented "Initialize Learning Bundle" button for recursive creation.
- Updated `createBundle` to preserve `notes` during initialization.
- Added comprehensive unit tests in `io_freeze.test.ts`.
- **Review Fixes**: Properly typed `SourceCard`, isolated metadata in `io_freeze.ts`, and cleaned up utility imports (`cn`).

### File List

- `next/src/services/io_freeze.ts`
- `next/src/services/io_freeze.test.ts`
- `next/src/services/srv_bundle.ts`
- `next/src/components/features/library/LibraryView.tsx`
