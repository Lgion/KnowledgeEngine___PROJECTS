# Story 5.1: Exportation du Bundle Enrichi (Full JSON)

Status: done

## Story

As a Creator,
I want to export my bundle including the original source, my notes, and performance statistics in a single JSON file,
So that I can backup my work or share it with other users.

## Acceptance Criteria

1. **Given** an active bundle with personalized data (notes, SRS stats)
2. **When** I click "Export Bundle" in the Library or Settings view
3. **Then** the system generates a structured JSON file containing the corresponding `Sources` and `CustomEntries` data.
4. **And** the exported file is compatible with the existing import service (`io_ingestion.ts`) for re-importing by another user.
5. **And** a "Save As" dialog is triggered to let the user save the file locally.

## Tasks / Subtasks

- [x] **Service: Export Logic (`io_export.ts`)**
  - [x] Implement a function to fetch all data related to a specific `SourceID`.
  - [x] Package `Source` and its linked `CustomEntries` into a single JSON object.
  - [x] Implement the browser download trigger (Blob/URL.createObjectURL).
- [x] **UI: Export Action in LibraryView**
  - [x] Add an "Export" button/icon on bundle cards in the `LibraryView`.
  - [x] Add a loading state during the generation of the export file.
- [x] **Integration & Validation**
  - [x] Verify that an exported file can be imported back without data loss.
  - [x] Validate the export JSON against a dedicated Zod schema if necessary.

## Dev Notes

- **Export Format**:
  ```json
  {
    "version": "1.0",
    "exportDate": "...",
    "source": { ... },
    "entries": [ { ... }, { ... } ]
  }
  ```
- **Service Pattern**: Reuse the `io_` prefix as defined in architecture.
- **UI**: Use `lucide-react` `Download` icon. Consistent with Slate Tech design.

## Dev Agent Record

### Agent Model Used
Antigravity (Claude 3.5 Sonnet variant)

### Implementation Plan
1. Create `srv_export.ts` (or `io_export.ts` as per architecture) to handle the data gathering and file generation.
2. Add a selector in `st_library.ts` (if it exists) or use `db_client` directly to fetch bundle data.
3. Update `LibraryView` to include the export button.
4. Test the round-trip (Export -> Import).

### Completion Notes
- Created `KnowledgeBundleSchema` in `zod_models.ts` for full ecosystem portability.
- Implemented `io_export.ts` using Blobs for browser-side file generation.
- Updated `io_ingestion.ts` to automatically detect if a JSON is a "Bundle" (enriched) or a "Raw Source" (needs mapping).
- Integrated "Export" icon (Download) in `LibraryView.tsx`.
- Updated `ImportSource.tsx` to handle bundle preview without requiring mapping step.
- Verified with `io_bundle.test.ts`.

### File List
- `next/src/schemas/zod_models.ts`
- `next/src/services/io_export.ts`
- `next/src/services/io_ingestion.ts`
- `next/src/components/features/library/LibraryView.tsx`
- `next/src/components/features/library/ImportSource.tsx`
- `next/src/services/io_bundle.test.ts`
