(async () => {
  if (globalThis.TwitterBirdSettings) {
    const settings = await globalThis.TwitterBirdSettings.load().catch(
      () => null,
    );
    if (!settings?.enabled || !settings.title) return;
  }
  // Preserve the existing English casing rules; other locales use verified templates.
  const englishPageTitles = new Map([
    ["Post", "Tweet"],
    ["Posted", "Tweeted"],
    ["Posts", "Tweets"],
    ["Repost", "Retweet"],
    ["Reposted", "Retweeted"],
    ["Reposts", "Retweets"],
  ]);

  function localizedTitle(title, data) {
    if (title === "X") return data?.brand ?? "Twitter";
    if (!title.endsWith(" / X")) return;
    const content = title.slice(0, -4);
    if (!data) return `${content} / Twitter`; // Preserve generic branding, not guessed translations.
    let restored = Object.hasOwn(data.headings, content)
      ? data.headings[content]
      : content;
    const [prefix, remainder] = data.title[0].split("{name}");
    const [between, suffix] = remainder.split("{text}");
    const parts = content.split(between);
    if (
      parts.length === 2 &&
      parts[0].startsWith(prefix) &&
      parts[1].endsWith(suffix)
    ) {
      const name = parts[0].slice(prefix.length);
      const text = suffix ? parts[1].slice(0, -suffix.length) : parts[1];
      if (name) {
        // A callback avoids interpreting $&, $1 or placeholder-like text in names/posts.
        restored = data.title[1].replace(/\{(name|text)\}/g, (_, field) =>
          field === "name" ? name : text,
        );
      }
    }
    return `${restored} / ${data.brand}`;
  }

  function restoreTitle() {
    const original = document.title;
    const [, unread = "", title] = original.match(
      /^(\(\d+\+?\)\s+)?([\s\S]*)$/,
    );
    // Match only the fixed signup slogan, including titles partly restored by older versions.
    if (/^X\. It[’']s what[’']s happening \/ (?:X|Twitter)$/.test(title)) {
      document.title = unread + title.replace(/^X\./, "Twitter.").replace(/ \/ X$/, " / Twitter");
      return;
    }
    const language = globalThis.TwitterBirdLocales
      ? globalThis.TwitterBirdLocales.currentLanguage()
      : document.documentElement?.lang || "en";
    if (!["en", "en-GB"].includes(language)) {
      const data = globalThis.TwitterBirdClassicLocales?.[language];
      const localized = localizedTitle(title, data);
      if (localized !== undefined && unread + localized !== original)
        document.title = unread + localized;
      return;
    }
    let restored;
    if (title === "X") {
      restored = "Twitter";
    } else if (title.endsWith(" / X")) {
      let content = title.slice(0, -4);
      const parts = content.split(' on X: "');
      if (parts.length === 2 && content.endsWith('"')) {
        content = `${parts[0]} on Twitter: "${parts[1]}`;
      } else {
        // Only whole, fixed page labels: never words within names or quoted posts.
        content = englishPageTitles.get(content) ?? content;
      }
      restored = `${content} / Twitter`;
    } else {
      return;
    }
    const next = unread + restored;
    if (next !== original) document.title = next;
  }

  restoreTitle();
  // Observe the document so a late or replaced <head>/<title> is covered too.
  new MutationObserver(restoreTitle).observe(document, {
    childList: true,
    subtree: true,
    characterData: true,
    attributes: true,
    attributeFilter: ["lang"],
  });
})();
