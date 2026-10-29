import { chromium } from "playwright-core";

const API = "http://localhost:8080/api";
const WEB = "http://localhost:5173";
const title = `E2E reconciliation ${Date.now().toString().slice(-6)}`;

const browser = await chromium.launch({ channel: "chrome", headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

const failures = [];
const check = (condition, message) => {
  if (condition) console.log(`PASS  ${message}`);
  else {
    console.log(`FAIL  ${message}`);
    failures.push(message);
  }
};

async function apiEntries(query) {
  const response = await fetch(`${API}/entries?${new URLSearchParams(query)}`);
  return response.json();
}

// The table row is the desktop representation; the mobile card is display:none at 1440px.
const row = () => page.locator("tbody tr").filter({ hasText: title }).first();

// ---- create -----------------------------------------------------------------
await page.goto(`${WEB}/entries`, { waitUntil: "networkidle" });
await page.getByRole("button", { name: /new entry/i }).first().click();
await page.waitForSelector("#entry-title");
await page.fill("#entry-title", title);
await page.selectOption("#entry-category", "ENGINEERING");
await page.selectOption("#entry-status", "ACTIVE");
await page.fill("#entry-amount", "4250.75");
await page.fill("#entry-owner", "E2E Bot");
await page.fill("#entry-notes", "Created by the automated verification run.");
await page.getByRole("button", { name: /create entry/i }).click();

await page.waitForSelector("text=Entry created", { timeout: 8000 });
check(true, "create → success toast");

const created = await apiEntries({ q: title, size: 5 });
check(created.totalElements === 1, "create → row persisted in the database");
const entry = created.content[0];
check(entry?.reference?.startsWith("ENT-"), `reference generated (${entry?.reference})`);
check(entry?.amount === 4250.75, "amount stored exactly");

// ---- search & filter --------------------------------------------------------
await page.goto(`${WEB}/entries?q=${encodeURIComponent(title)}`, { waitUntil: "networkidle" });
await row().waitFor({ state: "visible" });
check(await row().isVisible(), "search finds the new entry");

const activeOnly = await apiEntries({ q: title, status: "ACTIVE" });
const draftOnly = await apiEntries({ q: title, status: "DRAFT" });
check(activeOnly.totalElements === 1 && draftOnly.totalElements === 0, "status filter is applied server-side");

// ---- update -----------------------------------------------------------------
await row().click();
await page.waitForSelector("#entry-status");
await page.selectOption("#entry-status", "SETTLED");
await page.getByRole("button", { name: /save changes/i }).click();
await page.waitForSelector("text=Entry updated", { timeout: 8000 });

const updated = await apiEntries({ q: title });
check(updated.content[0]?.status === "SETTLED", "update → status changed to SETTLED");
check(updated.content[0]?.reference === entry.reference, "update → reference is immutable");

// ---- stats ------------------------------------------------------------------
const stats = await fetch(`${API}/entries/stats`).then((response) => response.json());
check(stats.totalEntries >= 21, `stats totalEntries = ${stats.totalEntries}`);
check(stats.monthly.length === 6, "stats monthly series has 6 points");
check(stats.settledCount >= 1, "stats settled count reflects the update");

// ---- delete -----------------------------------------------------------------
await row().click();
await page.waitForSelector("text=Edit entry");
await page.getByRole("button", { name: /^delete$/i }).click();
await page.getByRole("button", { name: /confirm delete/i }).click();
await page.waitForSelector("text=Entry deleted", { timeout: 8000 });

const afterDelete = await apiEntries({ q: title });
check(afterDelete.totalElements === 0, "delete → row removed from the database");

// ---- validation -------------------------------------------------------------
await page.getByRole("button", { name: /new entry/i }).first().click();
await page.waitForSelector("#entry-title");
await page.getByRole("button", { name: /create entry/i }).click();
await page.waitForTimeout(300);
check(await page.getByText("Give the entry a title.").isVisible(), "validation blocks an empty title");
await page.keyboard.press("Escape");

// ---- navigation -------------------------------------------------------------
await page.goto(`${WEB}/`, { waitUntil: "networkidle" });
check(await page.getByText("Every entry,").isVisible(), "overview renders");
await page.keyboard.press("Control+k");
await page.waitForTimeout(250);
check(await page.getByPlaceholder(/search entries or run a command/i).isVisible(), "command palette opens with ⌘K");

console.log(failures.length ? `\n${failures.length} FAILURE(S)` : "\nALL CHECKS PASSED");
await browser.close();
process.exit(failures.length ? 1 : 0);
