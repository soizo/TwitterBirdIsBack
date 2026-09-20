const assert = require("node:assert/strict");
const { test } = require("node:test");
const path = require("node:path");
const { chromium } = require("playwright");
const manifest = require("../extension/manifest.json");

const xLogo =
  "M21.742 21.75l-7.563-11.179 7.056-8.321h-2.456l-5.691 6.714-4.54-6.714H2.359l7.29 10.776L2.25 21.75h2.456l6.035-7.118 4.818 7.118h6.191-.008zM7.739 3.818L18.81 20.182h-2.447L5.29 3.818h2.447z";
const features = ["bird", "terms", "buttons", "translation", "title"];

test("Edit image toggle hides only matching links, including dynamic links", {
  timeout: 30000,
}, async (t) => {
  const { context, popup } = await install(t);
  assert.equal(
    await popup.locator("input[name=hideEditImage]").isChecked(),
    false,
  );
  const href =
    "/i/grok-redirect?redirect_after_login=%2Fimagine%3Fparent_x_post_id%3D2098231879132660212%26media_url%3Dhttps%253A%252F%252Fpbs.twimg.com%252Fmedia%252FHR5qxDFbAAErtlS.jpg%26action%3Dimg_edit";
  await context.route("https://x.com/**", (route) =>
    route.fulfill({
      contentType: "text/html",
      body: `<a id="edit" href="${href}">Edit image</a><a id="other" href="${href.replace("img_edit", "view")}">View image</a><a id="grok" href="/i/grok">Grok</a>`,
    }),
  );
  const page = await context.newPage();
  await page.goto("https://x.com/home");
  assert.equal(await page.locator("#edit").isVisible(), true);
  await toggle(popup, "hideEditImage", true);
  assert.equal(
    await page.locator("#edit").isVisible(),
    true,
    "requires refresh",
  );
  await page.reload();
  await page.locator("#edit").waitFor({ state: "hidden" });
  assert.equal(await page.locator("#other").isVisible(), true);
  assert.equal(await page.locator("#grok").isVisible(), true);
  await page.evaluate((href) => {
    const link = document.createElement("a");
    link.id = "dynamic";
    link.href = href;
    link.textContent = "Edit image";
    document.body.append(link);
  }, href);
  assert.equal(await page.locator("#dynamic").isVisible(), false);
  await popup.reload();
  await popup.locator("input[name=enabled]:enabled").waitFor();
  assert.equal(
    await popup.locator("input[name=hideEditImage]").isChecked(),
    true,
  );
  await toggle(popup, "enabled", false);
  await page.reload();
  assert.equal(await page.locator("#edit").isVisible(), true);
});

