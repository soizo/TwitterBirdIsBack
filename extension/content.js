(async () => {
  const settings = globalThis.TwitterBirdSettings
    ? await globalThis.TwitterBirdSettings.load().catch(() => null)
    : { enabled: true, bird: true, buttons: true, translation: true };
  for (const [attribute, key] of [
    ["buttons", "buttons"],
    ["hide-grok", "hideGrok"],
    ["hide-drawers", "hideDrawers"],
    ["hide-edit-image", "hideEditImage"],
  ]) {
    document.documentElement.setAttribute(
      `data-twitter-bird-${attribute}`,
      settings?.enabled && settings[key] ? "on" : "off",
    );
  }
  if (
    !settings?.enabled ||
    (!settings.bird && !settings.translation && !settings.hideGrok)
  )
    return;

  const interactive = 'a[href], button, [role="button"], [role="menuitem"]';
  const entryCandidates = `${interactive}, [data-twitter-bird-grok-entry]`;
  const userContent =
    '[data-testid="tweetText"], [data-testid="User-Name"], [data-testid="UserName"], [data-testid="UserDescription"], [data-testid="UserCell"], input, textarea, select, [contenteditable]:not([contenteditable="false"])';

  function markGrokEntry(element) {
    if (!element) return;
    const label =
      element.getAttribute("aria-label") ||
      element.getAttribute("title") ||
      element.textContent;
    let grok = false;
    if (
      element.matches(interactive) &&
      !element.closest(userContent) &&
      !globalThis.TwitterBirdLocales?.isTranslationLabel(label)
    ) {
      if (element.matches("a[href]")) {
        // /grok is a user profile, not the /i/grok AI route.
        const interfaceLink =
          element.matches('[role="button"], [role="menuitem"]') ||
          element.closest(
            'nav, [role="navigation"], [role="menu"], [data-testid="tweet"], [data-testid="HoverCard"], [data-testid="sidebarColumn"]',
          );
        grok =
          !!interfaceLink &&
          (/^(?:https:\/\/(?:www\.)?x\.com)?\/i\/grok(?:[/?#]|$)/.test(
            element.getAttribute("href"),
          ) ||
            /^https:\/\/(?:www\.)?grok\.com(?:[/?#]|$)/.test(
              element.getAttribute("href"),
            ));
      } else {
        // ponytail: observed Grok SVG prefix; add verified variants if X changes its artwork.
        grok =
          element.getAttribute("data-testid") === "grokImgGen" ||
          !!globalThis.TwitterBirdLocales?.isGrokLabel(label) ||
          !!element.querySelector('svg path[d^="M12.745 20.54l10.97-8.19"]');
      }
    }
    element.toggleAttribute("data-twitter-bird-grok-entry", grok);
  }

  function markGrokEntries(root) {
    markGrokEntry(root.closest(entryCandidates));
    for (const element of root.querySelectorAll(entryCandidates))
      markGrokEntry(element);
  }

  const xLogo =
    "M21.742 21.75l-7.563-11.179 7.056-8.321h-2.456l-5.691 6.714-4.54-6.714H2.359l7.29 10.776L2.25 21.75h2.456l6.035-7.118 4.818 7.118h6.191-.008zM7.739 3.818L18.81 20.182h-2.447L5.29 3.818h2.447z";
  const bird =
    "M23.643 4.937a9.65 9.65 0 0 1-2.825.775 4.958 4.958 0 0 0 2.163-2.723 9.99 9.99 0 0 1-3.127 1.195 4.916 4.916 0 0 0-8.384 4.482A13.944 13.944 0 0 1 1.64 3.162a4.916 4.916 0 0 0 1.523 6.558 4.903 4.903 0 0 1-2.229-.616v.061a4.917 4.917 0 0 0 3.946 4.818 4.935 4.935 0 0 1-2.224.084 4.923 4.923 0 0 0 4.6 3.419A9.869 9.869 0 0 1 0 19.523a13.94 13.94 0 0 0 7.548 2.212c9.057 0 14.01-7.503 14.01-14.01 0-.213-.005-.425-.014-.636a10.012 10.012 0 0 0 2.46-2.548l-.047-.02z";

  const GLOBE_PATH =
    "M18 0C8.059 0 0 8.059 0 18s8.059 18 18 18 18-8.059 18-18S27.941 0 18 0z" +
    "M2.05 19h3.983c.092 2.506.522 4.871 1.229 7H4.158c-1.207-2.083-1.95-4.459-2.108-7z" +
    "M19 8V2.081c2.747.436 5.162 2.655 6.799 5.919H19zm7.651 2c.754 2.083 1.219 4.46 1.317 7H19v-7h7.651z" +
    "M17 2.081V8h-6.799C11.837 4.736 14.253 2.517 17 2.081zM17 10v7H8.032c.098-2.54.563-4.917 1.317-7H17z" +
    "M6.034 17H2.05c.158-2.54.901-4.917 2.107-7h3.104c-.705 2.129-1.135 4.495-1.227 7z" +
    "m1.998 2H17v7H9.349c-.754-2.083-1.219-4.459-1.317-7z" +
    "M17 28v5.919c-2.747-.437-5.163-2.655-6.799-5.919H17z" +
    "m2 5.919V28h6.8c-1.637 3.264-4.053 5.482-6.8 5.919z" +
    "M19 26v-7h8.969c-.099 2.541-.563 4.917-1.317 7H19z" +
    "m10.967-7h3.982c-.157 2.541-.9 4.917-2.107 7h-3.104c.706-2.129 1.136-4.494 1.229-7z" +
    "m0-2c-.093-2.505-.523-4.871-1.229-7h3.104c1.207 2.083 1.95 4.46 2.107 7h-3.982z" +
    "m.512-9h-2.503c-.717-1.604-1.606-3.015-2.619-4.199C27.346 4.833 29.089 6.267 30.479 8z" +
    "M10.643 3.801C9.629 4.985 8.74 6.396 8.023 8H5.521c1.39-1.733 3.133-3.166 5.122-4.199z" +
    "M5.521 28h2.503c.716 1.604 1.605 3.015 2.619 4.198C8.654 31.166 6.911 29.733 5.521 28z" +
    "m19.836 4.198c1.014-1.184 1.902-2.594 2.619-4.198h2.503c-1.39 1.733-3.133 3.166-5.122 4.198z";

  const favicon = `data:image/svg+xml,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24"><path fill="#1d9bf0" d="${bird}"/></svg>`,
  )}`;

  function isTranslationButton(element) {
    if (!settings.translation || !element?.matches("button")) return false;
    const label = element.getAttribute("aria-label");
    return (
      globalThis.TwitterBirdLocales?.isTranslationLabel(label) ??
      label === "Show translation"
    );
  }

  function replaceIcons(root) {
    if (root.nodeType === Node.TEXT_NODE) {
      if (settings.hideGrok && root.parentElement)
        markGrokEntries(root.parentElement);
      return;
    }
    if (root.nodeType !== Node.ELEMENT_NODE) return;
    if (settings.hideGrok) markGrokEntries(root);
    if (
      isTranslationButton(root) &&
      root.previousElementSibling?.matches("svg")
    ) {
      replaceIcons(root.previousElementSibling);
    }
    const icons = root.matches('link[rel~="icon" i]')
      ? [root]
      : root.querySelectorAll('link[rel~="icon" i]');
    for (const icon of settings.bird ? icons : []) {
      if (icon.type !== "image/svg+xml") icon.type = "image/svg+xml";
      if (icon.getAttribute("sizes") !== "any")
        icon.setAttribute("sizes", "any");
      if (icon.getAttribute("href") !== favicon)
        icon.setAttribute("href", favicon);
    }
    const paths = root.matches("svg path")
      ? [root]
      : root.querySelectorAll("svg path");
    // ponytail: exact current X logo only; add observed variants when X changes its artwork.
    for (const path of paths) {
      if (settings.bird && path.getAttribute("d") === xLogo) {
        path.setAttribute("d", bird);
        path.style.fill = "#1d9bf0";
        // Only the loading screen; never override the application's selected theme.
        path
          .closest("#placeholder")
          ?.style.setProperty("background-color", "#fff", "important");
      }
      const svg = path.ownerSVGElement;
      if (
        isTranslationButton(svg?.nextElementSibling) &&
        path.getAttribute("d") !== GLOBE_PATH
      ) {
        path.setAttribute("d", GLOBE_PATH);
        svg.setAttribute("viewBox", "0 0 36 36");
      }
    }
  }

  replaceIcons(document.documentElement);
  new MutationObserver((records) => {
    for (const record of records) {
      if (
        record.type === "attributes" &&
        (settings.hideGrok ||
          record.target.matches("link") ||
          isTranslationButton(record.target))
      ) {
        replaceIcons(record.target);
      }
      if (settings.hideGrok && record.type === "childList") {
        markGrokEntry(record.target.closest(entryCandidates));
      }
      if (record.type === "characterData") replaceIcons(record.target);
      for (const node of record.addedNodes) replaceIcons(node);
    }
  }).observe(document.documentElement, {
    childList: true,
    subtree: true,
    attributes: true,
    characterData: !!settings.hideGrok,
    attributeFilter: [
      "href",
      "type",
      "sizes",
      "aria-label",
      "title",
      "role",
      "data-testid",
      "contenteditable",
      "d",
    ],
  });
})();
