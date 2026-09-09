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

test("brand logos inserted after startup also become blue birds", async (t) => {
  const browser = await chromium.launch({ channel: "chrome", headless: true });
  t.after(() => browser.close());
  const page = await browser.newPage();
  await page.setContent("<main></main>");
  await page.addScriptTag({
    path: path.resolve(__dirname, "../extension/content.js"),
  });
  await page.evaluate((logo) => {
    document.querySelector("main").innerHTML =
      `<svg viewBox="0 0 24 24"><g><path d="${logo}"></path></g></svg>`;
  }, xLogo);
  // Flush DOM observer delivery without a timing-dependent sleep.
  const result = await page.locator("main path").evaluate((node) => ({
    fill: getComputedStyle(node).fill,
    shape: node.getAttribute("d"),
  }));
  assert.equal(result.fill, "rgb(29, 155, 240)");
  assert.notEqual(result.shape, xLogo);
});

test("installed extension replaces the splash logo before page loading finishes", {
  timeout: 15000,
}, async (t) => {
  const extensionPath = path.resolve(__dirname, "../extension");
  const context = await chromium.launchPersistentContext("", {
    channel: "chromium",
    headless: true,
    args: [
      `--disable-extensions-except=${extensionPath}`,
      `--load-extension=${extensionPath}`,
    ],
  });
  let releaseBoot;
  const bootBlocked = new Promise((resolve) => {
    releaseBoot = resolve;
  });
  t.after(async () => {
    releaseBoot();
    await context.close();
  });
  await context.route("https://x.com/**", async (route) => {
    if (new URL(route.request().url()).pathname === "/boot.js") {
      await bootBlocked;
      await route.fulfill({ contentType: "text/javascript", body: "" });
      return;
    }
    await route.fulfill({
      contentType: "text/html",
      body: `<!doctype html><html><head><title>(8) Post / X</title>
        <style>body { background: black; } #placeholder { position: fixed; inset: 0; display: grid; place-items: center; background-color: black !important; }</style>
        </head><body>
        <div id="placeholder"><svg viewBox="0 0 24 24" width="48" height="48"><path d="${xLogo}"></path></svg></div>
        <button data-testid="tweetButtonInline" aria-label="Post"><span>Post</span></button>
        <script src="/boot.js"></script>
      </body></html>`,
    });
  });
  const page = await context.newPage();
  await page.goto("https://x.com/", { waitUntil: "commit" });
  await page.locator("#placeholder path").waitFor({ state: "attached" });
  const splash = await page.evaluate(async () => {
    await new Promise((resolve) =>
      requestAnimationFrame(() => requestAnimationFrame(resolve)),
    );
    const node = document.querySelector("#placeholder path");
    return {
      state: document.readyState,
      background: getComputedStyle(document.querySelector("#placeholder"))
        .backgroundColor,
      fill: getComputedStyle(node).fill,
      shape: node.getAttribute("d"),
    };
  });
  assert.equal(
    splash.state,
    "loading",
    "test must observe the splash before DOMContentLoaded",
  );
  assert.equal(splash.background, "rgb(255, 255, 255)");
  assert.equal(splash.fill, "rgb(29, 155, 240)");
  assert.notEqual(splash.shape, xLogo);
  await page.locator("#placeholder").evaluate((node) => node.remove());
  assert.equal(
    await page
      .locator("body")
      .evaluate((node) => getComputedStyle(node).backgroundColor),
    "rgb(0, 0, 0)",
    "the app must keep its original dark background",
  );
  assert.equal(await page.title(), "(8) Tweet / Twitter");
  assert.equal(await page.locator("button").textContent(), "Tweet");
  assert.equal(
    await page.locator("button").getAttribute("aria-label"),
    "Tweet",
  );
  assert.equal(
    await page
      .locator("button")
      .evaluate((node) => getComputedStyle(node).backgroundColor),
    "rgb(29, 161, 242)",
  );
});

test("favicon becomes a locally loadable blue bird without changing other head links", async (t) => {
  const browser = await chromium.launch({ channel: "chrome", headless: true });
  t.after(() => browser.close());
  const page = await browser.newPage();
  await page.setContent(`
    <head>
      <link rel="shortcut icon" href="https://abs.twimg.com/favicons/twitter-pip.3.ico" type="image/x-icon" sizes="32x32">
      <link rel="canonical" href="https://x.com/home">
    </head>
  `);
  await page.addScriptTag({
    path: path.resolve(__dirname, "../extension/content.js"),
  });
  const icon = page.locator('link[rel~="icon"]');
  assert.match(await icon.getAttribute("href"), /^data:image\/svg\+xml,/);
  assert.equal(await icon.getAttribute("type"), "image/svg+xml");
  assert.equal(await icon.getAttribute("sizes"), "any");
  const pixel = await icon.evaluate(async (link) => {
    const image = new Image();
    image.src = link.href;
    await image.decode();
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = 24;
    const context = canvas.getContext("2d");
    context.drawImage(image, 0, 0, 24, 24);
    return [...context.getImageData(12, 12, 1, 1).data];
  });
  assert.deepEqual(pixel, [29, 155, 240, 255]);
  assert.equal(
    await page.locator('link[rel="canonical"]').getAttribute("href"),
    "https://x.com/home",
  );
});

test("favicon stays a blue bird when the site rewrites its attributes", {
  timeout: 10000,
}, async (t) => {
  const browser = await chromium.launch({ channel: "chrome", headless: true });
  t.after(() => browser.close());
  const page = await browser.newPage();
  await page.setContent('<link rel="icon" href="https://x.com/original.ico">');
  await page.addScriptTag({
    path: path.resolve(__dirname, "../extension/content.js"),
  });
  const icon = page.locator('link[rel="icon"]');
  for (const [attribute, value] of [
    ["href", "https://x.com/unread.ico"],
    ["type", "image/png"],
    ["sizes", "32x32"],
  ]) {
    await icon.evaluate(
      (link, [name, value]) => link.setAttribute(name, value),
      [attribute, value],
    );
    assert.match(await icon.getAttribute("href"), /^data:image\/svg\+xml,/);
    assert.equal(await icon.getAttribute("type"), "image/svg+xml");
    assert.equal(await icon.getAttribute("sizes"), "any");
  }
});
