# Chat Context Pruning Contract

## `POST /chat`

The request shape remains unchanged. The service supplies the latest eight prior raw messages and
the current message separately. Older context is supplied as the persisted summary plus any
unrepresented messages still waiting for a refresh. Original messages remain persisted.

### Refresh threshold

- Count individual user and assistant messages, not turns.
- Do not invoke the summarizer while fewer than eight unrepresented messages are outside the
  latest-eight window.
- At the threshold, merge the prior summary with all currently unrepresented messages outside the
  window. Persist the replacement and its coverage cursor together before using it.
- If generation or persistence fails, fail the chat request. Do not advance the cursor, alter the
  previous summary, delete messages, or emit a successful summarize event.

### Successful response

`trace` may contain this additional event, emitted only after a summary update is persisted:

```json
{
  "type": "summarize",
  "messagesSummarized": 8,
  "estimatedTokens": 148
}
```

The event contains counts only, not the summary or source transcript. It appears before the
reasoning strategy's trace events. Requests without a summary refresh do not contain this event.

`metrics.historyMessages` remains the number of raw prior messages supplied to the final
answer-producing strategy. It includes the latest eight and any pending older messages; it
excludes the summary, the summary-generation input, and current request. `contextBreakdown`
estimates the summary-generation prompt and the final reasoning context as separate model-call
observations. A successful summary call contributes to `llmCalls` and `promptTokens`; if its real
input-token usage is absent, the combined `promptTokens` is `null`.

### Validation and errors

- Validate summary output, persisted summary records, and the new trace event before use or return.
- Existing request validation and generic chat error handling remain in effect.
- Failed summary refreshes do not produce a success-shaped response or event.
