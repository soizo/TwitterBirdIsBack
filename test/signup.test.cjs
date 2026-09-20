const assert = require("node:assert/strict");
const { test } = require("node:test");
const path = require("node:path");
const { chromium } = require("playwright");

// The shared 480×490 brand path from the six supplied light/dark signup snapshots.
// Keep only the logo and layout scaffolding, not saved scripts or user/session data.
const signupX = "M285.38 207.711L462.954 1.5H420.874L266.687 180.55L143.538 1.5H1.50003L187.726 272.256L1.50003 488.5H43.5818L206.408 299.417L336.462 488.5H478.5L285.37 207.711H285.38ZM227.743 274.641L208.875 247.68L58.7444 33.147H123.379L244.536 206.282L263.405 233.243L420.894 458.292H356.259L227.743 274.652V274.641Z";
const birdPrefix = "M23.643 4.937";
const script = (name) => path.resolve(__dirname, `../extension/${name}`);

function logo(dark, label = true) {
  return `<svg ${label ? 'aria-label="X" role="img"' : ''} viewBox="0 0 480 490" style="width:100%;max-width:480px;height:auto">
    <defs><linearGradient id="edge"><stop stop-color="white"/></linearGradient></defs>
    <path fill="${dark ? 'black' : '#222222'}" d="${signupX}"/>
    <path fill="none" stroke="url(#edge)" stroke-width="3" d="${signupX}"/>
    ${dark ? `<path fill="none" stroke="white" opacity="0.2" d="${signupX}"/>` : ''}
  </svg>`;
}

function fixture(dark, modern) {
  return `<!doctype html><html lang="en-GB"><head><title>X. It’s what’s happening / Twitter</title>
    <style>
      * { box-sizing:border-box } body { margin:0; background:${dark ? '#000' : '#fff'}; color:${dark ? '#fff' : '#000'} }
      main { display:flex; min-height:100vh; gap:32px; padding:24px }
      form { flex:1; min-width:0 } input { max-width:100% }
      .brand { flex:1; display:flex; justify-content:flex-end; align-items:center; overflow:hidden; min-height:45vh }
      .compact { display:none }
      @media(max-width:850px) { main { flex-direction:column } .wide { display:none } .compact { display:flex } }
    </style></head><body><main>
    <form><div class="compact mb-4 flex justify-center min-[851px]:hidden">${modern ? logo(dark) : ''}</div>
      <h1>Happening now.</h1><input aria-label="Email or username"><button type="button">Continue</button>
      <svg id="provider" viewBox="0 0 24 24"><path d="M1 1h10v10z"/></svg>
    </form>
    <div class="brand ${modern ? 'wide hidden min-[851px]:flex' : ''}" style="min-height:45vh;overflow:hidden;justify-content:flex-end">${logo(dark, modern)}</div>
    </main><div data-testid="tweetText" id="user-content">${logo(dark)}</div></body></html>`;
}

test("signup logos use one classic blue bird across themes, layouts and widths without changing the form", async (t) => {
  const browser = await chromium.launch({ channel: "chrome", headless: true });
  t.after(() => browser.close());
  for (const dark of [false, true]) {
    for (const modern of [false, true]) {
      for (const width of [1440, 800, 414]) {
        const page = await browser.newPage({ viewport: { width, height: 900 } });
        await page.setContent(fixture(dark, modern));
        await page.addStyleTag({ path: script("classic-ui.css") });
        await page.locator("input").fill("keep@example.org");
        await page.evaluate(() => {
          document.querySelector("button").addEventListener("click", () => document.body.dataset.clicked = "yes");
        });
        await page.addScriptTag({ path: script("content.js") });
        await page.addScriptTag({ path: script("title.js") });
        assert.equal(await page.title(), "Twitter. It’s what’s happening / Twitter");
        for (const svg of await page.locator("main svg:not(#provider)").all()) {
          assert.equal(await svg.getAttribute("viewBox"), "0 0 24 24");
          assert.equal(await svg.getAttribute("aria-label"), "Twitter");
          assert.equal(await svg.locator("path").count(), 1, "remove all old effect layers");
          assert.equal(await svg.locator("defs").count(), 0);
          assert.ok((await svg.locator("path").getAttribute("d")).startsWith(birdPrefix));
          assert.equal(await svg.locator("path").evaluate(p => getComputedStyle(p).fill), "rgb(29, 161, 242)");
          if (await svg.isVisible()) {
            const box = await svg.boundingBox();
            assert.ok(box.width > 0 && box.width <= (width <= 850 ? 96 : 360), `bird must fit ${width}px viewport`);
            if (width <= 850) {
              assert.ok(await svg.evaluate(s => s.parentElement.getBoundingClientRect().height < 160), "no giant narrow-screen logo spacer");
            }
          }
        }
        assert.equal(await page.locator("#provider path").getAttribute("d"), "M1 1h10v10z");
        assert.equal(await page.locator("#user-content svg").getAttribute("viewBox"), "0 0 480 490", "do not rewrite user content");
        assert.equal(await page.locator("input").inputValue(), "keep@example.org");
        await page.locator("button").click();
        assert.equal(await page.locator("body").getAttribute("data-clicked"), "yes");
        assert.equal(await page.locator("body").evaluate(b => getComputedStyle(b).backgroundColor), dark ? "rgb(0, 0, 0)" : "rgb(255, 255, 255)");
        await page.close();
      }
    }
  }
});

test("signup logos recover after insertion, path redraw and viewBox reset; existing switches remain independent", async (t) => {
  const browser = await chromium.launch({ channel: "chrome", headless: true });
  t.after(() => browser.close());
  const page = await browser.newPage();
  await page.setContent('<html lang="en-GB"><head><title>X. It’s what’s happening / X</title></head><body><main></main></body></html>');
  await page.addScriptTag({ path: script("content.js") });
  await page.evaluate(html => { document.querySelector("main").innerHTML = `<div>${html}</div>`; }, logo(true));
  assert.equal(await page.locator("svg").getAttribute("viewBox"), "0 0 24 24");
  await page.locator("svg path").evaluate((p, d) => p.setAttribute("d", d), signupX);
  assert.ok((await page.locator("svg path").getAttribute("d")).startsWith(birdPrefix));
  await page.locator("svg").evaluate(s => s.setAttribute("viewBox", "0 0 480 490"));
  assert.equal(await page.locator("svg").getAttribute("viewBox"), "0 0 24 24");
  await page.locator("svg").evaluate(s => { s.innerHTML = '<path d="M0 0h5"/>'; });
  assert.ok((await page.locator("svg path").getAttribute("d")).startsWith(birdPrefix));
  await page.close();

  for (const settings of [
    { enabled: false, bird: true, title: true },
    { enabled: true, bird: false, title: true },
    { enabled: true, bird: true, title: false },
  ]) {
    const p = await browser.newPage();
    await p.setContent(fixture(false, false));
    await p.evaluate(values => { globalThis.TwitterBirdSettings = { load: async () => values }; }, settings);
    await p.addScriptTag({ path: script("content.js") });
    await p.addScriptTag({ path: script("title.js") });
    assert.equal(await p.locator("main .brand svg").getAttribute("viewBox"), settings.enabled && settings.bird ? "0 0 24 24" : "0 0 480 490");
    assert.equal(await p.title(), settings.enabled && settings.title ? "Twitter. It’s what’s happening / Twitter" : "X. It’s what’s happening / Twitter");
    await p.close();
  }
});
