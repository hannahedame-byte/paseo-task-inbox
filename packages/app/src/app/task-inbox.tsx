import { HostRouteBootstrapBoundary } from "@/components/host-route-bootstrap-boundary";
import { TaskInboxScreen } from "@/task-inbox/screen";

export default function TaskInboxRoute() {
  return (
    <HostRouteBootstrapBoundary>
      <TaskInboxScreen />
    </HostRouteBootstrapBoundary>
  );
}
