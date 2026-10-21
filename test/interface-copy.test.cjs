const assert = require("node:assert/strict");
const { test } = require("node:test");
const path = require("node:path");
const { chromium } = require("playwright");
const { launchBrowser } = require("../test-support/browser.cjs");

test("interface branding changes without rewriting posts, profiles, drafts or URLs", async (t) => {
  const browser = await launchBrowser(chromium);
  t.after(() => browser.close());
  const page = await browser.newPage();
  await page.setContent(`<main><span id="source">Sourced from across <b>X</b></span>
    <span id="welcome">New to X?</span><a id="login" href="https://x.com/login">Log in to X</a>
    <article data-testid="tweetText">Sourced from across X</article>
    <div data-testid="UserDescription">New to X?</div>
    <div contenteditable="true">Log in to X</div>
    <div role="alert">New to X?</div><span id="unknown">Alice mentioned X yesterday</span></main>`);
  await page.addScriptTag({
    path: path.resolve(__dirname, "../extension/classic-ui.js"),
  });
  assert.equal(
    await page.locator("#source").textContent(),
    "Sourced from across Twitter",
  );
  assert.equal(await page.locator("#source b").count(), 1);
  assert.equal(await page.locator("#welcome").textContent(), "New to Twitter?");
  assert.equal(await page.locator("#login").textContent(), "Log in to Twitter");
  assert.equal(
    await page.locator("#login").getAttribute("href"),
    "https://x.com/login",
  );
  for (const [selector, text] of [
    ["article", "Sourced from across X"],
    ['[data-testid="UserDescription"]', "New to X?"],
    ["[contenteditable]", "Log in to X"],
    ['[role="alert"]', "New to X?"],
    ["#unknown", "Alice mentioned Twitter yesterday"],
  ]) {
    assert.equal(await page.locator(selector).textContent(), text);
  }
  await page.locator("#source").evaluate((el) => {
    el.textContent = "Sourced from across X";
  });
  assert.equal(
    await page.locator("#source").textContent(),
    "Sourced from across Twitter",
  );
});

test("priority-language reply placeholders use their own historical prompts", async (t) => {
  const browser = await launchBrowser(chromium);
  t.after(() => browser.close());
  for (const [language, current, historical] of [
    ["zh", "发布你的回复", "发布你的回复！"],
    ["zh-Hant", "發佈你的回覆", "推你的回覆！"],
    ["ja", "返信をポスト", "返信をツイートしましょう。"],
    ["ko", "답글 게시하기", "내 답글을 트윗하세요"],
    ["vi", "Đăng câu trả lời của bạn", "Đăng Tweet câu trả lời của bạn!"],
    ["pl", "Opublikuj swoją odpowiedź", "Wyślij Tweeta z odpowiedzią!"],
  ]) {
    const page = await browser.newPage();
    await page.setContent(
      `<html lang="${language}"><div class="public-DraftEditorPlaceholder-inner">${current}</div></html>`,
    );
    for (const file of ["locales.js", "classic-locales.js", "classic-ui.js"])
      await page.addScriptTag({
        path: path.resolve(__dirname, "../extension", file),
      });
    assert.equal(
      await page.locator(".public-DraftEditorPlaceholder-inner").textContent(),
      historical,
      language,
    );
    await page.close();
  }
});

test("reply placeholders restore historical wording without touching draft text", async (t) => {
  const browser = await launchBrowser(chromium);
  t.after(() => browser.close());
  const page = await browser.newPage();
  await page.setContent(`<div class="public-DraftEditorPlaceholder-inner">Post your reply</div>
    <div data-testid="tweetTextarea_0" contenteditable="true" aria-label="Post your reply" data-placeholder="Post your reply">Post your reply</div>
    <textarea data-testid="tweetTextarea_1" placeholder="Post your reply">Post your reply</textarea>
    <input placeholder="Post your reply" value="Post your reply">
    <article data-testid="tweetText"><span class="public-DraftEditorPlaceholder-inner">Post your reply</span></article>`);
  await page.addScriptTag({
    path: path.resolve(__dirname, "../extension/classic-ui.js"),
  });
  assert.equal(
    await page
      .locator("body > .public-DraftEditorPlaceholder-inner")
      .textContent(),
    "Tweet your reply!",
  );
  assert.equal(
    await page.locator("[contenteditable]").getAttribute("aria-label"),
    "Tweet your reply!",
  );
  assert.equal(
    await page.locator("[contenteditable]").getAttribute("data-placeholder"),
    "Tweet your reply!",
  );
  assert.equal(
    await page.locator("textarea").getAttribute("placeholder"),
    "Tweet your reply!",
  );
  assert.equal(
    await page.locator("[contenteditable]").textContent(),
    "Post your reply",
  );
  assert.equal(await page.locator("textarea").inputValue(), "Post your reply");
  assert.equal(
    await page.locator("input").getAttribute("placeholder"),
    "Post your reply",
  );
  assert.equal(await page.locator("article").textContent(), "Post your reply");
  await page
    .locator("[contenteditable]")
    .evaluate((el) => el.setAttribute("data-placeholder", "Post your reply"));
  assert.equal(
    await page.locator("[contenteditable]").getAttribute("data-placeholder"),
    "Tweet your reply!",
  );
});


