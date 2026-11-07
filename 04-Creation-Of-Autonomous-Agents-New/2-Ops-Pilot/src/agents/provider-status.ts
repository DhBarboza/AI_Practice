import { z } from "zod";

export const ProviderSchema = z.enum(["github", "cloudflare"]);
export type Provider = z.infer<typeof ProviderSchema>;

const providerStatusSchema = z.object({
  status: z.object({
    indicator: z.string().trim().min(1),
    description: z.string().trim().min(1),
  }),
});

const STATUS_URL: Record<Provider, string> = {
  github: "https://www.githubstatus.com/api/v2/status.json",
  cloudflare: "https://www.cloudflarestatus.com/api/v2/status.json",
};

function errorMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  const compact = message.replace(/\s+/g, " ").trim();
  return compact.length > 200 ? `${compact.slice(0, 197)}...` : compact;
}

function compactStatusText(value: string, limit: number): string {
  const compact = value.replace(/\s+/g, " ").trim();
  return compact.length > limit ? `${compact.slice(0, limit - 3)}...` : compact;
}

function failedStatus(provider: Provider, reason: string): string {
  return `não consegui consultar o status de ${provider} (${reason}). Responda com base nos alertas internos e avise o plantonista da limitação`;
}

export async function fetchProviderStatus(
  provider: Provider = "github",
  doFetch: typeof fetch = fetch,
): Promise<string> {
  const url = STATUS_URL[provider];

  for (let attempt = 1; attempt <= 2; attempt += 1) {
    let response: Response;
    try {
      response = await doFetch(url, { signal: AbortSignal.timeout(5000) });
    } catch (error) {
      if (attempt === 1) continue;
      return failedStatus(provider, errorMessage(error) || "falha de rede");
    }

    if (response.status >= 500) {
      if (attempt === 1) continue;
      return failedStatus(provider, `a página de status respondeu HTTP ${response.status}`);
    }
    if (!response.ok) {
      return `status page de ${provider} respondeu HTTP ${response.status}`;
    }

    let body: unknown;
    try {
      body = await response.json();
    } catch (error) {
      if (error instanceof SyntaxError) {
        return failedStatus(provider, "a página de status retornou JSON inválido");
      }
      if (attempt === 1) continue;
      return failedStatus(provider, errorMessage(error) || "falha de rede");
    }

    const parsed = providerStatusSchema.safeParse(body);
    if (!parsed.success) {
      return failedStatus(provider, "a página de status retornou dados inválidos");
    }

    const { indicator, description } = parsed.data.status;
    return `${provider} está ${compactStatusText(indicator, 80)} - ${compactStatusText(description, 200)}`;
  }

  return failedStatus(provider, "falha inesperada ao consultar a página de status");
}
