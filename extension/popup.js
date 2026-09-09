(async () => {
  const chinese = navigator.language.toLowerCase().startsWith("zh");
  const copy = chinese
    ? {
        enabled: "启用修改",
        legend: "修改项目",
        bird: "蓝鸟与网站图标",
        terms: "旧版操作用语",
        buttons: "经典蓝色按钮",
        translation: "翻译地球图标",
        title: "标签页标题",
        scope: "操作用语和标题目前仅支持英文。",
        hint: "统一应用于所有 X 页面，手动刷新后生效。",
        loading: "正在读取设置…",
        ready: "更改将自动保存。",
        saving: "正在保存…",
        saved: "已保存。",
        error: "保存失败，请重试。",
        loadError: "无法读取设置，请重新打开弹窗。",
      }
    : {
        enabled: "Enable modifications",
        legend: "Modifications",
        bird: "Blue bird & site icon",
        terms: "Classic wording",
        buttons: "Classic blue buttons",
        translation: "Translation globe",
        title: "Tab titles",
        scope: "Wording and titles: English only for now.",
        hint: "Applies to all X tabs after you refresh them.",
        loading: "Loading settings…",
        ready: "Changes save automatically.",
        saving: "Saving…",
        saved: "Saved.",
        error: "Could not save. Try again.",
        loadError: "Could not load settings. Reopen this popup.",
      };
  document.documentElement.lang = chinese ? "zh-CN" : "en";
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
