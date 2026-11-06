import { test } from "@e2e-dev/mobile";
import { expect } from "e2e";

// Real native routes/screens, controlled session and conversation ports.
// A failed auth refresh must preserve the draft and allow a successful retry.
test("recovers an unsent draft, renders the reply and keeps tab drafts separate", async ({
  app,
  screen,
}) => {
  await app.open();
  await expect(screen.getByText("Trip Planner")).toBeVisible();
  const input = screen.getByLabel("Message");
  await input.fill("Plan Kyoto");
  await screen.getByRole("button", "Send").tap();
  await expect(screen.getByText(/^Your message was not sent/)).toBeVisible();
  await expect(input).toHaveValue("Plan Kyoto");
  await screen.getByRole("button", "Send").tap();
  await expect(input).toHaveValue("");
  await expect(screen.getByText("Received: Plan Kyoto")).toBeVisible();
  await expect(screen.getByText("Kyoto", { exact: true })).toBeVisible();
  await expect(screen.getByText(/^Your message was not sent/)).toHaveCount(0);
  await input.fill("Next travel draft");
  await screen.getByText("Grocery", { exact: true }).tap();
  await expect(screen.getByLabel("Message")).toHaveValue("");
  await screen.getByLabel("Message").fill("Milk");
  await screen.getByText("Travel", { exact: true }).tap();
  await expect(screen.getByLabel("Message")).toHaveValue("Next travel draft");
  await expect(screen.getByText("Received: Plan Kyoto")).toBeVisible();
});
