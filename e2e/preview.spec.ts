import { expect, test, type Page } from "@playwright/test";

/**
 * Database-independent browser tests (preview mode: DATABASE_URL empty).
 * Run with: npm run test:e2e:preview
 */

const PUBLIC = ["/", "/menu", "/menu/pizza-pepperoni", "/cart", "/checkout", "/offers", "/about", "/contact", "/login", "/register"];

async function noHorizontalOverflow(page: Page) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(1);
}

test.describe("public routes in every locale", () => {
  for (const locale of ["", "/ru", "/en"]) {
    for (const route of PUBLIC) {
      const path = locale && route === "/" ? locale : `${locale}${route}`;
      test(`${path || "/"} renders`, async ({ page }) => {
        const errors: string[] = [];
        page.on("pageerror", (e) => errors.push(String(e)));
        page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
        const res = await page.goto(path);
        expect(res?.status()).toBe(200);
        await expect(page.locator("h1")).toHaveCount(1);
        await expect(page.locator("html")).toHaveAttribute("lang", locale ? locale.slice(1) : "kk");
        await noHorizontalOverflow(page);
        expect(errors.filter((e) => !/favicon|Download the React DevTools/.test(e))).toEqual([]);
      });
    }
  }
});

test("home: hero carousel and language switch", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Ең дәмді бургерлер мекені");
  const current = page.locator("[aria-current=true]:visible");
  const before = await current.getAttribute("aria-label");
  await page.getByRole("button", { name: "Келесі бургер" }).click();
  await expect(current).not.toHaveAttribute("aria-label", before ?? "");
  await page.getByRole("button", { name: "English" }).first().click();
  await expect(page).toHaveURL(/\/en$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("The Ultimate Burger Haven");
});

test("menu: category filter and search", async ({ page }) => {
  await page.goto("/en/menu");
  await page.getByRole("button", { name: /^Sushi & Rolls/ }).click();
  await expect(page).toHaveURL(/category=sushi/);
  await expect(page.getByText("5 dishes")).toBeVisible();
  await page.getByLabel("Search the menu").fill("philadelphia");
  await expect(page).toHaveURL(/q=philadelphia/);
  await expect(page.getByText("1 dish")).toBeVisible();
  await page.getByLabel("Search the menu").fill("zzzz");
  await expect(page.getByText("Nothing matches your search")).toBeVisible();
});

test("product customization, cart totals from the server and a coupon", async ({ page }) => {
  await page.goto("/en/menu/pizza-pepperoni");
  await page.getByRole("radio", { name: /40 cm/ }).click();
  await page.getByRole("radio", { name: /Cheese-stuffed crust/ }).click();
  await page.getByRole("checkbox", { name: /Mushrooms/ }).click();
  await expect(page.getByRole("button", { name: "Add · 5,980 ₸" })).toBeVisible();
  await page.getByRole("button", { name: /^Add · / }).click();
  await expect(page.getByRole("button", { name: /^Cart \(1\)/ })).toBeVisible();

  await page.goto("/en/cart");
  const summary = page.locator("aside");
  await expect(summary.getByText("6,970 ₸")).toBeVisible(); // 5,980 + 990 delivery
  await page.getByRole("textbox", { name: "Promo code" }).fill("welcome10");
  await page.getByRole("button", { name: "Apply" }).click();
  await expect(summary.getByText("−598 ₸")).toBeVisible();
  await expect(summary.getByText("6,372 ₸")).toBeVisible();
  await page.getByRole("button", { name: "Increase quantity" }).click();
  await expect(summary.getByText("11,960 ₸")).toBeVisible();
  await page.getByRole("button", { name: "Remove Pepperoni" }).click();
  await expect(page.getByText("Your cart is empty")).toBeVisible();
});

test("an invalid coupon is explained", async ({ page }) => {
  await page.goto("/en/menu/french-fries");
  await page.getByRole("button", { name: /^Add · / }).click();
  await page.goto("/en/cart");
  await page.getByRole("textbox", { name: "Promo code" }).fill("NOPE");
  await page.getByRole("button", { name: "Apply" }).click();
  await expect(page.getByText("This code doesn't exist")).toBeVisible();
});

test("checkout: validation and an honest preview-mode state", async ({ page }) => {
  await page.goto("/en/menu/burger-combo");
  await page.getByRole("button", { name: /^Add · / }).click();
  await page.goto("/en/checkout");
  await expect(page.getByText(/orders can be saved only after the database is connected/)).toBeVisible();
  await expect(page.getByRole("button", { name: /Place order/ })).toBeDisabled();
  await page.getByLabel("Name").fill("A");
  await page.getByLabel("Phone").fill("+7 727 123 45 67");
  await page.getByLabel("Name").blur();
  await page.getByLabel("Phone").blur();
  await expect(page.getByText("At least 2 characters")).toBeVisible();
  await expect(page.getByText("Enter a valid Kazakhstan mobile number")).toBeVisible();
  await page.getByRole("radio", { name: /Pickup/ }).click();
  await expect(page.getByLabel("Street, building")).toHaveCount(0);
});

test("database-backed areas show setup-required instead of fake data", async ({ page }) => {
  for (const path of ["/en/account", "/en/admin", "/en/admin/analytics", "/en/kitchen"]) {
    await page.goto(path);
    await expect(page).toHaveURL(new RegExp(`${path}$`));
    await expect(page.getByRole("heading", { name: "The database is not connected yet" })).toBeVisible();
  }
  await page.goto("/en/login");
  await expect(page.getByText(/sign-in and registration will work once the database is connected/)).toBeVisible();
});

test("mobile navigation and cart drawer", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/en");
  await page.getByRole("button", { name: "Open menu" }).click();
  await page.getByRole("dialog").getByRole("link", { name: "Menu" }).click();
  await expect(page).toHaveURL(/\/en\/menu$/);
  await noHorizontalOverflow(page);
  await page.goto("/en/menu/french-fries");
  await page.getByRole("button", { name: /^Add · / }).click();
  await page.getByRole("button", { name: /^Cart \(1\)/ }).click();
  await expect(page.getByRole("dialog").getByText("French Fries")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
});

test("keyboard: skip link and visible focus", async ({ page }) => {
  await page.goto("/en");
  await page.keyboard.press("Tab");
  const skip = page.getByRole("link", { name: "Skip to content" });
  await expect(skip).toBeFocused();
  await expect(skip).toBeVisible();
});