test("Actual link restores complete URLs by default and respects saved switches", {
  timeout: 30000,
}, async (t) => {
  const { context, popup } = await install(t);
  await context.route("https://x.com/**", (route) =>
    route.fulfill({
      contentType: "text/html; charset=utf-8",
      body: `<div data-testid="tweetText"><a id="actual" dir="ltr" href="https://t.co/xbDKj7jhvU" rel="noopener noreferrer nofollow" target="_blank" role="link" style="color: rgb(29, 155, 240)"><span aria-hidden="true">https://</span>github.com/soizo/FreeNumi</a></div>`,
    }),
  );
  const page = await context.newPage();
  await page.goto("https://x.com/home");
  // A wrong default, missing manifest script, or failing conversion breaks this.
  const destination = "https://github.com/soizo/FreeNumi";
  assert.equal(await page.locator("#actual").getAttribute("href"), destination);
  assert.equal(await popup.locator("input[name=actualLinks]").isChecked(), true);
  assert.deepEqual(await page.locator("#actual").evaluate((link) => ({
    text: link.textContent,
    target: link.target,
    rel: link.rel,
    color: getComputedStyle(link).color,
    hidden: link.firstElementChild.getAttribute("aria-hidden"),
  })), {
    text: destination,
    target: "_blank",
    rel: "noopener noreferrer nofollow",
    color: "rgb(29, 155, 240)",
    hidden: "true",
  });
  await context.route("https://github.com/**", (route) =>
    route.fulfill({ contentType: "text/html", body: "Destination" }),
  );
  const opened = page.waitForEvent("popup");
  await page.locator("#actual").click();
  const target = await opened;
  await target.waitForLoadState();
  assert.equal(target.url(), destination, "ordinary clicks go directly to the destination");
  await target.close();

  await toggle(popup, "actualLinks", false);
  assert.equal(await page.locator("#actual").getAttribute("href"), destination, "requires refresh");
  await page.reload();
  assert.equal(await page.locator("#actual").getAttribute("href"), "https://t.co/xbDKj7jhvU");
  await popup.reload();
  await popup.locator("input[name=enabled]:enabled").waitFor();
  assert.equal(await popup.locator("input[name=actualLinks]").isChecked(), false);
  await toggle(popup, "actualLinks", true);
  // This feature must not depend on bird/translation or other classic UI switches.
  await popup.evaluate(() => chrome.storage.local.set({
    bird: false, terms: false, buttons: false, translation: false, title: false,
  }));
  await page.reload();
  assert.equal(await page.locator("#actual").getAttribute("href"), destination);
  await toggle(popup, "enabled", false);
  assert.equal(await popup.locator("input[name=actualLinks]").isDisabled(), true);
  await page.reload();
  assert.equal(await page.locator("#actual").getAttribute("href"), "https://t.co/xbDKj7jhvU");
});