test("Discover more subtitles restore the brand across all display languages", async (t) => {
  const browser = await launchBrowser(chromium);
  t.after(() => browser.close());
  const headings = require("./fixtures/discover-headings.json");
  assert.equal(Object.keys(headings).length, 45);
  const page = await browser.newPage();
  for (const [language, heading] of Object.entries(headings)) {
    await page.setContent(`<html lang="${language}"><main>
      <div data-testid="cellInnerDiv"><div><h2></h2><div dir="ltr"><span id="source">源自于整个 X</span></div></div></div>
      <article><h2></h2><div dir="ltr">源自于整个 X</div></article>
      <div data-testid="cellInnerDiv"><h2>Other heading</h2><div dir="ltr" id="unrelated">源自于整个 X</div></div>
    </main></html>`);
    await page.locator("h2").evaluateAll((nodes, heading) => {
      nodes.slice(0, 2).forEach(node => node.textContent = heading);
    }, heading);
    for (const file of ["locales.js", "classic-ui.js"])
      await page.addScriptTag({ path: path.resolve(__dirname, "../extension", file) });
    assert.equal(await page.locator("#source").textContent(), "源自于整个 Twitter", language);
    assert.equal(await page.locator("article div").textContent(), "源自于整个 X", language);
    assert.equal(await page.locator("#unrelated").textContent(), "源自于整个 Twitter", language);
    await page.locator("#source").evaluate(node => node.innerHTML = "Sourced from across <b>X</b>");
    await page.waitForFunction(() => document.querySelector("#source").textContent === "Sourced from across Twitter");
    assert.equal(await page.locator("#source b").textContent(), "Twitter");
  }
});

test("brand-only restoration covers new interface copy and hints in all 45 languages", async (t) => {
  const browser = await launchBrowser(chromium);
  t.after(() => browser.close());
  const page = await browser.newPage();
  const titles = require("./fixtures/brand-titles.json");
  for (const language of Object.keys(titles)) {
    await page.setContent(`<html lang="${language}"><main>
      <div dir="ltr"><span id="copy">新しい X の機能 / X에서 / X'te</span></div>
      <button id="hint" aria-label="Try X today" title="X tools">Try X today</button>
      <div id="split"><b>X</b><span> tools and </span><b>X</b><span> news</span></div>
      <div id="splitword"><b>X</b><span>code</span></div>
      <button id="close">X</button><div id="tokens">XP Xcode eXample @X #X https://X.com X.com</div>
      <article><span>New X feature</span><button title="X user">X user</button></article>
      <div data-testid="UserDescription">X profile</div><div data-testid="messageEntry">X message</div>
      <div contenteditable="true">X draft</div><input value="X input" placeholder="X placeholder">
      <a id="account" href="https://x.com/X">X account</a>
      <a id="site" href="https://x.com/settings">X settings</a>
    </main></html>`);
    for (const file of ["locales.js", "classic-locales.js", "classic-ui.js", "title.js"])
      await page.addScriptTag({ path: path.resolve(__dirname, "../extension", file) });
    assert.equal(await page.locator("#copy").textContent(), "新しい Twitter の機能 / Twitter에서 / Twitter'te", language);
    assert.equal(await page.locator("#hint").getAttribute("aria-label"), "Try Twitter today", language);
    assert.equal(await page.locator("#hint").getAttribute("title"), "Twitter tools", language);
    assert.equal(await page.locator("#close").textContent(), "X", language);
    assert.deepEqual(await page.locator("#split > *").allTextContents(), ["Twitter", " tools and ", "Twitter", " news"], language);
    assert.equal(await page.locator("#splitword").textContent(), "Xcode", language);
    assert.equal(await page.locator("#tokens").textContent(), "XP Xcode eXample @X #X https://X.com X.com", language);
    assert.equal(await page.locator("article span").textContent(), "New X feature", language);
    assert.equal(await page.locator("article button").getAttribute("title"), "X user", language);
    assert.equal(await page.locator('[data-testid="UserDescription"]').textContent(), "X profile", language);
    assert.equal(await page.locator('[data-testid="messageEntry"]').textContent(), "X message", language);
    assert.equal(await page.locator("[contenteditable]").textContent(), "X draft", language);
    assert.equal(await page.locator("input").inputValue(), "X input", language);
    assert.equal(await page.locator("#account").textContent(), "X account", language);
    assert.equal(await page.locator("#site").textContent(), "Twitter settings", language);
    assert.equal(await page.locator("#site").getAttribute("href"), "https://x.com/settings", language);
    await page.locator("#hint").evaluate(node => node.setAttribute("aria-label", "Another X feature"));
    assert.equal(await page.locator("#hint").getAttribute("aria-label"), "Another Twitter feature", language);
    if (!["en", "en-GB", "zh", "zh-Hant", "ja", "ko", "vi", "pl"].includes(language)) {
      const title = titles[language].replace("{name}", "Alice X").replace("{text}", "Post X");
      await page.evaluate(title => document.title = title + " / X", title);
      const expected = titles[language].replace(/X/g, "Twitter").replace("{name}", "Alice X").replace("{text}", "Post X");
      assert.equal(await page.title(), expected.replace(/[ \t\n\r\f]+/g, " ") + " / Twitter", language);
    }
  }
});
