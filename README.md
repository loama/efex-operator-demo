# EFEX Operator Demo

EFEX Operator is a working treasury product demonstration for iOS, Android, and web. The interface follows the visual language of the EFEX website while every account, company, person, and transaction remains synthetic.

No operation connects to a bank or moves real money.

## What works

1. A responsive dashboard reads balances, accounts, and activity from the API.

2. Beneficiary creation validates input and persists it in local SQLite.

3. Payment creation requests a conversion quote, creates a draft, and submits it into a simulated processing state.

4. Currency conversion uses a live request to the local quote endpoint.

5. Account statements are generated as valid synthetic PDF documents.

6. The assistant uses the OpenAI Responses API with typed read tools for balances, payments, beneficiaries, statements, and conversion quotes. Every answer is grounded in the same synthetic records shown by the app. A deterministic answer remains available if the model service cannot respond.

7. A Kapso webhook adapter can answer inbound WhatsApp messages when credentials are present. Persistent message claims prevent duplicate replies. Native WhatsApp buttons open the relevant app screen, while statements arrive as PDF documents. A simulation endpoint proves the same behavior without credentials.

8. Future products are visible in a quiet disabled state so the product roadmap is clear without suggesting that incomplete flows already work.

## Repository structure

```text
apps
  api       Bun, Hono, SQLite, PDF generation, Kapso adapter
  mobile    Expo Router application for iOS, Android, and web
packages
  contracts Shared Zod schemas and TypeScript types
docs
  Architecture and implementation notes
```

## Local setup

Requirements are Bun 1.3 or newer, Xcode with an iOS simulator for native testing, and an Expo compatible environment.

```bash
bun install --frozen-lockfile
```

Start the API in one terminal.

```bash
bun run dev:api
```

Start the application in another terminal.

```bash
bun run dev:app
```

Press `i` to open the iOS simulator, `a` to open an Android emulator, or `w` to open the web app.

The app reads the API at `http://127.0.0.1:8787` on iOS and web. Android uses `http://10.0.2.2:8787`. Override either value with `EXPO_PUBLIC_API_URL`.

Reset all demo data at any time.

```bash
curl -X POST http://127.0.0.1:8787/v1/demo/reset
```

## Kapso setup

Copy `apps/api/.env.example` to `apps/api/.env` and provide the following values only when testing with a number you control.

```text
KAPSO_API_KEY
KAPSO_PHONE_NUMBER_ID
KAPSO_WEBHOOK_SECRET
PUBLIC_API_ORIGIN
PUBLIC_APP_ORIGIN
```

Register `POST /webhooks/kapso` for the `whatsapp.message.received` event on a number scoped Kapso webhook with buffering disabled. Each inbound message then gets its own delivery request. The handler verifies `X-Webhook-Signature`, rejects malformed payloads, and can still process a defensive batch of up to ten text events concurrently. It claims each message identifier in SQLite, generates an answer from the same demo service as the app, and sends one interactive action or statement document before acknowledging success. Model and delivery requests have bounded deadlines. A failed event returns a retryable error and releases its claim, while completed events remain protected from duplicate replies.

Without credentials, use `POST /v1/whatsapp/simulate` with `{ "message": "Necesito mi estado de cuenta" }`.

Kapso setup follows the official [TypeScript SDK guide](https://docs.kapso.ai/docs/whatsapp/typescript-sdk/introduction) and [webhook guide](https://docs.kapso.ai/docs/platform/webhooks/overview).

## OpenAI setup

Set `OPENAI_API_KEY` on the API service to enable model routing. `OPENAI_MODEL` defaults to `gpt-5.6-terra`. The model sees the customer question, selects exactly one typed read function, and suggests filters for a requested payment, beneficiary, statement period, or conversion amount. It never receives account records. The server reconciles explicit names, identifiers, periods, currencies, and amounts from the original message before it executes the function. It then constructs the final answer, status, navigation route, and statement attachment from validated synthetic data. If the model request fails or the key is absent, the existing deterministic assistant responds instead.

The assistant can explain synthetic account data, while the model only selects the relevant read function. It cannot execute payments or modify beneficiaries. Those operations remain explicit app flows with their existing validation and confirmation screens.

## Verification

```bash
bun run test
bun run typecheck
bun run lint
bun run build:web
```

The browser flow also creates a beneficiary, reviews and submits a simulated payment, and asks the assistant for an account answer. Native verification opens the same Expo app in an iOS simulator against the local API.

## Render hosting

The repository includes a Render Blueprint for a public static site and a free API service in Frankfurt.

[Deploy the demo on Render](https://render.com/deploy?repo=https://github.com/loama/efex-operator-demo)

The web build uses `EXPO_PUBLIC_API_URL` to reach the hosted API. The API accepts requests only from the configured web origin and local development origins. Free Render services may pause while idle, so the first request after a pause can take longer.

`WEB_ORIGIN` identifies the hosted web client. `DEMO_REQUEST_LIMIT` controls the number of API requests allowed per client during each minute. The public Blueprint sets both values automatically.

SQLite data on the free API instance is temporary. A new instance restores the synthetic seed data, which is appropriate for this assessment demo. The data reset endpoint remains available only during local development.

## Safety boundary

This repository is an assessment demo. It contains no production credentials, bank connectors, customer data, or real payment execution. The payment state machine stops at a local simulated state. Connecting it to financial infrastructure would require a separate security, compliance, authorization, and audit design.
