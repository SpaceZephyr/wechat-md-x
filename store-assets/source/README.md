# 视觉源文件

`logo-master.svg` 是可编辑的原创 X 字母标志，采用黑底、白色几何笔画和青色端点。`build_assets.py` 从对应的几何结构生成 16/32/48/128px 图标、三张 1280×800 商店截图，以及 440×280 和 1400×560 推广图。

三张 `demo-*.png` 由 `capture-demo.cjs` 调用插件的 `ui.js`、`wechat.js`、`x.js` 在隔离浏览器里渲染；页面文章、账号、图片和编辑区背景均为虚构示例。`demo-landscape.png` 是示例文章与封面的合成图片。

重新截取界面需要安装项目依赖和本机 Chrome：在仓库根目录运行 `node store-assets/source/capture-demo.cjs`。生成成品需要 Python Pillow 与 macOS 的 STHeiti 字体，再运行 `python3 store-assets/source/build_assets.py`。脚本会把成品写入 `store-assets/` 和根目录 `icons/`。
