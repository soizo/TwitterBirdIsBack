# Source review and reproducible packaging

The extension uses plain JavaScript, HTML and CSS. Runtime files are in `extension/`; there is no transpilation, bundling, minification or runtime dependency installation.

## Reproduce the Firefox upload

Requirements: Python 3.10 or later. No network access or third-party Python packages are needed.

From the extracted source archive's root directory, run:

```sh
python3 scripts/package-extension.py --output releases
```

For version 0.1.4, the Firefox upload is `releases/twitter-bird-is-back-0.1.4-firefox-unsigned.zip`. The script copies the runtime files unchanged and adds the stable Firefox extension ID, minimum browser versions and no-data-collection declaration to `manifest.json`. ZIP timestamps and file order are fixed. `releases/SHA256SUMS` records the generated archive hashes.

`npm run build` only copies `extension/` into `dist/` for local browser loading and is not needed to reproduce the Firefox ZIP. The checked-in icons and locale catalog are shipped as-is; do not regenerate them for this reproduction. Their optional maintenance scripts and original assets are included for inspection.

## Tests

For the browser regression suite, install Node.js 22, npm, Google Chrome and Playwright Chromium:

```sh
npm ci
npx playwright install chromium
npm test
```

Playwright is a development-only dependency. Browser installation and dependency installation require network access; packaging does not.

## Changes in 0.1.4

- Restore the classic blue bird on the login/signup landing page, replacing the recognized multi-layer brand SVG as one artwork and updating its accessible label.
- Adapt the bird size and its container spacing for wide and narrow screens, preserving the site's light/dark theme and login controls.
- Restore Twitter branding in the fixed signup tab title, including titles partly changed by older extension versions.
- Handle dynamic logo insertion and redraws. These changes follow the existing bird and title switches independently; no new permissions or network requests are added.
- Regression fixtures cover both observed page structures, light/dark themes, three viewport widths, form values and events, redraws and switches. Saved-page visual checks are offline checks, not live Firefox/Android registration tests.

The source ZIP includes source, tests, documentation, package metadata and original assets. It excludes Git internals, installed dependencies, generated release packages and local runtime data.
