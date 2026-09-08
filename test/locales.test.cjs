const assert = require("node:assert/strict");
const { test } = require("node:test");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const observed = require("./fixtures/x-locales.json");

// Fixtures are captured from X's selector and official bundles, not implementation output.
test("all 45 display languages and their HTML language aliases resolve correctly", () => {
  const context = vm.createContext({});
  vm.runInContext(
    fs.readFileSync(path.resolve(__dirname, "../extension/locales.js"), "utf8"),
    context,
  );
  const registry = context.TwitterBirdLocales;
  assert.ok(
    registry,
    "locale registry must be available to the content scripts",
  );
  for (const locale of observed) {
    for (const code of [
      locale.code,
      locale.language,
      locale.language.toUpperCase(),
    ]) {
      assert.equal(registry.resolve(code)?.language, locale.language, code);
    }
  }
  for (const [code, expected] of [
    ["zh-Hans-CN", "zh"],
    ["zh-Hant-HK", "zh-Hant"],
    ["en-US", "en"],
    ["pt-BR", "pt"],
    ["nb-NO", "nb"],
    ["ms-MY", "ms"],
    ["ar-x-fm", "ar-x-fm"],
  ])
    assert.equal(registry.resolve(code)?.language, expected, code);
  assert.equal(registry.resolve("not-a-language"), null);
  assert.equal(registry.resolve(""), null);
});
