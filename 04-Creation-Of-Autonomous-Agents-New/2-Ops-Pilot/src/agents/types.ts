export type AlertStatus = "firing" | "resolved";
export type AlertSeverity = "critical" | "warning" | "info";
export type IncidentSeverity = "critical" | "high" | "medium" | "low";

export interface Service {
  id: string;
  name: string;
  team: string;
  environment: string;
}

export interface Alert {
  id: string;
  service: string;
  title: string;
  severity: AlertSeverity;
  status: AlertStatus;
}

export interface Incident {
  id: string;
  title: string;
  service: string;
  severity: IncidentSeverity;
  status: "open" | "resolved";
}

export type TraceEvent =
  | { type: "thought" | "plan" | "critique" | "answer"; content: string }
  | { type: "action"; tool: string; args: Record<string, unknown> }
  | { type: "observation"; tool: string; content: string };

export interface ReasoningInput {
  input: string;
  maxIterations: number;
}

export interface ReasoningMetrics {
  llmCalls: number;
  latencyMs: number;
}

export interface ReasoningResult {
  answer: string;
  trace: TraceEvent[];
  metrics: ReasoningMetrics;
}

export interface ReasoningStrategy {
  name: string;
  run(input: ReasoningInput): Promise<ReasoningResult>;
}

export function assertValidReasoningInput(input: ReasoningInput): void {
  if (!input.input.trim()) throw new Error("Reasoning input must not be empty.");
  if (!Number.isInteger(input.maxIterations) || input.maxIterations < 1) {
    throw new Error("maxIterations must be a positive integer.");
  }
}
