import { router, useGlobalSearchParams, usePathname } from "expo-router";
import { ChevronDown, ChevronRight, Inbox } from "lucide-react-native";
import { useCallback, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Text, View, type PressableStateCallbackType } from "react-native";
import { StyleSheet } from "react-native-unistyles";
import { SidebarHeaderRow } from "@/components/sidebar/sidebar-header-row";
import { PressHighlight } from "@/components/ui/press-highlight";
import { DensityIcon } from "@/components/ui/density-icon";
import { ToolbarButton } from "@/components/ui/pane-content-toolbar";
import { useIsCompactFormFactor } from "@/constants/layout";
import {
  buildInboxRoute,
  resolveInboxFilter,
  INBOX_FILTERS,
  TASK_STATUSES,
  type InboxFilter,
} from "./model";
import { TaskStatusIcon } from "./status-icon";

export function TaskInboxSidebarGroup({ onBeforeNavigate }: { onBeforeNavigate?: () => void }) {
  const { t } = useTranslation();
  const onInbox = usePathname() === "/task-inbox";
  const { status } = useGlobalSearchParams();
  const selection = onInbox ? resolveInboxFilter(status) : null;
  const compact = useIsCompactFormFactor();
  const [expanded, setExpanded] = useState<boolean | null>(null);
  const open = expanded ?? (onInbox || !compact);
  const navigate = useCallback(
    (filter: InboxFilter) => {
      onBeforeNavigate?.();
      router.navigate(buildInboxRoute(filter));
    },
    [onBeforeNavigate],
  );
  const actions = useMemo(
    () => new Map(INBOX_FILTERS.map((value) => [value, () => navigate(value)])),
    [navigate],
  );
  function row(filter: InboxFilter) {
    const selected = selection === filter;
    const appearance = selected ? selectedAppearance : idleAppearance;
    return (
      <PressHighlight
        key={filter}
        accessibilityRole="button"
        accessibilityState={selected ? SELECTED : UNSELECTED}
        testID={`sidebar-task-inbox-${filter}`}
        style={appearance}
        onPress={actions.get(filter)}
      >
        <TaskStatusIcon value={filter} />
        <Text style={[styles.label, selected && styles.current]}>{t(`taskInbox.${filter}`)}</Text>
      </PressHighlight>
    );
  }
  const toggle = useCallback(() => setExpanded(!open), [open]);
  const all = useCallback(() => navigate("all"), [navigate]);
  const disclosure = useMemo(
    () => (
      <ToolbarButton
        compact
        label={t(open ? "taskInbox.collapse" : "taskInbox.expand")}
        onPress={toggle}
      >
        <DensityIcon icon={open ? ChevronDown : ChevronRight} size="xs" color="foregroundMuted" />
      </ToolbarButton>
    ),
    [t, open, toggle],
  );
  return (
    <View>
      <SidebarHeaderRow
        icon={Inbox}
        label={t("taskInbox.all")}
        variant="compact"
        isActive={selection === "all"}
        testID="sidebar-task-inbox"
        onPress={all}
        trailing={disclosure}
      />
      {open && (
        <View style={styles.children}>
          {TASK_STATUSES.map(row)}
          <View style={styles.rule} />
          {row("flagged")}
          {row("archived")}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create((theme) => ({
  children: {
    marginStart: theme.spacing[6],
    paddingStart: theme.spacing[1],
    marginEnd: theme.spacing[2],
    paddingBottom: theme.spacing[1],
  },
  child: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing[2],
    minHeight: { xs: 39, md: 28 },
    paddingHorizontal: theme.spacing[2],
    borderRadius: theme.borderRadius.lg,
  },
  highlight: { backgroundColor: theme.colors.surfaceSidebarSelected },
  label: { color: theme.colors.foregroundMuted, fontSize: theme.fontSize.base },
  current: { color: theme.colors.foreground },
  rule: {
    height: theme.borderWidth[1],
    marginVertical: theme.spacing[1],
    marginStart: theme.spacing[2],
    backgroundColor: theme.colors.border,
  },
}));

const SELECTED = { selected: true } as const;
const UNSELECTED = { selected: false } as const;
function selectedAppearance() {
  return [styles.child, styles.highlight];
}
function idleAppearance({ pressed, hovered }: PressableStateCallbackType & { hovered?: boolean }) {
  return [styles.child, (pressed || hovered) && styles.highlight];
}
