import { useCallback, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Text, View, type PressableStateCallbackType } from "react-native";
import { StyleSheet } from "react-native-unistyles";
import { ChevronDown, Flag } from "lucide-react-native";
import { DensityIcon } from "@/components/ui/density-icon";
import { PressHighlight } from "@/components/ui/press-highlight";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { StatusBadge } from "@/components/ui/status-badge";
import { useToast } from "@/contexts/toast-api-context";
import type { AggregatedAgent } from "@/hooks/use-aggregated-agents";
import { useTimeAgo } from "@/hooks/use-time-ago";
import { getHostRuntimeStore } from "@/runtime/host-runtime";
import { navigateToAgent } from "@/utils/navigate-to-agent";
import { FLAG_LABEL, readTaskStatus, STATUS_LABEL, TASK_STATUSES } from "./model";
import { TaskStatusIcon, statusIcons } from "./status-icon";

export function InboxSessionRow({ agent }: { agent: AggregatedAgent }) {
  const { t } = useTranslation();
  const toast = useToast();
  const [saving, setSaving] = useState(false);
  const age = useTimeAgo(agent.lastActivityAt);
  const status = readTaskStatus(agent);
  const flagged = agent.labels[FLAG_LABEL] === "true";
  const title = agent.title || t("agentList.fallbackTitle");
  const context = agent.projectPlacement?.projectName || agent.serverLabel;
  const save = useCallback(
    async (labels: Record<string, string>) => {
      const runtime = getHostRuntimeStore();
      const client = runtime.getClient(agent.serverId);
      if (!client || runtime.getSnapshot(agent.serverId)?.connectionStatus !== "online") {
        toast.error(t("workspace.terminal.hostDisconnected"));
        return;
      }
      setSaving(true);
      try {
        await client.updateAgent(agent.id, { labels });
        // A closed session on older hosts may not produce a live directory event.
        if (agent.status === "closed") await runtime.refreshDirectories(agent.serverId);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : t("common.errors.unableToSave"));
      } finally {
        setSaving(false);
      }
    },
    [agent.id, agent.serverId, agent.status, toast, t],
  );
  const openSession = useCallback(
    () =>
      navigateToAgent({
        serverId: agent.serverId,
        agentId: agent.id,
        workspaceId: agent.workspaceId,
        pin: true,
      }),
    [agent.id, agent.serverId, agent.workspaceId],
  );
  const toggleFlag = useCallback(
    () => void save({ [FLAG_LABEL]: flagged ? "false" : "true" }),
    [save, flagged],
  );
  const statusActions = useMemo(
    () =>
      TASK_STATUSES.map((value) => ({
        value,
        choose: () => {
          if (value !== status) void save({ [STATUS_LABEL]: value });
        },
      })),
    [save, status],
  );
  let variant: "muted" | "warning" | "success" = "muted";
  if (status === "needs-review") variant = "warning";
  if (status === "done") variant = "success";
  return (
    <View style={styles.row}>
      <PressHighlight
        style={sessionButtonStyle}
        accessibilityRole="button"
        accessibilityLabel={title}
        testID={`task-inbox-row-${agent.id}`}
        onPress={openSession}
      >
        <View style={styles.details}>
          <View style={styles.titleLine}>
            {flagged && <DensityIcon icon={Flag} size="xs" color="statusWarning" />}
            <Text numberOfLines={2} style={styles.title}>
              {title}
            </Text>
          </View>
          <Text numberOfLines={1} style={styles.context}>
            {context ? `${context} · ${age}` : age}
          </Text>
        </View>
      </PressHighlight>
      {agent.archivedAt ? (
        <TaskStatusIcon value="archived" />
      ) : (
        <DropdownMenu compactMode="sheet">
          <DropdownMenuTrigger
            testID={`task-inbox-change-${agent.id}`}
            disabled={saving}
            accessibilityLabel={t("taskInbox.change", { title, status: t(`taskInbox.${status}`) })}
            style={styles.trigger}
          >
            <StatusBadge
              variant={variant}
              label={t(`taskInbox.${status}`)}
              leading={statusIcons[status]}
            />
            <DensityIcon icon={ChevronDown} size="xs" color="foregroundMuted" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" sheetTitle={title} width={215}>
            <DropdownMenuLabel>{t("taskInbox.status")}</DropdownMenuLabel>
            {statusActions.map(({ value, choose }) => {
              return (
                <DropdownMenuItem
                  key={value}
                  selected={value === status}
                  leading={statusIcons[value]}
                  testID={`task-inbox-status-${value}`}
                  onSelect={choose}
                >
                  {t(`taskInbox.${value}`)}
                </DropdownMenuItem>
              );
            })}
            <DropdownMenuSeparator />
            <DropdownMenuItem
              leading={statusIcons.flagged}
              testID="task-inbox-toggle-flag"
              onSelect={toggleFlag}
            >
              {t(flagged ? "taskInbox.unflag" : "taskInbox.flag")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </View>
  );
}

function sessionButtonStyle({
  pressed,
  hovered,
}: PressableStateCallbackType & { hovered?: boolean }) {
  return [styles.sessionButton, (hovered || pressed) && styles.highlight];
}
const styles = StyleSheet.create((theme) => ({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing[2],
    borderBottomColor: theme.colors.border,
    borderBottomWidth: theme.borderWidth[1],
    paddingVertical: theme.spacing[1],
    paddingEnd: theme.spacing[1],
  },
  sessionButton: {
    flex: 1,
    minWidth: 0,
    paddingVertical: theme.spacing[3],
    paddingHorizontal: theme.spacing[2],
    borderRadius: theme.borderRadius.md,
  },
  highlight: { backgroundColor: theme.colors.interactionHighlight },
  details: { gap: theme.spacing[1] },
  titleLine: { flexDirection: "row", alignItems: "center", gap: theme.spacing[2] },
  title: {
    color: theme.colors.foreground,
    flexShrink: 1,
    fontSize: theme.fontSize.base,
    fontWeight: theme.fontWeight.medium,
  },
  context: { color: theme.colors.foregroundMuted, fontSize: theme.fontSize.sm },
  trigger: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing[1],
    minHeight: 44,
    paddingStart: theme.spacing[1],
  },
}));
