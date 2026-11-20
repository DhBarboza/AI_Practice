# Feature Specification: Context Section Budget

**Feature Branch**: `012-context-section-budget`

**Created**: 2026-11-19

**Status**: Draft

**Input**: User description: "ContextBuilder com orçamento por seção: src/context/context-builder.ts monta o prompt de TODAS as estratégias com teto por seção via env `CONTEXT_BUDGET_*`: system e mensagem intocáveis, resumo 200, janela 1200 (corta as mais antigas), memórias 300 (corta as de menor score). Teste: tetos baixos cortam na ordem certa."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Assemble a bounded prompt for every strategy (Priority: P1)

An operator chatting with OpsPilot wants every reasoning strategy to receive the same assembled
prompt: instructions and the current request stay complete, while the conversation summary, recent
history window, and recalled memories stay within configured size limits.

**Why this priority**: Unbounded older history and memories can crowd out the current request.
Shared assembly keeps answers grounded and comparable across strategies.

**Independent Test**: Prepare a request that includes instructions, a current message, a summary,
several history messages, and several scored memories. Run assembly once for each available
strategy path and verify that the same budgeted sections are supplied, with instructions and the
current message intact.

**Acceptance Scenarios**:

1. **Given** a request that includes system instructions, a current message, a summary, a history
   window, and recalled memories, **When** the prompt is assembled for any strategy, **Then** the
   system instructions and current message appear in full, and the summary, window, and memories
   each stay within their configured budgets.
2. **Given** two different strategies answering the same request with the same inputs, **When**
   each prompt is assembled, **Then** the budgeted sections and the uncut system and message
   content are identical.
3. **Given** a request whose summary, window, and memories already fit their budgets, **When** the
   prompt is assembled, **Then** no section content is dropped.

---

### User Story 2 - Trim overflow in a defined order (Priority: P2)

An operator or maintainer diagnosing oversized context wants overflow trimmed in a predictable
order: oldest window messages first, then lowest-scoring memories, while system instructions and
the current message are never shortened.

**Why this priority**: Predictable trimming preserves the most recent conversation and the most
relevant memories without sacrificing the request itself.

**Independent Test**: Set unusually low section budgets, supply oversized summary, window, and
memory inputs, and verify which items remain and which are dropped.

**Acceptance Scenarios**:

1. **Given** a history window whose estimated size exceeds its budget, **When** the prompt is
   assembled, **Then** the oldest messages are removed first until the remaining window fits, and
   newer messages are kept.
2. **Given** recalled memories whose estimated size exceeds their budget, **When** the prompt is
   assembled, **Then** memories with the lowest relevance score are removed first until the
   remaining memories fit.
3. **Given** a conversation summary whose estimated size exceeds its budget, **When** the prompt
   is assembled, **Then** the summary is shortened to fit the summary budget without removing
   system instructions or the current message.
4. **Given** system instructions and a current message that would exceed any section budget if
   they were treated as trimmable, **When** the prompt is assembled, **Then** both remain complete.
5. **Given** deliberately low budgets that force trimming in every trimmable section, **When**
   tests run, **Then** they fail unless oldest window messages are dropped first, lowest-scoring
   memories are dropped first, the summary is reduced to its cap, and system plus message content
   is unchanged.

---

### User Story 3 - Adjust section budgets without changing assembly rules (Priority: P3)

A maintainer wants to raise or lower the summary, window, and memory limits through
`CONTEXT_BUDGET_*` settings, using documented defaults when a setting is omitted.

**Why this priority**: Operators can tighten or relax context without changing how trimming order
works.

**Independent Test**: Assemble the same oversized inputs with default budgets and with lower
override values; confirm only the numeric caps change.

**Acceptance Scenarios**:

1. **Given** no budget overrides, **When** a prompt is assembled, **Then** the summary budget is
   200, the history-window budget is 1200, and the memories budget is 300, using the same token
   estimate already used for context measurement.
2. **Given** valid numeric `CONTEXT_BUDGET_*` overrides, **When** a prompt is assembled, **Then**
   each trimmable section respects the corresponding override and still trims in the same order.
3. **Given** an omitted or empty budget setting, **When** a prompt is assembled, **Then** that
   section uses its documented default rather than becoming unlimited.

---

### Edge Cases

- An empty summary, empty history window, or empty memory list produces no filler content and
  does not consume another section's budget.
- A single remaining window message or a single remaining memory can still exceed its section
  budget after lower-priority items are dropped; that remaining item is shortened to fit rather
  than exceeding the cap or removing the current message.