test("Actual link handles dynamic DOM and leaves incomplete or unsafe destinations alone", {
  timeout: 30000,
}, async (t) => {
  const { context } = await install(t);
  await context.route("https://x.com/**", (route) => route.fulfill({
    contentType: "text/html; charset=utf-8",
    body: `<main>
      <a id="title" href="https://t.co/title" title="https://example.org/full/path?q=a&amp;b=2#part">example.org/full…</a>
      <a id="http" href="http://t.co/http">http://example.org/path</a>
      <a id="late-text" href="https://t.co/text"><span></span></a>
      <a id="late-title" href="https://t.co/title">example.org/…</a>
      <a id="late-href">https://example.org/late</a>
    </main>`,
  }));
  const page = await context.newPage();
  const externalRequests = [];
  page.on("request", (request) => {
    if (new URL(request.url()).hostname !== "x.com") externalRequests.push(request.url());
  });
  await page.goto("https://x.com/home");
  assert.equal(await page.locator("#title").getAttribute("href"), "https://example.org/full/path?q=a&b=2#part");
  assert.equal(await page.locator("#http").getAttribute("href"), "http://example.org/path");
  await page.evaluate(() => {
    const span = document.querySelector("#late-text span");
    span.append(document.createTextNode("not ready"));
    document.querySelector("#late-title").title = "https://example.org/from-title";
    document.querySelector("#late-href").href = "https://t.co/late";
    const wrapper = document.createElement("div");
    wrapper.innerHTML = '<a id="inserted" href="https://t.co/new"><span>https://</span>example.org/new</a>';
    document.querySelector("main").append(wrapper);
  });
  await page.locator("#late-text span").evaluate((span) => {
    span.firstChild.data = "https://example.org/from-text";
  });
  for (const [id, url] of [
    ["late-text", "https://example.org/from-text"],
    ["late-title", "https://example.org/from-title"],
    ["late-href", "https://example.org/late"],
    ["inserted", "https://example.org/new"],
  ]) assert.equal(await page.locator(`#${id}`).getAttribute("href"), url, id);
  await page.locator("#inserted").evaluate((link) => {
    link.href = "https://t.co/redraw";
    link.textContent = "https://example.org/redrawn";
  });
  assert.equal(await page.locator("#inserted").getAttribute("href"), "https://example.org/redrawn");
  await page.locator("#inserted").evaluate((link) => { link.href = "https://t.co/restored"; });
  assert.equal(await page.locator("#inserted").getAttribute("href"), "https://example.org/redrawn");

  await page.locator("#inserted").evaluate((link) => { link.textContent = "https://example.org/text-update"; });
  assert.equal(await page.locator("#inserted").getAttribute("href"), "https://example.org/text-update", "text-only redraws must not leave stale destinations");
  await page.locator("#inserted").evaluate((link) => { link.textContent = "https://example.org/incomplete…"; });
  assert.equal(await page.locator("#inserted").getAttribute("href"), "https://t.co/restored", "fall back to the original short link when the destination becomes incomplete");
  await page.locator("#title").evaluate((link) => { link.title = "https://example.org/updated-title"; });
  assert.equal(await page.locator("#title").getAttribute("href"), "https://example.org/updated-title");
  await page.locator("#title").evaluate((link) => { link.href = "https://example.net/site-changed"; });
  assert.equal(await page.locator("#title").getAttribute("href"), "https://example.net/site-changed", "a new non-t.co href belongs to the site");

  // Removing validation must not turn partial text, editing content or non-t.co links into new targets.
  const unchanged = [
    ["https://t.co/short", "https://example.org/partial…"],
    ["https://t.co/dots", "https://example.org/partial..."],
    ["https://t.co/no-scheme", "example.org/path"],
    ["https://t.co/label", "Visit this website"],
    ["https://t.co/script", "javascript:alert(1)"],
    ["https://t.co/data", "data:text/html,hello"],
    ["https://t.co/userinfo", "https://example.org@evil.test/path"],
    ["https://t.co/space", "https://example.org/a b"],
    ["https://t.co/control", "https://exam\nple.org/path"],
    ["https://t.co/backslash", "https://example.org\\path"],
    ["https://t.co/invalid", "https://[invalid"],
    ["https://t.co/another", "https://t.co/other"],
    ["https://t.co.evil.test/path", "https://example.org/path"],
    ["https://example.net/original", "https://example.org/path"],
    ["/home", "https://example.org/path"],
  ];
  assert.deepEqual(await page.evaluate((cases) => {
    for (const [href, text] of cases) {
      const link = document.createElement("a");
      link.className = "unchanged";
      link.setAttribute("href", href);
      link.textContent = text;
      document.body.append(link);
    }
    const editor = document.createElement("div");
    editor.contentEditable = "true";
    editor.innerHTML = '<a class="unchanged" href="https://t.co/edit">https://example.org/edit</a>';
    document.body.append(editor);
    return new Promise((resolve) => requestAnimationFrame(() => resolve(
      [...document.querySelectorAll(".unchanged")].map((link) => link.getAttribute("href")),
    )));
  }, unchanged), [...unchanged.map(([href]) => href), "https://t.co/edit"]);
  assert.deepEqual(externalRequests, [], "resolving links must not make network requests");
});

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
  assert.equal(
    await popup.locator("header img").evaluate(async (image) => {
      await image.decode();
      return image.naturalWidth;
    }),
    128,
    "the provided extension logo must load in the actual popup",
  );
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

