import type { TraceEvent } from "./types.js";

function formatValue(value: unknown): string {
  return JSON.stringify(value) ?? String(value);
}

export function formatTrace(trace: readonly TraceEvent[]): string {
  return trace
    .map((event, index) => {
      const number = String(index + 1).padStart(2, "0");
      switch (event.type) {
        case "action":
          return `[${number}] ACTION ${event.tool}(${formatValue(event.args)})`;
        case "observation":
          return `[${number}] OBSERVATION ${event.tool}: ${event.content}`;
        default:
          return `[${number}] ${event.type.toUpperCase()}: ${event.content}`;
      }
    })
    .join("\n");
}
