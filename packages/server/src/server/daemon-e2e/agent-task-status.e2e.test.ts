import { expect, test } from "vitest";
import { DaemonClient } from "../test-utils/daemon-client.js";
import { createTestPaseoDaemon } from "../test-utils/paseo-daemon.js";

test("a second device receives task status changes before and after a session closes", async () => {
  const daemon = await createTestPaseoDaemon({ mcpEnabled: false });
  const url = `ws://127.0.0.1:${daemon.port}/ws`;
  const desktop = new DaemonClient({ url });
  const phone = new DaemonClient({ url });
  try {
    await Promise.all([desktop.connect(), phone.connect()]);
    const agent = await desktop.createAgent({
      provider: "codex",
      cwd: daemon.staticDir,
      labels: { team: "creative" },
    });
    let observed: Record<string, string> | undefined;
    phone.on("agent_update", (message) => {
      if (
        message.type === "agent_update" &&
        message.payload.kind === "upsert" &&
        message.payload.agent.id === agent.id
      ) {
        observed = message.payload.agent.labels;
      }
    });
    await phone.fetchAgents({ subscribe: {} });

    await desktop.updateAgent(agent.id, { labels: { "paseo.taskStatus": "needs-review" } });
    await expect
      .poll(() => observed)
      .toEqual({ team: "creative", "paseo.taskStatus": "needs-review" });

    await daemon.daemon.agentManager.closeAgent(agent.id);
    await desktop.updateAgent(agent.id, { labels: { "paseo.taskStatus": "done" } });
    const finalLabels = { team: "creative", "paseo.taskStatus": "done" };
    await expect.poll(() => observed).toEqual(finalLabels);
    expect((await phone.fetchAgent({ agentId: agent.id }))?.agent.labels).toEqual(finalLabels);
    expect(daemon.daemon.agentManager.getAgent(agent.id)).toBeNull();
  } finally {
    await Promise.all([phone.close(), desktop.close()]);
    await daemon.close();
  }
});
