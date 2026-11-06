# Data Model: External Provider Status Check

This feature is read-only and has no persisted entities.

## Provider

The identity used to select one fixed public status endpoint.

| Field | Type | Constraints |
|---|---|---|
| `provider` | `github` or `cloudflare` | Required selection; defaults to `github` when omitted |
| Endpoint | URL | Fixed by provider; never caller-controlled |

## Provider status observation

The validated status returned by a provider status page and presented to the agent.

| Field | Type | Constraints |
|---|---|---|
| `status.indicator` | string | Required, non-empty |
| `status.description` | string | Required, non-empty |
| Formatted result | single-line string | Contains indicator and description; whitespace normalized |

Status-page JSON is untrusted external input. The full response is not retained. The indicator
remains an arbitrary non-empty string so an upstream addition does not break validation.

## Failed status observation

A readable single-line tool result describing why the status could not be obtained. It is not a
domain entity and does not indicate that the provider is healthy or unhealthy.

| Field | Type | Constraints |
|---|---|---|
| Error result | string | Required tool result on a final failure; no exception escapes the tool |

Retryable failures are a network rejection, timeout, or HTTP 5xx. There is at most one retry.
Malformed JSON and schema-invalid responses are terminal and are not retried.
