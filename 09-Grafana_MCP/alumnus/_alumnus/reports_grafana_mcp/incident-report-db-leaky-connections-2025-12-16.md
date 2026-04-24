# Incident Report: DB Leaky Connections

## 1. Prometheus Metrics Analysis

**Query Executed:**
```promql
http_server_duration_milliseconds_count{http_route="/students/db-leaky-connections"}
```

**Findings:**
- Initial requests (first 2) succeed with a status code of `200` and normal response times (~15ms).
- Subsequent requests fail 100% of the time with a `500 Internal Server Error`.
- Response time for failed cases jumps to ~1000ms.

## 2. Loki Logs Analysis

**Query Executed:**
```logql
{service_name="alumnus_app_1637"} |= "error"
```

**Findings:**
- **Error Message:** `timeout exceeded when trying to connect`
- **Pattern:** Errors start occurring continuously after the first two successful requests. This limit of two before timeouts suggests a hard constraint on the application's connection pool.

**Stack Trace Extracted:**
```
Error: timeout exceeded when trying to connect
    at /home/atom/projects/AI_Practice/09-Grafana_MCP/alumnus/_alumnus/node_modules/pg-pool/index.js:45:11
    at async DbLeakyConnectionsScenario.createConnection (file:///home/atom/projects/AI_Practice/09-Grafana_MCP/alumnus/_alumnus/src/scenarios/db-leaky-connections/main.ts:51/52)
    at async Object.<anonymous> (file:///home/atom/projects/AI_Practice/09-Grafana_MCP/alumnus/_alumnus/src/scenarios/db-leaky-connections/main.ts:80/84)
```

## 3. Tempo Traces Analysis

**Query Executed:**
```traceql
{resource.service.name="alumnus_app_1637" && status="error"}
```

**Findings:**
- **Duration:** The spans for the failed requests all consistently reflect a `~1000ms` duration.
- **Span Hierarchy:** The DB operations are present in the traces, but there are absolutely **no spans or events corresponding to connection cleanup/release**.
- **Exceptions:** The error spans indicate timeout exceptions while trying to execute `pool.connect()`.

## 4. Root Cause Analysis

Based on the telemetry data:
1. **Error Pattern:** The strict pattern of "2 successes followed by all failures" correlates perfectly with a max database connection pool size of 2.
2. **Logs & Metrics:** The `1000ms` wait time matches default generic timeout settings for pool connection acquisition.
3. **Missing Telemetry:** The Tempo traces prove that connection cleanup procedures are never invoked.
4. **Conclusion:** At `main.ts:80`, database connections are acquired but never returned to the pool using `client.release()`. The missing `finally` block leaves the connections checked out forever until the pool is exhausted.

## 5. Diagnosis Correlation Table

| Telemetry Type | Data Found | Implication |
| -------------- | ---------- | ----------- |
| **Metrics** (Prometheus) | Jump to `1000ms` response times for `500` errors. | The request is waiting for a resource that never frees up, timing out after 1s. |
| **Logs** (Loki) | `timeout exceeded when trying to connect` at `main.ts:80`. | The DB connection pool limit is reached and cannot fulfill new connection requests. |
| **Traces** (Tempo) | DB operations visible, but no `release` spans. | Acquired connections are being leaked and permanently checked out of the pool. |

### Proposed Fix:
Ensure connections are always returned to the pool, even if an error occurs during query execution:

```typescript
const client = await this.pool.connect()
try {
  const result = await client.query('SELECT * FROM students LIMIT 1')
  return reply.send({ students: result.rows })
} finally {
  client.release() // Fixes the leak
}
```
