# Research: Semantic Memory

## Decisions

### Use the Transformers.js feature-extraction pipeline with the ONNX model

- **Decision**: Use `@huggingface/transformers` with `Xenova/all-MiniLM-L6-v2`, invoking the
  `feature-extraction` pipeline with `pooling: "mean"` and `normalize: true`. The model returns
  384-dimensional Float32 vectors.
- **Rationale**: The Transformers.js model card demonstrates this exact Node-compatible model and
  pooling/normalization call. A normalized output supports the specified dot-product recall and
  deduplication thresholds.
- **Alternatives considered**: The canonical `sentence-transformers/all-MiniLM-L6-v2` model is the
  source model, but its direct examples are Python-oriented; the `Xenova` repository provides the
  ONNX-compatible model intended for Transformers.js.
- **Sources**: [Xenova model card](https://huggingface.co/Xenova/all-MiniLM-L6-v2),
  [FeatureExtractionPipeline API](https://huggingface.co/docs/transformers.js/en/api/pipelines#module_pipelines.FeatureExtractionPipeline),
  [Transformers.js Node.js tutorial](https://huggingface.co/docs/transformers.js/en/tutorials/node)

### Lazy-load one shared model pipeline

- **Decision**: Initialize the feature-extraction pipeline on first use and share its
  initialization promise across concurrent calls. Allow a failed initialization to be retried
  rather than caching a rejected promise forever.
- **Rationale**: The official Node tutorial demonstrates lazy singleton pipeline initialization.
  Sharing the promise avoids duplicate model loads during simultaneous first requests.
- **Alternatives considered**: Eagerly loading the model at server startup increases startup time
  and makes unrelated app operations depend on model initialization. Creating a pipeline per
  request duplicates model memory and initialization work.
- **Sources**: [Transformers.js Node.js tutorial](https://huggingface.co/docs/transformers.js/en/tutorials/node),
  [Transformers.js custom usage](https://huggingface.co/docs/transformers.js/en/custom_usage)

### Treat model weights as local inference assets

- **Decision**: Use the library's local cache by default; document that the first model use may
  retrieve weights and subsequent inference uses the cached files. An offline deployment can
  pre-provision the model and configure `localModelPath` with remote models disabled.
- **Rationale**: Transformers.js downloads model files on first use and caches them locally. This
  keeps inference local without requiring model API credentials.
- **Alternatives considered**: Bundling model weights in the source repository increases
  repository size and complicates updates. Hosted embedding APIs would violate the requested
  local-inference constraint.
- **Sources**: [Transformers.js Node.js tutorial](https://huggingface.co/docs/transformers.js/en/tutorials/node),
  [Transformers.js custom usage](https://huggingface.co/docs/transformers.js/en/custom_usage)

### Store vectors as portable Float32 little-endian BLOBs

- **Decision**: Serialize each of the 384 vector values as a Float32 little-endian value in a
  1,536-byte BLOB. Bind a typed-array/DataView-compatible byte view through a prepared statement,
  read it back as `Uint8Array`, and validate its exact size and finite decoded components.
- **Rationale**: Node.js `node:sqlite` supports typed arrays and `DataView` as BLOB values and
  returns BLOBs as `Uint8Array`. Explicit little-endian encoding avoids depending on the host's
  native typed-array byte order.
- **Alternatives considered**: Binding a `Float32Array` directly is simpler but leaves its byte
  order implicit. JSON is larger and requires text parsing; no vector database or SQLite vector
  extension is currently present in the project.
- **Sources**: [Node.js v24 SQLite type conversion](https://nodejs.org/docs/latest-v24.x/api/sqlite.html#type-conversion-between-javascript-and-sqlite),
  [Node.js v24 SQLite statement binding](https://nodejs.org/docs/latest-v24.x/api/sqlite.html#statement-binding-parameters),
  [Node.js v24 `DatabaseSync`](https://nodejs.org/docs/latest-v24.x/api/sqlite.html#class-databasesync)

**Runtime note**: The Node.js v24.15 documentation labels `node:sqlite` release-candidate status.
This project already uses `DatabaseSync`; use typed-array or `DataView` BLOB binding supported in
that release rather than relying on `ArrayBuffer` binding added later in the v24 line.

### Follow the existing SQLite store and chat-service patterns

- **Decision**: Create an idempotent `memories` schema, prepare fixed SQL statements once, bind all
  user and fact values, validate rows at the persistence boundary, and inject the SQLite store into
  the chat service and HTTP composition. Rank only rows selected for the requesting user in
  application code.
- **Rationale**: Existing conversation and ops stores use `DatabaseSync`, prepared statements,
  Zod row validation, and `:memory:` tests. The shared chat service is the single point that
  supplies prompt input to all strategies.
- **Alternatives considered**: Add a vector-search dependency or query a global memory collection.
  The former adds operational complexity without a specified scale need; the latter violates
  per-user isolation.
- **Sources**: [SQLite conversation store](../../src/store/sqlite-conversation-store.ts),
  [SQLite ops store](../../src/store/sqlite-ops-store.ts),
  [Chat service](../../src/services/chat-service.ts)

## Resolved Technical Context

- The configured model output dimension is 384; the fixed Float32 BLOB size is 1,536 bytes.
- Dot product is appropriate for the specified ranking because stored and query embeddings are
  normalized.
- Candidate enumeration is scoped by `user_id` and scored in process; no vector extension or
  external database is needed for the specified top-three result contract.
- `node:sqlite` remains the project's existing persistence technology. Its API is synchronous,
  so database work should remain bounded; the model inference itself is asynchronous.
