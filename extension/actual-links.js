(async () => {
  const settings = await globalThis.TwitterBirdSettings.load().catch(() => null);
  if (!settings?.enabled || !settings.actualLinks) return;

  const shortLink = /^https?:\/\/t\.co\//i;
  const rewritten = new WeakMap();

  function destination(link) {
    // ponytail: only complete URLs supplied by the DOM; no network expansion or guessed schemes.
    const text = (link.getAttribute("title") || link.textContent).trim();
    if (!/^https?:\/\/[^/]/i.test(text) || /[\s\u0000-\u001f\u007f\\…]|\.{3}/u.test(text))
      return null;
    try {
      const url = new URL(text);
      if (url.username || url.password || url.hostname === "t.co") return null;
      return url.href;
    } catch {
      return null;
    }
  }

  function restore(link) {
    if (!(link instanceof HTMLAnchorElement) || link.isContentEditable) return;
    const href = link.getAttribute("href");
    const previous = rewritten.get(link);
    const original = previous?.actual === href ? previous.original : href;
    if (!shortLink.test(original)) {
      rewritten.delete(link);
      return;
    }
    const actual = destination(link);
    if (actual) rewritten.set(link, { original, actual });
    else rewritten.delete(link);
    // Keep text-only redraws accurate and recover the short link if the URL becomes incomplete.
    if (href !== (actual || original)) link.setAttribute("href", actual || original);
  }

  function scan(node) {
    const element = node.nodeType === Node.ELEMENT_NODE ? node : node.parentElement;
    if (!element) return;
    restore(element.closest("a[href]"));
    for (const link of element.querySelectorAll("a[href]")) restore(link);
  }

  scan(document.documentElement);
  new MutationObserver((records) => {
    for (const record of records) {
      // Only the containing link can change when its text/attributes change.
      const element = record.target.nodeType === Node.ELEMENT_NODE
        ? record.target : record.target.parentElement;
      restore(element?.closest("a[href]"));
      for (const node of record.addedNodes) scan(node);
    }
  }).observe(document.documentElement, {
    childList: true,
    subtree: true,
    characterData: true,
    attributes: true,
    attributeFilter: ["href", "title"],
  });
})();
