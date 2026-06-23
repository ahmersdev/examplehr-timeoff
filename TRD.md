# Technical Requirements Document

## 1. Overview

This system is a demo HR time-off portal built with Next.js. It serves two roles — **employee** and **manager** — each interacting with a mock Human Capital Management (HCM) backend that simulates real-world unreliability.

Employees view leave balances, submit time-off requests, and track request history. Managers review a pending-approval queue, inspect live balance data per request, and approve or deny submissions.

### Why this is hard

The HCM backend is **eventually consistent, probabilistically flaky, and capable of silent failure**. These are not edge cases — they are deliberate behaviors in the mock API:

- **Silent failures** — `POST /api/hcm/balance/request` can return HTTP 200 with a valid request object while failing to deduct the employee's balance (`src/app/api/hcm/balance/request/route.ts`).
- **Stale reads** — `GET /api/hcm/balance` has a 5% chance of returning an outdated `available` value with an old `lastSyncedAt`.
- **External balance changes** — `POST /api/hcm/request/:id/approve` has a 5% chance of detecting a conflict (e.g. an anniversary bonus applied while the request was pending).
- **Service outages** — batch balance fetches and submissions can return 503.

The UI must feel instant — employees expect immediate feedback when submitting leave — while correctness is verified asynchronously against an unreliable source of truth. Employee and manager flows carry different risk profiles: an employee submitting their own request can tolerate a rare rollback, but a manager approving someone else's request must not act on stale balance data.

```
┌──────────┐   optimistic submit    ┌─────────────────┐
│ Employee │ ──────────────────────▶│ React Query     │
└──────────┘                      │ cache           │
                                    └────────┬────────┘
                                             │
┌──────────┐   live balance check           ▼
│ Manager  │ ──────────────────────▶┌─────────────────┐
└──────────┘                        │ Mock HCM API    │
                                      │ (route handlers)│
┌──────────────┐   60s drift check    └─────────────────┘
│ Reconciliation│ ──────────────────▶ React Query cache
└──────────────┘
```

---

## 2. Architecture Decisions

### TanStack Query (React Query) v5 for server state

**Chosen over SWR and Redux RTK Query.**

TanStack Query provides first-class mutation lifecycle hooks (`onMutate`, `onSuccess`, `onError`) that are essential for optimistic updates with rollback. The reconciliation loop relies on `queryClient.isMutating({ mutationKey: hcmMutations.all })` to skip drift checks while mutations are in-flight — a capability that requires coordinated access to both query and mutation state in a single client.

Cache surgery across list and per-cell keys (`hcmKeys.balances` and `hcmKeys.balance`) is done via `setQueryData`, `invalidateQueries`, and `cancelQueries` in `src/lib/hooks/balance-cache.ts`. Mutation keys (`hcmMutations.submit`, `hcmMutations.approve`, `hcmMutations.deny`) allow the reconciliation guard to treat all HCM writes as a single in-flight group.

SWR was rejected because its mutation story is thinner — it lacks the `isMutating` guard pattern and the dual `setQueryData` / `invalidateQueries` strategy needed for drift reconciliation without UI flicker.

RTK Query was rejected because it couples server state to Redux, adding boilerplate (slices, middleware, provider nesting) that is disproportionate for a UI-focused demo with no global normalized entity store.

**Key files:** `src/lib/queryClient.ts`, `src/lib/hooks/query-keys.ts`, `src/lib/hooks/balance-cache.ts`

### Zustand for client state

**Chosen over Redux and React Context.**

A single store (`src/store/useAppStore.ts`) holds ephemeral, cross-cutting UI state:

| Field | Purpose |
|-------|---------|
| `currentUser` | Demo role selection (no real auth) |
| `notifications` | Toast queue |
| `requestBalanceSnapshots` | Expected `available` balance after employee submit (manager drift detection) |
| `pendingRequests` | Locally tracked requests across role transitions |
| `reconciledAt` | Timestamp of last background reconciliation |

Zustand requires no provider wrapper and avoids the re-render cascades that React Context would cause when the notification queue updates. Redux was rejected because there is no need for middleware, time-travel debugging, or normalized entity slices.

### MSW for test and Storybook mocking

**Chosen over JSON Server and hardcoded fixtures.**

MSW intercepts the same `/api/hcm/*` HTTP contract used in production code. Handler factories in `src/mocks/handlers/` support scenario modes that are impossible with static fixtures:

