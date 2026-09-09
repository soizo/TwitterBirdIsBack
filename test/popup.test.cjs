const assert = require("node:assert/strict");
const { test } = require("node:test");
const path = require("node:path");
const { chromium } = require("playwright");
const manifest = require("../extension/manifest.json");

const xLogo =
  "M21.742 21.75l-7.563-11.179 7.056-8.321h-2.456l-5.691 6.714-4.54-6.714H2.359l7.29 10.776L2.25 21.75h2.456l6.035-7.118 4.818 7.118h6.191-.008zM7.739 3.818L18.81 20.182h-2.447L5.29 3.818h2.447z";
const features = ["bird", "terms", "buttons", "translation", "title"];

async function install(t, locale = "en-US") {
  assert.ok(
    manifest.action?.default_popup,
    "toolbar action must open the settings popup",
  );
  const extension = path.resolve(__dirname, "../extension");
  const context = await chromium.launchPersistentContext("", {
    channel: "chromium",
    headless: true,
    locale,
    args: [
      `--disable-extensions-except=${extension}`,
      `--load-extension=${extension}`,
    ],
  });
  t.after(() => context.close());
  const manager = await context.newPage();
  await manager.goto("chrome://extensions/");
  const id = await manager
    .locator("extensions-item")
    .first()
    .getAttribute("id");
  await manager.close();
  const popup = await context.newPage();
  const popupURL = `chrome-extension://${id}/${manifest.action.default_popup}`;
  await popup.goto(popupURL);
  await popup.locator("input[name=enabled]:enabled").waitFor();
  return { context, popup, popupURL };
}

async function snapshot(page) {
  // The button CSS gate is written for both on/off after reading the saved snapshot.
  await page.waitForFunction(() =>
    document.documentElement.hasAttribute("data-twitter-bird-buttons"),
  );
  return page.evaluate(() => ({
    bird: document
      .querySelector("link[rel=icon]")
      .getAttribute("href")
      .startsWith("data:image/svg+xml,"),
    terms: document.querySelector("#post").textContent === "Tweet",
    buttons:
      getComputedStyle(document.querySelector("#post")).backgroundColor ===
      "rgb(29, 161, 242)",
    translation:
      document.querySelector("#translation svg").getAttribute("viewBox") ===
      "0 0 36 36",
    title: document.title === "(8) Tweet / Twitter",
  }));
}

async function toggle(popup, name, checked) {
  await popup.locator(`input[name=${name}]:enabled`).setChecked(checked);
  await popup.waitForFunction(
    () => document.querySelector("[role=status]").dataset.state === "saved",
  );
}

test("popup persists independent choices; existing X pages change only after reload", {
  timeout: 30000,
}, async (t) => {
  const { context, popup, popupURL } = await install(t);
  assert.equal(
    await popup
      .locator("label")
      .first()
      .evaluate((node) => getComputedStyle(node).fontSize),
    "14px",
    "Chrome extension defaults must not shrink the controls",
  );
  for (const name of ["enabled", ...features])
    assert.equal(await popup.locator(`input[name=${name}]`).isChecked(), true);
  await context.route("https://x.com/**", (route) =>
    route.fulfill({
      contentType: "text/html",
      body: `<!doctype html>
    <html><head><title>(8) Post / X</title><link rel="icon" href="https://x.com/original.ico"></head><body>
    <svg id="brand"><path d="${xLogo}"></path></svg>
    <button id="post" data-testid="tweetButtonInline" aria-label="Post">Post</button>
    <div id="translation"><svg viewBox="0 0 33 32"><path d="M0 0h10v10z"></path></svg><button aria-label="Show translation">Show translation</button></div>
    <div data-testid="tweetText">Post by X</div></body></html>`,
    }),
  );
  const page = await context.newPage();
  await page.goto("https://x.com/home");
  assert.deepEqual(await snapshot(page), {
    bird: true,
    terms: true,
    buttons: true,
    translation: true,
    title: true,
  });
  for (const feature of features) {
    await toggle(popup, feature, false);
    assert.equal(
      (await snapshot(page))[feature],
      true,
      "saving must not modify the already-open page",
    );
    await page.reload();
    const result = await snapshot(page);
    for (const key of features)
      assert.equal(
        result[key],
        key !== feature,
        `${feature} must not affect ${key}`,
      );
    assert.equal(
      await page.locator("[data-testid=tweetText]").textContent(),
      "Post by X",
    );
    if (feature === "bird")
      assert.equal(await page.locator("#brand path").getAttribute("d"), xLogo);
    await toggle(popup, feature, true);
    await page.reload();
    assert.equal((await snapshot(page))[feature], true);
  }
  await toggle(popup, "translation", false);
  await toggle(popup, "enabled", false);
  for (const feature of features)
    assert.equal(
      await popup.locator(`input[name=${feature}]`).isDisabled(),
      true,
    );
  await page.reload();
  assert.deepEqual(await snapshot(page), {
    bird: false,
    terms: false,
    buttons: false,
    translation: false,
    title: false,
  });
  // A new popup document must read storage, not an in-memory copy from the last popup.
  await popup.close();
  const reopened = await context.newPage();
  await reopened.goto(popupURL);
  await reopened.locator("input[name=enabled]:enabled").waitFor();
  assert.equal(
    await reopened.locator("input[name=enabled]").isChecked(),
    false,
  );
  assert.equal(
    await reopened.locator("input[name=translation]").isChecked(),
    false,
  );
  await toggle(reopened, "enabled", true);
  await page.reload();
  assert.deepEqual(await snapshot(page), {
    bird: true,
    terms: true,
    buttons: true,
    translation: false,
    title: true,
  });
  assert.equal(
    await reopened.evaluate(
      () => document.documentElement.scrollWidth > innerWidth,
    ),
    false,
  );
});

test("popup uses Chinese browser language and reports storage failure without claiming success", {
  timeout: 15000,
}, async (t) => {
  const { popup } = await install(t, "zh-CN");
  assert.equal(await popup.locator("html").getAttribute("lang"), "zh-CN");
  assert.match(await popup.locator("label[for=enabled]").textContent(), /启用/);
  // Native storage is exercised above; force only the failing I/O boundary here.
  await popup.evaluate(() => {
    chrome.storage.local.set = async () => {
      throw new Error("storage unavailable");
    };
  });
  // click() does not insist on an unchecked final state; rollback is expected here.
  await popup.locator("input[name=enabled]").click();
  await popup.waitForFunction(
    () => document.querySelector("[role=status]").dataset.state === "error",
  );
  assert.equal(
    await popup.locator("input[name=enabled]").isChecked(),
    true,
    "failed changes must roll back",
  );
  assert.equal(
    await popup.locator("input[name=enabled]").isEnabled(),
    true,
    "user can retry",
  );
  assert.match(await popup.locator("[role=status]").textContent(), /失败/);
});

test("popup reports its intended width even when the initial browser viewport is narrow", {
  timeout: 15000,
}, async (t) => {
  const { popup } = await install(t);
  // Model the near-zero viewport used before the native panel has its content width.
  // With max-width:100vw this collapses the body to its 48px of horizontal padding.
  await popup.setViewportSize({ width: 1, height: 600 });
  assert.equal(
    await popup
      .locator("body")
      .evaluate((node) => node.getBoundingClientRect().width),
    320,
    "popup content must not shrink to the initial viewport while the browser measures it",
  );
  assert.equal(
    await popup.evaluate(() => document.documentElement.scrollWidth),
    320,
  );
});
