# Implementation Plan: Semantic Memory

**Branch**: `008-semantic-memory` | **Date**: 2026-11-17 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/008-semantic-memory/spec.md`

## Summary

Add per-user semantic memories to chat. A local `all-MiniLM-L6-v2` embedder will create normalized
embeddings; a SQLite-backed store will use user-scoped dot-product comparisons to suppress near
duplicates and return at most three relevant facts. The chat service will recall against the
current message and add qualifying facts to the strategy prompt. Callers can also remember and
forget exact facts through the memory-store interface. Existing conversation history and response
fields remain unchanged.

## Technical Context

**Language/Version**: TypeScript ESM, Node.js 24 LTS, `strict: true`

**Primary Dependencies**: `@huggingface/transformers` using `Xenova/all-MiniLM-L6-v2`,
Node.js `node:sqlite` (`DatabaseSync`), Zod, Express 5, existing LangChain/LangGraph strategy
interfaces

**Storage**: SQLite at the existing `OPSPILOT_DB` path (default `./data/opspilot.db`); add a
`memories` table with user-scoped embedding BLOBs. Tests use isolated `:memory:` databases.

**Testing**: `node:test` through `tsx`; in-memory SQLite tests, injected embedding functions for
deterministic store and chat tests, a semantic recall test using the configured local model,
`npm run typecheck`, and `npm test`

**Target Platform**: Node.js 24 LTS on the project's Linux server

**Project Type**: TypeScript backend application with an Express HTTP API and agent workflows

**Performance Goals**: Return at most three memories meeting the 0.3 relevance threshold. No
request-latency target is specified; the model is loaded lazily, and a user's stored embeddings are
scored in-process.

**Constraints**: Validate request, embedding, and database-row boundaries with Zod; keep SQL in a
store adapter and use prepared statements for variable values; use local model inference with
mean pooling and normalization; avoid cross-user reads or writes; preserve the existing chat
response contract and conversation-history behavior.

**Scale/Scope**: One `memories` table and one required `userId` on `POST /chat`; score only the
requesting user's memories. No new public memory-management routes, agent tools, user registry, or
vector-database dependency are included.

## Constitution Check

| Principle / constraint | Plan compliance |
|---|---|
| Boundary Security | Validate non-empty `userId` and fact input; validate embeddings and persisted rows; scope each memory query and mutation by `user_id`. |
| Predictable Domain | Keep vector ranking and prompt composition in application/domain code; isolate SQLite and model inference behind their boundaries; propagate failures to the HTTP error edge. |
| Layered Architecture | Define memory types and store port in `src/memory/`, SQLite adapter in `src/store/`, chat orchestration in `src/services/`, and request validation/composition in `src/http/`. |
| Verifiable Quality | Cover deduplication, thresholds, top-three ordering, user isolation, forget behavior, and prompt injection with `node:test`; run typecheck and the project test suite. |
| Versioned Specifications | Keep design artifacts under `specs/008-semantic-memory/`. |
| SQLite and store boundaries | Reuse `node:sqlite` and `OPSPILOT_DB`; inject the store and use `:memory:` in tests. |

**Gate result**: PASS. No constitution violations or unresolved technical choices remain.

## Project Structure

### Documentation (this feature)

```text
specs/008-semantic-memory/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── chat-api.md
└── tasks.md                 # Created by /speckit-tasks, not this command
```

### Source Code (repository root)

```text
src/
├── memory/
│   ├── embeddings.ts                 # Lazy local embedding-model singleton
│   ├── embeddings.test.ts            # Lazy initialization and output validation
│   ├── memory-store.ts               # Memory model, validation, and store interface
│   ├── memory-store.test.ts          # Store behavior with injected embeddings
│   └── semantic-recall.test.ts       # Real-model semantic recall without shared words
├── store/
│   ├── sqlite-memory-store.ts        # Schema, BLOB serialization, and SQLite adapter
│   └── sqlite-memory-store.test.ts   # Persistence, ranking, and isolation tests
├── services/
│   ├── chat-service.ts               # Recall user facts and pass context to the strategy
│   └── chat-service.test.ts          # Prompt construction and memory-service behavior
└── http/
    ├── server.ts                     # Require userId and compose the production store
    └── server.test.ts                # Request validation and chat integration tests
```

**Structure Decision**: Extend the existing single-project layout. Keep embedding/model and
memory-domain contracts in the requested `src/memory/` area, put SQLite I/O in a `src/store/`
adapter following `SqliteConversationStore`, apply recall in the shared chat service so both
registered reasoning strategies receive the same context, and validate `userId` at the HTTP
controller boundary. No new public memory endpoints are specified.

## Design Decisions

- Use the same `OPSPILOT_DB` setting as the existing operational and conversation stores. The
  production HTTP composition owns and closes the memory store; tests inject an in-memory store.
- Allow the SQLite adapter to receive an injected database connection and embedding function in
  tests, so fixtures can seed rows and exercise ranking without loading model weights.
- Use a lazy, shared model-loading promise so concurrent first calls initialize one local
  embedding pipeline; clear a failed initialization so later calls can retry. The selected model
  produces normalized 384-dimensional embeddings that can be compared by dot product. Model setup
  failures propagate instead of silently disabling memory.
- Serialize vectors as a fixed 1,536-byte Float32 little-endian BLOB and validate its size and
  decoded values when reading it. Add a schema check for the BLOB type and fixed byte length.
  Add a `user_id` index; fetch only that user's vectors and rank them in-process, avoiding a new
  vector-search dependency for the unspecified per-user scale.
- `remember` validates and embeds a fact, compares it only with that user's vectors, and inserts
  only if no similarity is strictly greater than 0.92. `recall` embeds the current chat message,
  keeps scores at or above 0.3, sorts by descending dot product, and returns at most three facts.
  `forget` removes only the exact stored fact for that user.
- Recall happens within the chat service and is passed as separate context to the existing
  strategy adapter. Render a labeled, delimited memory section as contextual data only when recall
  returns facts; do not promote stored text to system instructions, alter conversation history
  counts, or add fields to successful chat responses.
- Model weights are cached locally after first use. Deployments without network access must
  pre-provision the model and point Transformers.js at the local model files.
- Memory retrieval or model failures fail the chat request through the existing generic HTTP
  error boundary. Do not return an ungrounded success-shaped response that suggests recall worked.
- `remember` and `forget` are internal memory-store operations in this scope. No HTTP routes or
  automatic agent tool for mutation are added because the feature description specifies only the
  `/chat` integration.

## Constitution Check (Post-Design)

| Principle / constraint | Result |
|---|---|
| Boundary validation and secret handling | PASS — validate the HTTP `userId`, memory inputs, embeddings, and stored rows; tests need no secrets. |
| Pure domain behavior and isolated side effects | PASS — vector scoring and prompt formatting stay outside SQLite; model inference and persistence are isolated behind injected boundaries. |
| Model / Service / Controller layering | PASS — memory contract/model, SQLite adapter, chat service, and HTTP controller are distinct. |
| Required automated validation | PASS — deterministic unit tests plus a real-model semantic recall check are specified; required typecheck and test commands are retained. |
| Persistence and reproducibility | PASS — SQLite remains the persistence engine; store tests use `:memory:` and deterministic injected embeddings. |

**Post-design gate result**: PASS.
