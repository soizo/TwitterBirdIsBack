const assert = require("node:assert/strict");
const { test } = require("node:test");
const path = require("node:path");
const { chromium } = require("playwright");

// Captured from x.com's brand link; not the ordinary close-button icon.
const xLogo =
  "M21.742 21.75l-7.563-11.179 7.056-8.321h-2.456l-5.691 6.714-4.54-6.714H2.359l7.29 10.776L2.25 21.75h2.456l6.035-7.118 4.818 7.118h6.191-.008zM7.739 3.818L18.81 20.182h-2.447L5.29 3.818h2.447z";
const closeIcon = "M18 6L6 18M6 6l12 12";

test("X brand becomes a blue bird without changing the close button or home link", async (t) => {
  const browser = await chromium.launch({ channel: "chrome", headless: true });
  t.after(() => browser.close());
  const page = await browser.newPage();
  await page.setContent(`
    <a href="/home" aria-label="X"><svg viewBox="0 0 24 24"><g><path d="${xLogo}"></path></g></svg></a>
    <button aria-label="Close"><svg><path d="${closeIcon}"></path></svg></button>
  `);
  await page.addScriptTag({
    path: path.resolve(__dirname, "../extension/content.js"),
  });

  const brandPath = page.locator("a svg path");
  assert.equal(
    await brandPath.evaluate((node) => getComputedStyle(node).fill),
    "rgb(29, 155, 240)",
  );
  assert.notEqual(await brandPath.getAttribute("d"), xLogo);
  assert.match(await brandPath.getAttribute("d"), /^M/);
  assert.equal(await page.locator("a").getAttribute("href"), "/home");
  assert.equal(await page.locator("button path").getAttribute("d"), closeIcon);
});
