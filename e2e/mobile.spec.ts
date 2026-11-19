import { expect, test } from "@playwright/test";

test("mobile navigation opens, navigates and the page has no horizontal overflow", async ({ page }) => {
  await page.goto("/en");
  await page.getByRole("button", { name: "Open menu" }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await dialog.getByRole("link", { name: "Menu" }).click();
  await expect(page).toHaveURL(/\/en\/menu$/);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(1);
});

test("mobile cart drawer opens from the header", async ({ page }) => {
  await page.goto("/en/menu/french-fries");
  await page.getByRole("button", { name: /^Add · / }).click();
  await page.getByRole("button", { name: /^Cart \(1\)/ }).click();
  await expect(page.getByRole("dialog").getByText("French Fries")).toBeVisible();
});
