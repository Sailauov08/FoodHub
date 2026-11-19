import { expect, test } from "@playwright/test";
import { randomUUID } from "node:crypto";

test("sign up, order, see it in history, sign out and sign back in", async ({ page }) => {
  const email = `e2e-${randomUUID().slice(0, 8)}@example.com`;
  const password = `Pw-${randomUUID()}`;

  await page.goto("/en/register");
  await page.getByLabel("Name").fill("E2E Customer");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page).toHaveURL(/\/en\/account$/);
  await expect(page.getByText("No orders yet")).toBeVisible();

  await page.goto("/en/menu/burger-combo");
  await page.getByRole("button", { name: "Increase quantity" }).click();
  await page.getByRole("button", { name: /^Add · / }).click();
  await page.goto("/en/checkout");
  await expect(page.getByLabel("Name")).toHaveValue("E2E Customer");
  await page.getByLabel("Phone").fill("+77017778899");
  await page.getByLabel("Street, building").fill("Dostyk ave 5");
  await page.getByRole("button", { name: /Place order/ }).click();
  await expect(page).toHaveURL(/\/en\/orders\//);
  const number = (await page.getByRole("heading", { level: 1 }).textContent())?.replace("Order ", "").trim();

  await page.goto("/en/account/orders");
  await expect(page.getByText(number!)).toBeVisible();

  await page.getByRole("button", { name: "Log out" }).click();
  await expect(page).toHaveURL(/\/en$/);
  await page.goto("/en/account");
  await expect(page).toHaveURL(/\/en\/login/);

  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password", { exact: true }).fill("wrong-password");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByText("Email or password is incorrect.")).toBeVisible();
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/en\/account/);
});

test("customers cannot open admin or kitchen pages", async ({ page }) => {
  await page.goto("/en/admin");
  await expect(page).toHaveURL(/\/en\/login\?next=%2Fadmin|\/en\/login\?next=\/admin/);
  const api = await page.request.get("/api/kitchen/orders");
  expect(api.status()).toBe(401);
});
