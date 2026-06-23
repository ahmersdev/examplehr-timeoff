# ExampleHR Time Off

A demo HR time-off portal built with Next.js. Employees view leave balances, submit requests, and track history. Managers review a pending-approval queue with live balance data and approve or deny submissions.

The mock HCM backend is deliberately unreliable — stale reads, silent failures, service outages, and approval conflicts are core behaviors, not edge cases. The UI uses optimistic updates with rollback and background reconciliation so interactions feel instant while correctness is verified asynchronously.

## Run locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Pick a demo user on the home page, then navigate to the employee or manager view.

## Storybook

```bash
npm run storybook
```

Open [http://localhost:6006](http://localhost:6006) to browse component and page stories with MSW scenario modes.

Run Storybook interaction tests (headless Chromium):

```bash
npm run test:storybook
```

**Deployed Storybook:** [https://examplehr-timeoff-seven.vercel.app/](https://examplehr-timeoff-seven.vercel.app/)

## Tests

```bash
npm run test             # unit + integration, enforces >80% coverage
npm run test:storybook   # Storybook play-function tests in headless Chromium
```

Additional scripts: `npm run test:run` (all Vitest projects), `npm run test:unit` (unit only, no coverage).

## Stack

| Technology                   | Why                                                                             |
| ---------------------------- | ------------------------------------------------------------------------------- |
| **Next.js 16 (App Router)**  | Colocated UI and mock HCM route handlers in one project                         |
| **React 19**                 | Current Next.js default; React Compiler enabled                                 |
| **TanStack Query v5**        | Optimistic mutations, rollback, and reconciliation guards                       |
| **Zustand**                  | Lightweight client state (user, toasts, snapshots) without provider boilerplate |
| **MSW**                      | Same `/api/hcm/*` contract in tests and Storybook with scenario modes           |
| **Vitest + Testing Library** | Fast unit and integration tests with jsdom                                      |
| **Storybook 10**             | Visual states, MSW scenarios, and play-function interaction tests               |
| **Tailwind CSS 4**           | Utility-first styling                                                           |
| **TypeScript**               | End-to-end type safety                                                          |

See [TRD.md](TRD.md) for full architecture rationale.
