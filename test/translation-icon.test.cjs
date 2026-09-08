const assert = require("node:assert/strict");
const { test } = require("node:test");
const path = require("node:path");
const { chromium } = require("playwright");

// Captured from the SVG immediately before x.com's Show translation button.
const grok =
  "M12.745 20.54l10.97-8.19c.539-.4 1.307-.244 1.564.38 1.349 3.288.746 7.241-1.938 9.955-2.683 2.714-6.417 3.31-9.83 1.954l-3.728 1.745c5.347 3.697 11.84 2.782 15.898-1.324 3.219-3.255 4.216-7.692 3.284-11.693l.008.009c-1.351-5.878.332-8.227 3.782-13.031L33 0l-4.54 4.59v-.014L12.743 20.544m-2.263 1.987c-3.837-3.707-3.175-9.446.1-12.755 2.42-2.449 6.388-3.448 9.852-1.979l3.72-1.737c-.67-.49-1.53-1.017-2.515-1.387-4.455-1.854-9.789-.931-13.41 2.728-3.483 3.523-4.579 8.94-2.697 13.561 1.405 3.454-.899 5.898-3.22 8.364C1.49 30.2.666 31.074 0 32l10.478-9.466";
const icon = `<svg width="20" height="20" viewBox="0 0 33 32" aria-hidden="true"><g><path fill="currentColor" d="${grok}"></path></g></svg>`;

test("only the Grok icon immediately beside Show translation becomes a 36x36 globe", async (t) => {
  const browser = await chromium.launch({ channel: "chrome", headless: true });
  t.after(() => browser.close());
  const page = await browser.newPage();
  await page.setContent(`
    <div id="translation" style="color: rgb(113, 118, 123)">${icon}<button aria-label="Show translation">Show translation</button></div>
    <nav>${icon}<button aria-label="Grok">Grok</button></nav>
    <button aria-label="Ask Grok">${icon}</button>
  `);
  await page.locator("#translation button").evaluate((button) => {
    button.addEventListener("click", () => (button.dataset.clicked = "yes"));
  });
  await page.addScriptTag({
    path: path.resolve(__dirname, "../extension/content.js"),
  });
  const svg = page.locator("#translation svg");
  assert.equal(await svg.getAttribute("viewBox"), "0 0 36 36");
  assert.match(
    await svg.locator("path").getAttribute("d"),
    /^M18 0C8\.059 0 0 8\.059 0 18/,
  );
  assert.deepEqual(
    await svg.locator("path").evaluate((node) => {
      const box = node.getBBox();
      return { x: box.x, y: box.y, width: box.width, height: box.height };
    }),
    { x: 0, y: 0, width: 36, height: 36 },
  );
  assert.equal(
    await svg.locator("path").evaluate((node) => getComputedStyle(node).fill),
    "rgb(113, 118, 123)",
  );
  assert.equal(await svg.getAttribute("width"), "20");
  assert.equal(await svg.getAttribute("height"), "20");
  assert.equal(await svg.getAttribute("aria-hidden"), "true");
  assert.deepEqual(
    await page
      .locator('nav path, button[aria-label="Ask Grok"] path')
      .evaluateAll((nodes) => nodes.map((node) => node.getAttribute("d"))),
    [grok, grok],
  );
  await page.locator("#translation button").click();
  assert.equal(
    await page.locator("#translation button").getAttribute("data-clicked"),
    "yes",
  );
});

test("translation globe handles buttons and labels arriving after their SVG", async (t) => {
  const browser = await chromium.launch({ channel: "chrome", headless: true });
  t.after(() => browser.close());
  const page = await browser.newPage();
  await page.setContent(
    `<div id="late-button">${icon}</div><div id="late-label">${icon}<button>Show translation</button></div>`,
  );
  await page.addScriptTag({
    path: path.resolve(__dirname, "../extension/content.js"),
  });
  assert.deepEqual(
    await page
      .locator("path")
      .evaluateAll((nodes) => nodes.map((node) => node.getAttribute("d"))),
    [grok, grok],
  );
  await page
    .locator("#late-button")
    .evaluate((row) =>
      row.insertAdjacentHTML(
        "beforeend",
        '<button aria-label="Show translation">Show translation</button>',
      ),
    );
  assert.equal(
    await page.locator("#late-button svg").getAttribute("viewBox"),
    "0 0 36 36",
  );
  assert.match(
    await page.locator("#late-button path").getAttribute("d"),
    /^M18 0C8\.059/,
  );
  await page
    .locator("#late-label button")
    .evaluate((button) =>
      button.setAttribute("aria-label", "Show translation"),
    );
  assert.equal(
    await page.locator("#late-label svg").getAttribute("viewBox"),
    "0 0 36 36",
  );
  assert.match(
    await page.locator("#late-label path").getAttribute("d"),
    /^M18 0C8\.059/,
  );
});
