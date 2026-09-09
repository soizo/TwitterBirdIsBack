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

## English system notifications

The notification allowlist in `extension/classic-ui.js` contains 50 complete static messages checked against the current official English resource:
<https://abs.twimg.com/responsive-web/client-web/i18n/en.331b03849c5aabc8a.js>

Representative identifiers:

| Identifiers | Message family |
| --- | --- |
| `h4dd544e`, `eae9e604`, `gcdf3fd6`, `c7999d10` | Single/multiple posts sent, including edit-window notices |
| `f5d17674`, `h32b1ac4`, `d8e56f40` | Repost success and retry/limit errors |
| `c0554ca0`, `g922bf14` | Send failure and edit restrictions |
| `cce3f116`, `b593b396`, `b2542f56`, `i14d7a46` | Bookmark changes and retry errors |
| `d04f95c0`, `a2dd7414`, `a50c911e` | Pin/unpin/highlight notices |
| `ie4538b4`, `ad135a24`, `ee369efc`, `c3e7f572` | Pin/unpin replies and failures |
| `cca7fa72`, `d15af6da`, `a1e1b748`, `dbd8a566`, `c82be5a8`, `b38b254a`, `he2e3cc4` | Unsent/draft/scheduled deletion results |

New notification coverage is limited to `[data-testid="toast"]` and `[role="alert"]`. Complete-message matching avoids rewriting interpolated usernames in unknown alerts. Matching tolerates case, whitespace, apostrophe style, and a terminal punctuation mark without changing those in the displayed text. User-content exclusions still apply. This is coverage of the checked messages, not a guarantee about future or arbitrary notifications. Tests use local DOM fixtures; no posts were published to exercise the confirmation.

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
