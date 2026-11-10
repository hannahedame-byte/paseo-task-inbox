import { router, useLocalSearchParams } from "expo-router";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { FlatList, Text, View } from "react-native";
import { StyleSheet, withUnistyles } from "react-native-unistyles";
import { ChevronDown } from "lucide-react-native";
import { MenuHeader } from "@/components/headers/menu-header";
import { Button } from "@/components/ui/button";
import { DensityIcon } from "@/components/ui/density-icon";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { useIsCompactFormFactor } from "@/constants/layout";
import { useAgentHistory } from "@/hooks/use-agent-history";
import { useAggregatedAgents, type AggregatedAgent } from "@/hooks/use-aggregated-agents";
import { useHosts, useHostRuntimeConnectionStatuses } from "@/runtime/host-runtime";
import {
  buildInboxRoute,
  matchesInboxFilter,
  resolveInboxFilter,
  INBOX_FILTERS,
  type InboxFilter,
} from "./model";
import { InboxSessionRow } from "./session-row";
import { useAddHost } from "@/hosts/add-host";
import { buildNewWorkspaceRoute } from "@/utils/host-routes";
import { TaskStatusIcon, statusIcons } from "./status-icon";

const Spinner = withUnistyles(LoadingSpinner, (theme) => ({ color: theme.colors.foregroundMuted }));
const filters = INBOX_FILTERS.map((value) => ({
  value,
  choose: () => router.setParams({ status: value }),
}));
const rowKey = (agent: AggregatedAgent) => JSON.stringify([agent.serverId, agent.id]);
const renderRow = ({ item }: { item: AggregatedAgent }) => <InboxSessionRow agent={item} />;

