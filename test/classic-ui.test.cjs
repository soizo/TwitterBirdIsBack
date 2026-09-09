const assert = require("node:assert/strict");
const { test } = require("node:test");
const path = require("node:path");
const { chromium } = require("playwright");

const scriptPath = path.resolve(__dirname, "../extension/classic-ui.js");

test("classic terminology changes UI labels but preserves user content and input", async (t) => {
  const browser = await chromium.launch({ channel: "chrome", headless: true });
  t.after(() => browser.close());
  const page = await browser.newPage();
  await page.setContent(`
    <button id="post" data-testid="tweetButtonInline" aria-label="Post"><span>Post</span></button>
    <div id="posted" role="status">Posted</div>
    <a id="posts" role="tab">Posts</a>
    <div id="repost" role="menuitem">Repost</div>
    <div data-testid="socialContext"><a data-testid="User-Name">Post</a><span id="reposted">Reposted</span></div>
    <button id="postage">Postage</button>
    <button id="follow" aria-label="Follow @Post">Follow</button>
    <article data-testid="tweetText">Post Posted Posts Repost Reposted</article>
    <button><span data-testid="User-Name">Post</span></button>
    <div role="button"><div id="editor" contenteditable="true">Post</div></div>
    <textarea>Repost</textarea><input value="Posts">
  `);
  await page.addScriptTag({ path: scriptPath });
  for (const [id, expected] of [
    ["post", "Tweet"],
    ["posted", "Tweeted"],
    ["posts", "Tweets"],
    ["repost", "Retweet"],
    ["reposted", "Retweeted"],
    ["postage", "Postage"],
  ]) {
    assert.equal(await page.locator(`#${id}`).textContent(), expected);
  }
  assert.equal(await page.locator("#post").getAttribute("aria-label"), "Tweet");
  assert.equal(
    await page.locator("#follow").getAttribute("aria-label"),
    "Follow @Post",
  );
  assert.equal(
    await page.locator('[data-testid="tweetText"]').textContent(),
    "Post Posted Posts Repost Reposted",
  );
  assert.deepEqual(
    await page.locator('[data-testid="User-Name"]').allTextContents(),
    ["Post", "Post"],
  );
  assert.equal(await page.locator("#editor").textContent(), "Post");
  assert.equal(await page.locator("textarea").inputValue(), "Repost");
  assert.equal(await page.locator("input").inputValue(), "Posts");
});

test("dynamic UI labels stay classic after insertion and text or accessible-name updates", async (t) => {
  const browser = await chromium.launch({ channel: "chrome", headless: true });
  t.after(() => browser.close());
  const page = await browser.newPage();
  await page.setContent("<main></main>");
  await page.addScriptTag({ path: scriptPath });
  await page.evaluate(() => {
    document.querySelector("main").innerHTML =
      '<button aria-label="Post"><span>Post</span></button><div role="menuitem">Undo repost</div><article data-testid="tweetText">Reposted</article>';
  });
  const button = page.locator("button");
  assert.equal(await button.textContent(), "Tweet");
  assert.equal(await button.getAttribute("aria-label"), "Tweet");
  assert.equal(
    await page.locator('[role="menuitem"]').textContent(),
    "Undo retweet",
  );
  for (const [original, expected] of [
    ["Posts", "Tweets"],
    ["Posted", "Tweeted"],
    ["REPOSTED", "RETWEETED"],
  ]) {
    await button.evaluate((node, text) => {
      node.querySelector("span").firstChild.nodeValue = text;
    }, original);
    assert.equal(await button.textContent(), expected);
  }
  await button.evaluate((node) =>
    node.setAttribute("aria-label", "5 Reposts. Repost"),
  );
  assert.equal(await button.getAttribute("aria-label"), "5 Retweets. Retweet");
  assert.equal(
    await page.locator('[data-testid="tweetText"]').textContent(),
    "Reposted",
  );
});

