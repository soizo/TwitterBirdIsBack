# Twitter Bird Is Back _(TwitterBirdIsBack / twitter-bird-is-back)_

Restore the classic Twitter bird, terminology, and blue buttons in Chrome and Firefox.

Bring back the familiar Twitter interface and optionally hide Grok entry points and the floating Grok and Chat panel. The extension does not change how posting, following, or translation works. The repository is named `TwitterBirdIsBack`, while the development package uses the hyphenated name `twitter-bird-is-back`; both refer to the same browser extension.

## Table of contents

- [Install](#install)
- [Usage](#usage)
- [Features and settings](#features-and-settings)
- [Language support](#language-support)
- [Privacy and permissions](#privacy-and-permissions)
- [Known limitations](#known-limitations)
- [Development documentation](#development-documentation)
- [Maintainer](#maintainer)
- [Contributing](#contributing)
- [License](#license)

## Install

### Firefox

Install [Twitter Bird Is Back from Mozilla Add-ons](https://addons.mozilla.org/firefox/addon/twitter-bird-is-back/) to receive signed releases and automatic updates.

Firefox 140 or later is required on desktop. The unsigned ZIP cannot be installed permanently in a standard Firefox release; use the store version or the temporary installation method below.

### Chrome, Chromium, and temporary Firefox installation

Download or clone this repository, then build the extension with Node.js and npm:

```sh
git clone https://github.com/soizo/TwitterBirdIsBack.git
cd TwitterBirdIsBack
npm ci
npm run build
```

- **Chrome or Chromium:** Open `chrome://extensions`, enable Developer mode, select "Load unpacked", and choose the generated `dist/` directory. Keep that directory in place while the extension is installed.
- **Temporary Firefox installation:** Open `about:debugging#/runtime/this-firefox`, select "Load Temporary Add-on", and choose `dist/manifest.json`. You must load it again after restarting Firefox.

After updating the source, run `npm ci` and `npm run build` again. Reload the extension from your browser's extension management page, then refresh Twitter. Do not uninstall and reinstall it to update, as doing so may erase your settings.

## Usage

```text
Open Twitter → Select the extension in the browser toolbar → Choose your settings → Refresh Twitter
```

Changes are saved as soon as you select them. Existing pages need a manual refresh, while newly opened pages use the latest settings. The extension does not refresh the page or clear anything you are editing. Turning off the main switch pauses all changes without clearing individual selections.

## Features and settings

| Feature | Default |
| --- | --- |
| Restore the bird logo and site icon | On |
| Restore classic Tweet and Retweet terminology | On |
| Restore classic blue buttons | On |
| Restore the globe icon for translation | On |
| Restore Twitter tab titles | On |
| Actual link: replace short links with complete page-supplied URLs | On |
| Hide all recognized Grok entry points | Off |
| Hide the floating Grok and Chat panel | Off |

The two hiding options work independently. "Hide all recognized Grok entry points" does not block network traffic or prevent direct access to Grok, and it leaves normal translation controls and user content intact. "Hide the floating Grok and Chat panel" does not hide the standard chat navigation item.

**Actual link** replaces `t.co` links with a complete HTTP(S) URL from the link's `title` or text, including dynamically loaded links. It preserves the displayed text and opening behavior. Incomplete or unsupported URLs are left unchanged; it does not fetch short links or guess missing parts. Destinations come from the page and are not independently verified. Direct links bypass the `t.co` redirect and any warnings it might show; turn this option off if you prefer the original links.

The classic bird appears on Twitter pages, including the login/signup landing page. Its signup artwork scales down on narrow screens while preserving the site's light/dark theme and login controls. The tab-title setting also restores the fixed signup slogan's Twitter branding. The laser-eye bird is limited to the browser toolbar, extension management page, and popup.

## Language support

The extension supports English, British English, Simplified Chinese, Traditional Chinese, Japanese, Korean, Spanish, Russian, and Ukrainian.

- Interface terminology follows the language selected on Twitter. Unsupported languages retain the site's current terminology.
- The popup follows the browser language. Unsupported languages fall back to English.
- The translation icon recognizes additional languages, but this does not mean that all interface terminology is supported in those languages.

## Privacy and permissions

The extension processes pages locally and does not send user data anywhere. It uses the `storage` permission to save settings in the current browser. Settings are not synchronized across devices. Site access is used to modify interface elements on Twitter pages.

The extension does not perform page-wide text replacement. It skips post content, recognized profile areas, and text inputs. This privacy statement does not cover network requests made by Twitter itself.

## Known limitations

- Changes to Twitter's interface may break some icon, terminology, or hiding rules.
- The restored site icon does not retain Twitter's unread badge. Unread counts in tab titles remain intact.
- Unrecognized brand icon shapes are not covered. The recognized signup logo is restored after dynamic redraws.
- Firefox compatibility and the appearance of the site icon in browser tabs still need manual verification. The declared minimum Android version is 142, but the extension has not been tested on an Android device.

## Development documentation

- [Development and maintenance guide](docs/development.md): implementation boundaries, source locations, tests, builds, and release procedures.
- [Localization verification notes](docs/localization.md): coverage, limitations, and official sources.

## Maintainer

[Soizo](https://github.com/soizo).

## Contributing

Use [GitHub Issues](https://github.com/soizo/TwitterBirdIsBack/issues) for questions, suggestions, and bug reports. Pull requests are welcome.

When reporting an interface problem, include your browser version, Twitter language, relevant settings, and reproduction steps. Remove private information from screenshots. Code contributions should follow the [development and maintenance guide](docs/development.md), pass the relevant tests, and build `dist/`. Do not commit generated builds or caches.

## License

[MIT](LICENSE) © 2026 Soizo.