| Mode | Behavior |
|------|----------|
| `default` | Normal operation with 10–30ms latency |
| `loading` | Infinite hang |
| `errors` | 503 on all endpoints |
| `stale` | Returns outdated balance data |
| `silent-failure` | 200 response but no balance deduction |
| `insufficient-balance` | 422 on submit |
| `anniversary-bonus` | +2 annual days on second balance read |
| `conflict-approve` | Always returns conflict on approve |

MSW runs in Vitest (`src/mocks/server.ts`, `vitest.setup.ts`) and Storybook (`.storybook/preview.tsx` via `msw-storybook-addon`). It is **not** started during `npm run dev`.

JSON Server was rejected because it cannot simulate silent failures, probabilistic chaos, or per-scenario handler switching without significant custom middleware.

Hardcoded fixtures were rejected because they cannot exercise optimistic update, rollback, or reconciliation flows that depend on mutable server state.

MSW handlers share `src/app/api/hcm/_lib/state.ts` with the Next.js route handlers, ensuring a single in-memory source of truth.

### Next.js App Router route handlers for runtime HCM

**Chosen as the dev-time HCM backend.**

Route handlers under `src/app/api/hcm/` implement the full HCM contract with probabilistic failure injection:

| Route | Latency | Failure modes |
|-------|---------|---------------|
| `GET /balances` | 300–800ms | 10% 503 |
| `GET /balance` | 100–300ms | 5% stale response |
| `POST /balance/request` | 400–900ms | 10% silent failure, 10% 503 |
| `POST /request/:id/approve` | 200–500ms | 5% conflict (anniversary bonus) |

During `npm run dev`, the client hits these real route handlers. MSW is reserved for isolated test environments. This split lets developers experience organic chaos in the browser while tests use deterministic scenario handlers.

The App Router was chosen because route handlers are colocated with the UI in a single Next.js project. Page routes (`src/app/page.tsx`, `src/app/(pages)/employee/page.tsx`, `src/app/(pages)/manager/page.tsx`) are thin re-exports of feature containers.

---

## 3. Data Fetching Strategy

### Batch vs per-cell endpoints

| Endpoint | Pattern | Used by | When |
|----------|---------|---------|------|
| `GET /api/hcm/balances` | Batch (all employees) | `useBalances`, `useReconciliation` | Employee dashboard, 60s drift check |
| `GET /api/hcm/balance` | Per-cell (`employeeId`, `locationId`, `leaveType`) | `useBalance`, submit verification, pre-approve fetch | Manager live balance per request; post-submit verification |
| `GET /api/hcm/requests` | Filtered list | `useRequests`, `usePendingRequests` | Employee history; manager queue |

The employee view needs all balances for a location — fetched via the batch endpoint and filtered client-side by `employeeId` and `locationId`. This minimizes round-trips for the balance grid.

The manager view needs **fresh single-cell truth** for each pending request. A `ManagerRequestBalanceLoader` component mounts one `useBalance` hook per visible request, comparing the live value against the `requestBalanceSnapshots` stored in Zustand at employee submit time. This N+1 pattern is acceptable for demo queue sizes.

Post-submit verification in `useSubmitRequest` also uses the per-cell endpoint to confirm the HCM actually deducted the balance after a 200 response.

### Polling and staleness intervals

| Mechanism | Interval | Source |
|-----------|----------|--------|
| Global `staleTime` | 30s | `src/lib/queryClient.ts` |
| `useBalances` `refetchInterval` | 30s | `src/lib/hooks/use-balances.ts` |
| `usePendingRequests` `refetchInterval` | 10s | `src/lib/hooks/use-requests.ts` |
| `useReconciliation` custom interval | 60s | `src/lib/hooks/use-reconciliation.ts` (`RECONCILE_INTERVAL_MS`) |
| UI `syncStatus` stale threshold | 5 min (`STALE_THRESHOLD_MS`) | `src/lib/hooks/use-balances.ts` |

**30s stale time + 30s refetch interval:** React Query considers balance data fresh for 30 seconds, avoiding refetch-on-mount churn. The 30s `refetchInterval` on `useBalances` provides passive background refresh so the employee grid stays reasonably current without user action.

**60s reconciliation:** A separate, slower drift detector runs outside React Query's polling. It fetches the batch endpoint, compares cached vs fresh values via `detectDrift`, and patches the cache with `setBalancesInCache` rather than invalidating (which would cause loading spinners and flicker). Reconciliation intentionally runs at half the frequency of balance polling because it is a heavier cross-check, not a display refresh.

