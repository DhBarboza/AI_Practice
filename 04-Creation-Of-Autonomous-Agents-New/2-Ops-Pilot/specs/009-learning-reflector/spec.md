# Feature Specification: Learning Reflector

**Feature Branch**: `Not specified`

**Created**: 2026-11-17

**Status**: Draft

**Input**: User description: "Refletor de aprendizado: após cada resposta, um modelo retorna { hasLearning, fact }; ele lê a última mensagem do usuário e destila fatos duráveis (nunca pedido pontual, nunca segredo) -> memories.remember assíncrono; tool forget_preference"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Learn durable facts after chat (Priority: P1)

After OpsPilot answers a user, it reviews only that user's latest message for a durable fact that
could improve future assistance. Suitable facts are saved for that same user without delaying or
changing the answer they already received.

**Why this priority**: Automatically retaining useful context makes future conversations more
relevant without requiring users to restate stable preferences.

**Independent Test**: Provide a successful chat turn with a known durable preference and a learning
result that identifies it. Verify the fact is eventually available to that user, while the chat
response completes independently of the learning operation.

**Acceptance Scenarios**:

1. **Given** a successful chat turn whose latest user message states a durable preference,
   **When** the learning assessment identifies a safe fact, **Then** that fact is saved for the
   active user after the answer is produced.
2. **Given** the latest user message is a one-off request, **When** it is assessed, **Then** no
   memory is saved, even if earlier messages contain durable facts.
3. **Given** the learning assessment reports no fact, **When** it completes, **Then** no memory is
   saved regardless of the contents of its fact field.
4. **Given** learning is slow or fails, **When** the answer is ready, **Then** the successful chat
   response is neither delayed until learning finishes nor changed into a failure.
5. **Given** a chat turn fails before producing an answer, **When** the request ends, **Then** no
   learning assessment is started for that turn.

### User Story 2 - Forget a saved preference (Priority: P2)

A user can ask OpsPilot to forget a saved preference. The agent uses the `forget_preference`
capability to remove only the targeted preference from the active user's memories.

**Why this priority**: Users need a direct way to correct or remove context they no longer want
used in future conversations.

**Independent Test**: Seed the same preference for two users, ask the agent to forget it for one
user, and verify that only that user's matching preference is removed.

**Acceptance Scenarios**:

1. **Given** the active user asks OpsPilot to forget a saved preference, **When** the agent uses
   `forget_preference` for that preference, **Then** it is no longer available to that user's
   future conversations.
2. **Given** another user has the same preference, **When** the active user forgets theirs,
   **Then** the other user's preference remains available.
3. **Given** the targeted preference is not saved, **When** the user asks to forget it, **Then**
   no other memory is removed and the agent can report that no matching preference was found.

### Edge Cases

- The learning result reports `hasLearning: true` but the fact is empty or whitespace-only; it is
  not saved.
- The learning result reports `hasLearning: false` while its fact field is non-empty; the fact is
  ignored.
- The latest message contains a password, token, key, recovery code, or other credential; none of
  it is saved, even if the learning result proposes it.
- The latest message includes both a one-off task and prior conversation history containing
  reusable facts; only the latest user message is assessed.
- The learning model or memory operation returns an error; the chat answer remains successful and
  the learning failure is recorded for operators.
- The user requests forgetting a preference that has no exact stored match; unrelated memories
  remain unchanged.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: After each successful chat answer, the system MUST assess only the latest user
  message and produce a learning result containing a boolean `hasLearning` and a `fact`.
- **FR-002**: The system MUST save a fact only when `hasLearning` is true and the fact is non-empty,
  durable, reusable in future assistance, and associated with the active user.
- **FR-003**: The system MUST NOT save one-off requests, task-specific instructions, or facts
  derived only from earlier conversation messages or assistant responses.
- **FR-004**: The system MUST NOT save secrets, including passwords, access tokens, API keys,
  private keys, recovery codes, or other authentication credentials, even when the learning result
  proposes them.
- **FR-005**: The system MUST start saving an eligible fact after the answer is produced without
  waiting for the learning assessment or memory operation to finish before returning that answer.
- **FR-006**: A learning-assessment or memory-operation failure MUST NOT change or fail the
  successful chat response; the failure MUST be recorded for operators and MUST NOT result in a
  success-shaped claim that the fact was saved.
- **FR-007**: The agent MUST provide a `forget_preference` capability for user-requested removal
  of a saved preference. It MUST affect only the targeted preference associated with the active
  user.
- **FR-008**: A request to forget a preference with no matching saved fact MUST leave all other
  memories unchanged.
- **FR-009**: Learning MUST apply only to successful chat answers; failed chat turns MUST NOT
  trigger a learning assessment.

### Key Entities

- **Learning result**: The assessment of the latest user message, with an indicator of whether a
  fact was learned and the proposed fact.
- **Durable fact**: A stable user preference or reusable context that can improve future
  assistance; it excludes one-off task requests and secrets.
- **User memory**: A durable fact associated with one user and available only in that user's
  future conversations.
- **Forget preference request**: A user-directed request that identifies a saved preference for
  removal from that user's memory.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: For every successful chat turn in the acceptance test set, the learning assessment
  uses the latest user message and does not use earlier messages or assistant responses as learning
  input.
- **SC-002**: All eligible durable facts in deterministic learning tests become available to the
  same user after the background learning operation completes; zero one-off requests or
  credential-bearing facts are saved.
- **SC-003**: A delayed or failed learning operation does not delay, change, or fail the successful
  chat response.
- **SC-004**: Forgetting a preference removes it from the requesting user's future memory results
  while leaving every other user's matching memory unchanged.

## Assumptions

- The active chat already supplies the stable `userId` used by the semantic-memory feature; user
  identity creation and authentication are outside this feature.
- Existing memory behavior remains responsible for persistence and duplicate suppression; this
  feature requests saving only after the learning assessment identifies an eligible fact.
- A fact is durable when it represents a stable preference, role, or standing work context likely
  to help in future interactions. A single-turn task or instruction is not durable.
- If `hasLearning` is false, the `fact` value is ignored. If it is true but the fact is empty,
  unsafe, or not durable, no memory is saved.
- The `forget_preference` capability is available to the chat agent and is scoped to the active
  user's memory; no new public memory-management endpoint is added.
- Learning is attempted only for successful answers, and operator-visible diagnostics are used
  for asynchronous learning failures without exposing secret content.
