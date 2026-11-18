# Learning and Agent Tool Contracts

## Learning assessment

After a successful answer, the reflector receives only the latest user message and returns one
strict result:

```json
{
  "hasLearning": true,
  "fact": "Prefers incident summaries in concise bullet points."
}
```

When there is no safe, durable fact, `hasLearning` is false and `fact` is null. A true result must
contain a non-empty fact. Invalid output, a one-off request, or credential-like content must not
cause a memory write.

The assessment is not given prior chat history, assistant output, or operational tool results.
The result is transient; accepted facts use the existing memory-store contract.

## `forget_preference` agent tool

The chat agent may invoke this tool when the active user requests forgetting a saved preference.

### Input

```json
{
  "fact": "Prefers incident summaries in concise bullet points."
}
```

- `fact` is required and non-empty after trimming.
- The tool accepts only the target fact. It does not accept a `userId`.
- The active `userId` is bound from validated chat context, outside model-generated arguments.
- Deletion is exact and scoped to the active user's memories.

### Result

```json
{
  "forgotten": true
}
```

`forgotten` is false when no exact fact was removed. The tool must not claim deletion in that
case, and a no-match must not affect other memories.

## Chat response compatibility

Learning is started after a successful answer without awaiting completion. The existing chat
response fields remain unchanged. Learning or persistence failures are recorded without including
the user message or candidate fact and do not convert the successful response into an error.

No public `/memories` or `/forget` endpoint is introduced.
