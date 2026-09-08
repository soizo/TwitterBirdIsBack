(() => {
  const terms = {
    post: "tweet",
    posted: "tweeted",
    posts: "tweets",
    repost: "retweet",
    reposted: "retweeted",
    reposts: "retweets",
  };
  const controls =
    'button, [role="button"], [role="tab"], [role="menuitem"], [role="status"], [data-testid="socialContext"], [data-testid="SideNav_NewTweet_Button"]';
  const protectedContent =
    'script, style, noscript, textarea, input, select, [contenteditable]:not([contenteditable="false"]), [data-testid="tweetText"], [data-testid="User-Name"], [data-testid="UserName"], [data-testid="UserDescription"], [data-testid="UserCell"]';
  const actionLabel =
    /^(?:undo\s+)?(?:reposted|reposts|repost|posted|posts|post)$/i;

  function isInterface(element) {
    if (!element || element.closest(protectedContent)) return false;
    const tooltip = element.closest(
      '[data-testid="HoverLabel"], [role="tooltip"]',
    );
    if (tooltip) return actionLabel.test(tooltip.textContent.trim());
    if (element.closest(controls)) return true;
    // The same heading structure shows display names on profile pages.
    if (!/\/status\/\d+(?:\/|$)/.test(location.pathname)) return false;
    const selector = '[data-testid="primaryColumn"] h2[role="heading"]';
    const heading = element.closest(selector);
    return heading !== null && heading === document.querySelector(selector);
  }

  function translate(text) {
    return text.replace(
      /\b(?:reposted|reposts|repost|posted|posts|post)\b/gi,
      (word) => {
        const replacement = terms[word.toLowerCase()];
        if (word === word.toUpperCase()) return replacement.toUpperCase();
        return word[0] === word[0].toUpperCase()
          ? replacement[0].toUpperCase() + replacement.slice(1)
          : replacement;
      },
    );
  }

  function restoreText(node) {
    if (!isInterface(node.parentElement)) return;
    const text = translate(node.nodeValue);
    if (text !== node.nodeValue) node.nodeValue = text;
  }

  function restoreLabel(element) {
    if (!isInterface(element)) return;
    for (const attribute of ["aria-label", "title"]) {
      const label = element.getAttribute(attribute);
      if (!label) continue;
      // Native hints must be complete action labels, not names or arbitrary prose.
      // Accessible names may also contain action counts, e.g. "9 reposts. Repost".
      if (
        !actionLabel.test(label.trim()) &&
        !(
          attribute === "aria-label" &&
          /^(?:[\d.,]+\s+)?(?:reposted|reposts|repost|posted|posts|post)\b/i.test(
            label,
          )
        )
      )
        continue;
      const translated = translate(label);
      if (translated !== label) element.setAttribute(attribute, translated);
    }
  }

  function restore(root) {
    if (root.nodeType === Node.TEXT_NODE) return restoreText(root);
    if (
      root.nodeType !== Node.ELEMENT_NODE &&
      root.nodeType !== Node.DOCUMENT_NODE
    )
      return;
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    while (walker.nextNode()) restoreText(walker.currentNode);
    if (root.nodeType === Node.ELEMENT_NODE) restoreLabel(root);
    for (const element of root.querySelectorAll("[aria-label], [title]"))
      restoreLabel(element);
  }

  restore(document);
  new MutationObserver((records) => {
    for (const record of records) {
      if (record.type === "attributes") restoreLabel(record.target);
      if (record.type === "characterData") restoreText(record.target);
      for (const node of record.addedNodes) restore(node);
    }
  }).observe(document, {
    childList: true,
    subtree: true,
    characterData: true,
    attributes: true,
    attributeFilter: ["aria-label", "title"],
  });
})();
