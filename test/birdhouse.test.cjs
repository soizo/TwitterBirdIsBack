const assert = require("node:assert/strict");
const { test } = require("node:test");
const path = require("node:path");
const { chromium } = require("playwright");
const { launchBrowser } = require("../test-support/browser.cjs");

test("birdhouse follows bird settings, survives navigation redraws, and preserves other links", async (t) => {
  const browser = await launchBrowser(chromium);
  t.after(() => browser.close());
  const original = "M0 0h10v10z";
  const icon = `<svg viewBox="0 0 24 24"><path d="${original}"/></svg>`;
  for (const settings of [
    { enabled: true, bird: true },
    { enabled: true, bird: false, translation: true },
    { enabled: false, bird: true },
  ]) {
    const page = await browser.newPage();
    await page.setContent(`<nav><a href="/home">${icon}</a><a href="/explore">${icon}</a></nav><a href="/home">${icon}</a>`);
    await page.evaluate(settings => {
      globalThis.TwitterBirdSettings = { load: async () => settings };
      document.querySelector("nav a").addEventListener("click", event => {
        event.preventDefault();
        document.body.dataset.clicked = "yes";
      });
    }, settings);
    await page.addScriptTag({ path: path.resolve(__dirname, "../extension/content.js") });
    const computed = selector => page.locator(selector).evaluate(p => getComputedStyle(p).d);
    const enabled = settings.enabled && settings.bird;
    assert.equal((await computed('nav > a[href="/home"] path')).includes("M 12 9"), enabled);
    for (const selector of ['nav > a[href="/explore"] path', 'body > a path'])
      assert.equal(await computed(selector), 'path("M 0 0 H 10 V 10 Z")');
    await page.locator('nav > a[href="/home"]').click();
    assert.equal(await page.locator("body").getAttribute("data-clicked"), "yes");
    await page.locator('nav > a[href="/home"]').evaluate((a, icon) => { a.innerHTML = icon; }, icon);
    await page.locator('nav > a[href="/home"] path').evaluate(p => p.setAttribute("d", "M1 1h2"));
    assert.equal((await computed('nav > a[href="/home"] path')).includes("M 12 9"), enabled);
    const home = page.locator('nav > a[href="/home"]');
    await home.evaluate(a => a.setAttribute("aria-current", "page"));
    assert.equal((await computed('nav > a[href="/home"] path')).startsWith('path("M 12 1.696'), enabled, "selected Home uses filled birdhouse");
    await home.evaluate((a, icon) => { a.innerHTML = icon; }, icon);
    assert.equal((await computed('nav > a[href="/home"] path')).startsWith('path("M 12 1.696'), enabled, "selected artwork survives redraw");
    await home.evaluate(a => a.removeAttribute("aria-current"));
    assert.equal((await computed('nav > a[href="/home"] path')).includes("M 12 9"), enabled, "leaving Home restores outline");
    await page.close();
  }
});

test("Home is filled by route without aria-current, including SPA navigation and history", async (t) => {
  const browser = await launchBrowser(chromium);
  t.after(() => browser.close());
  const page = await browser.newPage();
  await page.route("https://x.com/**", route => route.fulfill({
    contentType: "text/html",
    body: '<nav><a href="/home"><svg><path d="M0 0h10v10z"/></svg></a></nav><main></main>',
  }));
  await page.goto("https://x.com/home");
  await page.addScriptTag({ path: path.resolve(__dirname, "../extension/content.js") });
  const filled = () => page.locator("nav path").evaluate(p => getComputedStyle(p).d.startsWith('path("M 12 1.696'));
  assert.equal(await filled(), true, "initial Home route is filled without aria-current");
  await page.evaluate(() => {
    history.pushState({}, "", "/explore");
    document.querySelector("main").textContent = "Explore";
  });
  assert.equal(await filled(), false, "SPA navigation away restores outline");
  await page.evaluate(() => {
    history.pushState({}, "", "/home?test=1");
    document.querySelector("nav a").innerHTML = '<svg><path d="M0 0h10v10z"/></svg>';
  });
  assert.equal(await filled(), true, "returning Home and redrawing preserves filled state");
  await page.goBack();
  assert.equal(await filled(), false, "back restores outline");
  await page.goForward();
  assert.equal(await filled(), true, "forward restores filled state");
});
