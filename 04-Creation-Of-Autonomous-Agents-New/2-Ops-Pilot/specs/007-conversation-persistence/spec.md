# Feature Specification: Conversation Persistence

**Feature Branch**: `unspecified`

**Created**: 2026-11-16

**Status**: Draft

**Input**: User description: "Conversa persistente: ConversationStore (append/lastMessages/create) + tabela messages, como no SqliteOpsStore; /chat: conversationId opcional, devolvido na resposta; 12 últimas mensagens no prompt via composição; métrica historyMessages; Testes :memory: + fake"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Continue a conversation (Priority: P1)

As an OpsPilot user, I want to continue a previous chat by providing its conversation identifier, so that the assistant can retain context across separate requests and application restarts.

**Why this priority**: Continuity is the core user value of persistent conversations.

**Independent Test**: Submit a message without an identifier, then submit a follow-up using the returned identifier and verify that the conversation continues with its saved context.

**Acceptance Scenarios**:

1. **Given** a chat request without a conversation identifier, **When** the request succeeds, **Then** the response includes an identifier for the newly created conversation.
2. **Given** a conversation with a completed exchange, **When** a later request supplies its identifier, **Then** the assistant receives that conversation's prior messages and the response returns the same identifier.
3. **Given** a saved conversation, **When** the service restarts and a later request resumes it, **Then** its completed messages remain available.

### User Story 2 - Use recent context and measure it (Priority: P1)

As an OpsPilot user and maintainer, I want the assistant to use recent conversation messages and report how many were used, so that follow-up answers are relevant and context use is observable.

**Why this priority**: Correctly bounded context is essential to useful follow-ups, and the metric makes that behavior verifiable.

**Independent Test**: Continue a conversation containing more than 12 messages and verify the context contains only the latest 12 in chronological order and the metric reports 12.

**Acceptance Scenarios**:

1. **Given** a resumed conversation with more than 12 saved messages, **When** a new message is processed, **Then** only the 12 most recent saved messages are included as history, in chronological order.
2. **Given** a resumed conversation with fewer than 12 saved messages, **When** a new message is processed, **Then** all saved messages are included as history.
3. **Given** a new conversation with no prior messages, **When** its first message is processed, **Then** no prior history is included and `historyMessages` is zero.
4. **Given** any chat request, **When** the response is produced, **Then** `historyMessages` equals the number of prior messages included in the assistant's context.

### User Story 3 - Reject an invalid conversation reference (Priority: P2)

As an API client, I want an invalid or unknown conversation identifier to produce a clear client error, so that a typo does not silently start or alter a different conversation.

**Why this priority**: Clear reference handling prevents users from believing that unrelated conversations have been resumed.

**Independent Test**: Submit a malformed or unknown identifier and verify that the request fails clearly without creating a conversation or invoking the assistant.

**Acceptance Scenarios**:

1. **Given** a malformed conversation identifier, **When** it is submitted, **Then** the request is rejected as invalid input.
2. **Given** a well-formed identifier that does not identify a saved conversation, **When** it is submitted, **Then** the request returns a not-found client error and does not create a replacement conversation.

### Edge Cases

- A conversation with no saved messages supplies an empty history and reports a count of zero.
- When a conversation has exactly 12 saved messages, all 12 are included, in their original order.
- When a conversation has more than 12 saved messages, older messages are excluded and the newest 12 remain ordered from oldest to newest.
- A conversation identifier that is malformed or unknown must not be treated as an instruction to create a new conversation.
- The current user message is appended before the assistant runs. If the assistant fails, that user message remains saved without an assistant response.
- The current request is not counted as prior history for that same request.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The chat service MUST accept an optional `conversationId` when processing a message.
- **FR-002**: When a request omits `conversationId`, the system MUST create a new conversation.
- **FR-003**: Every successful chat response MUST include the identifier of the conversation used for that request, including a newly created identifier when the request omitted one.
- **FR-004**: The system MUST append the current user message before invoking the assistant and MUST append the assistant response after a successful result, so that messages remain available to later requests and after service restarts.
- **FR-005**: When continuing a conversation, the system MUST include up to the 12 most recent saved messages as context, ordered from oldest to newest within that selected set.
- **FR-006**: The system MUST exclude messages older than the 12 most recent saved messages from the context supplied for a request.
- **FR-007**: The response metrics MUST include `historyMessages`, whose value is the exact number of saved prior messages included in the context for that request.
- **FR-008**: The system MUST validate a supplied conversation identifier and reject malformed identifiers as invalid input.
- **FR-009**: The system MUST return a not-found client error when a well-formed identifier does not identify a saved conversation; it MUST NOT silently create a replacement conversation.
- **FR-010**: Automated tests MUST verify persistence and recent-message selection using isolated storage, and verify chat behavior using a deterministic fake assistant without external network access.

### Key Entities *(include if feature involves data)*

- **Conversation**: A continuing chat identified by a stable identifier and associated with an ordered sequence of messages.
- **Message**: A completed user message or assistant response, associated with one conversation and ordered by when it was added.
- **Chat response metrics**: Measurements returned with a successful response, including the number of prior messages used as context.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of successful requests without a conversation identifier return an identifier that can be used to continue that conversation.
- **SC-002**: 100% of successful follow-up requests using a valid identifier preserve the same identifier and retain access to previously completed messages, including after a service restart.
- **SC-003**: For conversations with zero or more saved messages, the context includes exactly the newest `min(message count, 12)` prior messages in chronological order.
- **SC-004**: For every successful request, `historyMessages` equals the number of prior messages included in its context, from 0 through 12.
- **SC-005**: Malformed and unknown conversation identifiers are rejected without creating a conversation or invoking the assistant.
- **SC-006**: Persistence and chat behavior are verifiable in automated tests without a file-backed operational database or external network access.

## Assumptions

- A chat without a `conversationId` starts a new conversation; a supplied identifier resumes an existing one.
- The current user message is persisted before assistant execution; the assistant response is persisted only after success. If execution fails, the user message remains and can appear in the history of a later request.
- The current request is not part of the prior-history count for that same request.
- `historyMessages` counts only saved messages selected as prior context, not the current request or the newly generated response.
- When more than 12 messages exist, history selection uses the 12 newest messages and presents that selected set in chronological order.
- A malformed identifier is an invalid request; a well-formed but unknown identifier is not found. Neither condition starts a new conversation.
- The assistant's existing response fields and behavior remain unchanged apart from returning `conversationId` and adding `historyMessages`.
