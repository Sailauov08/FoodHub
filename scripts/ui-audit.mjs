/**
 * Automated UI audit for database-independent routes.
 * Usage: node scripts/ui-audit.mjs [baseUrl] [--shots]
 * Checks every route × locale × width for: HTTP errors, console errors (incl. hydration and missing
 * translations), horizontal overflow, small touch targets, images without alt, broken images.
 * Writes audit-results/report.json (+ screenshots with --shots).
 */
import { chromium } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";

const base = process.argv.find((a) => a.startsWith("http")) ?? "http://localhost:3000";
const shots = process.argv.includes("--shots");
const routes = ["/", "/menu", "/menu?category=pizza", "/menu/pizza-pepperoni", "/menu/burger-combo", "/cart", "/checkout", "/offers", "/about", "/contact", "/login", "/register", "/account", "/account/orders", "/admin", "/admin/products", "/admin/analytics", "/kitchen", "/orders/doesnotexist123", "/this-page-does-not-exist"];
const locales = ["", "/ru", "/en"];
const widths = [360, 390, 430, 768, 1024, 1440, 1920];
const SHOT_WIDTHS = new Set([390, 1440]);

mkdirSync("audit-results/shots", { recursive: true });
const browser = await chromium.launch();
const results = [];

async function seedCart(page) {
  // A realistic cart so cart/checkout render their filled state.
  await page.goto(`${base}/en/menu/french-fries`, { waitUntil: "networkidle" });
  await page.getByRole("button", { name: /^Add · / }).click();
}

for (const width of widths) {
  const context = await browser.newContext({ viewport: { width, height: width < 768 ? 844 : 900 }, reducedMotion: "reduce" });
  const page = await context.newPage();
  await seedCart(page);
  for (const loc of locales) {
    for (const route of routes) {
      const path = loc && route === "/" ? loc : `${loc}${route}`;
      const errors = [];
      const onConsole = (m) => {
        if (m.type() === "error") errors.push(m.text().slice(0, 300));
      };
      const onPageError = (e) => errors.push(`pageerror: ${String(e).slice(0, 300)}`);
      page.on("console", onConsole);
      page.on("pageerror", onPageError);
      let status = 0;
      try {
        const res = await page.goto(base + path, { waitUntil: "networkidle", timeout: 90_000 });
        status = res?.status() ?? 0;
        await page.waitForTimeout(400);
      } catch (e) {
        errors.push(`navigation: ${String(e).slice(0, 200)}`);
      }
      const metrics = await page.evaluate(() => {
        const vw = window.innerWidth;
        const overflow = document.documentElement.scrollWidth - vw;
        const offenders = [];
        for (const el of document.querySelectorAll("body *")) {
          const r = el.getBoundingClientRect();
          if (r.width === 0 || r.right <= vw + 1) continue;
          // Ignore elements inside horizontally scrollable or clipped containers.
          let p = el.parentElement;
          let clipped = false;
          while (p && p !== document.body) {
            const cs = getComputedStyle(p);
            if (/(auto|scroll|hidden|clip)/.test(cs.overflowX)) {
              clipped = true;
              break;
            }
            p = p.parentElement;
          }
          if (!clipped && getComputedStyle(el).position !== "fixed") offenders.push(`${el.tagName.toLowerCase()}.${String(el.className).slice(0, 50)}`);
        }
        const small = [];
        for (const el of document.querySelectorAll("a[href], button, [role=button], input, select, textarea")) {
          const r = el.getBoundingClientRect();
          const cs = getComputedStyle(el);
          if (r.width <= 2 || cs.visibility === "hidden" || el.closest("[aria-hidden=true]")) continue; // sr-only skip link
          // Inline text links inside paragraphs are exempt (WCAG 2.5.8 exception).
          if (el.tagName === "A" && el.closest("p")) continue;
          if (r.height < 24 || r.width < 24) small.push(`${el.tagName.toLowerCase()}:${(el.getAttribute("aria-label") || el.textContent || "").trim().slice(0, 30)} ${Math.round(r.width)}x${Math.round(r.height)}`);
        }
        const imgsNoAlt = [...document.querySelectorAll("img:not([alt])")].length;
        const broken = [...document.querySelectorAll("img")].filter((i) => i.complete && i.naturalWidth === 0 && i.loading !== "lazy").map((i) => i.src.slice(-60));
        const text = document.body.innerText;
        const missing = (text.match(/\b[a-z]+\.[a-zA-Z]+\.[a-zA-Z_]+\b/g) || []).filter((s) => /^(common|nav|home|menu|cart|checkout|order|admin|account|auth|kitchen|errors|validation)\./.test(s));
        const h1 = document.querySelectorAll("h1").length;
        return { overflow, offenders: [...new Set(offenders)].slice(0, 5), small: [...new Set(small)].slice(0, 8), imgsNoAlt, broken, missing: [...new Set(missing)].slice(0, 5), h1, title: document.title, lang: document.documentElement.lang, url: location.pathname };
      });
      if (shots && SHOT_WIDTHS.has(width) && (loc === "" || route === "/")) {
        const name = `${width}${(loc || "/kk").replace("/", "_")}${route.replace(/[^a-z0-9]+/gi, "_")}.jpg`;
        await page.screenshot({ path: `audit-results/shots/${name}`, fullPage: width <= 430 ? false : true, type: "jpeg", quality: 70 });
      }
      page.off("console", onConsole);
      page.off("pageerror", onPageError);
      results.push({ width, path, status, errors: [...new Set(errors)].slice(0, 5), ...metrics });
    }
  }
  await context.close();
  console.log(`width ${width} done`);
}
await browser.close();

writeFileSync("audit-results/report.json", JSON.stringify(results, null, 2));
const problems = results.filter((r) => r.status >= 500 || r.errors.length || r.overflow > 1 || r.offenders.length || r.small.length || r.imgsNoAlt || r.broken.length || r.missing.length || r.h1 !== 1);
console.log(`checked ${results.length} page views, ${problems.length} with findings`);
for (const p of problems.slice(0, 200)) {
  const f = [];
  if (p.status >= 400) f.push(`HTTP ${p.status}`);
  if (p.errors.length) f.push(`console: ${p.errors.join(" | ")}`);
  if (p.overflow > 1) f.push(`overflow ${p.overflow}px ${p.offenders.join(",")}`);
  if (p.small.length) f.push(`small targets: ${p.small.join("; ")}`);
  if (p.imgsNoAlt) f.push(`img without alt: ${p.imgsNoAlt}`);
  if (p.broken.length) f.push(`broken img: ${p.broken.join(",")}`);
  if (p.missing.length) f.push(`raw keys: ${p.missing.join(",")}`);
  if (p.h1 !== 1) f.push(`h1 count ${p.h1}`);
  console.log(`[${p.width}] ${p.path} -> ${p.url}: ${f.join(" || ")}`);
}
