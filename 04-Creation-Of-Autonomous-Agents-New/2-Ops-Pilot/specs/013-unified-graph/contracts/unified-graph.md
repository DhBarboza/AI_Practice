# Contract: Unified Production Graph & HTTP /chat

This contract specifies the interfaces, schemas, and behavior for the unified graph (`src/agents/production-graph.ts`) and the updated HTTP `/chat` endpoint.

---

## 1. Unified Production Graph Contract

### Factory and Invocation

```ts
export interface ProductionGraphDependencies {
  conversationStore: ConversationStore;
  memoryStore: MemoryStore;
  opsStore?: OpsStore;
  learningReflector?: LearningReflector;
  modelFactory?: () => BaseChatModel;
  strategyRegistry?: ReadonlyMap<string, ReasoningStrategy>;
  budgets?: SectionBudget;
}

export interface ProductionGraphInput {
  userId: string;
  message: string;
  conversationId?: string;
  strategyOverride?: string;
  reflectOverride?: boolean;
}

export function createProductionGraph(
  dependencies: ProductionGraphDependencies
): CompiledStateGraph;
```

### Execution Guarantee
- Invoking the compiled graph with `ProductionGraphInput` returns a validated `ChatResponse`.
- Every trace event in `response.trace` MUST satisfy `TraceEventSchema` and have a valid non-empty `node` property.
- When `strategyOverride` is provided:
  - Automated router LLM call is bypassed.
  - Trace includes `{ type: "route", node: "router", route: strategyOverride, reason: "...", override: true }`.
- When `strategyOverride` is omitted:
  - Router classifies using `withStructuredOutput(RouteDecisionSchema)`.
  - Trace includes `{ type: "route", node: "router", route, reason, override: false }`.

---

## 2. Router Decision Table Contract

The router prompt MUST embed the following decision criteria:

```markdown
You are the OpsPilot Strategy Router. Evaluate the user request and choose the optimal execution strategy based on this table:

| Strategy | Criteria | Example Requests |
|---|---|---|
| `react` | Direct tool execution, single-action lookups, current status checks, alert queries, simple metrics. | "List all firing alerts", "Check health for payment-service", "What is the status of inc-42?" |
| `plan-and-execute` | Multi-step procedures, multi-service diagnostics, sequenced incident actions, dependency resolution. | "Investigate alert A, check related runbooks, and open an incident if critical", "Restart payment service and verify downstream checkout" |
| `reflect` | High-stakes or critical operations, ambiguous multi-cause alerts, tasks explicitly demanding verification before response. | "Resolve critical incident inc-99 and confirm stability", "Investigate possible data corruption in database cluster and verify safety" |

Output your choice as a structured object with `route` and `reason`.
```

---

## 3. HTTP POST `/chat` Contract

### Request

```http
POST /chat HTTP/1.1
Content-Type: application/json

{
  "userId": "user-ops-1",
  "message": "List all firing alerts",
  "strategy": "react",          // OPTIONAL: if omitted, graph routes dynamically
  "reflect": false,              // OPTIONAL
  "conversationId": "conv-123"   // OPTIONAL: creates new if omitted
}
```

### Request Validation Rules
- `userId`: Non-empty trimmed string matching `MemoryUserIdSchema`.
- `message`: Non-empty trimmed string.
- `strategy`: Optional trimmed string. If provided, must be one of `"react"`, `"plan-and-execute"`, or `"reflect"`. Invalid strategies return HTTP 422 `{"error": "Unknown strategy"}`.
- `reflect`: Optional boolean.
- `conversationId`: Optional valid conversation identifier.

### Response

```http
HTTP/1.1 200 OK
Content-Type: application/json

{
  "conversationId": "conv-123",
  "answer": "There is currently 1 firing alert for checkout-service.",
  "trace": [
    {
      "type": "route",
      "node": "router",
      "route": "react",
      "reason": "Direct query asking to list firing alerts.",
      "override": false
    },
    {
      "type": "action",
      "node": "react",
      "tool": "list_alerts",
      "args": { "status": "firing" }
    },
    {
      "type": "observation",
      "node": "react",
      "tool": "list_alerts",
      "content": "[{\"id\":\"alert-1\",\"service\":\"checkout-service\"}]"
    },
    {
      "type": "answer",
      "node": "react",
      "content": "There is currently 1 firing alert for checkout-service."
    }
  ],
  "metrics": {
    "llmCalls": 2,
    "latencyMs": 342,
    "promptTokens": 128,
    "contextBreakdown": { ... },
    "historyMessages": 1
  }
}
```
