(() => {
  // English title grammar only. Future locales need their own structural rules.
  const englishPageTitles = new Map([
    ["Post", "Tweet"],
    ["Posted", "Tweeted"],
    ["Posts", "Tweets"],
    ["Repost", "Retweet"],
    ["Reposted", "Retweeted"],
    ["Reposts", "Retweets"],
  ]);

  function restoreTitle() {
    const original = document.title;
    const [, unread = "", title] = original.match(
      /^(\(\d+\+?\)\s+)?([\s\S]*)$/,
    );
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
  });
})();