**10s pending request poll:** The manager queue refreshes more aggressively because approvals are time-sensitive and multiple managers could theoretically act on the same queue.

**5 min sync status threshold:** The `SyncStatusBar` UI derives a `stale` indicator when `lastSyncedAt` on any balance cell exceeds 5 minutes, independent of React Query's `staleTime`.

### Optimistic vs pessimistic update choices

**Employee submit — optimistic** (`src/lib/hooks/use-submit-request.ts`)

- `onMutate`: snapshot cache, deduct balance in cache, show phantom `RequestCard`
- `onSuccess`: re-fetch per-cell balance, compare to `expectedAvailable`; mismatch triggers rollback
- Rationale: the employee owns the action. A slow UI (pessimistic wait) hurts the common case more than a rare rollback hurts the failure case. The employee sees instant balance deduction and can continue working.

**Manager approve — pessimistic balance fetch** (`src/lib/hooks/use-approve-request.ts`)

- `mutationFn`: calls `fetchBalance` before `approveRequest`; server may return `conflict: true`
- UI: row hidden optimistically via local `hiddenIds` state only — no cache mutation in `onMutate`
- Rationale: approving commits organizational resources. The manager must detect external balance changes (anniversary bonus, manual adjustment) before acting. A live balance fetch in the mutation function ensures the approve call is preceded by fresh data.

**Manager deny — optimistic balance restore** (`src/lib/hooks/use-deny-request.ts`)

- `onMutate`: snapshot cache, restore days to balance via `restoreBalanceInCache`
- Rationale: denial returns leave days to the employee. The optimistic restore gives immediate visual feedback that the balance is being returned, with snapshot rollback on error.

---

## 4. Optimistic Update Lifecycle

### Employee submit state diagram

```
                    ┌──────────────────────────────────────┐
                    │               IDLE                    │
                    └─────────────────┬────────────────────┘
                                      │ user submits
                                      ▼
                    ┌──────────────────────────────────────┐
                    │  OPTIMISTIC (mutation pending)        │
                    │  • cache deducted (onMutate)          │
                    │  • phantom RequestCard shown          │
                    │  • form disabled (isSubmitting)       │
                    │  • in-flight queries cancelled        │
                    └─────────┬──────────────┬──────────────┘
                              │              │
                   verify OK  │              │ error / verify fail
                              ▼              ▼
              ┌───────────────────┐   ┌──────────────────────┐
              │   CONFIRMED        │   │   ROLLED BACK         │
              │ • invalidate RQ    │   │ • restore snapshot    │
              │ • snapshot to ZS   │   │ • isRolledBack=true   │
              │ • add pending req  │   │ • error toast (API)   │
              │ • refetch requests │   │ • inline alert (UI)   │
              └───────────────────┘   └──────────────────────┘
```

### Silent HCM failure detection

Silent failures occur when the HCM returns HTTP 200 with a valid request object but does not deduct the balance. Detection happens in `useSubmitRequest` `onSuccess`:

1. HCM returns 200 + request object (mutation appears successful).
2. Client re-fetches the per-cell balance via `fetchBalance(employeeId, locationId, leaveType)`.
3. Compares `fetched.available` to `expectedAvailable` (the value computed in `onMutate` as `current.available - days`).
4. On mismatch: calls `restoreBalanceCacheSnapshot`, sets `isRolledBack = true`, throws `VerificationError`.

This post-hoc verification catches the ~10% silent failure rate injected by the mock API without requiring the HCM to return an error code for a partial failure.

### Rollback communication without alarming the user

Rollback is designed to feel like a gentle retry prompt, not a system error:

| Channel | When | Copy |
|---------|------|------|
| Inline alert (`role="alert"`) | Verification failure or mutation error | "Your request could not be confirmed. Please try again." |
| Toast notification | Explicit API errors only (`onError` in `useSubmitRequest`) | Error message from `HcmApiError` |
| Balance display | Always on rollback | Restored instantly via cache snapshot — no loading spinner |

The balance is visually restored through `restoreBalanceCacheSnapshot`, which writes the pre-mutation snapshot back to both the list and cell cache keys. The user sees their balance return to its previous value without a jarring refetch.

