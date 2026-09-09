const assert = require("node:assert/strict");
const {test} = require("node:test");
const path = require("node:path");
const {chromium} = require("playwright");
const manifest = require("../extension/manifest.json");

async function inject(page) {
  // Exercise the shipped script order; settings/storage are covered by popup tests.
  for (const file of manifest.content_scripts[0].js.filter(file => file !== "settings.js")) {
    await page.addScriptTag({path:path.resolve(__dirname, "../extension", file)});
  }
}

test("Simplified Chinese restores sourced controls and split notifications without changing user content", async t => {
  const browser = await chromium.launch({channel:"chrome", headless:true});
  t.after(() => browser.close());
  const page = await browser.newPage();
  await page.route("https://x.com/**", route => route.fulfill({contentType:"text/html; charset=utf-8", body:`<!doctype html>
    <html lang="zh-CN"><head><title>(8) X 上的 Post Malone：“X 帖子” / X</title></head><body>
    <div data-testid="primaryColumn"><h2 role="heading">帖子</h2></div>
    <button id="post" title="发帖" aria-label="发帖"><svg width="10" height="10"></svg><span>发帖</span></button>
    <button id="undo" aria-label="撤销转帖"><span>撤销</span><span>转帖</span></button>
    <button id="count" aria-label="7 次转帖。转帖">7</button>
    <div role="alert"><span id="notice">你的<span>帖子</span>已发送。</span><a id="view" href="#">查看</a></div>
    <div role="alert" id="unknown-notice"><span>帖子</span> X 的未知通知</div>
    <button id="unknown-control">Post Malone</button>
    <div data-testid="tweetText" id="user-text">帖子 转帖 Post X</div>
    <div data-testid="User-Name" id="user-name">Post Malone</div>
    <input value="帖子 Post X">
    </body></html>`}));
  await page.goto("https://x.com/name/status/123");
  await page.locator("#view").evaluate(node => node.addEventListener("click", event => {event.preventDefault(); document.body.dataset.clicked="yes";}));
  await inject(page);
  assert.equal(await page.locator("#post").textContent(), "推文");
  assert.equal(await page.locator("#post").getAttribute("title"), "推文");
  assert.equal(await page.locator("#post").getAttribute("aria-label"), "推文");
  assert.equal(await page.locator("#post svg").count(), 1, "icons must not be flattened");
  assert.equal(await page.locator("h2").textContent(), "推文");
  assert.equal(await page.locator("#undo").textContent(), "撤销转推");
  assert.equal(await page.locator("#count").getAttribute("aria-label"), "7 转推。转推");
  assert.equal(await page.locator("#notice").textContent(), "你的推文已发送。");
  assert.equal(await page.locator("#unknown-notice").textContent(), "帖子 X 的未知通知");
  assert.equal(await page.locator("#unknown-control").textContent(), "Post Malone");
  assert.equal(await page.locator("#user-text").textContent(), "帖子 转帖 Post X");
  assert.equal(await page.locator("#user-name").textContent(), "Post Malone");
  assert.equal(await page.locator("input").inputValue(), "帖子 Post X");
  assert.equal(await page.title(), '(8) Post Malone 在 Twitter: "X 帖子" / Twitter');
  await page.locator("#view").click();
  assert.equal(await page.locator("body").getAttribute("data-clicked"), "yes");
});

