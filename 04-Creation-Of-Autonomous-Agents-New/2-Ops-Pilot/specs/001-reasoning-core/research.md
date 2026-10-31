# Research: OpsPilot Reasoning Core

## Decisions

### ReAct execution and trace

- **Decision**: Use LangGraph JS's prebuilt ReAct agent with the three validated tools. Derive action and observation events from tool-call and tool-result messages, and the final answer from the final assistant message. Use graph streaming/debug data only where the prebuilt agent's returned messages do not provide a complete structured execution trace. The current docs deprecate `createReactAgent` in favor of `createAgent`; because the feature explicitly calls for the prebuilt LangGraph ReAct agent, use the prebuilt API exposed by the installed dependency and preserve this behavior if the implementation must move to its supported equivalent.
- **Rationale**: The user explicitly requested the prebuilt ReAct agent. LangGraph provides graph streaming modes that expose execution updates and state; the message-level tool calls/results are a structured source for the required action/observation trace.
- **Alternatives considered**: A custom ReAct graph would allow bespoke state/trace control but would violate the request to use the prebuilt agent. Parsing model prose for tools would be less reliable than structured tool-call messages.
- **Sources**: [LangGraph JS streaming](https://docs.langchain.com/oss/javascript/langgraph/streaming); [LangGraph JS graph API](https://docs.langchain.com/oss/javascript/langgraph/graph-api); [prebuilt `createReactAgent` API and deprecation notice](https://reference.langchain.com/javascript/langchain-langgraph/prebuilt/createReactAgent); [current `createAgent` reference](https://reference.langchain.com/javascript/langchain/index/createAgent).

### Iteration limits and execution accounting

- **Decision**: Define a strategy iteration as one attempted tool action. Apply a tool-action budget of `maxIterations` for ReAct. For Plan-and-Execute, cap executed actions to `min(maxIterations, 8)` and enforce the cap before tool mutation. Configure a graph recursion ceiling independently as a safety guard against non-terminating control flow. Count actual model invocations with model callbacks for ReAct and explicit planner/executor/replanner invocation accounting for the graph strategy.
- **Rationale**: Tool actions are the shared, externally visible unit that can be limited consistently across different orchestration patterns. LangGraph's recursion setting limits graph supersteps, not business-level tool actions, so it is a separate guard and must not be used as the user-facing iteration metric.
- **Alternatives considered**: Treating every graph node as an iteration would give different meanings across strategies. Relying only on graph recursion limits could allow a tool limit to be exceeded or could stop a valid run early.
- **Sources**: [LangGraph JS graph API: recursion limit](https://docs.langchain.com/oss/javascript/langgraph/graph-api); [LangGraph JS streaming](https://docs.langchain.com/oss/javascript/langgraph/streaming); [LangChain JS model-call limit middleware](https://docs.langchain.com/oss/javascript/langchain/middleware/built-in).

### OpenRouter model factory

- **Decision**: Construct `ChatOpenAI` with an explicit API key, configured model, `temperature: 0`, OpenRouter's OpenAI-compatible `https://openrouter.ai/api/v1` base URL, and `provider.sort: "latency"` in model kwargs. Validate required configuration at factory creation and avoid serializing or logging the key.
- **Rationale**: The installed LangChain OpenAI integration accepts a custom base URL, key, and additional request parameters for OpenAI-compatible providers, fitting the required OpenRouter adapter without adding another provider package. OpenRouter can use the routing preference to prioritize its lowest-latency endpoint for the configured model. This cannot guarantee total run latency because each ReAct run makes sequential model calls and model/provider response times vary.
- **Alternatives considered**: A provider-specific package would add dependency surface and duplicate the already installed integration. Implicit environment lookup would make the model configuration less centralized and errors less direct.
- **Sources**: [LangChain JS providers and models](https://docs.langchain.com/oss/javascript/concepts/providers-and-models); [LangChain JS ChatOpenAI integration](https://docs.langchain.com/oss/javascript/integrations/chat/openai).

### Plan-and-Execute structure

- **Decision**: Implement the planner and replanner as structured-output model calls over concise text steps. The LangGraph executor uses an OpenRouter model bound to the validated tools, executes exactly one tool call per step, and appends the step/result pair to `done`. The replanner chooses to continue the remaining plan, replace it, or finish. Limit a run to `min(maxIterations, 8)` actions.
- **Rationale**: The executor can choose validated tool inputs based on the request and previous results, while one-step execution gives the replanner a chance to revise work after every observation. The explicit empty-plan and finish paths make termination testable.
- **Alternatives considered**: Executing the entire initial plan before review does not satisfy replanning after each step. Sending model-generated text directly to tools without a bound-tool call and Zod validation would weaken input safety.
- **Sources**: [LangGraph JS graph API](https://docs.langchain.com/oss/javascript/langgraph/graph-api); [LangGraph workflows and agents](https://docs.langchain.com/oss/javascript/langgraph/workflows-agents); [LangChain JS structured output](https://docs.langchain.com/oss/javascript/langchain/structured-output).

### JSON seed source and in-memory runtime

- **Decision**: Store the synthetic baseline in `src/agents/seed-data.json`, validate it with Zod, and load it into a fresh in-memory store for each strategy run and seed verification. Keep Sequelize model definitions available, but do not use MySQL in the current seed or tool-execution path.
- **Rationale**: JSON-backed fixtures let the model inspect existing alerts through tools and create incident records in memory, while tests remain deterministic and independent of credentials and databases.
- **Alternatives considered**: Making tool calls depend on MySQL would make core mock workflows and tests nondeterministic. Duplicating seed records in TypeScript and JSON would create two sources of truth.
- **Sources**: [Sequelize v6 Model Basics](https://sequelize.org/docs/v6/core-concepts/model-basics/); [Sequelize v6 Associations](https://sequelize.org/docs/v6/core-concepts/assocs/).

### Seed lifecycle

- **Decision**: Parse the JSON fixture when the seed module loads and construct a fresh store for each verification run. Stable fixture IDs and a fresh store ensure repeatable baseline state without duplicate records.
- **Rationale**: The in-memory seed lifecycle is repeatable without database state, credentials, or network access.
- **Alternatives considered**: Writing seed state back to JSON would make tests order-dependent and risks mutating the committed baseline during a strategy run.

### Offline verification

- **Decision**: Keep store and trace formatter tests independent of model construction, environment secrets and network access. Verify seed counts, status filters, incident state transitions, stable typed trace formatting, and tool argument metadata.
- **Rationale**: Determinism is a stated acceptance requirement and avoids making basic regression tests depend on an external provider.
- **Alternatives considered**: Testing only through an LLM-backed arena would be slower and could not reliably prove exact state or trace assertions.

## Resolved Unknowns

- The maximum number of Plan-and-Execute actions is fixed at eight, further bounded by `maxIterations`.
- `maxIterations` counts tool actions rather than graph supersteps or model calls.
- Each strategy run starts with an independent seeded in-memory store, so comparing strategies against the same input does not make one strategy's mutations affect another's initial state.
- Sequelize models are retained for future persistence, but the current seed path and mock tool execution use only the JSON fixture and in-memory stores.
- The project uses native Sequelize model definitions and associations rather than adding a TypeScript decorator package.
