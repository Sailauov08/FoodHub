import { expect, test } from "@playwright/test";
import { placePickupOrder } from "./helpers";

test("home page renders the hero, navigation and featured dishes (Kazakh by default)", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveTitle(/FoodHub/);
  await expect(page.locator("html")).toHaveAttribute("lang", "kk");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("бургер");
  await expect(page.getByRole("link", { name: "Тапсырыс беру" })).toBeVisible();
  await page.getByRole("button", { name: "Келесі бургер" }).click();
  await page.getByRole("button", { name: "English" }).first().click();
  await expect(page).toHaveURL(/\/en$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("The Ultimate Burger Haven");
});

test("browse the menu: filter by category, search and open a product", async ({ page }) => {
  await page.goto("/en/menu");
  await page.getByRole("button", { name: /^Pizza/ }).click();
  await expect(page).toHaveURL(/category=pizza/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Pizza");
  await page.getByLabel("Search the menu").fill("pepperoni");
  await expect(page).toHaveURL(/q=pepperoni/);
  await page.getByRole("link", { name: "Pepperoni", exact: true }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Pepperoni");
  await expect(page.getByText("Choose size")).toBeVisible();
});

test("customize a pizza, update quantities in the cart and see server totals", async ({ page }) => {
  await page.goto("/en/menu/pizza-pepperoni");
  await page.getByRole("radio", { name: /40 cm/ }).click();
  await page.getByRole("radio", { name: /Cheese-stuffed crust/ }).click();
  await page.getByRole("checkbox", { name: /Mushrooms/ }).click();
  // 4990 + 690 + 300 = 5980
  await expect(page.getByRole("button", { name: /Add · 5,980 ₸/ })).toBeVisible();
  await page.getByRole("button", { name: /Add · / }).click();

  await page.goto("/en/cart");
  await expect(page.getByText("5,980 ₸").first()).toBeVisible();
  await page.getByRole("button", { name: "Increase quantity" }).first().click();
  await expect(page.getByText("11,960 ₸").first()).toBeVisible();
  // 11,960 subtotal → delivery 990 → total 12,950
  await expect(page.getByText("12,950 ₸")).toBeVisible();
  await page.getByRole("button", { name: "Decrease quantity" }).first().click();
  await expect(page.getByText("6,970 ₸")).toBeVisible();
});

test("guest checkout with cash creates a persisted order with secure tracking", async ({ page, browser }) => {
  const url = await placePickupOrder(page);
  await expect(page.getByText("Received").first()).toBeVisible();
  await expect(page.getByText("Pay on pickup")).toBeVisible();

  // Without the token the order is not visible.
  const anon = await browser.newPage();
  await anon.goto(url.split("?")[0]!);
  await expect(anon.getByText("Order not found")).toBeVisible();
  await anon.close();

  // The guest can cancel while it is still pending.
  await page.getByRole("button", { name: "Cancel order" }).click();
  await page.getByRole("alertdialog").getByRole("button", { name: "Cancel order" }).click();
  await expect(page.getByText("Cancelled").first()).toBeVisible();
});

test("checkout validates the form", async ({ page }) => {
  await page.goto("/en/menu/burger-combo");
  await page.getByRole("button", { name: /^Add · / }).click();
  await page.goto("/en/checkout");
  await page.getByLabel("Phone").fill("123");
  await page.getByRole("button", { name: /Place order/ }).click();
  await expect(page.getByText("Enter a valid Kazakhstan mobile number")).toBeVisible();
  await expect(page.getByText("Enter the street and building")).toBeVisible();
});
