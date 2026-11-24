# Quickstart: Unified Production Graph

This guide outlines how to run and validate the Unified Production Graph, its dynamic strategy router, and trace node attribution.

---

## Prerequisites

- Node.js 24 LTS and project dependencies installed.
- No live network connection or paid API keys required; all tests run deterministically using mock models.

---

## 1. Run Automated Typecheck & Test Suite

From `2-Ops-Pilot/`:

```sh
npm run typecheck
npm test
```

Expected output:
- TypeScript passes with zero diagnostics under `strict: true`.
- All existing tests and new graph/router tests pass.

---

## 2. Targeted Graph Scenarios

Execute targeted tests for the production graph, routing, and trace attribution:

```sh
node --import tsx --test \
  src/agents/production-graph.test.ts \
  src/agents/trace.test.ts \
  src/http/server.test.ts
```

### Scenario A: Dynamic Routing (No Strategy Supplied)

1. **Direct query**: Request `"List all firing alerts"`.
   - **Expected**: Router selects `route: "react"`. Trace contains `type: "route", node: "router", override: false`.
2. **Multi-step workflow**: Request `"Investigate alert-1, check related runbooks, and open an incident if critical"`.
   - **Expected**: Router selects `route: "plan-and-execute"`. Plan-and-execute node runs and generates plan/action events.
3. **High-criticality resolution**: Request `"Resolve critical incident inc-42 and verify service health before closing"`.
   - **Expected**: Router selects `route: "reflect"`. Reflection node runs with critic verification.

### Scenario B: Manual Strategy Override via /chat

Send a POST request to `/chat`:
```json
{
  "userId": "test-user",
  "message": "List all firing alerts",
  "strategy": "plan-and-execute"
}
```

- **Expected**:
  - Router model invocation is bypassed.
  - Trace includes `{ "type": "route", "node": "router", "route": "plan-and-execute", "override": true }`.
  - Plan-and-execute strategy node executes.

### Scenario C: Complete Trace Node Attribution

Verify that every event in `response.trace` contains a non-empty `node` field:
- `event.node` matches `"context"`, `"router"`, `"react"`, `"plan-and-execute"`, `"reflect"`, or `"response"`.
- No trace event has `node === undefined` or `node === ""`.
