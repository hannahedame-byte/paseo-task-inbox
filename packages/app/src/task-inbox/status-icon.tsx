import {
  Archive,
  Circle,
  CircleCheck,
  CircleDashed,
  CircleDot,
  CircleX,
  Flag,
  Inbox,
} from "lucide-react-native";
import { DensityIcon } from "@/components/ui/density-icon";
import type { InboxFilter } from "./model";

const icons = {
  all: Inbox,
  backlog: CircleDashed,
  todo: Circle,
  "needs-review": CircleDot,
  done: CircleCheck,
  cancelled: CircleX,
  flagged: Flag,
  archived: Archive,
};

export function TaskStatusIcon({ value, large }: { value: InboxFilter; large?: boolean }) {
  let color: "foregroundMuted" | "statusWarning" | "statusSuccess" = "foregroundMuted";
  if (value === "needs-review") color = "statusWarning";
  if (value === "done") color = "statusSuccess";
  return <DensityIcon icon={icons[value]} size={large ? "lg" : "sm"} color={color} />;
}

export const statusIcons = Object.fromEntries(
  Object.keys(icons).map((value) => [
    value,
    <TaskStatusIcon key={value} value={value as InboxFilter} />,
  ]),
) as Record<InboxFilter, React.JSX.Element>;
