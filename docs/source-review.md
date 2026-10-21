# Source review and reproducible packaging

The extension uses plain JavaScript, HTML and CSS. Runtime files are in `extension/`; there is no transpilation, bundling, minification or runtime dependency installation.

## Reproduce the Firefox upload

Requirements: Python 3.10 or later. No network access or third-party Python packages are needed.

From the extracted source archive's root directory, run:

```sh
python3 scripts/package-extension.py --output releases
```

For version 0.1.7, the Firefox upload is `releases/twitter-bird-is-back-0.1.7-firefox-unsigned.zip`. The script copies the runtime files unchanged and adds the stable Firefox extension ID, minimum browser versions and no-data-collection declaration to `manifest.json`. ZIP timestamps and file order are fixed. `releases/SHA256SUMS` records the generated archive hashes.

`npm run build` only copies `extension/` into `dist/` for local browser loading and is not needed to reproduce the Firefox ZIP. The checked-in icons and locale catalog are shipped as-is; do not regenerate them for this reproduction. Their optional maintenance scripts and original assets are included for inspection.

## Tests

For the browser regression suite, install Node.js 22, npm, Google Chrome and Playwright Chromium:

```sh
npm ci
npx playwright install chromium
npm test
```

Playwright is a development-only dependency. Browser installation and dependency installation require network access; packaging does not.

## Changes in 0.1.5

- Add a Twemoji font option, enabled by default and controlled independently by the existing settings system. The master switch also disables it; changes apply after refreshing Twitter.
- Bundle the unchanged Twemoji 17.0.3 COLRv0 font from https://github.com/10ta/twemoji-color-font/releases/tag/v17.0.3, with provenance, SHA-256 and CC BY 4.0 / MIT license files in extension/fonts/. No font is fetched from the network while browsing.
- Apply the font to Unicode emoji in existing and dynamic text and editable fields, keeping text nodes and original ordinary-text font stacks. Emoji images remain unchanged.
- Add popup translations and compact option spacing to keep the popup within the native height limit.
- Expose only the bundled font file to the existing Twitter host matches; no new permissions or data collection.
- All 36 browser regression tests passed using installed Helium in an isolated profile, including bundled font decoding, dynamic text, saved settings, refresh behavior, and the master switch. This does not claim live Firefox or Android verification.

The source ZIP includes source, tests, documentation, package metadata and original assets. It excludes Git internals, installed dependencies, generated release packages and local runtime data.

## 0.1.6 changes

Restore Twitter in the Discover more recommendation subtitle, including the reported Simplified Chinese wording. Identify this bounded module using its direct subtitle/heading structure and official heading d172116a in all 45 display languages; leave protected user content and unrelated headings alone. Local Chromium fixtures verify all 45 heading variants, split text and dynamic updates. This does not claim live-account subtitle verification in every language.

## 0.1.7 changes

Split website localization into detailed terminology for English/British English, Simplified/Traditional Chinese, Japanese, Korean and Vietnamese, and brand-only restoration for other languages. Vietnamese uses verified historical bundle `vi.58b1d9da.js`. Replace the heading-specific branding workaround with context-aware brand matching across interface text and accessibility hints. Preserve text-node positions, protected user content, close glyphs, account links, handles, URLs and larger words. All 45 languages use first-party title grammar to keep names and quoted posts untouched. Popup languages and permissions are unchanged.
