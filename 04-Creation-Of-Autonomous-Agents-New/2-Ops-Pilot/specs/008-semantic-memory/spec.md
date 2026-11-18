# Feature Specification: Semantic Memory

**Feature Branch**: `Not specified`

**Created**: 2026-11-17

**Status**: Draft

**Input**: User description: "Memória semântica: MemoryStore por userId — remember (dedup > 0.92), recall top-3 por produto escalar (min 0.3), forget; tabela memories, embedding all-MiniLM-L6-v2 local em BLOB; /chat ganha userId e injeta o recall no prompt; teste: recall acha fato sem palavra em comum. User: @huggingface/transformers com pooling: mean + normalize: true e lazy singleton em src/memory/embeddings.ts e src/memory/memory-store.ts."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Use relevant memories in chat (Priority: P1)

An on-call user provides a user identifier when chatting with OpsPilot. OpsPilot retrieves that user's relevant stored facts and uses them as context, so it can respond appropriately even when the current message uses different words.

**Why this priority**: Relevant context in chat is the primary user value of semantic memory.

**Independent Test**: Store a fact, then send a chat message that is semantically related but shares no words with the fact. Verify the fact is included in the context used to answer.

**Acceptance Scenarios**:

1. **Given** a user has a stored fact relevant to their message, **When** they send a chat request with their user identifier, **Then** OpsPilot includes that fact in the prompt context.
2. **Given** multiple facts are relevant, **When** a user chats, **Then** at most the three highest-relevance facts meeting the minimum relevance threshold are included.
3. **Given** no fact meets the minimum relevance threshold, **When** a user chats, **Then** no unrelated memory is added to the prompt.
4. **Given** two users have separate memories, **When** either user chats, **Then** only that user's memories can be used.

### User Story 2 - Remember facts without duplicates (Priority: P2)

An on-call user can save a fact for future conversations. Repeating a fact or a sufficiently similar fact does not create a duplicate entry for that user.

**Why this priority**: Chat recall depends on users and the application being able to build a useful, clean set of facts.

**Independent Test**: Save a fact, save the same fact again, and verify only one matching memory remains for that user; verify another user can save the same fact independently.

**Acceptance Scenarios**:

1. **Given** a valid fact and user identifier, **When** the fact is remembered, **Then** it is stored with its user association and a creation time.
2. **Given** an existing memory for the same user has similarity greater than 0.92 to the new fact, **When** the new fact is remembered, **Then** a duplicate memory is not created.
3. **Given** the closest existing memory has similarity equal to or below 0.92, **When** the fact is remembered, **Then** the new fact is stored.
4. **Given** a different user already has a similar fact, **When** the current user remembers that fact, **Then** the current user's memory is stored independently.

### User Story 3 - Forget a stored fact (Priority: P3)

An on-call user can remove a fact from their semantic memory so it is no longer available to future chat requests.

**Why this priority**: Users need control over personal context, including the ability to remove outdated or unwanted facts.

**Independent Test**: Remember a fact, forget it, and verify it is absent from later recall while another user's matching fact remains.

**Acceptance Scenarios**:

1. **Given** a user has a stored fact, **When** they forget that fact, **Then** it is removed from their memory and is not returned by later recalls.
2. **Given** another user has the same fact, **When** the current user forgets their fact, **Then** the other user's memory remains unchanged.
3. **Given** the requested fact is not stored for that user, **When** they forget it, **Then** no other memory is changed.

### Edge Cases

- A missing or empty user identifier is rejected; it must never cause unscoped recall, storage, or deletion.
- An empty or whitespace-only fact is rejected and is not persisted.
- A user with no memories receives an empty recall result.
- Memories with a score at or below 0.3 are excluded, including when fewer than three memories otherwise qualify.
- A forget request for a non-existent fact leaves all stored memories unchanged.
- Similarity-based deduplication is scoped to the requesting user and uses a strict greater-than 0.92 threshold.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The chat request MUST require a valid `userId` and use it to scope all memory operations for that request.
- **FR-002**: The system MUST allow a fact to be remembered for a specific user and persist the fact, its user association, its embedding, and its creation time.
- **FR-003**: The system MUST prevent a new fact from being stored as a duplicate when its similarity to an existing fact for the same user is greater than 0.92. A similarity of exactly 0.92 MUST NOT count as a duplicate.
- **FR-004**: The system MUST recall no more than the three highest-ranked memories for the requesting user, ranked by dot product, and MUST exclude results with a score at or below 0.3.
- **FR-005**: The system MUST inject recalled facts into the chat prompt as contextual information and MUST NOT include memories belonging to another user.
- **FR-006**: The system MUST allow a user to forget a stored fact without changing another user's memories.
- **FR-007**: The system MUST reject missing or empty user identifiers and empty facts before performing memory operations.
- **FR-008**: The system MUST generate embeddings locally using the `all-MiniLM-L6-v2` model, with mean pooling and normalization enabled. Model initialization MUST be lazy and shared as a singleton.
- **FR-009**: The system MUST store memory embeddings in a BLOB in a `memories` table with columns `id`, `user_id`, `fact`, `embedding`, and `created_at`.
- **FR-010**: The embedding and memory-store responsibilities MUST be located in `src/memory/embeddings.ts` and `src/memory/memory-store.ts`, respectively.

### Key Entities

- **Memory**: A fact retained for one user, including its identifier, user association, embedding, and creation time.
- **User**: The owner whose identifier scopes the memory lifecycle and determines which facts may be recalled, deduplicated, or forgotten.
- **Chat request**: A user message paired with the required user identifier and used to retrieve relevant memory context.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: In a semantic-recall test where the query and stored fact share no words, the relevant fact is returned when its relevance score is greater than 0.3.
- **SC-002**: Every recall result contains at most three facts, and every returned fact has a relevance score greater than 0.3.
- **SC-003**: A new fact with similarity greater than 0.92 to an existing fact for the same user does not create a second memory; a fact at or below 0.92 can be stored.
- **SC-004**: Tests covering two users confirm that recall, deduplication, and forgetting never expose or modify the other user's memories.
- **SC-005**: A forgotten fact is absent from subsequent recall for that user.

## Assumptions

- Each `userId` supplied to chat is the stable identity used to scope that user's memory; authentication and identity issuance are outside this feature.
- Facts are retained until explicitly forgotten; no automatic expiration or retention policy is introduced.
- Forgetting targets an exact stored fact for the requesting user; a request for a fact that is not present leaves that user's other memories unchanged.
- The explicitly requested local embedding model, normalization, pooling, lazy singleton, persistence shape, and source-file locations are fixed implementation constraints for this feature.
- The supplied recall reference defines the relevance filter strictly as `score > 0.3`; a score of exactly 0.3 is excluded.
