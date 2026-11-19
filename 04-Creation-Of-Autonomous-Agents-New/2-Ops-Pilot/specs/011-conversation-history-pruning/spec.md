# Feature Specification: Conversation History Pruning

**Feature Branch**: `011-conversation-history-pruning`

**Created**: 2026-11-18

**Status**: Draft

**Input**: User description: "Sumarização de histórico (pruning): tabela conversation_summaries; o que sai das 8 mensagens recentes vira um resumo de ~150 tokens, preservando decisões, fatos e pendências, mesclado ao resumo anterior e persistido. O resumo é refeito só quando 8 novas mensagens saem da janela, nunca a cada request. O resumo entra no contexto; evento summarize. Com teste fake."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Keep recent context and summarize older history (Priority: P1)

As an OpsPilot user, I want the assistant to retain the latest conversation messages verbatim and use a concise summary for older context, so that follow-up answers remain grounded without repeatedly sending the full conversation.

**Why this priority**: The assistant must receive both recent details and the durable context needed to continue ongoing incident work.

**Independent Test**: Use a deterministic fake summarizer and a conversation containing an older summary, pending older messages, and more than eight prior messages. Verify that context contains the summary, any not-yet-summarized pending messages, the latest eight prior messages in order, and the current request.

**Acceptance Scenarios**:

1. **Given** a conversation with a saved summary and at most seven newer messages not yet represented by it that have fallen outside the latest-eight window, **When** another request is prepared, **Then** the saved summary, those pending messages, the latest eight prior messages, and the current request are available as context without regenerating the summary.
2. **Given** a conversation with no saved summary and fewer than eight prior messages outside the latest-eight window, **When** another request is prepared, **Then** no summary is generated and no prior message is lost from context.
3. **Given** a conversation with older messages already covered by its saved summary, **When** the assistant receives a follow-up, **Then** it receives that summary and the latest eight prior messages in chronological order, with the current request kept distinct.

### User Story 2 - Refresh and observe a durable summary (Priority: P2)

As an OpsPilot user and maintainer, I want the summary to be refreshed only after a complete batch of older messages has accumulated, and to know when that happens, so that summaries remain stable between refreshes and their updates are observable.

**Why this priority**: Threshold-based updates avoid redundant summarization while preserving continuity across requests and service restarts.

**Independent Test**: With a fake summarizer, process requests while fewer than eight new messages have left the recent window and verify there are no summarizer calls or `summarize` events. Add enough messages to reach the threshold, then verify one merged summary is persisted, used in context, and reported by one event.

**Acceptance Scenarios**:

1. **Given** a saved summary and fewer than eight additional messages not represented by it outside the latest-eight window, **When** the conversation is continued, **Then** the saved summary is unchanged and no `summarize` event is emitted.
2. **Given** at least eight additional unrepresented messages have left the latest-eight window, **When** context is prepared, **Then** the prior summary and all newly unrepresented older messages are combined into a replacement summary, persisted, and used in that request's context.
3. **Given** a summary is successfully refreshed, **When** the chat response is returned, **Then** its trace contains one `summarize` event identifying the number of newly covered messages and the approximate summary size, without exposing the source transcript.
4. **Given** a persisted conversation summary and a service restart, **When** the conversation is resumed before the next refresh threshold, **Then** the saved summary is reused without another summarizer call.
5. **Given** summary generation fails, **When** the chat continues, **Then** the previous summary and coverage position remain intact, source messages remain available, and a later eligible request can retry.

### Edge Cases

- The current request is separate from the eight prior messages used as the recent-history window.
- User and assistant messages each count as one message; a turn is not treated as a single message.
- Fewer than eight messages may be outside the recent window while a refresh is pending; these messages remain available verbatim until the next successful summary update.
- When a successful refresh covers more than eight unrepresented messages, all currently unrepresented messages outside the recent window are included, preventing a partial or duplicate coverage position.
- Empty conversations do not create an empty summary.
- Summary generation must preserve decisions, factual details, and unresolved tasks; it must not invent facts or silently resolve conflicting information.
- A failed refresh must not delete source messages, replace the previous summary, advance its coverage position, or emit a successful `summarize` event.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The assistant's context MUST include the latest eight prior conversation messages in chronological order, plus the current request as a separate item.
- **FR-002**: The system MUST retain original conversation messages; pruning changes the context supplied to the assistant and MUST NOT delete the source history.
- **FR-003**: The system MUST track which messages are already represented by the saved summary so that each new message is summarized at most once.
- **FR-004**: The system MUST refresh a summary only when at least eight additional unrepresented messages have fallen outside the latest-eight window. It MUST NOT regenerate or rewrite a summary on every request.
- **FR-005**: On refresh, the system MUST combine the previous summary, when present, with all currently unrepresented messages outside the latest-eight window and persist one replacement summary associated with that conversation in `conversation_summaries`.
- **FR-006**: A summary MUST target approximately 150 tokens, ordinarily within 120–180 tokens, while preserving decisions, facts, and pending or unresolved tasks. Preserving accurate information takes priority over the target length.
- **FR-007**: The refreshed summary MUST be included in the context for the request that triggered its successful refresh, together with any still-pending unsummarized older messages and the latest eight prior messages.
- **FR-008**: After a successful refresh, the conversation trace MUST contain one event with type `summarize`, identifying the newly covered message count and approximate summary size without including the source transcript.
- **FR-009**: If refresh fails, the previous saved summary and its coverage position MUST remain unchanged, source messages MUST remain available, and no successful `summarize` event MUST be emitted.
- **FR-010**: Automated tests MUST use a fake summarizer and verify threshold behavior, merge and persistence behavior, context composition, event emission, and failure handling without provider credentials or external network access.

### Key Entities *(include if feature involves data)*

- **Conversation Summary**: The current compact account of older context for one conversation, including the point through which source messages have been covered and when the summary was last updated.
- **Conversation Message**: A persisted user or assistant message with a chronological position in its conversation; original messages remain available after they are summarized.
- **Summarize Event**: A trace event emitted only after a successful summary refresh, recording the number of newly covered messages and approximate summary size.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Every chat request supplies the latest `min(prior message count, 8)` prior messages in chronological order, plus the current request.
- **SC-002**: Zero summary refreshes or `summarize` events occur before eight new unrepresented messages have left the recent window; one successful refresh covers all eligible unrepresented older messages when the threshold is reached.
- **SC-003**: A refreshed summary ordinarily measures 120–180 tokens and retains every decision, fact, and pending task present in the deterministic test scenario.
- **SC-004**: A saved summary and its coverage position are reused after service restart, and covered source messages are not summarized a second time.
- **SC-005**: The full refresh lifecycle, including the failure path, is verifiable with a fake summarizer and no provider credentials or external network calls.

## Assumptions

- “Eight recent messages” means eight prior persisted user/assistant messages; the current request is supplied separately and does not displace one of those eight during that request.
- The threshold counts individual persisted messages, not user-assistant turns.
- The summary is a soft target of about 150 tokens; salient information takes precedence over strict length.
- Until a refresh threshold is reached, up to seven unrepresented older messages remain available verbatim in context to avoid dropping information.
- A successful refresh occurs before the main answer is generated, so the refreshed summary can be used immediately.
- Summary generation is an internal context-maintenance action; failure should not erase history or invalidate the previous summary.
