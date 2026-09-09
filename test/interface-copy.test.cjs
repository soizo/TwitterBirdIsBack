const assert = require('node:assert/strict');
const {test} = require('node:test');
const path = require('node:path');
const {chromium} = require('playwright');

test('known site-brand hints change without rewriting posts, profiles, drafts or links', async t => {
  const browser = await chromium.launch({channel:'chrome',headless:true});
  t.after(() => browser.close());
  const page = await browser.newPage();
  await page.setContent(`<main><span id="source">Sourced from across <b>X</b></span>
    <span id="welcome">New to X?</span><a id="login" href="https://x.com/login">Log in to X</a>
    <article data-testid="tweetText">Sourced from across X</article>
    <div data-testid="UserDescription">New to X?</div>
    <div contenteditable="true">Log in to X</div>
    <div role="alert">New to X?</div><span id="unknown">Alice mentioned X yesterday</span></main>`);
  await page.addScriptTag({path:path.resolve(__dirname,'../extension/classic-ui.js')});
  assert.equal(await page.locator('#source').textContent(),'Sourced from across Twitter');
  assert.equal(await page.locator('#source b').count(),1);
  assert.equal(await page.locator('#welcome').textContent(),'New to Twitter?');
  assert.equal(await page.locator('#login').textContent(),'Log in to Twitter');
  assert.equal(await page.locator('#login').getAttribute('href'),'https://x.com/login');
  for (const [selector,text] of [['article','Sourced from across X'],['[data-testid="UserDescription"]','New to X?'],['[contenteditable]','Log in to X'],['[role="alert"]','New to X?'],['#unknown','Alice mentioned X yesterday']]) {
    assert.equal(await page.locator(selector).textContent(),text);
  }
  await page.locator('#source').evaluate(el => {el.textContent='Sourced from across X';});
  assert.equal(await page.locator('#source').textContent(),'Sourced from across Twitter');
});

test('priority-language reply placeholders use their own historical prompts', async t => {
  const browser = await chromium.launch({channel:'chrome',headless:true});
  t.after(() => browser.close());
  for (const [language,current,historical] of [
    ['zh','发布你的回复','发布你的回复！'], ['zh-Hant','發佈你的回覆','推你的回覆！'],
    ['ja','返信をポスト','返信をツイートしましょう。'], ['ko','답글 게시하기','내 답글을 트윗하세요'],
    ['es','Postea tu respuesta','¡Twittea tu respuesta!'], ['ru','Опубликовать ответ','Твитните свой ответ!'],
    ['uk','Опублікувати відповідь','Твітніть свою відповідь!'],
  ]) {
    const page = await browser.newPage();
    await page.setContent(`<html lang="${language}"><div class="public-DraftEditorPlaceholder-inner">${current}</div></html>`);
    for (const file of ['locales.js','classic-locales.js','classic-ui.js'])
      await page.addScriptTag({path:path.resolve(__dirname,'../extension',file)});
    assert.equal(await page.locator('.public-DraftEditorPlaceholder-inner').textContent(),historical,language);
    await page.close();
  }
});

test('reply placeholders restore historical wording without touching draft text', async t => {
  const browser = await chromium.launch({channel:'chrome',headless:true});
  t.after(() => browser.close());
  const page = await browser.newPage();
  await page.setContent(`<div class="public-DraftEditorPlaceholder-inner">Post your reply</div>
    <div data-testid="tweetTextarea_0" contenteditable="true" aria-label="Post your reply" data-placeholder="Post your reply">Post your reply</div>
    <textarea data-testid="tweetTextarea_1" placeholder="Post your reply">Post your reply</textarea>
    <input placeholder="Post your reply" value="Post your reply">
    <article data-testid="tweetText"><span class="public-DraftEditorPlaceholder-inner">Post your reply</span></article>`);
  await page.addScriptTag({path:path.resolve(__dirname,'../extension/classic-ui.js')});
  assert.equal(await page.locator('body > .public-DraftEditorPlaceholder-inner').textContent(),'Tweet your reply!');
  assert.equal(await page.locator('[contenteditable]').getAttribute('aria-label'),'Tweet your reply!');
  assert.equal(await page.locator('[contenteditable]').getAttribute('data-placeholder'),'Tweet your reply!');
  assert.equal(await page.locator('textarea').getAttribute('placeholder'),'Tweet your reply!');
  assert.equal(await page.locator('[contenteditable]').textContent(),'Post your reply');
  assert.equal(await page.locator('textarea').inputValue(),'Post your reply');
  assert.equal(await page.locator('input').getAttribute('placeholder'),'Post your reply');
  assert.equal(await page.locator('article').textContent(),'Post your reply');
  await page.locator('[contenteditable]').evaluate(el => el.setAttribute('data-placeholder','Post your reply'));
  assert.equal(await page.locator('[contenteditable]').getAttribute('data-placeholder'),'Tweet your reply!');
});
