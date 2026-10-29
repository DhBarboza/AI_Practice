# Research: OpsPilot Reasoning Core

## Decisions

### ReAct execution and trace

- **Decision**: Use LangGraph JS's prebuilt ReAct agent with the three validated tools. Derive action and observation events from tool-call and tool-result messages, and the final answer from the final assistant message. Use graph streaming/debug data only where the prebuilt agent's returned messages do not provide a complete structured execution trace. The current docs deprecate `createReactAgent` in favor of `createAgent`; because the feature explicitly calls for the prebuilt LangGraph ReAct agent, use the prebuilt API exposed by the installed dependency and preserve this behavior if the implementation must move to its supported equivalent.
- **Rationale**: The user explicitly requested the prebuilt ReAct agent. LangGraph provides graph streaming modes that expose execution updates and state; the message-level tool calls/results are a structured source for the required action/observation trace.
- **Alternatives considered**: A custom ReAct graph would allow bespoke state/trace control but would violate the request to use the prebuilt agent. Parsing model prose for tools would be less reliable than structured tool-call messages.
- **Sources**: [LangGraph JS streaming](https://docs.langchain.com/oss/javascript/langgraph/streaming); [LangGraph JS graph API](https://docs.langchain.com/oss/javascript/langgraph/graph-api); [prebuilt `createReactAgent` API and deprecation notice](https://reference.langchain.com/javascript/langchain-langgraph/prebuilt/createReactAgent); [current `createAgent` reference](https://reference.langchain.com/javascript/langchain/index/createAgent).

### Iteration limits and execution accounting

- **Decision**: Define a strategy iteration as one attempted tool action. Apply a tool-action budget of `maxIterations` for ReAct. For Plan-and-Execute, cap executed actions to `min(maxIterations, 8)` and enforce the cap before tool mutation. Configure a graph recursion ceiling independently as a safety guard against non-terminating control flow. Count actual model invocations with model callbacks for ReAct and explicit planner/replanner invocation accounting for the graph strategy.
- **Rationale**: Tool actions are the shared, externally visible unit that can be limited consistently across different orchestration patterns. LangGraph's recursion setting limits graph supersteps, not business-level tool actions, so it is a separate guard and must not be used as the user-facing iteration metric.
- **Alternatives considered**: Treating every graph node as an iteration would give different meanings across strategies. Relying only on graph recursion limits could allow a tool limit to be exceeded or could stop a valid run early.
- **Sources**: [LangGraph JS graph API: recursion limit](https://docs.langchain.com/oss/javascript/langgraph/graph-api); [LangGraph JS streaming](https://docs.langchain.com/oss/javascript/langgraph/streaming); [LangChain JS model-call limit middleware](https://docs.langchain.com/oss/javascript/langchain/middleware/built-in).

### OpenRouter model factory

- **Decision**: Construct `ChatOpenAI` with an explicit API key, configured model, `temperature: 0`, and OpenRouter's OpenAI-compatible `https://openrouter.ai/api/v1` base URL. Validate required configuration at factory creation and avoid serializing or logging the key.
- **Rationale**: The installed LangChain OpenAI integration accepts a custom base URL and key for OpenAI-compatible providers, fitting the required OpenRouter adapter without adding another provider package.
- **Alternatives considered**: A provider-specific package would add dependency surface and duplicate the already installed integration. Implicit environment lookup would make the model configuration less centralized and errors less direct.
- **Sources**: [LangChain JS providers and models](https://docs.langchain.com/oss/javascript/concepts/providers-and-models); [LangChain JS ChatOpenAI integration](https://docs.langchain.com/oss/javascript/integrations/chat/openai).

### Plan-and-Execute structure

- **Decision**: Implement the planner and replanner as structured-output model calls, with a Zod-discriminated tool-step schema. Use a LangGraph state graph with planner, single-step executor, and replanner nodes; route to the executor only when a validated step remains.
- **Rationale**: Structured plans prevent free-form model text from becoming tool input. One-step execution ensures the replanner can revise work after each observation. The explicit empty-plan and no-remaining-steps paths make termination testable.
- **Alternatives considered**: Executing the entire initial plan before review does not satisfy replanning after each step. A free-form plan requires fragile parsing and weaker input validation.
- **Sources**: [LangGraph JS graph API](https://docs.langchain.com/oss/javascript/langgraph/graph-api); [LangGraph workflows and agents](https://docs.langchain.com/oss/javascript/langgraph/workflows-agents); [LangChain JS structured output](https://docs.langchain.com/oss/javascript/langchain/structured-output).

### Sequelize/MySQL models and seed

- **Decision**: Define Service, Alert and Incident models using Sequelize's native model-definition APIs, with explicit table names and service foreign-key relationships. Use the existing seeded in-memory store as the agent-tools' runtime source; the seed command also performs an idempotent upsert into MySQL when database configuration is supplied.
- **Rationale**: Sequelize v6 supports both `sequelize.define` and `Model.init`, and provides associations to express service ownership. Keeping tool runs in memory preserves offline deterministic tests and avoids coupling strategy behavior to MySQL availability, while maintaining the requested MySQL persistence path.
- **Alternatives considered**: Making every tool call depend on a live MySQL connection would make the core mock workflows and tests nondeterministic. Storing only service names in foreign-key columns would weaken referential integrity; the tool boundary can accept service names and resolve them to service identifiers in persistence adapters.
- **Sources**: [Sequelize v6 Model Basics](https://sequelize.org/docs/v6/core-concepts/model-basics/); [Sequelize v6 Associations](https://sequelize.org/docs/v6/core-concepts/assocs/).

### Sequelize seed lifecycle

- **Decision**: Keep the seed operation idempotent through stable primary keys and update-on-duplicate semantics, and order writes so referenced services exist before alerts. Use a transaction for the MySQL seed if the data is persisted through multiple related writes.
- **Rationale**: Sequelize does not record seed execution history by default; stable identifiers and safe repeatability make reruns predictable. Parent-first inserts satisfy foreign-key constraints, and a transaction avoids a partially updated baseline.
- **Alternatives considered**: Blind inserts duplicate or fail on rerun; recording only that a seeder ran would not restore a partially changed baseline.
- **Sources**: [Sequelize v6 migrations and seeders](https://sequelize.org/docs/v6/other-topics/migrations/#seeders); [Sequelize v6 transactions](https://sequelize.org/docs/v6/other-topics/transactions/).

### Offline verification

- **Decision**: Keep store and trace formatter tests independent of model construction, environment secrets and network access. Verify seed counts, status filters, incident state transitions, stable typed trace formatting, and tool argument metadata.
- **Rationale**: Determinism is a stated acceptance requirement and avoids making basic regression tests depend on an external provider.
- **Alternatives considered**: Testing only through an LLM-backed arena would be slower and could not reliably prove exact state or trace assertions.

## Resolved Unknowns

- The maximum number of Plan-and-Execute actions is fixed at eight, further bounded by `maxIterations`.
- `maxIterations` counts tool actions rather than graph supersteps or model calls.
- Each strategy run starts with an independent seeded in-memory store, so comparing strategies against the same input does not make one strategy's mutations affect another's initial state.
- MySQL persistence is provided by Sequelize models and the seed path; mock agent tool execution and offline tests do not require a live database.
- The project uses native Sequelize model definitions and associations rather than adding a TypeScript decorator package.
