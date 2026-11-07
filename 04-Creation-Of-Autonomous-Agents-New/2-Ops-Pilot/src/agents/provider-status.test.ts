import assert from "node:assert/strict";
import test from "node:test";
import { fetchProviderStatus } from "./provider-status.js";

const providerUrls = {
  github: "https://www.githubstatus.com/api/v2/status.json",
  cloudflare: "https://www.cloudflarestatus.com/api/v2/status.json",
} as const;

function statusResponse(indicator: string, description: string): Response {
  return new Response(
    JSON.stringify({ status: { indicator, description } }),
    { status: 200 },
  );
}

test("fetchProviderStatus checks GitHub by default and returns a compact one-line status", async () => {
  const calls: string[] = [];
  const doFetch: typeof fetch = async (input) => {
    calls.push(String(input));
    return statusResponse("operational", "All systems\noperational");
  };

  const result = await fetchProviderStatus(undefined, doFetch);

  assert.deepEqual(calls, [providerUrls.github]);
  assert.equal(result, "github está operational - All systems operational");
  assert.equal(result.includes("\n"), false);
});

test("fetchProviderStatus checks the explicitly selected Cloudflare endpoint", async () => {
  const calls: string[] = [];
  const doFetch: typeof fetch = async (input) => {
    calls.push(String(input));
    return statusResponse("degraded_performance", "Some services are degraded");
  };

  const result = await fetchProviderStatus("cloudflare", doFetch);

  assert.deepEqual(calls, [providerUrls.cloudflare]);
  assert.equal(
    result,
    "cloudflare está degraded_performance - Some services are degraded",
  );
});

test("fetchProviderStatus applies a five-second timeout to every request", async (t) => {
  const timeoutDelays: number[] = [];
  t.mock.method(AbortSignal, "timeout", (delay: number) => {
    timeoutDelays.push(delay);
    return new AbortController().signal;
  });
  const signals: AbortSignal[] = [];
  const doFetch: typeof fetch = async (_input, init) => {
    assert.ok(init?.signal instanceof AbortSignal);
    signals.push(init.signal);
    return statusResponse("operational", "All services normal");
  };

  await fetchProviderStatus("github", doFetch);

  assert.deepEqual(timeoutDelays, [5000]);
  assert.equal(signals.length, 1);
});

test("fetchProviderStatus retries a timeout once and returns a readable failure", async () => {
  let calls = 0;
  const doFetch: typeof fetch = async () => {
    calls += 1;
    throw new DOMException("request timed out", "TimeoutError");
  };

  const result = await fetchProviderStatus("github", doFetch);

  assert.equal(calls, 2);
  assert.match(result, /não consegui consultar o status de github/);
  assert.match(result, /request timed out/);
});

test("fetchProviderStatus retries a timeout while reading the response body", async () => {
  let calls = 0;
  const doFetch: typeof fetch = async () => {
    calls += 1;
    if (calls > 1) return statusResponse("operational", "Recovered");
    const response = statusResponse("operational", "Not received");
    Object.defineProperty(response, "json", {
      value: async () => {
        throw new DOMException("request timed out", "TimeoutError");
      },
    });
    return response;
  };

  const result = await fetchProviderStatus("github", doFetch);

  assert.equal(calls, 2);
  assert.equal(result, "github está operational - Recovered");
});

test("fetchProviderStatus retries a 5xx response once", async () => {
  let calls = 0;
  const doFetch: typeof fetch = async () => {
    calls += 1;
    return calls === 1
      ? new Response("upstream unavailable", { status: 503 })
      : statusResponse("operational", "Recovered");
  };

  const result = await fetchProviderStatus("cloudflare", doFetch);

  assert.equal(calls, 2);
  assert.equal(result, "cloudflare está operational - Recovered");
});

test("fetchProviderStatus does not retry non-5xx HTTP errors", async () => {
  let calls = 0;
  const doFetch: typeof fetch = async () => {
    calls += 1;
    return new Response("not found", { status: 404 });
  };

  const result = await fetchProviderStatus("github", doFetch);

  assert.equal(calls, 1);
  assert.equal(result, "status page de github respondeu HTTP 404");
});

test("fetchProviderStatus returns readable errors for malformed status data without retrying", async () => {
  let calls = 0;
  const doFetch: typeof fetch = async () => {
    calls += 1;
    return new Response(JSON.stringify({ status: { indicator: " ", description: 1 } }), {
      status: 200,
    });
  };

  const result = await fetchProviderStatus("cloudflare", doFetch);

  assert.equal(calls, 1);
  assert.match(result, /a página de status retornou dados inválidos/);
});

test("fetchProviderStatus returns a readable error for invalid JSON without retrying", async () => {
  let calls = 0;
  const doFetch: typeof fetch = async () => {
    calls += 1;
    return new Response("{invalid json", { status: 200 });
  };

  const result = await fetchProviderStatus("github", doFetch);

  assert.equal(calls, 1);
  assert.match(result, /a página de status retornou JSON inválido/);
});
