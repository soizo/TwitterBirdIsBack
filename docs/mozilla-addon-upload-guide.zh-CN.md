# Mozilla 扩展手动上传指南（Firefox 通用）

适用：在 Mozilla Add-ons（简称 **AMO**，也就是 Firefox 扩展商店）首次上传扩展，或给已有扩展更新版本。

**一句话流程：准备文件 → 登录正确账号 → 进入正确扩展 → 上传安装包 → 填说明和源码 → 提交 → 确认保存。**

> 不同账号、首次上传和版本更新的页面可能略有不同，源码步骤也可能出现在不同位置。以页面实际提示为准，下面给出了常见的英文按钮名称。

---

## 一、先准备好两个文件

建议把这次要上传的文件放进同一个容易找到的文件夹。

| 文件 | 用途 | 示例名称 |
| --- | --- | --- |
| **安装包** | 用户实际安装的扩展 | `my-addon-0.1.8-firefox.zip` |
| **源码包** | 让 Mozilla 审核员检查、重新构建 | `my-addon-0.1.8-source.zip` |

**这两个包不要选反。不要直接把整个项目文件夹压缩后当作安装包上传。**

### 1. 安装包怎么准备？

- 项目已有“Firefox 打包”命令：按项目说明执行，使用它生成的 Firefox 包。不要拿 Chrome 包冒充 Firefox 包。
- 项目需要编译（例如 TypeScript、React、Vite、Webpack）：先按项目说明构建，再打包运行产物，不能只把未编译的源文件压缩上传。
- 项目没有构建步骤、就是普通 HTML/CSS/JavaScript：可以把扩展的运行文件压缩成 ZIP。

打开安装包，最外层应当直接看到 `manifest.json`：

```text
正确：my-addon.zip        错误：my-addon.zip
      ├─ manifest.json         └─ my-addon/
      ├─ scripts/                 ├─ manifest.json
      └─ icons/                   └─ ...
```

在 macOS 手动压缩时：**进入存放 `manifest.json` 的文件夹，选中里面需要的文件，再右键“压缩”**；不是右键压缩外面的整个文件夹。

### 2. 版本号怎么检查？

打开本次安装包里的 `manifest.json`，找到：

```json
"version": "0.1.8"
```

- 更新已有扩展时，使用比后台已有版本更新、且未被使用的版本号。
- **改 ZIP 文件名不等于改版本号。** AMO 读取的是包内的 `manifest.json`。
- 不要改变已有扩展的 ID。版本更新必须进入原扩展条目，不能重新创建一个扩展。
- 项目若在多个文件中维护版本号，按项目约定同步更新，并重新构建打包。

### 3. 源码包怎么准备？

**代码经过编译、打包、压缩等处理时，需要提供相应源码和构建说明。** 如果安装包就是完整、可读、未处理的源代码，通常不需要另外提供源码；不要因此把本来需要的源码步骤跳过。

源码包应包含：

- 与本次安装包对应的源码。
- 构建脚本、配置文件、必要资源。
- 依赖清单和锁文件（例如 `package.json`、`package-lock.json`）。
- 一份说明如何构建的 `README`。有测试时，建议附上测试文件和必要辅助文件。

**不要放入密码、密钥、令牌、浏览器 Profile、Cookie、私人数据、`.git/`、`node_modules/` 或其他无关本地文件。**

构建说明至少写清楚四件事：

```text
环境：需要什么系统、语言/工具，以及版本。
安装：怎样安装依赖；如果不需要，明确写“不需要”。
构建：从源码包根目录开始，依次执行哪些命令。
结果：生成的 Firefox 安装包或运行文件在哪个路径。
```

命令必须是**这个项目实际可用的命令**。没有适用于所有扩展的统一 `npm run build`。最好自己在一个新文件夹解压源码，照着说明构建一次，核对生成的运行文件与安装包一致。

上传前先完成项目相关测试，并保留这次实际上传的安装包和源码包，方便以后对应审核问题。

---

## 二、打开正确的 Firefox Profile 和账号

1. 打开你要用来发布的 Firefox Profile。
2. 如果不确定当前 Profile，在地址栏打开 `about:profiles`，找标有“这是正在使用的配置文件”或类似提示的那一项，检查它的名称。
3. 确认是你要的 Profile 后，再进入：

   **<https://addons.mozilla.org/developers/addons>**

4. 登录你的 Mozilla 账号。如果需要验证码或二次验证，按页面提示完成。
5. 检查右上角账号是否正确，并确认列表中能看到你要更新的扩展。

