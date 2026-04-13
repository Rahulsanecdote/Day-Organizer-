# Day Organizer Codebase Audit (April 13, 2026)

## Scope

- Static audit of the entire repository (`src`, API routes, sync layer, auth flow, and build behavior).
- Validation commands run: `npm test -- --runInBand`, `npm run lint`, `npm run build`.

## Executive Summary

The app's biggest functional risk is **integration mismatch across Google Calendar + sync flows**. The UI sends one payload format, the API expects another, and session token lifecycle conflicts with the client persistence approach. This produces user-visible failure modes that feel "illogical" (calendar import appears connected but doesn't reliably work).

The second major issue is **maintainability-driven UI inconsistency**: very large page components, extensive inline styles, and native `alert`/hard navigation patterns cause a fragmented experience and make defects more likely.

---

## High Severity Findings

### 1) Google Calendar import contract mismatch (client ↔ server)

**Impact:** Calendar import can silently fail or return unexpected data.

- Morning flow posts `{ tokens, start, end }` to `/api/google/events`.
- API route ignores those fields and only reads `date`, then relies on tokens from server session.
- This is a hard contract mismatch between caller and endpoint.

**Evidence:**

- `src/app/(dashboard)/morning/page.tsx` sends `tokens/start/end`.
- `src/app/api/google/events/route.ts` expects `date` and `session.googleTokens`.

**Recommendation:**

- Define one canonical contract for event fetch (prefer server-side session only).
- Update morning flow to send `{ date }`.
- Remove client-side token passing entirely.

### 2) OAuth token lifecycle is internally inconsistent

**Impact:** Connected Google account state is unstable, especially across page transitions.

- `/api/google/tokens` is single-use and clears session tokens after returning them.
- `/api/google/events` later requires session tokens to exist.
- After token retrieval, events endpoint can return 401 even though UI may show "connected".

**Evidence:**

- `src/app/api/google/tokens/route.ts` deletes `session.googleTokens`.
- `src/app/api/google/events/route.ts` requires `session.googleTokens?.access_token`.

**Recommendation:**

- Keep tokens server-side (session/DB) and never rely on browser-stored raw OAuth tokens.
- Replace "single-use token download" with a durable server token reference strategy.

### 3) Realtime sync subscription is likely misconfigured

**Impact:** Cross-device updates may not arrive reliably.

- `postgres_changes` subscription is configured with `event`, `schema`, `filter`, but no explicit `table` binding.
- Handler logic expects `payload.table` and filters by table list.

**Evidence:**

- `src/lib/sync/SyncService.ts` subscription config and downstream table validation.

**Recommendation:**

- Register one subscription per table (`habits`, `tasks`, `daily_inputs`, `plans`) or use documented wildcard table semantics explicitly.
- Add integration tests around realtime callbacks.

---

## Medium Severity Findings

### 4) Build fragility due to runtime Google Font fetches

**Impact:** Production builds fail in restricted/no-egress environments.

- `next/font/google` pulls remote CSS during build.
- Current build fails when fonts cannot be fetched.

**Evidence:**

- `src/app/layout.tsx` imports `Inter` and `Cormorant_Garamond` from `next/font/google`.
- `npm run build` failed in this environment with font fetch errors.

**Recommendation:**

- Use local/self-hosted fonts (`next/font/local`) for deterministic builds.

### 5) Incomplete auth UX path

**Impact:** User expects social sign-in option that is not implemented in UI.

- Login page has TODO for Google OAuth button.

**Evidence:**

- `src/app/(auth)/login/page.tsx` TODO comment.

**Recommendation:**

- Either implement the button or remove all related messaging/dead code to reduce confusion.

### 6) UX consistency issues from browser primitives

**Impact:** Interface feels abrupt and less polished.

- Multiple pages use blocking `alert()` dialogs.
- Some flows use `window.location.href` instead of router navigation.

**Evidence:**

- `src/app/(dashboard)/today-setup/page.tsx` uses both `alert()` and `window.location.href`.

**Recommendation:**

- Replace with non-blocking toast system and `router.push` for in-app transitions.

---

## Structural / Maintainability Findings

### 7) Extremely large page components increase defect rate

**Impact:** Hard to reason about UI/state logic; regression risk is high.

Largest files observed:

- `src/app/(dashboard)/plan/page.tsx` (~1376 lines)
- `src/app/(dashboard)/tasks/page.tsx` (~1272 lines)
- `src/app/(dashboard)/profile/page.tsx` (~955 lines)
- `src/app/(dashboard)/history/page.tsx` (~857 lines)
- `src/app/(dashboard)/today-setup/page.tsx` (~750 lines)
- `src/app/(dashboard)/habits/page.tsx` (~736 lines)

**Recommendation:**

- Split by domain hooks + presentational components.
- Extract shared form sections, cards, and modal patterns.
- Add feature-level tests for each extracted unit.

---

## Suggested Stabilization Plan (order)

1. **Fix Google flow contract + token lifecycle** (blocker).
2. **Fix realtime subscription table bindings**.
3. **Standardize UX primitives** (toast + router navigation).
4. **Refactor giant dashboard pages into smaller units**.
5. **Harden build with local fonts**.

## Current Validation Snapshot

- `npm test -- --runInBand` ✅ pass (all test suites passing).
- `npm run lint` ✅ pass.
- `npm run build` ❌ fails in current environment due to Google Font fetch failures.
