(() => {
  const xLogo =
    "M21.742 21.75l-7.563-11.179 7.056-8.321h-2.456l-5.691 6.714-4.54-6.714H2.359l7.29 10.776L2.25 21.75h2.456l6.035-7.118 4.818 7.118h6.191-.008zM7.739 3.818L18.81 20.182h-2.447L5.29 3.818h2.447z";
  const bird =
    "M23.643 4.937a9.65 9.65 0 0 1-2.825.775 4.958 4.958 0 0 0 2.163-2.723 9.99 9.99 0 0 1-3.127 1.195 4.916 4.916 0 0 0-8.384 4.482A13.944 13.944 0 0 1 1.64 3.162a4.916 4.916 0 0 0 1.523 6.558 4.903 4.903 0 0 1-2.229-.616v.061a4.917 4.917 0 0 0 3.946 4.818 4.935 4.935 0 0 1-2.224.084 4.923 4.923 0 0 0 4.6 3.419A9.869 9.869 0 0 1 0 19.523a13.94 13.94 0 0 0 7.548 2.212c9.057 0 14.01-7.503 14.01-14.01 0-.213-.005-.425-.014-.636a10.012 10.012 0 0 0 2.46-2.548l-.047-.02z";

  const favicon = `data:image/svg+xml,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24"><path fill="#1d9bf0" d="${bird}"/></svg>`,
  )}`;

  function replaceIcons(root) {
    if (root.nodeType !== Node.ELEMENT_NODE) return;
    const icons = root.matches('link[rel~="icon" i]')
      ? [root]
      : root.querySelectorAll('link[rel~="icon" i]');
    for (const icon of icons) {
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
      if (path.getAttribute("d") !== xLogo) continue;
      path.setAttribute("d", bird);
      path.style.fill = "#1d9bf0";
    }
  }

  replaceIcons(document.documentElement);
  new MutationObserver((records) => {
    for (const record of records) {
      if (record.type === "attributes" && record.target.matches("link")) {
        replaceIcons(record.target);
      }
      for (const node of record.addedNodes) replaceIcons(node);
    }
  }).observe(document.documentElement, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ["href", "type", "sizes"],
  });
})();
