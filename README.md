<h1 align="center">公众号 Markdown → X 文章</h1>

<p align="center"><code>wechat-md-x</code></p>

<p align="center"><em>「先把公众号文章存成 Markdown，再把它带进 X 草稿。」</em></p>

<p align="center">
  <img alt="Chrome Manifest V3" src="https://img.shields.io/badge/Chrome-Manifest%20V3-356D67">
  <img alt="Markdown 与图片" src="https://img.shields.io/badge/输出-Markdown%20%2B%20图片-356D67">
  <img alt="MIT License" src="https://img.shields.io/badge/License-MIT-356D67">
</p>

<p align="center">MIT License · Chrome 桌面版 · <a href="mailto:wzfh520@gmail.com">联系支持</a></p>

打开公众号文章，插件会把正文存成 Markdown，图片放进同名文件夹。你可以先在 Obsidian 或其他 Markdown 编辑器里修改，再去 X Articles 导入这个文件夹，生成一篇新草稿。

它会填入标题、封面、正文和能找到的图片。导入后由 X 自动保存为草稿；发布前请自己预览和检查排版。

## 安装

商店链接在正式上架后补充。现在可以本地安装：

1. 下载本仓库，或解压发布包。
2. 在 Chrome 打开 `chrome://extensions/`，开启「开发者模式」。
3. 点击「加载已解压的扩展程序」，选择包含 `manifest.json` 的文件夹。
4. 刷新已打开的公众号和 X 页面。

## 使用

### 1. 公众号文章 → Markdown

打开 `mp.weixin.qq.com/s/...` 文章，点击页面右下角「下载 Markdown」。下载结果位于 Chrome 下载目录的 `wechat-to-x/<文章标题>/`：

```text
<文章标题>/
├── <文章标题>.md
└── images/
    ├── 01.png
    └── cover.jpg
```

Markdown 包含标题、作者、账号、日期、原文链接等 front matter；正文里的图片链接指向本地 `images/`。若个别图片抓取失败，会保留原图地址。

### 2. 本地 Markdown → X 草稿

打开 `https://x.com/compose/articles`，点击右下角「导入 Markdown」。把刚才的文章文件夹拖入面板，或选择文件夹；也可以只选择 `.md` 与图片文件。确认标题、封面、字数和图片数量后，点击「导入到 X 草稿」。

插件会先确认当前编辑器没有会被覆盖的内容，再新建或使用空白草稿。导入时别操作编辑器；完成后到 X 的预览页检查。需要已经能使用 X Articles 的账号。

## Markdown 格式

支持标题、粗体、斜体、链接、列表、引用及图片（相对路径、Obsidian 嵌入、网络地址）。X Articles 编辑器只支持两级标题；更深标题会折成小标题。代码块转为保留换行的普通段落，表格转为逐行文本。

测试用的虚构文章在 [`examples/sample-article/`](examples/sample-article/)；商店截图也使用这类虚构内容。

## 权限与隐私

`downloads` 用于把 Markdown 和图片写入本地下载目录。扩展只在公众号文章页、X 文章页运行；微信图片域名权限用于抓取原文图片。导入时，用户选择的本地 Markdown 和图片由浏览器读取，并通过 X 编辑器写入用户自己的 X 草稿。

扩展没有开发者服务器、账号系统或分析服务，不会把文章传给插件开发者。下载文件留在本地，X 草稿由 X 服务管理。详情见[隐私政策](PRIVACY_POLICY.md)。

## 已知边界

- 公众号视频和音频只留文字提示，不导出媒体文件。
- 图片若已失效或被图床拒绝请求，Markdown 会保留远程地址；导入时可能跳过缺失图片。
- 超过 5MB 的图片可能压缩为 JPG；GIF 原样上传。
- 插件依赖 X Articles 当前的编辑器结构。X 改版后若导入失败，已写入的内容可能留在草稿中，需要人工检查。
- 扩展不会自动发布文章，也不会替用户取得 X Articles 的使用资格。

## 许可证与支持

这是无构建步骤的 Manifest V3 扩展。`wechat.js` 负责公众号导出，`x.js` 和 `x-main.js` 负责 Markdown 导入与编辑器写入，`sanitize.js` 在粘贴前过滤 Markdown 中的危险 HTML，`ui.js` 提供两边共用的浮动面板，`background.js` 负责下载和图片请求。商店图文物料在 `store-assets/`，不进入扩展安装包。安全测试可在安装开发依赖后运行 `npm test`，需要本机 Chrome。

源码按 [MIT License](LICENSE) 发布。随包提供的 Marked v12.0.2 保留其[原始许可证](lib/LICENSE.marked.md)。问题与建议请发至 [wzfh520@gmail.com](mailto:wzfh520@gmail.com)。
