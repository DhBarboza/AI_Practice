# Tool Contract: `check_provider_status`

## Purpose and use

Read the current public status of GitHub or Cloudflare during incident triage. Use when an
external dependency may be unavailable, when determining whether a fault is local or provider-side,
or when a provider outage is suspected. The tool observes reported status; it does not determine
root cause or perform remediation.

## Input

| Field | Type | Required | Default | Description |
|---|---|---:|---|---|
| `provider` | `github` or `cloudflare` | No | `github` | Provider whose public status to check |

The tool rejects values outside the supported provider enum. Provider input cannot select an
arbitrary URL.

## Provider mapping

| Provider | Public endpoint |
|---|---|
| `github` | `https://www.githubstatus.com/api/v2/status.json` |
| `cloudflare` | `https://www.cloudflarestatus.com/api/v2/status.json` |

No API key or other credential is sent.

## Request and response

- Each HTTP request has a 5-second timeout.
- A network failure, timeout, or HTTP 5xx causes exactly one retry. The retry has its own 5-second
  timeout.
- Other non-success HTTP responses are terminal. Invalid JSON or a response failing schema
  validation is terminal and is not retried.
- A usable response contains a `status` object with non-empty string `indicator` and `description`
  fields.
- Successful output is one line containing the indicator and description. Normalize embedded
  whitespace so provider text cannot turn the result into multiple lines.
- Any final failure is a readable, one-line string returned as the tool result. It must not escape
  the tool as an exception, be mistaken for a successful status, or include a stack trace.

## Testability

The fetch implementation is injectable. Automated tests use a fake fetch to verify provider URL
selection, successful formatting, five-second timeout signal, retry limits, timeout/network/5xx
behavior, invalid data, and final error results without external network access.
