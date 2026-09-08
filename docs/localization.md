# Localization evidence

## Scope

The target is all display-language options offered by x.com, using each language's historical Twitter terminology. Coverage includes UI labels, detail headings, hover hints, native `title` and accessible labels, the translation-entry icon, and tab titles. User-authored text, display names and search queries must not be translated or rewritten.

Language resolution and translation-entry icon matching now have 45-locale implementation and regression fixtures. UI terminology and tab-title grammar remain English-only; the full language inventory is not a claim of complete multilingual support.

Public bundle URLs for every locale are recorded in `locale-sources.json`. Captured input labels live in `../test/fixtures/x-locales.json`. Canonical aliases confirmed in the first-party bundle map include `en-gb → en-GB`, `msa → ms`, `no → nb`, `zh-cn → zh`, and `zh-tw → zh-Hant`.

## Official language inventory

Observed on 2026-09-08 in the display-language selector at <https://x.com/settings/language>, without saving or changing the account language: **45 options**.

```text
ar ar-x-fm bn en-gb bg ca hr cs da nl en fil fi fr de el gu he hi hu
id it ja kn ko msa mr no fa pl pt ro ru sr zh-cn sk es sv ta th zh-tw
tr uk ur vi
```

Important variants: `ar-x-fm` is Arabic (Feminine), `en-gb` is British English, and `ur` is labelled Urdu (beta). Browser HTML language tags may differ in case or canonical form from the selector values; normalize aliases explicitly rather than silently assuming they are interchangeable.

Official help distinguishes display language from the language of posts and notes that Arabic (Feminine) is web-only:
<https://help.x.com/en/managing-your-account/how-to-change-language-settings>

## Current first-party message evidence

Observed public British English bundle:
<https://abs.twimg.com/responsive-web/client-web/i18n/en-GB.ea5b5bbca2646d13a.js>

Selected message identifiers in that snapshot:

| Identifier | Current English message |
| --- | --- |
| `df34a454` | Post |
| `f2919fb8` | Repost |
| `fd1e5446` | Undo repost |
| `dfad425d` | Repost count plus Repost action; generated function |
| `a386dc55` | Repost count plus Reposted state; generated function |
| `d92eb65e`, `jbde7c78` | Show translation |

The current bundle establishes current X wording, not historical Twitter wording. Historical replacement terms still need source checking per locale. Do not execute downloaded bundles as application code or infer safe string boundaries from English word-boundary rules.

Logged-out requests currently use a different `x-web` application; its bundles should not be assumed to describe the authenticated interface. Only public asset URLs and bounded language/message data belong in research artifacts, never account state or credentials.

## Historical English terminology evidence

Fetched directly from the official CDN, as text only:
<https://abs.twimg.com/responsive-web/client-web/i18n/en.90f24639.js>

| Historical identifier | Observed message |
| --- | --- |
| `bea869b4`, `bff6789c` | Tweet |
| `bab1f8b0` | Tweets |
| `bac8f4c2`, `d6c8514a` | Retweet |
| `d497b854` | Retweets |
| `g23ce6f0` | Retweeted |
| `fa9ce7f4`, `f3bbbb88` | Undo Retweet |
| `b4947556` | Translate Tweet |

These historical action identifiers differ from the current ones; looking up only current IDs in old bundles incorrectly reports missing labels. This resource confirms English terminology, not yet the other languages or an exact release date. The public capture used to discover its URL is <https://urlscan.io/result/127334b1-9691-419b-9474-0de62f268aa8/>; terminology evidence comes from the CDN response itself, not the capture's description.
