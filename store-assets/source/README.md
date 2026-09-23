# 视觉源文件

`logo-master.svg` 是可编辑的原创 logo。`build_assets.py` 从它对应的几何结构生成 16/32/48/128px 图标、三张 1280×800 商店截图，以及 440×280 和 1400×560 推广图。

三张 `demo-*.png` 是用插件原有 `ui.js`、`wechat.js` 和 `x.js` 在隔离浏览器里渲染的界面截图；页面文章、账号、图片和编辑区背景均为虚构示例。`logo-directions.png` 是三种 logo 的探索图，不用于商店上传。

重新生成成品需要 Python Pillow 与 macOS 的 STHeiti 字体。运行 `python3 build_assets.py`，脚本会把成品写入上级 `store-assets/` 和根目录 `icons/`。
