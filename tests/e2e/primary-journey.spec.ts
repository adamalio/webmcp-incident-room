import { expect, test } from "@playwright/test";

test("shows the canonical incident shell", async ({ page }) => {
  await page.goto("/");

  await expect(page).toHaveTitle("WebMCP Incident Room");
  await expect(page.getByText("Synthetic incident simulation")).toBeVisible();
  await expect(page.getByText("inc_checkout_20260827_001")).toBeVisible();
  await expect(page.getByRole("button", { name: "Reset" })).toBeVisible();
});
