export type AlertLevel = "warning" | "watch" | "advisory" | "statement";

export const LEVEL_RANK: Record<AlertLevel, number> = { warning: 3, watch: 2, advisory: 1, statement: 0 };

export function levelFor(event: string): AlertLevel {
  const e = event.toLowerCase();
  if (e.includes("warning")) return "warning";
  if (e.includes("watch")) return "watch";
  if (e.includes("advisory")) return "advisory";
  return "statement";
}
