# Chat HTTP Contract

## Request

```http
POST /chat
Content-Type: application/json
```

```json
{
  "message": "List firing alerts",
  "strategy": "react",
  "reflect": false
}
```

| Field | Required | Contract |
|---|---|---|
| `message` | Yes | Non-empty string after trimming. |
| `strategy` | No | Non-empty registered strategy name. If omitted, use `react`. |
| `reflect` | No | Boolean; defaults to false. If true, wrap the selected strategy in reflection. |

The body is strict; unknown fields are invalid.

When `strategy` is omitted, `react` is selected. When `reflect` is `true`, the selected base strategy is decorated with reflection for that request.

Example reflected request:

```sh
curl -X POST http://localhost:3000/chat \
  -H 'content-type: application/json' \
  -d '{"message":"List firing alerts","strategy":"react","reflect":true}'
```

## Responses

### 200 OK

Exactly the reasoning result fields:

```json
{
  "answer": "There are firing alerts.",
  "trace": [],
  "metrics": {
    "llmCalls": 1,
    "latencyMs": 12.5
  }
}
```

### 400 Bad Request

Malformed JSON and schema-invalid bodies return the Zod issue details:

```json
{
  "issues": [
    {
      "code": "too_small",
      "path": ["message"],
      "message": "Too small: expected string to have >=1 characters"
    }
  ]
}
```

### 422 Unprocessable Entity

```json
{ "error": "Unknown strategy" }
```

The request was valid but its strategy name is not registered. No strategy is invoked.

### 500 Internal Server Error

```json
{ "error": "Internal server error" }
```

Unexpected strategy/model failures and invalid strategy results do not expose internal details.

### 504 Gateway Timeout

```json
{ "error": "Request timed out" }
```

The server returns this response when execution exceeds 180 seconds. It does not include a partial result. The current strategy interface does not provide cancellation, so timeout only bounds the HTTP response wait.

## Composition and Testing

The agent registry is the source of supported base strategy names. The Express application factory accepts an alternate registry and a timeout override for deterministic integration tests. The HTTP server listens on `PORT`, defaulting to `3000`. Tests use a fake strategy and short deadline; they do not call the model provider or external network services.

Start the service with `npm run http`. Set `OPENROUTER_API_KEY` and `OPENROUTER_MODEL` for model-backed requests.