test("popup supports the selected X languages and falls back without inventing locales", {
  timeout: 90000,
}, async (t) => {
  for (const [browserLanguage, language, enabled] of [
    ["ja-JP", "ja", "変更を有効にする"],
    ["en-US", "en", "Enable modifications"],
    ["en-GB", "en-GB", "Enable modifications"],
    ["zh-CN", "zh-CN", "启用修改"],
    ["zh-TW", "zh-TW", "啟用修改"],
    ["zh-HK", "zh-TW", "啟用修改"],
    ["ko-KR", "ko", "변경 사항 적용"],
    ["es-MX", "es", "Activar cambios"],
    ["ru-RU", "ru", "Включить изменения"],
    ["uk-UA", "uk", "Увімкнути зміни"],
    ["fr-FR", "en", "Enable modifications"],
  ]) {
    const { context, popup } = await install(t, browserLanguage);
    assert.equal(
      await popup.locator("html").getAttribute("lang"),
      language,
      browserLanguage,
    );
    assert.equal(
      await popup.locator("[data-copy=enabled]").textContent(),
      enabled,
    );
    assert.equal(
      await popup.locator("[role=status]").getAttribute("data-state"),
      "ready",
    );
    assert.equal(
      await popup.evaluate(() =>
        [...document.querySelectorAll("[data-copy]")].every(
          (e) => e.textContent.trim() && e.textContent !== "undefined",
        ),
      ),
      true,
    );
    assert.equal(
      await popup.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
      true,
      `${language}: horizontal overflow`,
    );
    assert.ok(
      (await popup.locator("body").evaluate((e) => e.scrollHeight)) <= 600,
      `${language}: popup must fit the native height limit`,
    );
    await toggle(popup, "hideGrok", true);
    assert.equal(
      await popup.locator("[role=status]").getAttribute("data-state"),
      "saved",
    );
    await context.close();
  }
});

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
    <div id="placeholder" style="background-color: black"><svg id="brand"><path d="${xLogo}"></path></svg></div>
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
    assert.equal(
      await page
        .locator("#placeholder")
        .evaluate((node) => getComputedStyle(node).backgroundColor),
      feature === "bird" ? "rgb(0, 0, 0)" : "rgb(255, 255, 255)",
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
  assert.equal(
    await page
      .locator("#placeholder")
      .evaluate((node) => getComputedStyle(node).backgroundColor),
    "rgb(0, 0, 0)",
  );
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

test("Grok and floating-drawer options are independent and preserve ordinary chat, translation and user content", {
  timeout: 30000,
}, async (t) => {
  const { context, popup, popupURL } = await install(t);
  assert.equal(
    await popup
      .locator("input[name=hideGrok], input[name=hideDrawers]")
      .count(),
    2,
    "both optional visibility settings must exist",
  );
  for (const name of ["hideGrok", "hideDrawers"])
    assert.equal(await popup.locator(`input[name=${name}]`).isChecked(), false);
  await context.route("https://x.com/**", (route) =>
    route.fulfill({
      contentType: "text/html; charset=utf-8",
      body: `<!doctype html><html><body>
    <nav><a id="grok-nav" href="/i/grok">Grok</a><a id="chat-nav" href="/i/chat">Chat</a></nav>
    <div data-testid="tweet"><button id="grok-actions" aria-label="Grok actions">Grok</button>
      <button id="grok-ja" aria-label="Grokのアクション">Grok</button>
      <button id="summary" aria-label="Profile Summary">Summary</button>
      <a id="ask-grok" href="/i/grok?text=hello">Ask Grok</a>
      <div data-testid="followups_123">Suggested Grok prompts</div>
      <div data-testid="tweetText"><a id="user-link" href="/i/grok">Grok</a> I like Grok and Chat.</div>
    </div>
    <button id="icon-only"><svg><path d="M12.745 20.54l10.97-8.19"></path></svg></button>
    <div data-testid="UserCell" role="button" aria-label="Grok" id="user-cell">Grok</div>
    <button id="image" data-testid="grokImgGen">Generate image</button>
    <button id="translate" aria-label="Show translation">Show translation</button>
    <button id="follow" aria-label="Follow @Grok">Follow</button>
    <a id="grok-profile" href="/grok">Grok's profile</a>
    <div data-testid="messageEntry"><a id="message-link" href="/i/grok">Grok</a></div>
    <div data-testid="GrokDrawer"><button>Grok</button></div>
    <div data-testid="chat-drawer-root"><button>Chat</button></div>
    <div data-testid="DMDrawer"><button>Messages</button></div>
    </body></html>`,
    }),
  );
  const page = await context.newPage();
  await page.goto("https://x.com/home");
  assert.equal(
    await page.locator("#grok-ja").getAttribute("aria-label"),
    "Grokのアクション",
    "fixture encoding must preserve official labels",
  );
  const visible = async (selector) => {
    await page.waitForFunction(() =>
      document.documentElement.hasAttribute("data-twitter-bird-hide-grok"),
    );
    return page.locator(selector).isVisible();
  };
  await toggle(popup, "hideDrawers", true);
  assert.equal(
    await visible("[data-testid=GrokDrawer]"),
    true,
    "existing pages must not change before reload",
  );
  await page.reload();
  for (const id of ["GrokDrawer", "chat-drawer-root", "DMDrawer"])
    assert.equal(await visible(`[data-testid=${id}]`), false, id);
  for (const id of ["grok-nav", "chat-nav", "grok-actions"])
    assert.equal(await visible(`#${id}`), true, id);
  await toggle(popup, "hideDrawers", false);
  await toggle(popup, "hideGrok", true);
  await page.reload();
  for (const selector of [
    "#grok-nav",
    "#grok-actions",
    "#grok-ja",
    "#summary",
    "#ask-grok",
    "#image",
    "#icon-only",
    "[data-testid=GrokDrawer]",
    "[data-testid=followups_123]",
  ])
    assert.equal(await visible(selector), false, selector);
  for (const selector of [
    "#chat-nav",
    "#translate",
    "#follow",
    "#grok-profile",
    "#user-link",
    "#user-cell",
    "#message-link",
    "[data-testid=chat-drawer-root]",
    "[data-testid=DMDrawer]",
  ])
    assert.equal(await visible(selector), true, selector);
  await page.evaluate(() => {
    const button = document.createElement("button");
    button.id = "late-grok";
    button.setAttribute("aria-label", "Grok actions");
    document.body.append(button);
  });
  assert.equal(await visible("#late-grok"), false);
  await page.locator("#late-grok").evaluate((button) => {
    button.setAttribute("aria-label", "Follow @Grok");
    button.textContent = "Follow";
  });
  assert.equal(
    await visible("#late-grok"),
    true,
    "reused controls must not stay hidden",
  );
  await page.locator("#icon-only path").evaluate((path) => path.remove());
  assert.equal(
    await visible("#icon-only"),
    true,
    "removing a Grok icon must restore a reused button",
  );
  await page.evaluate(() => {
    const item = document.createElement("div");
    item.id = "role-only";
    item.setAttribute("role", "button");
    item.setAttribute("aria-label", "Grok actions");
    item.textContent = "Grok actions";
    document.body.append(item);
  });
  assert.equal(await visible("#role-only"), false);
  await page
    .locator("#role-only")
    .evaluate((node) => node.removeAttribute("role"));
  assert.equal(
    await visible("#role-only"),
    true,
    "a node that is no longer a control must not stay hidden",
  );
  // Visibility settings must still run if all original modification groups are off.
  await popup.evaluate(() =>
    chrome.storage.local.set({
      bird: false,
      terms: false,
      buttons: false,
      translation: false,
      title: false,
      hideGrok: true,
      hideDrawers: true,
    }),
  );
  await page.reload();
  assert.equal(await visible("#grok-nav"), false);
  assert.equal(await visible("[data-testid=chat-drawer-root]"), false);
  await popup.goto(popupURL);
  await popup.locator("input[name=enabled]:enabled").waitFor();
  assert.equal(await popup.locator("input[name=hideGrok]").isChecked(), true);
  assert.equal(
    await popup.locator("input[name=hideDrawers]").isChecked(),
    true,
  );
  await toggle(popup, "enabled", false);
  await page.reload();
  for (const selector of [
    "#grok-nav",
    "#grok-actions",
    "[data-testid=GrokDrawer]",
    "[data-testid=chat-drawer-root]",
  ])
    assert.equal(await visible(selector), true, selector);
});