Background reconciliation uses neutral copy: "Your leave balance was updated" (info toast), distinguishing external changes from submission failures.

---

## 5. Cache Invalidation Strategy

### When to invalidate vs reconcile

| Trigger | Strategy | Keys affected |
|---------|----------|---------------|
| Submit success (verified) | `invalidateQueries` | `balances(employeeId)`, `balance(...)`, `requests({ employeeId })`, `requests({ status: 'pending' })` |
| Approve success | `patchBalanceInCache` then `invalidateQueries` | Request lists |
| Deny success | `patchBalanceInCache` then `invalidateQueries` | Request lists |
| Reconciliation drift detected | `setBalancesInCache` (no invalidate) | List + all cell keys for employee |
| Reconciliation during mutation | Skip entirely | — |

**Invalidation** marks queries stale and triggers a background refetch. Used after mutations where the server is the source of truth and the client wants fresh data — particularly request lists that changed status.

**Reconciliation** patches the cache in-place via `setQueryData`. Used when background drift is detected and the goal is to update displayed values without loading states or flicker. The `detectDrift` function compares `available`, `used`, and `total` per `locationId:leaveType` cell between cached and fresh batch data.

### Background reconciliation and in-flight mutations

`reconcileEmployeeBalances` in `src/lib/hooks/use-reconciliation.ts` returns early when:

```typescript
queryClient.isMutating({ mutationKey: hcmMutations.all }) > 0
```

This prevents a 60s batch fetch from overwriting optimistic cache edits made during an in-flight submit, approve, or deny mutation. Without this guard, the sequence would be:

1. Employee submits → cache deducted optimistically
2. 60s reconciliation fires → fetches batch with old balance → overwrites optimistic deduction
3. Submit completes → verification fails due to stale cache

The mutation key group (`hcmMutations.all`) covers all three write operations.

### staleTime, refetchInterval, and reconcile interval

| Setting | Value | Role |
|---------|-------|------|
| `staleTime` | 30s | Data considered fresh; suppresses automatic refetch on mount/focus within window |
| `refetchInterval` (balances) | 30s | Passive display refresh for employee balance grid |
| `refetchInterval` (pending) | 10s | Aggressive refresh for manager approval queue |
| `RECONCILE_INTERVAL_MS` | 60s | Slower cadence for truth cross-check; patches cache on drift |
| `refetchOnWindowFocus` | true (global) | Re-sync when user returns to tab |

The three timers serve different purposes: `staleTime` controls React Query's freshness model, `refetchInterval` keeps the UI current, and reconciliation verifies correctness without disturbing the display layer.

---

## 6. State Machine for a Time-Off Request

### Server-persisted statuses

Defined in `src/types/index.ts`:

```typescript
status: "pending" | "approved" | "denied" | "rolled_back"
```

### Transitions

```
                    POST /balance/request
              ┌─────────────────────────────┐
              │                             │
              ▼                             │
         ┌─────────┐                         │
         │ pending │◀── approve conflict     │
         └────┬────┘    (bonus applied,     │
              │          request stays       │
    ┌─────────┼─────────┐  pending)          │
    │         │         │                    │
    ▼         ▼         │                    │
┌─────────┐ ┌────────┐ │                    │
│approved │ │ denied │ │                    │
└─────────┘ └────────┘ │                    │
                       │                    │
                       └────────────────────┘
```

| From | To | Trigger | Handler |
|------|----|---------|---------|
| — | `pending` | Employee submits time-off request | `POST /api/hcm/balance/request` → `createRequest()` |
| `pending` | `approved` | Manager approves | `POST /api/hcm/request/:id/approve` |
| `pending` | `denied` | Manager denies | `POST /api/hcm/request/:id/deny` |
| `pending` | `pending` | Approve conflict (5% chance) | Approve route applies anniversary bonus, returns `conflict: true` |

| Status | Set by | Notes |
|--------|--------|-------|
| `pending` | `createRequest()` on submit | Initial state; includes `submittedAt` |
| `approved` | Approve route | Sets `resolvedAt` |
| `denied` | Deny route | Sets `resolvedAt`; optional `rejectionReason` |
| `rolled_back` | **Type only** | Never assigned by server or hooks; client rollback uses `isRolledBack` flag + cache restore |

### Client-only overlays (not persisted)