function MobileFilter({ filter }: { filter: InboxFilter }) {
  const { t } = useTranslation();
  return (
    <DropdownMenu compactMode="sheet">
      <DropdownMenuTrigger
        accessibilityLabel={t("taskInbox.chooseView")}
        testID="task-inbox-filter"
        style={styles.filterTrigger}
      >
        <TaskStatusIcon value={filter} />
        <Text style={styles.filterLabel}>{t(`taskInbox.${filter}`)}</Text>
        <DensityIcon icon={ChevronDown} size="xs" color="foregroundMuted" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" sheetTitle={t("taskInbox.chooseView")}>
        {filters.map(({ value, choose }) => {
          return (
            <DropdownMenuItem
              key={value}
              leading={statusIcons[value]}
              selected={value === filter}
              onSelect={choose}
              testID={`task-inbox-filter-${value}`}
            >
              {t(`taskInbox.${value}`)}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function TaskInboxScreen() {
  const { t } = useTranslation();
  const { status } = useLocalSearchParams();
  const filter = resolveInboxFilter(status);
  const archive = filter === "archived";
  const compact = useIsCompactFormFactor();
  const directory = useAggregatedAgents({ demand: !archive });
  const history = useAgentHistory({ enabled: archive });
  const hosts = useHosts();
  const hostIds = useMemo(() => hosts.map((host) => host.serverId), [hosts]);
  const connection = useHostRuntimeConnectionStatuses(hostIds);
  const unavailable = hosts.filter((host) => {
    const state = connection.get(host.serverId);
    return state === "offline" || state === "error";
  });
  const agents = archive ? history.agents : directory.agents;
  const visible = useMemo(
    () => agents.filter((agent) => matchesInboxFilter(agent, filter)),
    [agents, filter],
  );
  const isLoading = archive ? history.isInitialLoad : directory.isInitialLoad;
  const canLoadMore = archive && history.hasMore;
  const errors = archive
    ? history.hostErrors.map((error) => error.serverName)
    : unavailable.map((host) => host.label);
  const noReachableHosts = hosts.length === 0 || unavailable.length === hosts.length;
  const filterTitle = t(`taskInbox.${filter}`);
  const mobileFilter = useMemo(
    () => (compact ? <MobileFilter filter={filter} /> : undefined),
    [filter, compact],
  );
  const emptyView = useMemo(
    () => (
      <EmptyView
        filter={filter}
        noReachableHosts={noReachableHosts}
        hasMore={canLoadMore}
        error={archive && history.isError}
        retry={history.refreshAll}
      />
    ),
    [filter, noReachableHosts, canLoadMore, archive, history.isError, history.refreshAll],
  );
  const footer = useMemo(
    () =>
      canLoadMore ? (
        <View style={styles.footer}>
          <Button variant="ghost" disabled={history.isLoadingMore} onPress={history.loadMore}>
            {t("sessions.actions.loadMore")}
          </Button>
        </View>
      ) : null,
    [canLoadMore, history.isLoadingMore, history.loadMore, t],
  );
  return (
    <View style={styles.screen} testID="task-inbox-screen">
      <MenuHeader title={t("taskInbox.title")} rightContent={mobileFilter} />
      <View style={styles.body}>
        <View style={styles.heading}>
          <TaskStatusIcon value={filter} large />
          <Text accessibilityRole="header" style={styles.headingText}>
            {filterTitle}
          </Text>
          {visible.length > 0 && (
            <Text style={styles.count}>
              {visible.length}
              {canLoadMore ? "+" : ""}
            </Text>
          )}
        </View>
        {errors.map((name) => (
          <Text key={name} style={styles.hint}>
            {t("sessions.hostLoadFailed", { host: name })}
          </Text>
        ))}
        {isLoading && !noReachableHosts ? (
          <View style={styles.empty}>
            <Spinner />
          </View>
        ) : (
          <FlatList
            data={visible}
            renderItem={renderRow}
            keyExtractor={rowKey}
            contentContainerStyle={visible.length === 0 ? styles.emptyList : styles.list}
            ListEmptyComponent={emptyView}
            ListFooterComponent={footer}
          />
        )}
      </View>
    </View>
  );
}

function openAllSessions() {
  router.navigate(buildInboxRoute("all"));
}
function startWorkspace() {
  router.push(buildNewWorkspaceRoute());
}

function EmptyView({
  filter,
  noReachableHosts,
  hasMore,
  error,
  retry,
}: {
  filter: InboxFilter;
  noReachableHosts: boolean;
  hasMore: boolean;
  error: boolean;
  retry: () => Promise<void>;
}) {
  const { t } = useTranslation();
  const addHost = useAddHost();
  let message = t("taskInbox.empty");
  let action =
    filter === "all" ? (
      <Button onPress={startWorkspace}>{t("sidebar.actions.newWorkspace")}</Button>
    ) : (
      <Button variant="ghost" onPress={openAllSessions}>
        {t("taskInbox.all")}
      </Button>
    );
  if (noReachableHosts) {
    message = t("taskInbox.connect");
    action = (
      <Button testID="task-inbox-add-host" onPress={addHost}>
        {t("settings.addHost")}
      </Button>
    );
  } else if (error) {
    message = t("taskInbox.loadError");
    action = (
      <Button variant="ghost" onPress={retry}>
        {t("paneFind.retry")}
      </Button>
    );
  } else if (hasMore) {
    message = t("taskInbox.moreArchive");
  }
  return (
    <View style={styles.empty} testID="task-inbox-empty">
      <TaskStatusIcon value={filter} large />
      <Text style={styles.hint}>{message}</Text>
      {(!hasMore || error || noReachableHosts) && action}
    </View>
  );
}

const styles = StyleSheet.create((theme) => ({
  screen: { flex: 1, backgroundColor: theme.colors.surface0 },
  body: {
    flex: 1,
    width: "100%",
    maxWidth: 960,
    alignSelf: "center",
    paddingHorizontal: { xs: theme.spacing[3], md: theme.spacing[6] },
  },
  heading: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing[2],
    paddingTop: { xs: theme.spacing[4], md: theme.spacing[6] },
    paddingBottom: theme.spacing[3],
    paddingStart: theme.spacing[2],
    borderBottomWidth: theme.borderWidth[1],
    borderBottomColor: theme.colors.border,
  },
  headingText: {
    color: theme.colors.foreground,
    fontWeight: theme.fontWeight.medium,
    fontSize: theme.fontSize.lg,
  },
  count: { color: theme.colors.foregroundMuted, fontSize: theme.fontSize.sm },
  list: { paddingBottom: theme.spacing[6] },
  emptyList: { flexGrow: 1 },
  empty: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: theme.spacing[3],
    padding: theme.spacing[4],
  },
  hint: {
    color: theme.colors.foregroundMuted,
    fontSize: theme.fontSize.base,
    textAlign: "center",
    paddingVertical: theme.spacing[2],
  },
  footer: { alignItems: "center", padding: theme.spacing[3] },
  filterTrigger: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing[1],
    paddingHorizontal: theme.spacing[2],
    minHeight: 40,
  },
  filterLabel: { color: theme.colors.foreground, fontSize: theme.fontSize.sm },
}));