test("priority locales preserve nouns, verbs, counted states, title grammar and dynamic updates", {timeout:60000}, async t => {
  const browser = await chromium.launch({channel:"chrome", headless:true});
  t.after(() => browser.close());
  // Expected strings are independently recorded from the sources in docs/localization.md.
  for (const fixture of require('./fixtures/priority-classic.json')) {
    const page = await browser.newPage();
    await page.route('https://x.com/**', route => route.fulfill({contentType:'text/html; charset=utf-8',body:`<!doctype html><html><head><title>X</title></head><body>
      <div data-testid="primaryColumn"><h2 id="heading" role="heading"></h2></div>
      <button id="post"><span></span></button><button id="undo"></button><button id="count">23</button>
      <div id="tab" role="tab"></div><div id="tooltip" role="tooltip"></div><div id="notice" role="alert"></div>
      <div id="user" data-testid="tweetText">Post X</div><button id="sports">ポストシーズン</button>
      </body></html>`}));
    await page.goto('https://x.com/name/status/123');
    await page.evaluate(f => {
      document.documentElement.lang = f.language;
      document.title = '(2) ' + f.title[0];
      document.querySelector('#post span').textContent=f.post[0];
      document.querySelector('#post').setAttribute('title',f.post[0]);
      for (const key of ['heading','undo','notice']) document.querySelector('#'+key).textContent=f[key][0];
      document.querySelector('#tab').textContent=f.heading[0];
      document.querySelector('#tooltip').textContent=f.undo[0];
      document.querySelector('#count').setAttribute('aria-label',f.count[0]);
    },fixture);
    await inject(page);
    for (const key of ['post','heading','undo','notice']) assert.equal(await page.locator('#'+key).textContent(),fixture[key][1],fixture.language+':'+key);
    assert.equal(await page.locator('#tab').textContent(),fixture.heading[1],fixture.language+':tab noun');
    assert.equal(await page.locator('#tooltip').textContent(),fixture.undo[1],fixture.language+':tooltip');
    assert.equal(await page.locator('#post').getAttribute('title'),fixture.post[1]);
    assert.equal(await page.locator('#count').getAttribute('aria-label'),fixture.count[1],fixture.language+':count');
    assert.equal(await page.title(),'(2) '+fixture.title[1],fixture.language+':title');
    assert.equal(await page.locator('#user').textContent(),'Post X');
    assert.equal(await page.locator('#sports').textContent(),'ポストシーズン');
    await page.evaluate(f => {
      document.querySelector('#post span').firstChild.data=f.post[0];
      document.querySelector('#count').setAttribute('aria-label',f.count[0]);
      const late=document.createElement('button');late.id='late';late.textContent=f.undo[0];document.body.append(late);
    },fixture);
    assert.equal(await page.locator('#post').textContent(),fixture.post[1]);
    assert.equal(await page.locator('#count').getAttribute('aria-label'),fixture.count[1]);
    assert.equal(await page.locator('#late').textContent(),fixture.undo[1]);
    await page.close();
  }
});

test("unimplemented languages keep their wording, late language selection works, and profile headings remain names", async t => {
  const browser=await chromium.launch({channel:'chrome',headless:true});t.after(()=>browser.close());
  const page=await browser.newPage();
  await page.route('https://x.com/**',route=>route.fulfill({contentType:'text/html; charset=utf-8',body:`<!doctype html><html lang="fr"><head><title>Post / X</title></head><body>
    <div data-testid="primaryColumn"><h2 role="heading">ポスト</h2></div>
    <button id="post">Post</button><button id="count"></button>
    <div role="alert" id="unknown">Post Malone sent a post.</div>
    </body></html>`}));
  await page.goto('https://x.com/Alice');await inject(page);
  assert.equal(await page.locator('#post').textContent(),'Post');
  assert.equal(await page.locator('#unknown').textContent(),'Post Malone sent a post.');
  assert.equal(await page.title(),'Post / Twitter','generic site branding must not regress outside the priority locales');
  await page.evaluate(()=>{document.documentElement.lang='ja';document.querySelector('#post').textContent='ポスト';});
  assert.equal(await page.locator('#post').textContent(),'ツイートする');
  assert.equal(await page.locator('h2').textContent(),'ポスト','a profile display name is not a detail heading');
  for (const name of ['constructor', '__proto__', 'toString']) {
    await page.evaluate(name => {document.title=name+' / X';}, name);
    assert.equal(await page.title(),name+' / Twitter','object property names are still user text');
  }
  for (const [code, cases] of [
    ['ru', [['1','репост','ретвит'],['2','репоста','ретвита'],['5','репостов','ретвитов'],['11','репостов','ретвитов'],['21','репост','ретвит'],['1 002','репоста','ретвита']]],
    ['uk', [['1','репост','ретвіт'],['2','репости','ретвіти'],['5','репостів','ретвітів'],['11','репостів','ретвітів'],['21','репост','ретвіт']]],
  ]) {
    for (const [count, current, classic] of cases) {
      await page.evaluate(({code,count,current})=>{document.documentElement.lang=code;document.querySelector('#count').setAttribute('aria-label',`${count} ${current}. ${code==='ru'?'Сделан репост':'Зроблено репост'}`);},{code,count,current});
      assert.equal(await page.locator('#count').getAttribute('aria-label'),`${count} ${classic}. ${code==='ru'?'Ретвитнуто':'Ретвітнуто'}`);
    }
  }
});
