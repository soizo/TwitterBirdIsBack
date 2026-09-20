# Source review and reproducible packaging

The extension uses plain JavaScript, HTML and CSS. Runtime files are in `extension/`; there is no transpilation, bundling, minification or runtime dependency installation.

## Reproduce the Firefox upload

Requirements: Python 3.10 or later. No network access or third-party Python packages are needed.

From the extracted source archive's root directory, run:

```sh
python3 scripts/package-extension.py --output releases
```

For version 0.1.3, the Firefox upload is `releases/twitter-bird-is-back-0.1.3-firefox-unsigned.zip`. The script copies the runtime files unchanged and adds the stable Firefox extension ID, minimum browser versions and no-data-collection declaration to `manifest.json`. ZIP timestamps and file order are fixed. `releases/SHA256SUMS` records the generated archive hashes.

`npm run build` only copies `extension/` into `dist/` for local browser loading and is not needed to reproduce the Firefox ZIP. The checked-in icons and locale catalog are shipped as-is; do not regenerate them for this reproduction. Their optional maintenance scripts and original assets are included for inspection.

## Tests

For the browser regression suite, install Node.js 22, npm, Google Chrome and Playwright Chromium:

```sh
npm ci
npx playwright install chromium
npm test
```

Playwright is a development-only dependency. Browser installation and dependency installation require network access; packaging does not.

## Changes in 0.1.3

- Actual link is enabled by default, with an independent localized popup switch.
- Complete HTTP(S) URLs from a link's title or text replace `t.co` destinations locally, including dynamically rendered links. No short-link requests or extra permissions are used.
- Incomplete or unsupported destinations are left alone. Direct links bypass the short-link redirect and its possible warnings; destinations supplied by the page are not independently verified.
- Popup spacing accommodates the additional control within the browser's height limit.

The source ZIP includes source, tests, documentation, package metadata and original assets. It excludes Git internals, installed dependencies, generated release packages and local runtime data.
