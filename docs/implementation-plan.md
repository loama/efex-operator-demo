# EFEX Operator implementation plan

## Objective

Build a public Bun monorepo containing a universal Expo application, a typed demo API, shared contracts, tests, documentation, and an optional Kapso adapter. Run it on web and in an iOS simulator. Publish it to GitHub after local verification and three rounds of independent review.

## Global constraints

1. All account, company, person, payment, and transaction data is synthetic.

2. No operation may connect to a real bank or move real money.

3. Main flows must call the HTTP API and expose loading, success, empty, and error states.

4. The interface must follow the approved EFEX website direction. Headings use DM Sans. Interface copy uses Inter. Primary actions use near black. Pale yellow marks selection and progress.

5. iOS, Android, and web share the same Expo codebase.

6. The API uses a local SQLite database and resets to deterministic seeded data.

7. Kapso integration remains disabled until credentials exist. A local webhook and simulator prove the inbound reply behavior without sending external messages.

8. Sections outside the main assessment path must be visibly disabled or marked as coming soon.

9. Bun is the only package manager and JavaScript runtime used by project scripts.

## Task 1

Create the Bun workspace, Expo application, API application, shared contracts package, common tooling, and continuous integration workflow.

## Task 2

Implement the SQLite seed, typed routes, validation, safe fake payment state machine, beneficiary creation, conversion quotes, statements, activity, assistant responses, and inbound WhatsApp simulation.

## Task 3

Implement the responsive EFEX application shell, typography, colors, reusable controls, skeletons, error views, empty views, motion, desktop rail, and mobile navigation.

## Task 4

Implement dashboard, accounts, payment creation and approval, beneficiaries, conversion, statements, activity, assistant, company access, and coming soon states.

## Task 5

Add API tests, component tests, end to end flow checks, documentation, demo reset controls, and optional Kapso configuration guidance.

## Task 6

Run type checks, lint, tests, the web export, API smoke tests, browser interaction checks, and the iOS simulator. Publish the reviewed branch through a public GitHub repository.

## Review process

Run three independent reviewers in parallel. Judge and fix valid findings. Repeat this complete review round three times. Each round must cover product behavior, code and API correctness, and visual or accessibility quality.
