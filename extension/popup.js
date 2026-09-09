(async () => {
    const messages = globalThis.TwitterBirdPopupMessages;
    const resolved = globalThis.TwitterBirdLocales.resolve(
        navigator.language,
    )?.language;
    const language =
        resolved === "en-GB" || Object.hasOwn(messages, resolved)
            ? resolved
            : "en";
    const copy = messages[language] ?? messages.en;
    document.documentElement.lang =
        { zh: "zh-CN", "zh-Hant": "zh-TW" }[language] ?? language;
    for (const element of document.querySelectorAll("[data-copy]")) {
        element.textContent = copy[element.dataset.copy];
    }
    const form = document.querySelector("form");
    const inputs = [...form.querySelectorAll("input")];
    const status = document.querySelector("[role=status]");
    let settings;

    function report(state) {
        status.dataset.state = state;
        status.textContent = copy[state];
    }

    function render() {
        for (const input of inputs) {
            input.checked = settings[input.name];
            input.disabled = input.name !== "enabled" && !settings.enabled;
        }
    }

    report("loading");
    try {
        settings = await globalThis.TwitterBirdSettings.load();
        render();
        report("ready");
    } catch {
        report("loadError");
        return;
    }

    form.addEventListener("submit", (event) => event.preventDefault());
    form.addEventListener("change", async (event) => {
        const input = event.target;
        const { name, checked } = input;
        // Lock controls only during the write: no out-of-order saves or lost choices.
        for (const control of inputs) control.disabled = true;
        report("saving");
        try {
            await globalThis.TwitterBirdSettings.save(name, checked);
            settings[name] = checked;
            report("saved");
        } catch {
            report("error");
        }
        render();
        input.focus();
    });
})();