| Overlay | Where | Purpose |
|---------|-------|---------|
| `optimisticStatus: 'pending_submission'` | Phantom `RequestCard` during submit | Visual indicator that submission is in-flight |
| `optimisticStatus: 'pending_approval'` | Defined in types | **Unused** in current implementation |
| `hiddenIds` (local state) | Manager container | Optimistically hides request row during approve/deny |
| `isRolledBack` (hook state) | `useSubmitRequest` | Drives inline alert on employee page |

### Zustand pending request tracking

- **Employee submit success:** `addPendingRequest(request)` and `setRequestBalanceSnapshot(request.id, expectedAvailable)`.
- **Manager approve/deny success:** `resolvePendingRequest(requestId, finalStatus)` removes from Zustand `pendingRequests`.
- **Manager queue display:** primarily driven by React Query `usePendingRequests` (10s poll), not the Zustand list directly.

---

## 7. Component Architecture

### Component tree

```
RootLayout (src/app/layout.tsx)
└── ReactQueryProvider (src/components/providers.tsx)
    ├── /           → features/home/index.tsx       (role picker)
    ├── /employee   → features/employee/index.tsx   (container)
    └── /manager    → features/manager/index.tsx    (container)
```

### Container vs presentational split

| Layer | Location | Responsibility |
|-------|----------|----------------|
| **Routes** | `src/app/page.tsx`, `src/app/(pages)/*/page.tsx` | Thin re-exports of feature containers |
| **Containers** | `src/features/home/`, `src/features/employee/`, `src/features/manager/` | Hooks, Zustand, routing guards, event handlers |
| **Presentational** | `src/components/` | Pure UI from props + callbacks |
| **Connected (Storybook only)** | `src/components/RequestFormConnected.tsx` | Thin wrapper for isolated form demos |

Presentational components exported from `src/components/index.ts`:

- `BalanceCard`, `BalanceGrid` — balance display
- `RequestForm`, `RequestCard`, `RequestStatusBadge` — request UI
- `ManagerRequestQueue` — manager approval table
- `NotificationToast` — toast queue display
- `SyncStatusBar` — HCM sync status indicator

### Why components are props-driven (no internal fetching)

Presentational components receive all data and callbacks as props. They never import hooks or call APIs directly. This is a deliberate architectural choice:

1. **Storybook isolation** — stories render any UI state with mock props, no `QueryClientProvider` required.
2. **Unit test simplicity** — component tests pass data directly without MSW or query client setup.
3. **Reusability** — `RequestCard` renders the same whether data comes from the employee history or an optimistic placeholder.
4. **Separation of concerns** — containers own the "what data" and "when to fetch" decisions; components own the "how to display" decisions.

The one exception is `RequestFormConnected`, a thin Storybook wrapper that calls hooks and passes results to `RequestForm`.

### Data concern mapping

| UI component | Data source | Wired by |
|--------------|-------------|----------|
| `BalanceGrid` | `useBalances` → `balances`, `syncStatus` | Employee container |
| `RequestForm` | `availableBalances`, `onSubmit`, `isSubmitting` | Employee container |
| Phantom `RequestCard` | `isOptimistic` + synthetic request object | Employee container |
| `RequestCard` (history) | `useRequests` → `requests` | Employee container |
| `ManagerRequestQueue` | `usePendingRequests`, live balances, flags | Manager container |
| `ManagerRequestBalanceLoader` | `useBalance` per request | Manager container (renders null) |
| `SyncStatusBar` | `useBalances` → `syncStatus`, `lastSyncedAt` | Manager container |
| `NotificationToast` | Zustand `notifications` | Both containers |

---

## 8. Test Strategy

### Test layers

| Layer | Command | Location | What it covers |
|-------|---------|----------|----------------|
| **Unit** | `npm run test:unit` | `src/components/__tests__/`, `src/lib/hooks/__tests__/`, `src/store/`, `src/mocks/handlers.test.ts` | Component rendering, validation, hook mutation logic, store actions, MSW handler contracts |
| **Integration** | `npm run test:unit` (same project) | `src/tests/integration/` | Full Employee/Manager page flows spanning hooks + cache + Zustand + component feedback |
| **Storybook interaction** | `npm run test:storybook` | `*.stories.tsx` via Playwright browser | Visual states, MSW scenario modes, `play` function user flows |

Vitest is configured with two projects in `vitest.config.ts`: `unit` (jsdom) and `storybook` (headless Chromium via `@vitest/browser-playwright`).

### Why Storybook interaction tests for UI state coverage

