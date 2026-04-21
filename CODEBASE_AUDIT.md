# Day Organizer Codebase Audit (April 21, 2026)

## Scope

- Full repository static audit of application code, API routes, data/sync layers, and auth integrations.
- Validation commands run in this audit:
    - `npm test -- --runInBand`
    - `npm run lint`
    - `npm run build`
    - `npm audit --omit=dev` (blocked by registry permissions in this environment)

## Executive Summary

The project is in generally solid shape from a correctness baseline: all test suites pass, linting passes, and production build passes in this environment.

The most important remaining risks are:

1. **Sensitive OAuth tokens are copied from httpOnly session storage into client-side persisted preferences** (and can then be synced), which weakens token security posture.
2. **Dashboard pages are extremely large and state-heavy**, increasing regression risk and slowing feature iteration.
3. **Cloud sync observability and failure handling are still limited** (errors are logged, but retries/backoff/UX feedback are basic).

---

## High Severity Findings

### 1) Google OAuth tokens are persisted client-side in user preferences

**Impact:** Access/refresh tokens can be exposed via client-side storage or downstream sync surfaces, undermining the security benefit of httpOnly session cookies.

**Evidence:**

- Google callback stores tokens server-side in encrypted session cookie (`session.googleTokens`).
- Profile callback then calls `/api/google/tokens` and writes returned tokens into `preferences.googleCalendarTokens` via `DataService.savePreferences`.
- `UserPreferences` type explicitly models persisted `googleCalendarTokens`.

**Recommendation:**

- Keep Google OAuth credentials server-only.
- Replace persisted token blobs with a boolean/status record (connected, last validated at, account email).
- Update API routes to always read tokens from server session (or secure server DB), never from client preferences.

---

## Medium Severity Findings

### 2) Dashboard feature pages remain very large monoliths

**Impact:** Higher change-risk, slower code review, and harder test isolation.

**Evidence (line counts):**

- `plan/page.tsx`: 1735 lines
- `tasks/page.tsx`: 1274 lines
- `onboarding/page.tsx`: 1088 lines
- `habits/page.tsx`: 1061 lines
- `profile/page.tsx`: 963 lines
- `today-setup/page.tsx`: 891 lines
- `history/page.tsx`: 857 lines

**Recommendation:**

- Split by workflow sections + feature hooks (data fetching, form logic, mutation actions).
- Move presentational sections to typed subcomponents.
- Add focused unit tests around extracted hooks and pure utility transforms.

### 3) Sync error handling is functional but minimal for production resilience

**Impact:** Network or Supabase instability can leave users with retries that are opaque and potentially stale pending-change queues.

**Evidence:**

- Failed push increments retry count but does not implement exponential backoff, jitter, retry ceilings, or surfaced per-record failure messaging.
- Sync status exposes `lastError` but currently returns `null` in `getStatus()`.

**Recommendation:**

- Add bounded exponential backoff and dead-letter handling for repeatedly failing records.
- Populate `lastError` from push/pull failures and expose actionable UI hints.
- Add integration tests for retry progression and recovery.

---

## Low Severity / Observations

### 4) Build stability improved compared with prior snapshot

`npm run build` succeeds in this environment on April 21, 2026 (Next.js 16.2.3), including type-check and static generation.

### 5) Dependency vulnerability scan could not be completed here

`npm audit --omit=dev` failed with an npm advisory endpoint `403 Forbidden` from this environment, so dependency CVE status is **not** confirmed by this run.

---

## Validation Snapshot (April 21, 2026)

- `npm test -- --runInBand` ✅ pass (6 suites, 123 tests).
- `npm run lint` ✅ pass.
- `npm run build` ✅ pass.
- `npm audit --omit=dev` ⚠️ blocked by npm advisory endpoint permissions (`403 Forbidden`).

## Recommended Prioritized Plan

1. **Security first:** remove client-persisted `googleCalendarTokens`; shift to server-only token management.
2. **Refactorability:** decompose the top 3 largest dashboard pages (`plan`, `tasks`, `onboarding`) into hooks/components.
3. **Sync hardening:** add backoff + surfaced sync error states + retry policy tests.
4. **Ops hygiene:** rerun `npm audit --omit=dev` in CI or a network-allowed environment and track remediations.
