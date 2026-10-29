import { chromium } from "playwright-core";
import { mkdir } from "node:fs/promises";
import path from "node:path";

const outDir = path.resolve(".screenshots");
await mkdir(outDir, { recursive: true });

const browser = await chromium.launch({ channel: "chrome", headless: true });

async function capture(name, width, height, url, fullPage = true) {
  const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 2 });
  await page.goto(url, { waitUntil: "networkidle" });
  await page.waitForTimeout(600);
  await page.screenshot({ path: path.join(outDir, `${name}.png`), fullPage });
  await page.close();
  console.log(`saved ${name}.png @ ${width}x${height}`);
}

await capture("01-overview", 1440, 900, "http://localhost:5173/");
await capture("02-entries", 1440, 900, "http://localhost:5173/entries");
await capture("05-overview-1280", 1280, 800, "http://localhost:5173/");
await capture("06-mobile", 390, 844, "http://localhost:5173/entries");

// Sheet + palette at desktop size
const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
await page.goto("http://localhost:5173/entries", { waitUntil: "networkidle" });
await page.getByRole("button", { name: /new entry/i }).first().click();
await page.waitForTimeout(500);
await page.screenshot({ path: path.join(outDir, "03-sheet.png") });
await page.keyboard.press("Escape");
await page.keyboard.press("Control+k");
await page.waitForTimeout(400);
await page.screenshot({ path: path.join(outDir, "04-palette.png") });
console.log("saved sheet + palette");

await browser.close();