MSW handler modes map 1:1 to story parameters, enabling visual testing of states that are tedious to set up in unit tests:

| Story | MSW mode | UI state exercised |
|-------|----------|-------------------|
| Employee happy path | `default` | Normal submit flow |
| Employee silent failure | `silent-failure` | Rollback + alert |
| Employee slow HCM | `loading` | Syncing indicators |
| Employee anniversary bonus | `anniversary-bonus` | Balance change notification |
| Manager balance changed | `default` + snapshot mismatch | Warning flags on queue |
| Manager approve error | `conflict-approve` | Conflict warning + row reappears |

Stories in `src/features/employee/EmployeePage.stories.tsx` and `src/features/manager/ManagerPage.stories.tsx` include `play` functions that drive user interactions in the Storybook browser test project.

### Why integration tests for optimistic/rollback flows

Optimistic update and rollback flows span multiple layers:

1. `useSubmitRequest` deducts cache in `onMutate`
2. `useReconciliation` may fire during the mutation window
3. Zustand receives snapshots and notifications
4. Employee container renders inline alert on `isRolledBack`

Unit tests validate each layer in isolation but cannot catch ordering bugs — for example, reconciliation overwriting an optimistic cache edit, or a rollback notification not reaching the UI. Integration tests in `src/tests/integration/` render the full page component with MSW and assert end-to-end behavior:

- `employee-submit-flow.test.tsx` — submit → optimistic balance → confirm; silent-failure → rollback + notification
- `manager-approve-flow.test.tsx` — approve success; approve conflict → warning + request reappears

### Coverage targets

Configured in `vitest.config.ts`:

| Setting | Value |
|---------|-------|
| Scope | `src/components/**`, `src/lib/hooks/**` |
| Excludes | `*.stories.*`, `__tests__/`, `index.ts` |
| Thresholds | 80% statements, branches, functions, lines |

**Rationale:** Hooks and presentational components are the user-facing contract. API route handlers and Zustand store are covered indirectly through integration tests. The 80% threshold balances thoroughness against maintenance cost for a demo application — high enough to catch regressions in mutation logic and component rendering, low enough to avoid testing trivial prop-passing.

### Global test setup

`vitest.setup.ts` provides:

- MSW `server.listen()` / `resetHandlers()` / `close()`
- `resetHcmState()` — resets in-memory HCM state between tests
- `resetAppStore()` — resets Zustand store between tests

Shared test utilities live in `src/tests/test-utils.tsx` and `src/tests/mocks/next-navigation.ts`.

---

## 9. Known Tradeoffs and Future Work

### Current tradeoffs

| Tradeoff | Impact | Notes |
|----------|--------|-------|
| `rolled_back` status unused | Type/API mismatch | Rollback is client-side only via `isRolledBack` flag; server never sets this status. Consider persisting or removing from the type union. |
| `optimisticStatus: 'pending_approval'` unused | Dead type field | Manager row hide uses local `hiddenIds` instead. |
| Manager N+1 per-cell fetches | One `useBalance` per pending request | Acceptable for demo queue size; production would use a batch endpoint scoped to pending request dimensions. |
| Batch `/balances` returns all employees | Over-fetching | Client filters by `employeeId`; production API would scope server-side. |
| MSW not active in `npm run dev` | Chaos testing requires Storybook or direct API hits | Route handlers inject their own probabilistic failures during dev. |
| No real authentication | `currentUser` set via home page role picker | Demo convenience; production would need auth middleware. |
| In-memory HCM state | Resets on server restart | No persistence layer; all data is seed data in `src/app/api/hcm/_lib/state.ts`. |
| `optimisticStatus` not read by `RequestCard` | Phantom card shows `status: 'pending'` | The `pending_submission` overlay is set but not rendered differently by presentational components. |

### Future work

- **WebSocket or SSE push** for balance changes instead of 30s/60s polling
- **Persisted rollback audit trail** — log silent failures and rollbacks server-side for compliance
- **Authentication middleware** — replace demo role picker with real identity
- **Batch balance endpoint for manager queue** — eliminate N+1 per-cell fetches
- **E2E Playwright suite** — full browser tests beyond Storybook interaction tests
- **Server-side `rolled_back` status** — align type system with actual rollback persistence
- **Unified optimistic status rendering** — teach `RequestCard` and `RequestStatusBadge` to read `optimisticStatus`
