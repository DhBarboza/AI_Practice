# Research: Context Token Metrics

## Decision 1: Use LangChain message usage metadata for real prompt usage

**Decision**: Read `AIMessage.usage_metadata.input_tokens` for each model call that contributes
to the chat answer. ReAct returns the agent's message sequence; for structured model calls,
retain the raw `AIMessage` alongside the parsed result with `withStructuredOutput(...,
{ includeRaw: true })`. Sum input-token counts over calls in the turn. If any contributing call
does not provide an input-token count, report the turn total as unavailable (`null`) rather than
returning a partial sum.

**Rationale**: LangChain documents `usage_metadata` as standardized input/output usage metadata
on `AIMessage`. Its structured-output API can return the raw message, which preserves usage
metadata while keeping parsed domain data available. These are the boundaries already used by
the project's ReAct, Plan-and-Execute, and reflection strategies.

**Alternatives considered**:

- Provider-specific fields such as OpenAI response token-usage objects: rejected because they
  couple the metrics contract to an integration-specific response shape.
- `chars / 4` as a fallback for real usage: rejected because it is an estimate and must never be
  presented as actual prompt usage.
- A partial sum when one call omits usage: rejected because it would look like a complete
  per-turn total.

**Sources**:

- [LangChain JS messages and usage metadata](https://docs.langchain.com/oss/javascript/langchain/messages)
- [LangChain JS structured output and raw AIMessage](https://docs.langchain.com/oss/javascript/langchain/models)

## Decision 2: Estimate source context at the model-call boundary

**Decision**: Preserve source attribution for current message, conversation history, recalled
memories, agent instructions, and operational/tool context while composing inputs. Estimate each
source for each answer-affecting model call with the shared estimator, then aggregate estimates
by source and total for the turn. Mark the breakdown as estimated.

**Rationale**: The same user context can be sent in multiple model calls, especially in ReAct,
Plan-and-Execute, and reflection. Measuring only the initial chat prompt would understate the
context actually supplied over a turn. Per-call attribution also keeps estimates separate from
provider-reported usage.

**Alternatives considered**:

- Estimating only the initial composed chat prompt: rejected because it omits repeated prompts,
  reflection inputs, and tool context.
- Estimating by dividing real prompt usage proportionally: rejected because it would derive
  source counts from real usage and falsely imply token-level source attribution.

## Decision 3: Keep metrics transient and validate the CLI boundary

**Decision**: Return metrics in the existing chat response; do not persist them. The shell script
launches a TypeScript runner which validates the chat response with Zod before printing the
per-turn real count or an unavailable marker.

**Rationale**: The feature requests observability in chat responses and a long-conversation
exercise, not historical analytics. Keeping parsing in TypeScript follows the project's CLI
boundary validation principle.

**Alternatives considered**:

- Persisting a token-usage history: rejected as outside feature scope and unnecessary for a
  per-turn diagnostic.
- Parsing the response directly as unvalidated JSON in the shell script: rejected by the
  constitution's external-boundary validation requirement.