test("hover and native hints use classic action labels without altering arbitrary tooltip text", async (t) => {
  const browser = await chromium.launch({ channel: "chrome", headless: true });
  t.after(() => browser.close());
  const page = await browser.newPage();
  await page.setContent(`
    <button data-testid="retweet" data-hint="Repost" aria-label="9 reposts. Repost" title="Repost">↻</button>
    <button data-testid="unretweet" data-hint="Undo repost" aria-label="Undo repost" title="Undo repost">↻</button>
    <button data-testid="tweetButtonInline" data-hint="Post" aria-label="Post" title="Post">Post</button>
    <button id="profile-hint" title="Post Malone">Profile</button>
    <div role="tooltip" id="user-tooltip">I wrote a Post about X</div>
  `);
  await page.evaluate(() => {
    for (const button of document.querySelectorAll("[data-hint]")) {
      button.addEventListener("mouseenter", () => {
        const hint = document.createElement("span");
        hint.dataset.testid = "HoverLabel";
        const text = document.createElement("span");
        text.textContent = button.dataset.hint;
        hint.append(text);
        document.body.append(hint);
      });
      button.addEventListener("mouseleave", () =>
        document.querySelector('[data-testid="HoverLabel"]')?.remove(),
      );
    }
  });
  await page.addScriptTag({ path: scriptPath });
  for (const [testid, expected] of [
    ["retweet", "Retweet"],
    ["unretweet", "Undo retweet"],
    ["tweetButtonInline", "Tweet"],
  ]) {
    const button = page.locator(`[data-testid="${testid}"]`);
    await button.hover();
    assert.equal(
      await page.locator('[data-testid="HoverLabel"]').textContent(),
      expected,
    );
    assert.equal(await button.getAttribute("title"), expected);
    assert.equal(
      await button.getAttribute("aria-label"),
      testid === "retweet" ? "9 retweets. Retweet" : expected,
    );
    await page.mouse.move(0, 0);
  }
  await page
    .locator('[data-testid="retweet"]')
    .evaluate((button) => button.setAttribute("title", "Reposted"));
  assert.equal(
    await page.locator('[data-testid="retweet"]').getAttribute("title"),
    "Retweeted",
  );
  await page.evaluate(() => {
    const hint = document.createElement("div");
    hint.role = "tooltip";
    hint.id = "action-tooltip";
    hint.textContent = "Repost";
    document.body.append(hint);
  });
  assert.equal(await page.locator("#action-tooltip").textContent(), "Retweet");
  await page.locator("#action-tooltip").evaluate((hint) => {
    hint.firstChild.data = "Undo repost";
  });
  assert.equal(
    await page.locator("#action-tooltip").textContent(),
    "Undo retweet",
  );
  assert.equal(
    await page.locator("#profile-hint").getAttribute("title"),
    "Post Malone",
  );
  assert.equal(
    await page.locator("#user-tooltip").textContent(),
    "I wrote a Post about X",
  );
});

test("opening tweet details restores the page heading without renaming profiles or user headings", async (t) => {
  const browser = await chromium.launch({ channel: "chrome", headless: true });
  t.after(() => browser.close());
  const page = await browser.newPage();
  await page.route("https://x.com/**", (route) =>
    route.fulfill({
      contentType: "text/html",
      body: `<a id="open" href="/alice/status/123">Open tweet</a><a id="profile" href="/alice">Profile</a>
      <div data-testid="primaryColumn"><h2 id="title" role="heading"><span>Home</span></h2>
        <article data-testid="tweetText"><h2 role="heading">Post</h2></article>
        <div data-testid="User-Name">Post</div>
      </div>`,
    }),
  );
  await page.addInitScript({ path: scriptPath });
  await page.goto("https://x.com/home");
  // Reproduce X's same-document navigation, not a full page reload.
  await page.evaluate(() => {
    for (const link of document.querySelectorAll("a")) {
      link.addEventListener("click", (event) => {
        event.preventDefault();
        history.pushState({}, "", link.getAttribute("href"));
        document.querySelector("#title").innerHTML = "<span>Post</span>";
      });
    }
  });
  await page.locator("#open").click();
  assert.equal(await page.locator("#title").textContent(), "Tweet");
  for (const [original, expected] of [
    ["Post", "Tweet"],
    ["Posts", "Tweets"],
    ["Reposts", "Retweets"],
  ]) {
    await page.locator("#title span").evaluate((node, text) => {
      node.firstChild.nodeValue = text;
    }, original);
    assert.equal(await page.locator("#title").textContent(), expected);
  }
  assert.equal(
    await page.locator('[data-testid="tweetText"] h2').textContent(),
    "Post",
  );
  assert.equal(
    await page.locator('[data-testid="User-Name"]').textContent(),
    "Post",
  );
  await page.locator("#profile").click();
  assert.equal(await page.locator("#title").textContent(), "Post");
});

