import { expect, test } from "../support/fixtures";
import { gotoAppShell } from "../support/helpers/app";
import { seedWorkspace } from "../support/helpers/seed-client";

test("review an individual task and reopen its saved status on a compact screen", async ({
  page,
}, testInfo) => {
  const workspace = await seedWorkspace({ repoPrefix: "campaign-", title: "Spring campaign" });
  try {
    await workspace.client.renameProject(workspace.projectId, "Creative studio");
    const createSession = (title: string) =>
      workspace.client.createAgent({
        provider: "mock",
        cwd: workspace.repoPath,
        workspaceId: workspace.workspaceId,
        title,
      });
    const writer = await createSession("Review the homepage copy");
    const producer = await createSession("Choose a video draft");
    const retired = await createSession("Previous launch notes");
    await workspace.client.archiveAgent(retired.id);
    const archivedRow = page.getByTestId(`task-inbox-row-${retired.id}`);
    const writerRow = page.getByTestId(`task-inbox-row-${writer.id}`);
    const videoRow = page.getByTestId(`task-inbox-row-${producer.id}`);
    const statusControl = page.getByTestId(`task-inbox-change-${writer.id}`);
    const filter = (slug: string) =>
      page.getByTestId(`sidebar-task-inbox-${slug}`).filter({ visible: true });

    await page.emulateMedia({ colorScheme: "dark" });
    await page.setViewportSize({ width: 1280, height: 830 });
    await gotoAppShell(page);
    await page.getByTestId("sidebar-task-inbox").filter({ visible: true }).click();
    await expect(writerRow).toContainText("Review the homepage copy");
    await expect(videoRow).toContainText("Choose a video draft");
    await expect(archivedRow).toHaveCount(0);
    await filter("archived").click();
    await expect(archivedRow).toBeVisible();
    await expect(writerRow).toHaveCount(0);

    await expect(filter("todo")).toHaveText("Todo");
    await filter("todo").click();
    await expect(writerRow).toBeVisible();
    await expect(videoRow).toBeVisible();
    await statusControl.click();
    await page.getByTestId("task-inbox-status-needs-review").filter({ visible: true }).click();
    await expect(writerRow).toHaveCount(0);
    await expect(videoRow).toBeVisible();

    await filter("needs-review").click();
    await expect(writerRow).toBeVisible();
    await expect(videoRow).toHaveCount(0);
    await statusControl.click();
    await page.getByTestId("task-inbox-toggle-flag").filter({ visible: true }).click();
    await filter("flagged").click();
    await expect(writerRow).toBeVisible();
    await expect(videoRow).toHaveCount(0);
    await filter("needs-review").click();
    await expect(writerRow).toBeVisible();
    await page.mouse.move(1000, 700);
    await page.screenshot({ path: testInfo.outputPath("task-inbox-desktop.png") });

    await page.setViewportSize({ width: 390, height: 844 });
    await page.reload();
    await expect(writerRow).toBeVisible({ timeout: 30_000 });
    await expect(videoRow).toHaveCount(0);
    await page.mouse.move(380, 750);
    await page.screenshot({ path: testInfo.outputPath("task-inbox-phone.png") });
    await page.getByTestId("task-inbox-filter").click();
    await page.getByTestId("task-inbox-filter-todo").filter({ visible: true }).click();
    await expect(videoRow).toBeVisible();
    await expect(writerRow).toHaveCount(0);
    await page.getByTestId("task-inbox-filter").click();
    await page.getByTestId("task-inbox-filter-needs-review").filter({ visible: true }).click();
    await writerRow.click();
    await expect(page.getByRole("textbox", { name: "Message agent..." })).toBeVisible();
  } finally {
    await workspace.cleanup();
  }
});
