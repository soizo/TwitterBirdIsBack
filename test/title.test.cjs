const assert = require("node:assert/strict");
const { test } = require("node:test");
const path = require("node:path");
const { chromium } = require("playwright");

const scriptPath = path.resolve(__dirname, "../extension/title.js");

test("English tab titles restore only structural branding and fixed UI terms", async (t) => {
  const browser = await chromium.launch({ channel: "chrome", headless: true });
  t.after(() => browser.close());
  const cases = [
    ["(8) Home / X", "(8) Home / Twitter"],
    ["X. It’s what’s happening / X", "Twitter. It’s what’s happening / Twitter"],
    ["X. It’s what’s happening / Twitter", "Twitter. It’s what’s happening / Twitter"],
    ["X. It's what's happening / X", "Twitter. It's what's happening / Twitter"],
    ["(2) X. It’s what’s happening / X", "(2) Twitter. It’s what’s happening / Twitter"],
    ["X. It’s what’s happening (@alice) / X", "X. It’s what’s happening (@alice) / Twitter"],
    ["(2) Post / X", "(2) Tweet / Twitter"],
    ["Posts / X", "Tweets / Twitter"],
    ["Reposts / X", "Retweets / Twitter"],
    ["(8) X", "(8) Twitter"],
    ["X (@X) / X", "X (@X) / Twitter"],
    ["Post Malone (@post) / X", "Post Malone (@post) / Twitter"],
    ['"Post on X" - Search / X', '"Post on X" - Search / Twitter'],
    [
      '(8) X on X: "I use X. Post / X and Repost stay literal." / X',
      '(8) X on Twitter: "I use X. Post / X and Repost stay literal." / Twitter',
    ],
    // A display name or quoted post can itself contain the platform delimiter.
    // Keep ambiguous inner text intact rather than guessing where it starts.
    [
      'Alice on X: "Fan" on X: "Post / X" / X',
      'Alice on X: "Fan" on X: "Post / X" / Twitter',
    ],
    [
      "Unrecognized title mentioning X and Post",
      "Unrecognized title mentioning X and Post",
    ],
  ];
  for (const [original, expected] of cases) {
    const page = await browser.newPage();
    await page.evaluate((title) => {
      document.title = title;
    }, original);
    await page.addScriptTag({ path: scriptPath });
    assert.equal(await page.title(), expected, original);
    await page.close();
  }
});

test("tab titles recover from startup, unread updates, navigation and title-node replacement", async (t) => {
  const browser = await chromium.launch({ channel: "chrome", headless: true });
  t.after(() => browser.close());
  const page = await browser.newPage();
  await page.route("https://x.com/**", (route) =>
    route.fulfill({
      contentType: "text/html",
      body: "<title>(8) Home / X</title><main></main>",
    }),
  );
  await page.addInitScript({ path: scriptPath });
  await page.goto("https://x.com/home");
  assert.equal(await page.title(), "(8) Home / Twitter");
  await page.evaluate(() => {
    document.title = "(9) Notifications / X";
  });
  assert.equal(await page.title(), "(9) Notifications / Twitter");
  await page.evaluate(() => {
    document.querySelector("title").firstChild.data = "(9) Messages / X";
  });
  assert.equal(await page.title(), "(9) Messages / Twitter");
  await page.evaluate(() => {
    history.pushState({}, "", "/alice/status/123");
    document.title = '(9) Alice on X: "Post about X / X" / X';
  });
  assert.equal(
    await page.title(),
    '(9) Alice on Twitter: "Post about X / X" / Twitter',
  );
  await page.evaluate(() => {
    const title = document.createElement("title");
    title.textContent = "Posts / X";
    document.querySelector("title").replaceWith(title);
  });
  assert.equal(await page.title(), "Tweets / Twitter");
});
