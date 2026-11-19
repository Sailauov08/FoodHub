import { expect, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";

export function staff(): { admin: { email: string; password: string }; kitchen: { email: string; password: string } } {
  if (process.env.E2E_ADMIN_EMAIL) {
    return {
      admin: { email: process.env.E2E_ADMIN_EMAIL, password: process.env.E2E_ADMIN_PASSWORD ?? "" },
      kitchen: { email: process.env.E2E_KITCHEN_EMAIL ?? "", password: process.env.E2E_KITCHEN_PASSWORD ?? "" },
    };
  }
  return JSON.parse(readFileSync("e2e/.auth/staff.json", "utf8"));
}

export async function login(page: Page, email: string, password: string) {
  await page.goto("/en/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).not.toHaveURL(/\/login/);
}

/** Adds the Burger Combo (required sauce pre-selected) twice and places a cash pickup order. Returns the order URL. */
export async function placePickupOrder(page: Page, name = "E2E Guest") {
  await page.goto("/en/menu/burger-combo");
  await page.getByRole("button", { name: "Increase quantity" }).click();
  await page.getByRole("button", { name: /^Add · / }).click();
  await expect(page.getByText("Added to cart").first()).toBeVisible();
  await page.goto("/en/checkout");
  await page.getByLabel("Name").fill(name);
  await page.getByLabel("Phone").fill("+7 701 555 44 33");
  await page.getByRole("radio", { name: /Pickup/ }).click();
  await page.getByRole("button", { name: /Place order/ }).click();
  await expect(page).toHaveURL(/\/en\/orders\/[a-z0-9]+\?t=/, { timeout: 20_000 });
  await expect(page.getByText("Order placed!")).toBeVisible();
  return page.url();
}
