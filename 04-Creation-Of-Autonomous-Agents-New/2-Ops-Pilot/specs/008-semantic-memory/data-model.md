# Data Model: Semantic Memory

## Memory

Represents one fact retained for one user.

| Field | Type | Constraints |
|---|---|---|
| `id` | string | Primary key, required, unique |
| `user_id` | string | Required, non-empty; scopes every memory operation |
| `fact` | string | Required, non-empty after trimming |
| `embedding` | BLOB | Required; 384 Float32 little-endian components (1,536 bytes) from the configured model |
| `created_at` | ISO-8601 string | Required; set when the memory is first inserted |

The SQLite table is `memories`. Add an index on `user_id` to support the per-user read and deletion
paths. There is no `users` table in this feature, so `user_id` is not a foreign key.

## Relationships and lifecycle

- A user may have zero or more memories; each memory belongs to exactly one `user_id`.
- The asynchronous store contract exposes `remember(userId, fact): Promise<void>`,
  `recall(userId, query): Promise<Memory[]>`, and
  `forget(userId, fact): Promise<void>`. Recall returns the selected memory records; ranking scores
  remain internal to the store.
- `remember(userId, fact)` validates both inputs, embeds the fact, and compares it only with that
  user's existing embeddings. If any dot-product similarity is strictly greater than `0.92`, it
  does not insert a duplicate. A score of exactly `0.92` is not a duplicate.
- `recall(userId, query)` embeds the query, compares it only with that user's memories, discards
  scores below `0.3`, sorts by descending score, and returns no more than three facts. A score of
  exactly `0.3` is eligible.
- `forget(userId, fact)` removes the exact matching fact for that user. A non-match is a no-op;
  another user's rows are never changed.
- Facts have no automatic expiration in this version. Forgetting is the only specified removal
  operation.

## Embedding constraints

- Generate embeddings locally with the Transformers.js-compatible
  `Xenova/all-MiniLM-L6-v2` model and the specified mean pooling and normalization.
- The same lazy model instance is used for facts and queries so their vectors share one space.
- The stored representation is binary and is validated before scoring. The storage adapter
  reads BLOB data as bytes, decodes little-endian Float32 components, and rejects an incorrect
  byte length or non-finite values rather than returning malformed memories.
- Because embeddings are normalized, dot product is the ranking and similarity measure used by
  both recall and deduplication.

## Chat request relationship

`POST /chat` requires a non-empty `userId`. It is passed to recall with the current message; the
returned facts are contextual input to the selected reasoning strategy. The user identity is not
added to or inferred from conversation history, and no new user entity or conversation ownership
schema is introduced.
