# Research: Learning Reflector

## Decision 1: Use the existing structured-output model pattern

**Decision**: Implement the reflector as a one-shot structured model call using the existing
`createModel()` factory, `withStructuredOutput`, and a strict Zod schema for
`{ hasLearning: boolean, fact: string | null }`.

**Rationale**: The repository already uses `withStructuredOutput` with Zod for planner and replanner
results in `src/agents/plan-and-execute.ts`. This keeps learning separate from the operational
agent loop and avoids adding a dependency or tool-calling step for a simple classification.

**Alternatives considered**:

- A new agent with a structured response strategy: unnecessary because the reflector has no tools
  and produces one small result.
- Provider-native structured output only: rejected because the configured OpenRouter model may
  vary; the existing model's structured-output integration is the project-local pattern.

**Sources**:

- [LangChain JS: Structured output](https://docs.langchain.com/oss/javascript/langchain/structured-output)
- [LangChain JS: Zod structured output for models](https://docs.langchain.com/oss/javascript/langchain/models#structured-output)
- Repository precedent: `createModel().withStructuredOutput(...)` in
  `src/agents/plan-and-execute.ts`.

## Decision 2: Start reflection without awaiting it

**Decision**: After a successful, validated answer, start the assessment and persistence in a
detached promise and attach a rejection handler that records a safe error category.

**Rationale**: Awaiting model inference or embedding/persistence would put additional latency and
failure modes on the chat response path, contrary to the feature requirement. A rejection handler
prevents unhandled asynchronous failures while keeping the response successful.

**Alternatives considered**:

- Await learning before returning: rejected because it delays or fails the user-visible answer.
- Add a durable job queue: rejected because there is no queue infrastructure in the project and
  the feature explicitly calls for asynchronous learning without requiring durable scheduling.

**Sources**:

- Feature requirements FR-005 and FR-006 in `spec.md`.
- The existing chat orchestration boundary in `src/services/chat-service.ts`.

## Decision 3: Treat the learning result as untrusted input

**Decision**: Validate the result and fact with Zod, instruct the model to abstain on one-off
requests and secrets, and apply a deterministic credential-like-content guard before persistence.
Do not include message or fact content in asynchronous failure logs.

**Rationale**: Model output is external data and the feature explicitly prohibits storing secrets.
A second application-side check prevents a malformed or over-eager model decision from directly
writing a candidate fact.

**Alternatives considered**:

- Trust the model's `hasLearning` decision alone: rejected because the output boundary must be
  validated and the user explicitly requires that secrets are never persisted.
- Log the full rejected message or model error for diagnostics: rejected because errors can echo
  secret-bearing content.

**Sources**:

- OpsPilot Constitution, Boundary Security and secret-handling requirements.
- Feature requirements FR-003, FR-004, and FR-006 in `spec.md`.

## Decision 4: Bind `forget_preference` to trusted chat context

**Decision**: Register a strict tool with only the target `fact` as a model-supplied argument. Bind
the active `userId` and `MemoryStore` from the validated chat invocation, and return whether an
exact deletion occurred.

**Rationale**: Identity must not be selected by model-generated tool arguments. The repository
creates tools through `createOpsTools` and injects them into both ReAct and Plan-and-Execute
strategies, so extending that existing composition preserves current patterns.

**Alternatives considered**:

- Add `userId` as a tool argument: rejected because the model could select another user's scope.
- Add a public forget endpoint or expose the tool through MCP: rejected because the requested
  capability is an agent tool and the spec bounds it to chat.
- Always report a successful deletion: rejected because an exact fact may not exist and the tool
  must not make a false success claim.

**Sources**:

- [LangChain JS: Create tools](https://docs.langchain.com/oss/javascript/langchain/tools#create-tools)
- [LangChain JS: Access runtime context](https://docs.langchain.com/oss/javascript/langchain/tools#access-context)
- Repository precedent: `createOpsTools` in `src/agents/tools.ts`.

## Decision 5: Keep facts in the existing memory store

**Decision**: Reuse the existing `MemoryStore` and SQLite adapter. Extend `forget` to return
whether a row was removed; do not add a table, public route, or second persistence mechanism.

**Rationale**: The previous semantic-memory feature already owns per-user facts, embeddings,
deduplication, and exact deletion. The reflector adds a policy for when to call `remember`, not a
new kind of persisted record.

**Alternatives considered**:

- Add a separate preferences table or vector store: rejected because it duplicates the existing
  user-memory lifecycle.
- Make forgetting semantic or delete all nearby facts: rejected because the current memory
  contract is exact-fact deletion and targeted user control is safer.

**Sources**:

- `src/memory/memory-store.ts` and `src/store/sqlite-memory-store.ts`.
- Feature assumptions and requirements in `spec.md`.

## Unresolved Questions

None. The feature specification supplies the learning decision fields, trigger, privacy exclusions,
asynchronous behavior, and tool name; existing project patterns resolve the integration choices.
