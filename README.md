# Twitter Bird Is Back _(TwitterBirdIsBack / twitter-bird-is-back)_

在 Chrome 和 Firefox 中恢复经典 Twitter 蓝鸟、操作用语和蓝色按钮。

恢复熟悉的 Twitter 网页外观，并按需隐藏 Grok 入口和右下角浮动区。不改变发帖、关注或翻译的原有操作。仓库名为 `TwitterBirdIsBack`，开发包名采用连字符形式 `twitter-bird-is-back`；两者指同一个浏览器扩展。

## 目录

- [安装](#安装)
- [使用](#使用)
- [功能与设置](#功能与设置)
- [语言支持](#语言支持)
- [隐私与权限](#隐私与权限)
- [已知限制](#已知限制)
- [开发文档](#开发文档)
- [维护者](#维护者)
- [贡献](#贡献)
- [许可证](#许可证)

## 安装

### Firefox

0.1.1 已提交 Mozilla Add-ons 公开审核，产品页目前尚不可访问，因此暂不提供商店安装链接。审核期间可使用下述临时加载方式。

需要 Firefox 桌面版 140 或更高版本。未签名 ZIP 不能在正式版 Firefox 中直接永久安装；公开版本可用后，可从 Mozilla Add-ons 安装并接收更新。

### Chrome / Chromium 与 Firefox 临时加载

下载或克隆本仓库，在仓库目录中使用 Node.js 与 npm 构建：

```sh
git clone https://github.com/soizo/TwitterBirdIsBack.git
cd TwitterBirdIsBack
npm ci
npm run build
```

- **Chrome / Chromium**：打开 `chrome://extensions`，开启开发者模式，点击「加载已解压的扩展程序」，选择生成的 `dist/` 文件夹。请保留该文件夹，不要移动或删除。
- **Firefox 临时加载**：打开 `about:debugging#/runtime/this-firefox`，点击「临时载入附加组件」，选择 `dist/manifest.json`。浏览器重启后需重新加载。

源码更新后重新运行 `npm ci` 和 `npm run build`，在浏览器扩展管理页重新加载扩展，再刷新 Twitter 页面。不要通过卸载重装来升级，以免丢失设置。

## 使用

```text
打开 Twitter → 点击浏览器工具栏中的扩展图标 → 选择功能 → 手动刷新 Twitter 页面
```

勾选后自动保存。已有页面需要手动刷新，新打开的页面直接使用最新设置；扩展不会替你刷新页面或清空正在编辑的内容。关闭总开关只暂停修改，不会清除分项选择。

## 功能与设置

| 功能 | 默认状态 |
| --- | --- |
| 恢复网页蓝鸟与网站图标 | 开启 |
| 恢复 Tweet / Retweet 等经典操作用语 | 开启 |
| 恢复经典蓝色按钮 | 开启 |
| 将翻译入口图标恢复为地球图标 | 开启 |
| 恢复 Twitter 标签页标题 | 开启 |
| 隐藏所有已识别的 Grok 入口 | 关闭 |
| 隐藏右下角 Grok 和 Chat 浮动区 | 关闭 |

两个隐藏选项互相独立。「隐藏所有 Grok 入口」不会拦截网络或禁止直接访问 Grok；普通翻译和用户内容保留。「隐藏右下角 Grok 和 Chat」不隐藏普通聊天导航。

网页使用经典蓝鸟；浏览器工具栏、扩展管理页与弹窗使用激光眼蓝鸟。

## 语言支持

支持英语、英式英语、简体中文、繁体中文、日语、韩语、西班牙语、俄语和乌克兰语。

- 网页用语跟随 **Twitter 网页显示语言**；不支持的语言保留原用语。
- 弹窗跟随 **浏览器语言**；不支持的语言回退到英语。
- 翻译按钮图标可识别更多语言，但不代表这些语言的全部网页用语都已适配。

## 隐私与权限

扩展在本地处理页面，不向外发送用户数据。`storage` 权限用于保存开关设置；设置仅保存在当前浏览器，不跨设备同步。网站访问权限用于修改 Twitter 网页中的界面元素。

扩展不会对整页文字做全局替换，会跳过推文正文、已识别的用户资料及输入内容。Twitter 网站本身的网络请求不受此隐私说明约束。

## 已知限制

- 网站界面更新可能导致部分图标、用语或隐藏规则失效。
- 使用蓝鸟网站图标时，不保留网站叠加在图标上的未读标记；标签页标题中的未读数量仍保留。
- 部分被网站重绘的 SVG 和其他形状的品牌图标尚未覆盖。
- Firefox 兼容性和浏览器标签栏图标外观仍需人工验证；Android 声明最低版本为 142，但尚未完成实机测试。

## 开发文档

- [开发与维护指南](docs/development.md)：实现边界、源码位置、测试、构建与发布流程。
- [多语言核对记录](docs/localization.md)：覆盖状态、限制及官方来源。

## 维护者

[Soizo](https://github.com/soizo)。

## 贡献

问题、建议和使用疑问请提交到 [GitHub Issues](https://github.com/soizo/TwitterBirdIsBack/issues)，欢迎 Pull Request。

报告界面问题时，请附浏览器版本、网页语言、相关开关和复现步骤；截图请遮住私人内容。代码修改请遵循[开发与维护指南](docs/development.md)，先通过相关测试并构建 `dist/`，不要提交构建产物或缓存。

## 许可证

[MIT](LICENSE) © 2026 Soizo。
