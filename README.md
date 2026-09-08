# Twitter Bird Is Back

将 x.com 的 X 品牌 SVG 和 favicon 换回蓝鸟。原生 Manifest V3 扩展，无运行时依赖。

## 本地开发

```sh
npm ci
npx playwright install chromium
npm test && npm run build
```

每轮修改都先通过测试，再构建 `dist/`，供浏览器加载预览。DOM 测试使用本机安装的 Google Chrome；启动屏测试使用 Playwright Chromium，在隔离配置中真实加载扩展，并阻塞测试页面加载来检查启动阶段。

## 加载与更新

- **Chrome**：打开 `chrome://extensions`，开启开发者模式，点击「加载已解压的扩展程序」，选择本项目的 `dist/`。
- **Firefox**：打开 `about:debugging#/runtime/this-firefox`，点击「临时载入附加组件」，选择 `dist/manifest.json`。临时加载在浏览器重启后失效。
- **每次构建后**：在对应扩展管理页点击扩展的「重新加载」，再刷新 x.com。不是自动热更新。

## 当前范围

- 浏览器回归测试：初始和动态插入的品牌 SVG、启动屏、favicon 图片解码，以及网站改写 favicon 地址、类型和尺寸后的恢复。
- 保留普通关闭按钮、首页链接和非 favicon 的 head 链接。
- favicon 固定显示蓝鸟，不保留网站叠加在图标上的未读标记。
- 尚未覆盖：已有 SVG 被页面重绘还原，以及其他形状的 X 品牌图标。
- 启动屏已通过 Chromium 真实加载扩展测试，并获得用户实站反馈；Firefox 兼容性和浏览器标签栏 favicon 外观仍需人工验证。