> Profile 和 Mozilla 账号不是同一个东西：**Profile 要对，登录账号也要对。** 看不到扩展时，先检查账号，不要急着重新创建扩展。

---

## 三、找到上传入口

### 已经上架过：更新原扩展

1. 在 **My Add-ons（我的附加组件）** 中点击目标扩展。
2. 打开 **Manage Status & Versions（管理状态和版本）**。
3. 查看已有版本，确认这次版本号没有用过。
4. 点击 **Upload a New Version / Upload New Version（上传新版本）**。

**不要点 Submit a New Add-on。那是创建另一个扩展，不是更新。**

### 从未上传过：首次提交

1. 在开发者后台点击 **Submit a New Add-on（提交新的附加组件）**。
2. 按提示阅读并接受开发者协议。
3. 选择分发方式：

| 页面选项 | 意思 | 应该怎么选 |
| --- | --- | --- |
| **On this site / Listed** | 在 AMO 商店公开展示，让用户搜索、安装 | 想正常上架商店就选这个 |
| **On your own / Unlisted** | 不在商店公开展示，获取签名后自行分发 | 只有明确要自行分发才选 |

更新原扩展时，保持原有分发方式，不要顺手切换。

---

## 四、上传安装包，等自动检查完成

1. 在 **Upload Version** 页面点击 **Select a file（选择文件）**。
2. 选择本次的 **Firefox 安装包**，不是源码包。
3. 等待上传和检查完成，不要连续点击、重复上传。
4. 查看检查结果：

| 结果 | 怎么处理 |
| --- | --- |
| **0 errors，没有错误** | 可以继续 |
| **Warnings，警告** | 打开详情，确认具体原因；尤其注意安全、隐私和兼容性问题。允许继续不代表可以不管 |
| **Errors，错误** | 先修复项目并重新打包，不能强行继续 |

5. 如果出现兼容平台选项，只选择实际支持的平台。支持桌面 Firefox 不代表已经验证支持 Android。
6. 点击 **Continue（继续）**。

> 此时通常只是上传并通过自动检查，**不等于已经发布，也不等于审核通过**。

---

## 五、填写说明，按提示上传源码

### 1. Release Notes：给用户看的更新说明

简短写清楚这次变化，不要把计划做的事情写成已经完成。

可替换模板（只保留实际发生的内容）：

```text
本次更新：
- 新增：……
- 修复：……
- 改进：……
```

### 2. Notes to Reviewer：给审核员看的说明

交代功能、测试方法、权限、数据行为和构建方式。可以使用下面的英文模板，**把方括号内容改成真实情况再提交**：

```text
Changes in this version:
[Describe the actual changes.]

How to test:
[Steps to exercise the extension. Include required settings or test access instructions.]

Permissions and data handling:
[Explain permission changes, if any, and the actual data collection/transmission behavior.]

Source and build:
[State whether a separate source archive is provided.]
[Give the build instructions or the path to them inside the source archive.]

Verification:
[List only the tests and browser/platform checks actually performed.]
```

- 没有新增权限，才写“没有新增权限”。
- 确实没有收集数据，才写“没有收集数据”。
- 只测过 Chromium，不能写成已经在 Firefox 或 Android 实测。
- 不要在备注里留下个人密码或私密凭据；如需测试账号，按 Mozilla 的审核要求安排专用测试访问。

### 3. Source Code Upload：源码上传

看到“是否需要提供源码”时：

- **需要源码**：选 **Yes**，再点 **Browse（浏览）**，选择对应版本的 `source.zip`。
- **确实不需要源码**：选 **No**，按页面提示继续。
- 普通未处理源码项目如希望主动附上源码及说明，也可以选择 Yes。

源码步骤可能出现在版本说明之前，也可能出现在点击 **Submit Version** 之后。**不要因为看见一次“提交”按钮，就以为后面没有步骤了。**

### 4. 首次上架还要填写商店资料

首次发布通常还需要填写名称、简介、详细介绍、分类、许可证等资料，并按页面要求补充图标、截图、隐私信息等。

涉及数据收集或传输时，如实填写相关声明；需要隐私政策时提供对应链接。不要为了继续流程而一律选择“不收集”。

更新已有扩展时，部分资料可能已经填写，无变化就不必重写。

---

## 六、提交后，再检查一次后台

