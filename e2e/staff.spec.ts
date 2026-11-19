import { expect, test } from "@playwright/test";
import { randomUUID } from "node:crypto";
import { login, placePickupOrder, staff } from "./helpers";

test("admin creates a product that appears on the menu, then archives it", async ({ page }) => {
  const { admin } = staff();
  await login(page, admin.email, admin.password);
  await page.goto("/en/admin/products/new");
  const slug = `e2e-dish-${randomUUID().slice(0, 6)}`;
  await page.locator("#slug").fill(slug);
  for (const s of ["Kk", "Ru", "En"]) {
    await page.locator(`#name${s}`).fill(`E2E Dish ${s}`);
    await page.locator(`#description${s}`).fill("Created by an end-to-end test");
  }
  await page.locator("#price").fill("1990");
  await page.getByRole("button", { name: "Save" }).click();
  await expect(page.getByText("Product saved")).toBeVisible();
  await expect(page).toHaveURL(/\/en\/admin\/products\/[a-z0-9]+$/);

  await page.goto(`/en/menu/${slug}`);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("E2E Dish En");
  await expect(page.getByRole("button", { name: /Add · 1,990 ₸/ })).toBeVisible();

  await page.goto("/en/admin/products");
  const row = page.getByRole("row", { name: /E2E Dish En/ });
  await row.getByRole("button", { name: "Archive" }).click();
  await page.getByRole("alertdialog").getByRole("button", { name: "Archive" }).click();
  await expect(page.getByText("Archived", { exact: true })).toBeVisible();
});

test("kitchen workflow: a new order moves through the kitchen columns", async ({ page, browser }) => {
  const customer = await browser.newPage();
  const name = `Kitchen ${randomUUID().slice(0, 4)}`;
  await placePickupOrder(customer, name);

  const { kitchen } = staff();
  await login(page, kitchen.email, kitchen.password);
  await expect(page).toHaveURL(/\/en\/kitchen/);
  const card = page.locator("li", { hasText: name });
  await expect(card).toBeVisible({ timeout: 15_000 });
  await card.getByRole("button", { name: "Accept" }).click();
  await expect(page.locator("section", { hasText: "Confirmed" }).locator("li", { hasText: name })).toBeVisible();
  await card.getByRole("button", { name: "Start cooking" }).click();
  await expect(page.locator("section", { hasText: "Preparing" }).locator("li", { hasText: name })).toBeVisible();
  await card.getByRole("button", { name: "Mark ready" }).click();
  await expect(page.locator("section", { hasText: "Ready" }).locator("li", { hasText: name })).toBeVisible();

  // The customer's tracking page reflects the kitchen's progress.
  await customer.reload();
  await expect(customer.getByText("Your order is ready.")).toBeVisible();
  await customer.close();

  // Kitchen staff cannot access admin pages.
  await page.goto("/en/admin");
  await expect(page).not.toHaveURL(/\/admin/);
});
