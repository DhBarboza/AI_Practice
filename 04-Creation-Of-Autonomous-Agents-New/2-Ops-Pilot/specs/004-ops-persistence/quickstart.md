# Quickstart: Ops Persistence

## Prerequisites

- Node.js 24 LTS.
- Dependencies installed from the repository manifest.
- For model-backed agent execution, the existing OpenRouter configuration is available; local
  persistence tests do not require model credentials or network access.

## Validate the persistent store

1. Set `OPSPILOT_DB` to a disposable local SQLite file, or leave it unset to use
   `./data/opspilot.db`.
2. Optionally run `npm run seed` to initialize and summarize the persistent store explicitly. Store
   construction also performs idempotent schema setup and seeding.
3. Start the application using the repository command appropriate to the workflow:

   ```sh
   npm run http
   ```

4. Confirm that startup creates the database and that repeated starts preserve incidents while
   leaving the seeded service, alert, and runbook counts unchanged.
5. Open an incident for a seeded service, list it, resolve it, and verify that it remains resolved
   after restarting the application.
6. Query the runbooks for Checkout, Payments, and Auth; each must return only the matching service's
   guidance.

## Validate isolated behavior

Run the focused persistence and tool tests after implementation:

```sh
node --import tsx --test src/store/sqlite-ops-store.test.ts src/agents/tools.test.ts
```

The tests use `:memory:` and require no file-backed database, model provider, or network access.
They verify seed idempotence, service/alert/runbook contents, incident lifecycle and filtering,
closed-domain constraints, and tool schemas/descriptions.

## Validate the repository

```sh
npm run typecheck
npm test
```

Both commands must pass. Run the benchmark separately with `npm run bench` to confirm that its
scenarios continue to use the reproducible in-memory mock, not `OPSPILOT_DB`.

See [data-model.md](./data-model.md) for entities and [contracts/ops-tools.md](./contracts/ops-tools.md)
for store/tool behavior.
