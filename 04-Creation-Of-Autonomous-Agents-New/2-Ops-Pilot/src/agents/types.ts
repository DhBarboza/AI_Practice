import { z } from "zod";

export const AlertStatusSchema = z.enum(["firing", "resolved"]);
export const AlertFilterStatusSchema = z.enum(["firing", "resolved", "all"]);
export const AlertSeveritySchema = z.enum(["critical", "warning", "info"]);
export const IncidentSeveritySchema = z.enum([
  "critical",
  "high",
  "medium",
  "low",
]);
export const IncidentStatusSchema = z.enum(["open", "resolved"]);

export const ServiceSchema = z
  .object({
    id: z.string().min(1),
    name: z.string().min(1),
    team: z.string().min(1),
    environment: z.string().min(1),
  })
  .strict();

export const AlertSchema = z
  .object({
    id: z.string().min(1),
    service: z.string().min(1),
    title: z.string().min(1),
    severity: AlertSeveritySchema,
    status: AlertStatusSchema,
  })
  .strict();

export const IncidentSchema = z
  .object({
    id: z.string().min(1),
    title: z.string().min(1),
    service: z.string().min(1),
    severity: IncidentSeveritySchema,
    status: IncidentStatusSchema,
  })
  .strict();

export const OpenIncidentInputSchema = z
  .object({
    title: z.string().trim().min(1),
    service: z.string().trim().min(1),
    severity: IncidentSeveritySchema,
  })
  .strict();

export const ResolveIncidentInputSchema = z
  .object({ id: z.string().trim().min(1) })
  .strict();

export const ReasoningInputSchema = z
  .object({
    input: z.string().trim().min(1),
    maxIterations: z.number().int().positive(),
  })
  .strict();

const ContentTraceEventSchema = z
  .object({
    type: z.enum(["thought", "plan", "critique", "answer"]),
    content: z.string(),
  })
  .strict();

const ActionTraceEventSchema = z
  .object({
    type: z.literal("action"),
    tool: z.string().min(1),
    args: z.record(z.string(), z.unknown()),
  })
  .strict();

const ObservationTraceEventSchema = z
  .object({
    type: z.literal("observation"),
    tool: z.string().min(1),
    content: z.string(),
  })
  .strict();

export const TraceEventSchema = z.discriminatedUnion("type", [
  ContentTraceEventSchema,
  ActionTraceEventSchema,
  ObservationTraceEventSchema,
]);

export const ReasoningResultSchema = z
  .object({
    answer: z.string(),
    trace: z.array(TraceEventSchema),
    metrics: z
      .object({
        llmCalls: z.number().int().nonnegative(),
        latencyMs: z.number().nonnegative(),
      })
      .strict(),
  })
  .strict();

export type AlertStatus = "firing" | "resolved";
export type AlertFilterStatus = z.infer<typeof AlertFilterStatusSchema>;
export type AlertSeverity = "critical" | "warning" | "info";
export type IncidentSeverity = "critical" | "high" | "medium" | "low";

export type Service = z.infer<typeof ServiceSchema>;
export type Alert = z.infer<typeof AlertSchema>;
export type Incident = z.infer<typeof IncidentSchema>;
export type TraceEvent = z.infer<typeof TraceEventSchema>;
export type ReasoningInput = z.infer<typeof ReasoningInputSchema>;

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
  ReasoningInputSchema.parse(input);
}