1. 检查目标扩展、版本号、说明、源码附件是否正确。
2. 按页面提示点击 **Submit Version（提交版本）**、**Continue** 等按钮，完成剩余步骤。
3. 等待页面返回结果。如果跳转很慢，先检查是否已经提交成功，不要立刻再点一次。
4. 回到该扩展的 **Manage Status & Versions**。
5. 找到本次版本，点击版本号，核对：
   - 版本号正确。
   - 安装包确实存在。
   - 说明已保存。
   - 如附源码，**Source code** 处已经有 **View current（查看当前源码）** 或等效链接。
6. 刷新或重新打开版本详情，确认信息仍然存在。

### 状态怎么看？

| 页面状态或提示 | 意思 |
| --- | --- |
| **Validation passed** | 自动检查通过，还不能据此判断已发布 |
| **Submitted / Awaiting Review / Pending** 等 | 已提交，按页面所示等待后续处理 |
| **Approved** | 后台将该版本标记为已批准；仍可能有后续人工复查 |
| **Rejected / Disabled** | 查看原因，修复问题后按要求处理 |

具体状态文案可能变化。**以版本详情和 Mozilla 通知为准，不要只看上传进度条或成功邮件。**

- 公开上架的扩展：再打开商店详情页，核对可安装的版本是否已更新；商店和更新分发可能有延迟。
- 自行分发的扩展：等待签名完成，从版本详情下载签名后的 `.xpi` 再分发，不要分发本地 unsigned 包。

---

## 七、常见问题：按这个处理

### “这个版本号已经存在”

先回到版本列表，看看刚才是不是已经提交成功。**已存在就不要重复提交。** 确实需要另发一版时，修改项目版本号、重新测试打包，不能只改 ZIP 文件名。

### 提示找不到 `manifest.json`

打开安装包，检查是不是多套了一层文件夹。`manifest.json` 必须在 ZIP 最外层。

### 找不到我的扩展

先检查 Firefox Profile 和 Mozilla 登录账号。确认账号无误后再检查扩展权限，不要误建一个同名新扩展。

### 源码上传后报 503 或其他服务器错误

1. 不要立刻把整个版本重新提交一遍。
2. 回到版本列表，检查安装包是否已经保存、本次版本是否已经出现。
3. 如果版本已存在，打开它的详情，找到 **Source code**。
4. 选择同一份源码包，点击 **Save Changes（保存更改）**。
5. 确认有保存成功提示，刷新后仍然存在 **View current** 链接。
6. 如果仍然报错，保留文件和错误信息，稍后再试或联系 Mozilla 支持，不要反复点击提交。

**文件选择框显示了文件名，只表示你选了文件，不代表服务器已经保存。** 对于重要发布，可以从 View current 下载源码包，与本地包比较 SHA-256，进一步确认文件一致。

### 上传成功，但还没在商店看到新版

查看本次版本的状态、是否有未完成步骤，以及 Mozilla 发来的通知。确认分发渠道是公开上架；如果只是等待审核或同步，按页面提示等待，不要不断创建新版本。

---

## 最后一分钟检查清单

- [ ] Firefox Profile 正确，Mozilla 账号正确。
- [ ] 更新的是原扩展，没有误建新条目。
- [ ] 包内版本号正确，比已有版本更新，扩展 ID 未改变。
- [ ] 选的是 Firefox 安装包，`manifest.json` 在包内最外层。
- [ ] 项目相关测试通过，警告已阅读，错误已解决。
- [ ] 更新说明、审核说明和数据声明如实填写。
- [ ] 如需源码，已上传对应版本源码，附可用构建说明。
- [ ] 已重新打开版本详情，确认安装包、说明和源码真正保存。
- [ ] 已确认当前是“待处理”还是“已批准”，没有把自动检查通过当作发布完成。
- [ ] 已保留本次安装包、源码包及对应源代码版本。

**Mozilla 上传和 GitHub 推送是两件事。这份流程不要求你推送、打 Git 标签或创建 GitHub Release。**

## 官方说明

- [提交与更新扩展](https://extensionworkshop.com/documentation/publish/submitting-an-add-on/)
- [安装包的正确打包方式](https://extensionworkshop.com/documentation/publish/package-your-extension/)
- [源码提交要求及已存在版本补传源码](https://extensionworkshop.com/documentation/publish/source-code-submission/)
- [签名与分发方式](https://extensionworkshop.com/documentation/publish/signing-and-distribution-overview/)

页面按钮和步骤可能调整，遇到差异时，以 AMO 当前页面和官方文档为准。
