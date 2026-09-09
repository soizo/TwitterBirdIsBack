const assert = require("node:assert/strict");
const { test } = require("node:test");
const path = require("node:path");
const { chromium } = require("playwright");

// Representative current X messages; sources are recorded in docs/localization.md.
const messages = [
  ["Your post was sent.", "Your tweet was sent."],
  [
    "Your post was sent. You have 30 minutes to make any edits.",
    "Your tweet was sent. You have 30 minutes to make any edits.",
  ],
  [
    "Your post was sent. You have 1 hour to make any edits.",
    "Your tweet was sent. You have 1 hour to make any edits.",
  ],
  ["Your posts were sent.", "Your tweets were sent."],
  ["Post reposted", "Tweet retweeted"],
  [
    "Something went wrong. Try reposting again in a minute.",
    "Something went wrong. Try retweeting again in a minute.",
  ],
  [
    "Something went wrong. Try sending your post again in a minute.",
    "Something went wrong. Try sending your tweet again in a minute.",
  ],
  ["Post added to your Bookmarks", "Tweet added to your Bookmarks"],
  ["Post removed from your Bookmarks", "Tweet removed from your Bookmarks"],
  [
    "Your post was pinned to your profile.",
    "Your tweet was pinned to your profile.",
  ],
  [
    "Your post was unpinned from your profile",
    "Your tweet was unpinned from your profile",
  ],
  ["Reply pinned to post", "Reply pinned to tweet"],
  ["Unable to unpin reply from post", "Unable to unpin reply from tweet"],
  [
    "Your selected draft posts were deleted.",
    "Your selected draft tweets were deleted.",
  ],
  [
    "Your selected scheduled posts were deleted.",
    "Your selected scheduled tweets were deleted.",
  ],
  [
    "Scheduled post could not be deleted.",
    "Scheduled tweet could not be deleted.",
  ],
  [
    "Some unsent posts could not be deleted.",
    "Some unsent tweets could not be deleted.",
  ],
  ["Your post can’t be updated again.", "Your tweet can’t be updated again."],
  [
    "Your post was successfully boosted!",
    "Your tweet was successfully boosted!",
  ],
];

test("system notifications restore classic wording without rewriting posts or unrelated alerts", async (t) => {
  const browser = await chromium.launch({ channel: "chrome", headless: true });
  t.after(() => browser.close());
  const page = await browser.newPage();
  await page.setContent(`
    <div data-testid="toast" role="alert"><span id="sent" aria-label="Your post was sent." title="Your post was sent.">Your post was sent.</span><a href="/user/status/123">View</a></div>
    <div data-testid="toast"><span id="name">Post Malone followed you</span></div>
    <div role="alert"><span data-testid="tweetText">Your post was sent.</span><span data-testid="User-Name">Post</span></div>
    <p id="ordinary">Your post was sent.</p>
    <div role="alert"><textarea>Your post was sent.</textarea><div contenteditable="true">Your post was sent.</div></div>
  `);
  await page.addScriptTag({
    path: path.resolve(__dirname, "../extension/classic-ui.js"),
  });
  assert.equal(
    await page.locator("#sent").textContent(),
    "Your tweet was sent.",
  );
  assert.equal(
    await page.locator("#sent").getAttribute("aria-label"),
    "Your tweet was sent.",
  );
  assert.equal(
    await page.locator("#sent").getAttribute("title"),
    "Your tweet was sent.",
  );
  assert.equal(await page.locator("a").textContent(), "View");
  assert.equal(
    await page.locator("a").getAttribute("href"),
    "/user/status/123",
  );
  assert.equal(
    await page.locator("#name").textContent(),
    "Post Malone followed you",
  );
  for (const selector of [
    "[data-testid=tweetText]",
    "#ordinary",
    "[contenteditable]",
  ]) {
    assert.equal(
      await page.locator(selector).textContent(),
      "Your post was sent.",
    );
  }
  assert.equal(
    await page.locator("[data-testid=User-Name]").textContent(),
    "Post",
  );
  assert.equal(
    await page.locator("textarea").inputValue(),
    "Your post was sent.",
  );

  for (const [index, [original, expected]] of [
    ...messages,
    ["your post was sent", "your tweet was sent"],
  ].entries()) {
    await page.evaluate(
      ({ text, index }) => {
        document.querySelector("#late")?.remove();
        const toast = document.createElement("div");
        toast.id = "late";
        if (index % 2) toast.setAttribute("role", "alert");
        else toast.setAttribute("data-testid", "toast");
        const message = document.createElement("span");
        message.textContent = text;
        toast.append(message);
        document.body.append(toast);
      },
      { text: original, index },
    );
    assert.equal(await page.locator("#late span").textContent(), expected);
    await page.locator("#sent").evaluate((node, text) => {
      node.firstChild.nodeValue = text;
      node.setAttribute("aria-label", text);
      node.setAttribute("title", text);
    }, original);
    assert.equal(await page.locator("#sent").textContent(), expected);
    assert.equal(
      await page.locator("#sent").getAttribute("aria-label"),
      expected,
    );
    assert.equal(await page.locator("#sent").getAttribute("title"), expected);
  }
  await page.evaluate(() => {
    document.querySelector("#late").innerHTML =
      '<span>Your <b>post</b> was sent.</span><a href="/view">View</a>';
  });
  assert.equal(
    await page.locator("#late span").textContent(),
    "Your tweet was sent.",
  );
  assert.equal(await page.locator("#late a").textContent(), "View");
  await page.locator("#late").evaluate((node) => {
    node.innerHTML = 'Your post was sent.<a href="/view">View</a>';
    node.setAttribute("aria-label", "Post Malone");
    node.setAttribute("title", "Post Malone");
  });
  assert.equal(
    await page.locator("#late").textContent(),
    "Your tweet was sent.View",
  );
  assert.equal(
    await page.locator("#late").getAttribute("aria-label"),
    "Post Malone",
  );
  assert.equal(
    await page.locator("#late").getAttribute("title"),
    "Post Malone",
  );
  await page.locator("#late").evaluate((node) => {
    node.textContent = "Your post was sent by Post Malone";
  });
  assert.equal(
    await page.locator("#late").textContent(),
    "Your post was sent by Post Malone",
  );
});
