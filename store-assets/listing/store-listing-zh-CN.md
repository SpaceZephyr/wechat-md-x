# Chrome 网上应用店字段（简体中文）

## 基本信息

- 软件包名称：公众号 Markdown → X 文章
- 简短说明：在公众号文章页一键下载 Markdown（图片存到同名文件夹），在 X 文章编辑器里导入本地 Markdown，一步生成 X 草稿。
- 推荐类别：生产力工具
- 主要语言：简体中文
- 成熟内容：否（扩展本身不提供成人内容；文章内容由用户自行打开或选择）

## 详细说明（可直接粘贴）

把公众号文章连同图片存成 Markdown，再把修改好的 Markdown 导入 X Articles，生成一篇新草稿。

在公众号文章页点击“下载 Markdown”，插件会把正文保存为 `.md` 文件，把图片放进同名文件夹的 `images/` 目录，并在 Markdown 中写入标题、作者、账号、日期和原文链接。你可以先在 Obsidian 或其他 Markdown 编辑器里修改。

打开 X 文章编辑器后，点击“导入 Markdown”，拖入文章文件夹，或选择 `.md` 和图片文件。面板会预览标题、封面、字数及图片数量；确认后点击“导入到 X 草稿”，插件按顺序写入标题、正文和图片。导入完成后由 X 保存草稿，发布前请自行预览排版。

支持常见 Markdown 标题、粗体、斜体、链接、列表、引用，以及相对路径图片和 Obsidian 图片嵌入。较深的标题、表格和代码块会转为 X Articles 编辑器可接受的形式。

需要用户自己的 X Articles 编辑权限。扩展不会登录 X、自动发布文章，也不会把文章上传给插件开发者。部分公众号视频、音频和无法抓取的图片不能完整迁移；X 页面改版可能影响导入。

## 单一用途

在用户主动操作时，把当前公众号文章保存为含图片的本地 Markdown，再把用户选定的 Markdown 导入到其 X Articles 草稿。

## 审核人员测试说明

1. 在一篇公开的 `https://mp.weixin.qq.com/s/...` 文章页点击右下角“下载 Markdown”，检查 Chrome 下载目录中的 `wechat-to-x/<标题>/` 是否包含 `.md` 和图片。
2. 若有 X Articles 编辑权限，打开 `https://x.com/compose/articles`，点击右下角“导入 Markdown”，选择刚下载的文件夹，预览后导入空白草稿。导入过程中请勿操作编辑器。
3. 仓库的 `examples/sample-article/` 提供虚构 Markdown 与图片，也可用于第 2 步。没有 X Articles 权限时，仍可检查文件选择和预览；真正写入草稿需要有编辑权限的账号。

## 链接

- 主页：`https://github.com/SpaceZephyr/wechat-md-x`
- 支持：`https://github.com/SpaceZephyr/wechat-md-x/issues`；邮箱 `wzfh520@gmail.com`
- 隐私政策：`https://github.com/SpaceZephyr/wechat-md-x/blob/main/PRIVACY_POLICY.md`
- 源码：`https://github.com/SpaceZephyr/wechat-md-x`
