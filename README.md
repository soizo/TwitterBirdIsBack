# Twitter Bird Is Back

恢复 x.com 的蓝鸟图标、经典英文用语和蓝色按钮。原生 Manifest V3 扩展，无运行时依赖。

## 经典界面

- 界面控件和状态标签中的 `Post / Posted / Posts` → `Tweet / Tweeted / Tweets`，`Repost / Reposted / Reposts` → `Retweet / Retweeted / Retweets`，保留常见大小写形式，并处理动态加载和重绘。
- 悬停提示（`HoverLabel`／`role="tooltip"`）、原生 `title` 和无障碍标签同步恢复操作用语，包括 `Undo repost`；任意提示正文不做逐词替换。
- 详情页及其子页面的主标题同样恢复 Tweet／Tweets／Retweets，支持单页导航和重绘；资料页标题不纳入替换，避免改写用户显示名。
- 不做整页文字替换；跳过推文正文、已识别的用户名／用户资料区域和输入内容。未识别的界面区域可能仍显示新用语。
- 侧栏与编辑框发帖按钮、Follow 按钮：背景 `#1DA1F2`，悬停 `#168BD2`。文字和图标在浅色、深色模式下统一使用白色；不依赖网站或系统主题。
- 不改变点击逻辑和禁用状态，不覆盖 Following／Unfollow 的样式。
- 翻译入口图标识别 X 的全部 45 个显示语言选项对应的官方按钮文案，只替换按钮前紧邻的 Grok SVG；保留原尺寸、颜色及行为，支持延迟出现，其他 Grok 图标不变。
- 多语言适配进行中：`extension/locales.js` 负责语言代码与翻译入口文案；页面用语和 tab title 暂仍为英文规则。覆盖状态及官方来源见 [多语言核对记录](docs/localization.md)。
- 图标逻辑在 `extension/content.js`；用语和按钮样式在 `extension/classic-ui.js`、`extension/classic-ui.css`。

## 弹窗开关

点击浏览器工具栏的扩展图标，可控制总开关和五个分项：蓝鸟与网站图标、旧版操作用语、经典蓝色按钮、翻译地球图标、标签页标题。首次默认全部开启。

- 勾选即自动保存；设置保存在当前浏览器的 `storage.local`，不跨设备同步。
- **手动刷新 X 页面后生效**，不自动刷新，也不改动当前页面上的编辑内容。新打开的页面直接读取最新设置。
- 关闭总开关只暂停修改，保留分项选择；重新开启后沿用原组合。
- 弹窗使用白底黑字、少量 Twitter 蓝和原生复选框。浏览器语言为中文时显示中文，其余回退英文。
- 读取或保存失败会明确提示；读取失败时页面不应用修改，保存失败时勾选恢复为此前的状态。
- 设置逻辑在 `extension/settings.js`；弹窗在 `extension/popup.html`、`popup.css`、`popup.js`。只新增 `storage` 权限。

## 标签页标题（英文规则）

规则独立放在 `extension/title.js`，未来按语言扩展结构规则，不做全文词语替换。

- `(8) Home / X` → `(8) Home / Twitter`，保留未读数量。
- `Post / X` → `Tweet / Twitter`；固定页面名也覆盖 Posted／Posts／Repost／Reposted／Reposts。
- `Alice on X: "I use X" / X` → `Alice on Twitter: "I use X" / Twitter`，不改引号内正文。
- 用户名、搜索词不做逐词替换。若内文包含多个 `on X: "` 分隔符，保留歧义部分，只恢复末尾站名。
- 支持初次加载、未读数更新、单页导航和标题节点重建。

## 本地开发

```sh
npm ci
npx playwright install chromium
npm test && npm run build
```

每轮修改都先通过测试，再构建 `dist/`，供浏览器加载预览。DOM 测试使用本机安装的 Google Chrome；启动屏和弹窗测试使用 Playwright Chromium，在隔离配置中真实加载扩展。启动屏测试阻塞页面加载检查启动阶段；弹窗测试使用真实扩展存储检查分项开关、刷新生效与持久化。

修改用语时按界面位置逐项检查：按钮正文、详情标题、菜单／撤销状态、真实 hover 提示、原生 `title`、无障碍标签和 tab title；覆盖动态出现与重绘，并保留正文、用户名、搜索词的反例测试。不要只检查按钮正文就视为完成。

## 加载与更新

- **Chrome**：打开 `chrome://extensions`，开启开发者模式，点击「加载已解压的扩展程序」，选择本项目的 `dist/`。
- **Firefox**：打开 `about:debugging#/runtime/this-firefox`，点击「临时载入附加组件」，选择 `dist/manifest.json`。临时加载在浏览器重启后失效。
- **每次构建后**：在对应扩展管理页点击扩展的「重新加载」，再刷新 x.com。不是自动热更新。

## 当前范围

- 浏览器回归测试：初始和动态插入的品牌 SVG、启动屏、favicon 图片解码及防改回、用语替换与用户内容保护、按钮明暗主题／悬停／禁用态。
- 保留普通关闭按钮、首页链接和非 favicon 的 head 链接。
- 开启蓝鸟分项时，favicon 固定显示蓝鸟，不保留网站叠加在图标上的未读标记。
- 尚未覆盖：已有 SVG 被页面重绘还原，以及其他形状的 X 品牌图标。
- 启动屏已通过 Chromium 真实加载扩展测试，并获得用户实站反馈；Firefox 兼容性和浏览器标签栏 favicon 外观仍需人工验证。