- Equal memory scores drop the later (less recently ranked) memory first so the result is
  deterministic.
- A zero budget for a trimmable section omits that section entirely while leaving system
  instructions and the current message intact.
- Invalid budget values (non-numeric, negative) are rejected at configuration time rather than
  treated as unlimited.
- Operational or tool context contributed by a strategy after assembly is outside this feature's
  section budgets.
- Existing history pruning still selects which messages are candidates for the window; this
  feature only caps what from that window, the summary, and recalled memories is placed in the
  assembled prompt.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST assemble the prompt for every chat reasoning strategy through one
  shared context builder so strategies do not apply different section-budget rules.
- **FR-002**: The assembled prompt MUST include distinct sections for system instructions, the
  current user message, the conversation summary, the recent history window, and recalled
  memories, when each has content.
- **FR-003**: System instructions and the current user message MUST be included in full. The
  builder MUST NOT shorten, omit, or reorder them to satisfy any section budget.
- **FR-004**: The conversation-summary section MUST stay within a budget of 200 estimated tokens
  by default (`CONTEXT_BUDGET_SUMMARY`). Content beyond that budget MUST be shortened to fit.
- **FR-005**: The recent-history window section MUST stay within a budget of 1200 estimated
  tokens by default (`CONTEXT_BUDGET_WINDOW`). Overflow MUST be reduced by dropping the oldest
  messages first.
- **FR-006**: The recalled-memories section MUST stay within a budget of 300 estimated tokens by
  default (`CONTEXT_BUDGET_MEMORY`). Overflow MUST be reduced by dropping the lowest-scoring
  memories first.
- **FR-007**: Section budgets MUST be read from `CONTEXT_BUDGET_*` settings. Missing values MUST
  use the defaults in FR-004 through FR-006. Invalid values MUST fail configuration rather than
  disabling the cap.
- **FR-008**: Budget measurements MUST use the project's existing characters-per-four-tokens
  estimate so section caps are comparable to context estimates.
- **FR-009**: After dropping whole window messages or memories, if the single remaining item in
  that section still exceeds its budget, the system MUST shorten that remaining item to fit.
- **FR-010**: Automated tests MUST cover default budgets, override budgets, uncut system and
  message content, and low-cap scenarios that prove oldest-window and lowest-score-memory
  trimming order.

### Key Entities *(include if feature involves data)*

- **Prompt section**: A labeled portion of the assembled prompt (system instructions, current
  message, summary, history window, or recalled memories) with its own budget rule.
- **Section budget**: The maximum estimated token size allowed for one trimmable section,
  configured through `CONTEXT_BUDGET_*` with documented defaults.
- **History window item**: One prior conversation message in chronological order; older items are
  dropped first when the window exceeds its budget.
- **Recalled memory item**: One scored user memory considered for the prompt; lower scores are
  dropped first when memories exceed their budget.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: For every strategy path in deterministic tests, the assembled prompt contains the
  complete system instructions and complete current message, with no character removed from
  either.
- **SC-002**: With default budgets, the summary section never exceeds 200 estimated tokens, the
  history window never exceeds 1200, and recalled memories never exceed 300.
- **SC-003**: In low-budget tests, 100% of dropped window messages are older than every retained
  window message, and 100% of dropped memories have a score less than or equal to every retained
  memory, with equal scores resolved deterministically.
- **SC-004**: The same inputs produce the same budgeted prompt sections for all strategies under
  test.
- **SC-005**: Changing only `CONTEXT_BUDGET_*` values changes section sizes according to the new
  caps without changing trim order.

## Assumptions

- The designated assembly point is `src/context/context-builder.ts`; planning may wire existing
  chat and strategy entry points through it without changing product behavior described here.
- Token estimates follow the existing four-characters-per-token rounding used for context
  measurement.
- Default caps are 200 (summary), 1200 (window), and 300 (memories). Environment names follow
  `CONTEXT_BUDGET_SUMMARY`, `CONTEXT_BUDGET_WINDOW`, and `CONTEXT_BUDGET_MEMORY`.
- “System” means agent instructions supplied as the system/instruction section, not secrets or
  environment files.
- “Message” means the current user request for that turn, distinct from prior history.
- History-window trimming operates on the recent messages already selected for context (including
  any pending unsummarized older messages still treated as raw history), not on persisted storage.
- Source conversation records and stored memories are not deleted when they are omitted from a
  prompt.
- Operational or tool context generated during strategy execution remains outside these section
  budgets.
- New logic will have focused tests consistent with the project's constitution.
