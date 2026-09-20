(() => {
  const defaults = {
    enabled: true,
    bird: true,
    terms: true,
    buttons: true,
    translation: true,
    title: true,
    actualLinks: true,
    hideGrok: false,
    hideDrawers: false,
    hideEditImage: false,
  };
  const api = globalThis.browser ?? globalThis.chrome;
  let snapshot;

  function load() {
    // One snapshot per document: saving in the popup never changes a running page.
    return (snapshot ??= api.storage.local
      .get(defaults)
      .then((values) =>
        Object.fromEntries(
          Object.entries(defaults).map(([key, fallback]) => [
            key,
            typeof values[key] === "boolean" ? values[key] : fallback,
          ]),
        ),
      ));
  }

  async function save(key, value) {
    if (!Object.hasOwn(defaults, key) || typeof value !== "boolean") {
      throw new TypeError("Invalid extension setting");
    }
    // Write just the changed key so two popups cannot overwrite unrelated choices.
    await api.storage.local.set({ [key]: value });
  }

  globalThis.TwitterBirdSettings = { load, save };
})();
