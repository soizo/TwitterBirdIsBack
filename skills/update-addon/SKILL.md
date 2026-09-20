---
name: update-addon
description: Updates Twitter Bird Is Back on Mozilla Add-ons through MCP, attaches reproducible source code, and verifies an authorized GitHub push. Use when the user requests an add-on update, AMO release, source submission, or the established update workflow in this repository.
---

# Twitter Bird Is Back 更新工作流

这是本项目已实际走通的流程；复用步骤，不重新设计发布方案。所有命令在仓库根目录执行。

## 授权与范围

- “更新到我的 addons”指现有 Mozilla Add-ons 条目 `twitter-bird-is-back`，不是创建新插件。
- 发布必须有当次授权；GitHub 推送也必须有当次明确授权。保存这个流程不构成未来自动发布／推送许可。
- 更新时默认选择附上源码，包含可复现打包说明。不新增权限、不改扩展 ID、不改变分发渠道。
- 不提交 ZIP、XPI、`dist/`、缓存或浏览器记录；不上传凭据、会话、`.pi/`、`.git/`、`node_modules/` 等本地数据。
- 用户自行完成登录和二次验证。不要读取或记录浏览器凭据。

## 1. 检查与版本号

1. 检查 `git status --short`、当前分支、远端及未推送提交；保护无关修改。
2. 使用 Playwright MCP 打开 `https://addons.mozilla.org/en-US/developers/addons`，确认账号、插件和最新已上传版本。
3. 选择高于已上传版本的新版本号；通常递增 patch。同步修改 `extension/manifest.json`、`package.json`、`package-lock.json` 中的根包版本。
4. 更新 `docs/source-review.md` 的版本与变更说明；修正已过期的安装／审核状态，但不要提前宣称新版本获批。

## 2. 验证、打包与源码

1. 运行 `npm test && npm run package && git diff --check`，阅读结果；长命令用后台任务，等待完成通知，不轮询。
2. 检查差异后创建本地发布准备提交。源码归档必须来自已验证的明确提交，而非混杂工作区。
3. 从 manifest 读取本次版本 `VERSION`，生成源码包：

```sh
VERSION=$(node -p "require('./extension/manifest.json').version")
git archive --format=zip -o "releases/twitter-bird-is-back-$VERSION-source.zip" HEAD \
  extension scripts docs test assets package.json package-lock.json README.md LICENSE
```

4. 检查归档内容和完整性。在临时目录解压源码，执行 `python3 scripts/package-extension.py --output reproduced`；生成的 Firefox unsigned ZIP 必须与待上传 ZIP **逐字节一致**。
5. 记录 Firefox unsigned ZIP 和 source ZIP 的 SHA-256。保留旧发布包，不覆盖旧版本。
6. 源码说明应交代环境、命令、产物：Python 3.10+；无需联网或第三方 Python 依赖；运行时无转译／压缩／打包依赖。已提交图标和语言目录直接使用，生成脚本只用于维护。Playwright 仅为开发测试依赖。

## 3. MCP 上传 AMO

1. 打开现有条目的新版入口：`https://addons.mozilla.org/en-US/developers/addon/twitter-bird-is-back/versions/submit/`，保持公开列出渠道。
2. 上传 `releases/twitter-bird-is-back-$VERSION-firefox-unsigned.zip`。确认校验结果；错误必须处理，警告必须理解并如实报告，不忽略。
3. Continue → 填写 Release Notes 和 Notes to Reviewer。说明变更、权限／数据行为、构建命令及已验证的测试范围；不把 Chromium 验证说成 Firefox／Android 实测。
4. Submit Version 后会出现 Source Code Upload：选择 **Yes**，附上 `releases/twitter-bird-is-back-$VERSION-source.zip`，再 Continue。
5. 对地址、版本号、字段和按钮使用当前快照；不要复用旧发布的 ref、文件 ID 或版本 ID。工具参数先查 schema，当前点击参数名是 `target`，不是 `ref`。

### 已遇到的 MCP 上传问题

- 元素存在但等待 visible/stable 超时：先用 `browser_tabs` 选择目标标签页，并检查 `document.visibilityState`。后台标签页曾导致动作一直等待。
- 点击已执行、仅等待导航超时：先检查当前页面和远端结果，**不要盲目再次提交**。
- 原生文件上传曾报 `DOM.setFileInputFiles: Not allowed`。这是该浏览器连接的上传限制；可用 MCP 的文件拖放能力把同一个获授权文件交给原有表单，不绕过登录或服务器校验。
- 若原页面不支持拖放，在已确认的上传 input 上临时适配，再调用 `browser_drop` 上传指定路径：

```js
// selector 必须来自当前页面；本次见过 #upload-addon 和 #id_source。
const input = document.querySelector(selector);
input.addEventListener('dragover', event => event.preventDefault());
input.addEventListener('drop', event => {
  event.preventDefault();
  input.files = event.dataTransfer.files;
  input.dispatchEvent(new Event('change', { bubbles: true }));
}, { once: true });
```

- `browser_run_code_unsafe` 如确需使用，参数必须是 `async (page) => { ... }` 函数字符串，不是裸 `await`。优先普通 MCP 工具；多步有依赖调用用 `mcpScript`。

## 4. 确认保存，恢复 503

1. 上传后检查 Status & Versions，再进入本次 Manage Version。区分“已提交”“待审核”和 **Approved**，不将校验通过视为已获批。
2. 源码上传曾返回 **503**，但扩展本身已经获批；这时不能重传整个版本，也不能宣称源码已附上。
3. 在现有版本详情的 **Source code** 字段补传同一源码 ZIP，点击 Save Changes。
4. 确认 **Changes successfully saved**，且 Source code 出现 **View current**。只有文件选择框显示文件名，不代表服务器已保存。
5. 使用当前 View current 链接，在同源已登录页面中下载并计算 SHA-256（只返回状态、大小、哈希）；必须与本地 source ZIP 一致。不要导出 cookies 或认证请求头。
6. 如果服务仍失败，停止重复提交，明确报告扩展和源码各自的状态，保留附件供恢复。

## 5. GitHub 与签名包

- 有推送授权时，将本次已验证提交推送到确认的远端分支；此仓库通常为 `origin/master`。禁止 force push，不顺带创建 tag、PR 或 GitHub Release。
- 用 `git ls-remote` 对比远端分支与本地 HEAD，确认推送成功；失败时如实报告。用户授权范围不含未知提交时先询问。
- AMO 获批后，可从本次详情页的真实链接下载签名 XPI 到 `releases/` 并保存校验和。
- 签名包应包含签名文件；运行文件应与 unsigned ZIP 一致。AMO 可能仅重排 manifest JSON 格式：对 manifest 比较解析后的对象，对其他运行文件比较原始字节，不把合法签名差异误判成代码改变。
- 最后确认工作区状态，简短报告：版本、AMO 状态、源码已保存且校验一致、GitHub 分支／提交，以及仍未完成的事项。
