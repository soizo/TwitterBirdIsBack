(async () => {
  if (globalThis.TwitterBirdSettings) {
    const settings = await globalThis.TwitterBirdSettings.load().catch(
      () => null,
    );
    if (!settings?.enabled || !settings.terms) return;
  }
  const terms = {
    post: "tweet",
    posted: "tweeted",
    posting: "tweeting",
    posts: "tweets",
    repost: "retweet",
    reposted: "retweeted",
    reposting: "retweeting",
    reposts: "retweets",
  };
  const controls =
    'button, [role="button"], [role="tab"], [role="menuitem"], [role="status"], [data-testid="socialContext"], [data-testid="SideNav_NewTweet_Button"]';
  const protectedContent =
    'script, style, noscript, textarea, input, select, [contenteditable]:not([contenteditable="false"]), [data-testid="tweetText"], [data-testid="User-Name"], [data-testid="UserName"], [data-testid="UserDescription"], [data-testid="UserCell"]';
  const actionLabel =
    /^(?:undo\s+)?(?:reposting|reposted|reposts|repost|posting|posted|posts|post)$/i;

  const notificationSelector = '[data-testid="toast"], [role="alert"]';
  // Verified static X messages, not a blanket replacement in arbitrary alerts.
  // Source: docs/localization.md (official English resource snapshot).
  const notificationMessages = new Set(
    [
      "Your post was sent.",
      "Your post was sent. You have 30 minutes to make any edits.",
      "Your post was sent. You have 1 hour to make any edits.",
      "Your posts were sent.",
      "Post reposted",
      "You reposted",
      "Something went wrong. Try sending your post again in a minute.",
      "Something went wrong. Try reposting again in a minute.",
      "Sorry! You have exceeded your post limit. Try reposting again tomorrow",
      "You have been blocked from reposting this user’s posts at their request.",
      "You are over the daily limit for sending posts.",
      "Sorry, that post has been deleted.",
      "The post you are trying to reply to has been deleted or is not visible to you.",
      "The post you’re trying to reply to has been deleted",
      "Your post can’t be updated again.",
      "Posts can only be edited within the first 30 minutes after they’re published.",
      "Posts can only be edited within the first 1 hour after they’re published.",
      "Scheduled post could not be deleted.",
      "Some unsent posts could not be deleted.",
      "Your selected unsent posts were deleted.",
      "Some draft posts could not be deleted.",
      "Your selected draft posts were deleted.",
      "Some scheduled posts could not be deleted.",
      "Your selected scheduled posts were deleted.",
      "Something went wrong, and the unsent post wasn’t deleted.",
      "You can’t schedule a post to send in the past.",
      "You can’t schedule a post more than 18 months in the future.",
      "Post added to your Bookmarks",
      "Post removed from your Bookmarks",
      "Something went wrong. Try bookmarking that post again in a minute.",
      "Something went wrong. Try removing that post from your bookmarks again in a minute.",
      "Something went wrong. Try liking your post again in a minute.",
      "Try unliking your post again in a minute.",
      "Your post was pinned to your profile.",
      "Your post was unpinned from your profile",
      "Your post has been pinned and added to highlights.",
      "Post reply hidden",
      "Reply hidden from post",
      "Reply pinned to post",
      "Reply unpinned from post",
      "Unable to pin reply to post",
      "Unable to unpin reply from post",
      "You hid this post",
      "You kept this post",
      "This post was hidden by a moderator for breaking Community rules",
      "This member was removed from the Community, so their posts are hidden.",
      "Posts from this account will now be allowed in your Home timeline.",
      "You have muted posts from this account.",
      "Your post was successfully boosted!",
      "Your post was posted, but we were unable to run the Boost on it. You will not be charged.",
    ].map(notificationKey),
  );

  function notificationKey(text) {
    // Canonicalize only for matching; preserve the displayed punctuation and spacing.
    // Translating first also recognizes partially restored, multi-node messages.
    return translate(text)
      .trim()
      .toLowerCase()
      .replace(/\s+/g, " ")
      .replaceAll("’", "'")
      .replace(/[.!]$/, "");
  }

  function isNotification(element, text) {
    const notification = element.closest(notificationSelector);
    if (!notification) return false;
    if (text && notificationMessages.has(notificationKey(text))) return true;
    for (let part = element; part; part = part.parentElement) {
      if (notificationMessages.has(notificationKey(part.textContent)))
        return true;
      if (part === notification) break;
    }
    return false;
  }

  function isInterface(element, text) {
    if (!element || element.closest(protectedContent)) return false;
    if (isNotification(element, text)) return true;
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
      /\b(?:reposting|reposted|reposts|repost|posting|posted|posts|post)\b/gi,
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
    if (!isInterface(node.parentElement, node.nodeValue)) return;
    const text = translate(node.nodeValue);
    if (text !== node.nodeValue) node.nodeValue = text;
  }

  function restoreLabel(element) {
    if (element.closest(protectedContent)) return;
    const notification = element.closest(notificationSelector);
    for (const attribute of ["aria-label", "title"]) {
      const label = element.getAttribute(attribute);
      if (!label) continue;
      if (notification) {
        // Never rewrite a username embedded in an accessible name or native hint.
        if (
          !notificationMessages.has(notificationKey(label)) &&
          !actionLabel.test(label.trim())
        )
          continue;
      } else {
        if (!isInterface(element)) continue;
        // Native hints must be complete action labels, not names or arbitrary prose.
        // Accessible names may also contain action counts, e.g. "9 reposts. Repost".
        if (
          !actionLabel.test(label.trim()) &&
          !(
            attribute === "aria-label" &&
            /^(?:[\d.,]+\s+)?(?:reposting|reposted|reposts|repost|posting|posted|posts|post)\b/i.test(
              label,
            )
          )
        )
          continue;
      }
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
