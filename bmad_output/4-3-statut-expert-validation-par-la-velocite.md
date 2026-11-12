# Story 4.3: Statut "Expert" - Validation par la Vélocité

Status: done

## Story

As a Power User,
I want my "Expert" status to be validated only if my response speed is below a defined threshold (1.5s),
So that I can guarantee "reflex-type" memorization and protect my progress.

## Acceptance Criteria

1. **Given** an item already classified as "Medium" or "Expert" (Repetition > 2)
2. **When** I answer correctly in Arcade mode with a remaining timer >= 70% (<= 1.5s elapsed)
3. **Then** the item is marked as "Reflex Verified" in its metadata.
4. **And** while "Reflex Verified", an isolated fail (Quality < 3) does not reset the SRS progress entirely, only degrades it slightly (Protected Mode).
5. **And** a "Reflex" badge is displayed in the Discovery phase when this condition is met.

## Tasks / Subtasks

- [x] **Schema: Update `zod_models.ts`**
  - [x] Add `isReflexVerified` to `SRSStatsSchema` (boolean, default false).
- [x] **Logic: Enhance `srv_srs.ts`**
  - [x] Update `calculateNextStats` to accept `options: { isArcade: boolean, timerValue: number }`.
  - [x] Implement Reflex Tracking: Set `isReflexVerified: true` if `isCorrect && isArcade && timerValue >= 70`.
  - [x] Implement Reflex Protection: If `isReflexVerified` is true and a fail occurs, reduce `repetition` and `interval` by 10% instead of resetting to 0.
- [x] **Store: Update `st_quiz.ts`**
  - [x] Pass `mode` and `arcadeTimer` to `calculateNextStats` in `submitAnswer`.
- [x] **UI: Feedback in `QuizView.tsx`**
  - [x] Add a `Zap` or "Reflex Verified" badge in the `QuizCard` during the discovery phase if the item just gained or already has reflex status.
  - [x] Add a visual hit/feedback when a Reflex bonus is achieved.
- [x] **Validation**
  - [x] Verify protection logic with unit tests.
  - [x] Verify threshold detection (1.5s / 70%) with integration tests.

## Dev Notes

- **Threshold Calculations**: 
  - Gauge duration: 5s (defined in `ArcadeIndicator.tsx`).
  - Elapsed time 1.5s => 30% spent => 70% remaining.
- **Protection Logic**: 
  - Standard fail: `repetition = 0`, `interval = 1`.
  - Reflex Protected fail: `repetition = floor(repetition * 0.9)`, `interval = floor(interval * 0.9)`, and `isReflexVerified` resets to `false`.
- **UI**: Slate Tech style. Use `lucide-react` `Zap` icon in cyan-500.

## Dev Agent Record

### Agent Model Used
Antigravity (Claude 3.5 Sonnet variant)

### Implementation Plan
1. Update `SRSStatsSchema`.
2. Modify `calculateNextStats` signature and implementation in `srv_srs.ts`.
3. Update `submitAnswer` in `st_quiz.ts` to call the new logic.
4. Add the "Reflex" badge to `QuizCard`.

### Completion Notes
- Updated `SRSStatsSchema` with `isReflexVerified`.
- Modified `srv_srs.ts` to detect "Reflex" speed (timer >= 70%) for items with Rep > 2.
- Implemented **Reflex Protection**: if verified, a fail only reduces stats by 10% (keeping repetition and interval high).
- Added cyan Zap badges in `QuizView.tsx` to signal Reflex status.
- Verified with unit tests in `src/services/srv_reflex.test.ts`.

### File List
- `next/src/schemas/zod_models.ts`
- `next/src/services/srv_srs.ts`
- `next/src/stores/st_quiz.ts`
- `next/src/components/features/quiz/QuizView.tsx`
- `next/src/services/srv_reflex.test.ts`

### Change Log
- 2026-02-11: Initial story creation and planning.
