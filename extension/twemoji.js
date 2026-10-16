(async () => {
  const settings = await globalThis.TwitterBirdSettings?.load().catch(() => null);
  if (!settings?.enabled || !settings.twemoji) return;

  const api = globalThis.browser ?? globalThis.chrome;
  const family = '"Twitter Bird Twemoji"';
  const style = document.createElement("style");
  style.textContent = `@font-face {
    font-family: ${family};
    src: url("${api.runtime.getURL("fonts/Twemoji-17.0.3.ttf")}") format("truetype");
    font-display: swap;
    font-weight: 100 900;
    unicode-range: U+00A9,U+00AE,U+200D,U+203C,U+2049,U+20E3,U+2122,U+2139,U+2190-21FF,U+2300-23FF,U+2460-24FF,U+25A0-27BF,U+2934-2935,U+2B00-2BFF,U+3030,U+303D,U+3297,U+3299,U+FE0E-FE0F,U+1F000-1FAFF;
  }`;

  // Keep each element's site font stack and DOM intact. Only the emoji font takes
  // precedence; its unicode range leaves ordinary text in the original typeface.
  function apply(element) {
    if (!(element instanceof HTMLElement) || element.closest("script,style,noscript")) return;
    const hasText = [...element.childNodes].some(node =>
      node.nodeType === Node.TEXT_NODE && /[\p{Extended_Pictographic}\p{Regional_Indicator}\u20e3]/u.test(node.data));
    if (!hasText && !element.matches("input,textarea,[contenteditable]")) return;
    const current = getComputedStyle(element).fontFamily;
    if (!current.includes("Twitter Bird Twemoji")) {
      element.style.setProperty("font-family", `${family}, ${current}`, "important");
    }
  }

  function scan(root) {
    if (root.nodeType === Node.TEXT_NODE) return apply(root.parentElement);
    apply(root);
    root.querySelectorAll?.("*").forEach(apply);
  }

  function start() {
    document.documentElement.append(style);
    scan(document.documentElement);
    new MutationObserver(records => {
      for (const record of records) {
        if (record.type === "childList") record.addedNodes.forEach(scan);
        else if (record.type === "characterData") apply(record.target.parentElement);
        else scan(record.target);
      }
    }).observe(document.documentElement, {
      subtree: true, childList: true, characterData: true,
      attributes: true, attributeFilter: ["style", "class"],
    });
  }
  if (document.documentElement) start();
  else document.addEventListener("DOMContentLoaded", start, { once: true });
})();
