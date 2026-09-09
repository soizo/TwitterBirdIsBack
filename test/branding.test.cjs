const assert = require("node:assert/strict");
const {test} = require("node:test");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const extension = path.resolve(__dirname, "../extension");

test("extension branding uses Twitter wording and complete square icon assets", () => {
  const manifest = require("../extension/manifest.json");
  const context = vm.createContext({});
  vm.runInContext(fs.readFileSync(path.join(extension,"popup-locales.js"),"utf8"),context);
  const ownCopy = [manifest.name, manifest.description, manifest.action.default_title,
    ...Object.values(context.TwitterBirdPopupMessages).flatMap(Object.values),
    fs.readFileSync(path.join(extension,"popup.html"),"utf8").replace(/<[^>]*>/g,"")].join("\n");
  assert.doesNotMatch(ownCopy,/\bX\b|x\.com/i,"visible extension copy must use Twitter, not the renamed brand");
  assert.ok(manifest.content_scripts[0].matches.includes("https://x.com/*"), "real internal domain matching must remain intact");
  for (const size of [16,32,48,128]) {
    assert.equal(manifest.icons?.[size],manifest.action.default_icon?.[size]);
    assert.ok(manifest.icons?.[size], `${size}px icon must be declared`);
    const png = fs.readFileSync(path.join(extension,manifest.icons[size]));
    assert.equal(png.subarray(0,8).toString("hex"),"89504e470d0a1a0a");
    assert.equal(png.readUInt32BE(16),size);
    assert.equal(png.readUInt32BE(20),size);
  }
});