test("post and Follow buttons use classic blue with darker hover without changing disabled or following behavior", async (t) => {
  const browser = await chromium.launch({ channel: "chrome", headless: true });
  t.after(() => browser.close());
  const page = await browser.newPage();
  for (const theme of ["light", "dark"]) {
    await page.emulateMedia({
      colorScheme: theme === "dark" ? "light" : "dark",
    });
    await page.setContent(`
      <style>
        body { background: ${theme === "dark" ? "black" : "white"}; }
        button, a { display: inline-block; padding: 12px; background: black; }
        button span, a span { color: white; }
        button:disabled { opacity: .5; }
      </style>
      <a id="sidebar" data-testid="SideNav_NewTweet_Button" href="/compose/post" style="background-color: black"><span>Post</span><svg width="16" height="16" viewBox="0 0 24 24"><path fill="currentColor" d="M2 2h20v20H2z"/></svg></a>
      <button id="inline" data-testid="tweetButtonInline" style="background-color: black"><span>Post</span></button>
      <button id="modal" data-testid="tweetButton"><span>Post</span></button>
      <button id="follow" data-testid="42-follow" style="background-color: black"><span>Follow</span></button>
      <button id="following" data-testid="43-unfollow"><span>Following</span></button>
      <button id="like"><span>Like</span></button>
      <button id="disabled" data-testid="tweetButton" disabled aria-disabled="true"><span>Post</span></button>
    `);
    await page.evaluate((scheme) => {
      document.documentElement.style.colorScheme = scheme;
      document.documentElement.dataset.twitterBirdButtons = "on";
    }, theme);
    await page.addStyleTag({
      path: path.resolve(__dirname, "../extension/classic-ui.css"),
    });
    await page.mouse.move(0, 0);
    for (const id of ["sidebar", "inline", "modal", "follow"]) {
      const button = page.locator(`#${id}`);
      assert.equal(
        await button.evaluate((node) => getComputedStyle(node).backgroundColor),
        "rgb(29, 161, 242)",
      );
      assert.equal(
        await button
          .locator("span")
          .evaluate((node) => getComputedStyle(node).color),
        "rgb(255, 255, 255)",
      );
      await button.hover();
      assert.equal(
        await button.evaluate((node) => getComputedStyle(node).backgroundColor),
        "rgb(22, 139, 210)",
      );
      await page.mouse.move(0, 0);
    }
    assert.equal(
      await page
        .locator("#sidebar path")
        .evaluate((node) => getComputedStyle(node).fill),
      "rgb(255, 255, 255)",
    );
    for (const id of ["following", "like"]) {
      assert.equal(
        await page
          .locator(`#${id}`)
          .evaluate((node) => getComputedStyle(node).backgroundColor),
        "rgb(0, 0, 0)",
      );
    }
    const disabled = page.locator("#disabled");
    await disabled.hover();
    assert.equal(await disabled.isDisabled(), true);
    assert.equal(
      await disabled.evaluate((node) => getComputedStyle(node).opacity),
      "0.5",
    );
    assert.equal(
      await disabled.evaluate((node) => getComputedStyle(node).backgroundColor),
      "rgb(29, 161, 242)",
    );
    await page.locator("#follow").evaluate((node) => {
      node.dataset.testid = "42-unfollow";
    });
    assert.equal(
      await page
        .locator("#follow")
        .evaluate((node) => getComputedStyle(node).backgroundColor),
      "rgb(0, 0, 0)",
    );
    await page.evaluate(
      (scheme) => {
        document.documentElement.style.colorScheme = scheme;
      },
      theme === "dark" ? "light" : "dark",
    );
    assert.equal(
      await page
        .locator("#modal span")
        .evaluate((node) => getComputedStyle(node).color),
      "rgb(255, 255, 255)",
    );
  }
});
