import type { AggregatedAgent } from "@/hooks/use-aggregated-agents";

export const TASK_STATUSES = ["backlog", "todo", "needs-review", "done", "cancelled"] as const;
export type TaskStatus = (typeof TASK_STATUSES)[number];
export type InboxFilter = TaskStatus | "all" | "flagged" | "archived";
export const INBOX_FILTERS: readonly InboxFilter[] = [
  "all",
  ...TASK_STATUSES,
  "flagged",
  "archived",
];
export const STATUS_LABEL = "paseo.taskStatus";
export const FLAG_LABEL = "paseo.flagged";

export function isTaskStatus(value: unknown): value is TaskStatus {
  return TASK_STATUSES.some((status) => status === value);
}

export function resolveInboxFilter(value: unknown): InboxFilter {
  return isTaskStatus(value) || value === "flagged" || value === "archived" ? value : "all";
}

export function readTaskStatus(agent: Pick<AggregatedAgent, "labels">): TaskStatus {
  const status = agent.labels[STATUS_LABEL];
  return isTaskStatus(status) ? status : "todo";
}

export function matchesInboxFilter(agent: AggregatedAgent, filter: InboxFilter): boolean {
  if (filter === "archived") return Boolean(agent.archivedAt);
  if (agent.archivedAt) return false;
  if (filter === "flagged") return agent.labels[FLAG_LABEL] === "true";
  return filter === "all" || readTaskStatus(agent) === filter;
}

export function buildInboxRoute(filter: InboxFilter) {
  return { pathname: "/task-inbox" as const, params: { status: filter } };
}
