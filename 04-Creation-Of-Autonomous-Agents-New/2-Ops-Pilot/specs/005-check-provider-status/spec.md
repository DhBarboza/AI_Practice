# Feature Specification: External Provider Status Check

**Feature Branch**: `005-check-provider-status`

**Created**: 2026-11-06

**Status**: Draft

**Input**: User description: "Add the `check_provider_status` tool for GitHub and Cloudflare public status pages, with provider selection, a five-second timeout, one retry for network or server failures, validated status responses, compact results, and deterministic fake-fetch tests."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Check an external dependency (Priority: P1)

During an incident, an on-call operator suspects an external provider may be degraded and needs to distinguish a provider outage from an issue in OpsPilot's own systems. The agent can check the public status of GitHub or Cloudflare and report a concise observation.

**Why this priority**: Quickly identifying an external dependency issue helps responders choose the right mitigation and avoid misdiagnosing an incident.

**Independent Test**: Select either supported provider and verify that the agent receives that provider's current indicator and description in a single line.

**Acceptance Scenarios**:

1. **Given** a status check is requested for GitHub, **When** the check succeeds, **Then** the result contains GitHub's status indicator and description on one line.
2. **Given** a status check is requested for Cloudflare, **When** the check succeeds, **Then** the result contains Cloudflare's status indicator and description on one line.
3. **Given** no provider is specified, **When** the status check runs, **Then** GitHub is checked by default.
4. **Given** a responder suspects a provider-side issue, **When** the agent selects this tool, **Then** its description makes clear it is useful for distinguishing an external provider issue from an OpsPilot-side issue or an unavailable dependency.

### User Story 2 - Get a usable result when status cannot be checked (Priority: P2)

When a provider status page cannot be reached or returns unusable data, the on-call operator still needs a clear outcome rather than a failed agent interaction or misleading status.

**Why this priority**: Explicitly reporting uncertainty prevents responders from treating unavailable status data as evidence that the provider is healthy.

**Independent Test**: Simulate timeouts, network failures, server errors, and malformed responses; verify that the check retries eligible failures once and ultimately returns a readable error as its result.

**Acceptance Scenarios**:

1. **Given** a request times out, **When** the check makes its single retry and the retry succeeds, **Then** it returns the validated provider status.
2. **Given** a network failure or server-side error occurs, **When** the one permitted retry also fails, **Then** the tool returns a concise, readable error result and does not throw an exception to its caller.
3. **Given** the response does not contain the required status indicator and description, **When** the response is processed, **Then** the tool returns a readable invalid-response error rather than a status or an uncaught exception.
4. **Given** a status check is tested, **When** a fake fetch implementation is supplied, **Then** the outcome can be verified without making a network request.

### Edge Cases

- The selected provider is not in the supported set; the input must be rejected before attempting a status request.
- The provider returns a successful HTTP response whose body is malformed or lacks either required status field.
- A request fails due to timeout or network error, or receives a server-side error; only one additional attempt is made.
- The provider responds with an error other than a network error or server-side error; the final result is still readable and does not claim a valid status.
- The status indicator or description is empty or not a string; the response is treated as invalid.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The agent MUST provide a `check_provider_status` tool for checking the public status of supported external providers.
- **FR-002**: The tool MUST accept `provider` values `github` and `cloudflare`; its default MUST be `github`, and its parameter description MUST explain the supported values.
- **FR-003**: The tool's description MUST guide the agent to use it when an external dependency may be unavailable, when determining whether an issue is local or provider-side, or when an external-provider problem is suspected.
- **FR-004**: The GitHub status check MUST use `https://www.githubstatus.com/api/v2/status.json`; the Cloudflare status check MUST use `https://www.cloudflarestatus.com/api/v2/status.json`. These public endpoints MUST NOT require an API key.
- **FR-005**: Each status request MUST have a five-second timeout. A network failure, timeout, or server-side HTTP error MUST trigger exactly one retry; no further retry is permitted.
- **FR-006**: A successful response MUST be validated to contain a `status` object with non-empty string `indicator` and `description` values. A response that does not satisfy this shape MUST be treated as invalid.
- **FR-007**: On success, the tool MUST return a compact, single-line result containing the status indicator and description.
- **FR-008**: If the check ultimately fails for any reason, the tool MUST return a readable error string as its result and MUST NOT throw the failure out of the tool.
- **FR-009**: Automated tests MUST be able to inject a fake fetch function and verify success, timeout, and invalid-response behavior without network access.

### Key Entities

- **Provider status observation**: A single provider's reported status indicator and human-readable description.
- **Provider selection**: The requested supported provider, with GitHub selected when the caller omits the parameter.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Both supported providers can be checked independently and successful results contain both required status fields on exactly one line.
- **SC-002**: Every individual status request ends within five seconds; eligible transient failures result in no more than one retry.
- **SC-003**: For all tested request failures and invalid response shapes, the tool returns a readable error result without propagating an exception.
- **SC-004**: Automated tests for success, timeout, and invalid response complete without making external network requests.

## Assumptions

- The provider status APIs remain publicly reachable without authentication and retain the documented `status.indicator` and `status.description` response shape.
- A timeout is treated as a network failure for retry purposes.
- The status check is an observation to support incident triage; it does not determine root cause or perform remediation.
- Provider status requests do not require persistence or exposure of credentials.
