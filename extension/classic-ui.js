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

  const localeCache = new Map();
  const normalized = (text) => text.trim().replace(/\s+/g, " ");
  const language = () => globalThis.TwitterBirdLocales
    ? globalThis.TwitterBirdLocales.currentLanguage()
    : document.documentElement.lang || "en";
  const english = () => ["en", "en-GB"].includes(language());

  function localeRules() {
    const code = language();
    const source = globalThis.TwitterBirdClassicLocales?.[code];
    if (!source) return null;
    if (!localeCache.has(code)) {
      const rules = {};
      for (const kind of ["actions", "headings", "labels", "notices", "composer"]) {
        rules[kind] = new Map(Object.entries(source[kind]).map(([from, to]) => [normalized(from), to]));
      }
      const escape = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      rules.counts = source.counts.map(([from, to]) => {
        const [prefix, suffix] = from.split("{count}");
        return [new RegExp(`^${escape(prefix)}([\\p{Nd}][\\p{Nd}.,\\u00a0\\u202f ]*)${escape(suffix)}$`, "u"), to];
      });
      localeCache.set(code, rules);
    }
    return localeCache.get(code);
  }

  function localScope(element) {
    if (!element || element.closest(protectedContent)) return null;
    const notice = element.closest(notificationSelector);
    if (notice) return {root: notice, kind: "notices"};
    const control = element.closest(`${controls}, [data-testid="HoverLabel"], [role="tooltip"]`);
    if (control) return {root: control, kind: control.matches('[role="tab"]') ? "headings" : "actions"};
    if (!/\/status\/\d+(?:\/|$)/.test(location.pathname)) return null;
    const selector = '[data-testid="primaryColumn"] h2[role="heading"]';
    const heading = element.closest(selector);
    return heading && heading === document.querySelector(selector) ? {root: heading, kind: "headings"} : null;
  }

  function localText(text, rules, kind) {
    const [, before, value, after] = text.match(/^(\s*)([\s\S]*?)(\s*)$/);
    let replacement = rules[kind].get(normalized(value));
    if (replacement === undefined && kind !== "notices") {
      replacement = rules.labels.get(normalized(value));
      if (replacement === undefined) {
        for (const [pattern, target] of rules.counts) {
          const match = value.match(pattern);
          if (match) { replacement = target.replace("{count}", () => match[1]); break; }
        }
      }
    }
    return replacement === undefined ? text : before + replacement + after;
  }

  function textNodes(element, notice) {
    const excluded = `${protectedContent}, svg${notice ? ', a, button, [role="button"]' : ''}`;
    const nodes = [];
    const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
    while (walker.nextNode()) {
      if (!walker.currentNode.parentElement.closest(excluded)) nodes.push(walker.currentNode);
    }
    return nodes;
  }

  function replaceNodeText(nodes, replacement) {
    const original = nodes.map(node => node.data).join("");
    if (replacement === original) return;
    let start = 0, end = original.length, targetEnd = replacement.length;
    while (start < end && start < targetEnd && original[start] === replacement[start]) start++;
    while (end > start && targetEnd > start && original[end - 1] === replacement[targetEnd - 1]) {end--; targetEnd--;}
    // Edit only text data in the changed range. Keep SVGs, links, spans and listeners.
    const inserted = replacement.slice(start, targetEnd);
    let offset = 0, written = false;
    for (const node of nodes) {
      const value = node.data;
      const from = Math.max(0, start - offset), to = Math.min(value.length, end - offset);
      if (from < to || (start === end && from === to && from <= value.length && to >= 0)) {
        node.data = value.slice(0, from) + (written ? "" : inserted) + value.slice(to);
        written = true;
      }
      offset += value.length;
    }
  }

  function restoreLocalText(element, rules) {
    const scope = localScope(element);
    if (!scope) return;
    const candidates = [scope.root];
    // Toasts may contain a separate message wrapper and an unchanged View link.
    if (scope.kind === "notices") {
      const inner = [];
      for (let part = element; part && part !== scope.root; part = part.parentElement) inner.push(part);
      candidates.push(...inner.reverse());
    }
    for (const candidate of candidates) {
      const nodes = textNodes(candidate, scope.kind === "notices");
      const value = nodes.map(node => node.data).join("");
      const next = localText(value, rules, scope.kind);
      if (next !== value) { replaceNodeText(nodes, next); return; }
    }
  }

  // Complete interface phrases only; never replace arbitrary occurrences of the brand.
  const brandHints = new Map([
    "Sourced from across X", "New to X?", "Welcome to X!", "Log in to X",
    "Sign up for X", "Log out of X?", "Continue to X", "Your X data",
    "Your X activity", "Off-X activity", "X Rules", "Check what’s trending on X.",
  ].map(text => [text, text.replace(/\bX\b/g, "Twitter")]));

  function restoreBrandHint(element) {
    if (!english() || element.closest(`${protectedContent}, article, ${notificationSelector}`) ||
        !element.closest('main, [role="main"], aside, nav, [data-testid="sidebarColumn"]')) return;
    const original = element.textContent;
    const replacement = brandHints.get(normalized(original));
    if (replacement && !element.querySelector(protectedContent)) {
      replaceNodeText(textNodes(element, false), original.replace(original.trim(), replacement));
    }
  }

  function composerText(value) {
    // Official historical reply prompt: ad993b0e (see localization evidence).
    const replacement = english()
      ? (normalized(value) === "Post your reply" ? "Tweet your reply!" : undefined)
      : localeRules()?.composer.get(normalized(value));
    return replacement ? value.replace(value.trim(), () => replacement) : value;
  }

  function restoreText(node) {
    restoreBrandHint(node.parentElement);
    if (node.parentElement.closest('.public-DraftEditorPlaceholder-inner') &&
        !node.parentElement.closest(protectedContent)) {
      const next = composerText(node.data);
      if (next !== node.data) node.data = next;
      return;
    }
    if (!english()) {
      const rules = localeRules();
      if (rules) restoreLocalText(node.parentElement, rules);
      return;
    }
    if (!isInterface(node.parentElement, node.nodeValue)) return;
    const text = translate(node.nodeValue);
    if (text !== node.nodeValue) node.nodeValue = text;
  }

  function restoreLabel(element) {
    if (element.matches('[data-testid^="tweetTextarea_"]') &&
        !element.parentElement?.closest(protectedContent)) {
      for (const attribute of ['placeholder', 'data-placeholder', 'aria-label']) {
        const value = element.getAttribute(attribute);
        if (value) {
          const next = composerText(value);
          if (next !== value) element.setAttribute(attribute, next);
        }
      }
    }
    if (!english()) {
      const rules = localeRules(), scope = localScope(element);
      if (!rules || !scope) return;
      for (const attribute of ["aria-label", "title"]) {
        const value = element.getAttribute(attribute);
        if (!value) continue;
        const next = localText(value, rules, scope.kind);
        if (next !== value) element.setAttribute(attribute, next);
      }
      return;
    }
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
    for (const element of root.querySelectorAll("[aria-label], [title], [placeholder], [data-placeholder]"))
      restoreLabel(element);
  }

  restore(document);
  new MutationObserver((records) => {
    for (const record of records) {
      if (record.type === "attributes") {
        if (record.attributeName === "lang") restore(document);
        else restoreLabel(record.target);
      }
      if (record.type === "characterData") restoreText(record.target);
      for (const node of record.addedNodes) restore(node);
    }
  }).observe(document, {
    childList: true,
    subtree: true,
    characterData: true,
    attributes: true,
    attributeFilter: ["aria-label", "title", "placeholder", "data-placeholder", "lang"],
  });
})();
