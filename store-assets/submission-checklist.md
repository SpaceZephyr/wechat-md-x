# Chrome 网上应用店上架清单

## 已备妥

- [x] Manifest V3、版本 `2.0.0`、运行文件与图标路径已核对。
- [x] 已准备 16/32/48/128px 原创图标及可编辑 SVG。
- [x] 商店图标 128×128、三张截图 1280×800、小型推广图 440×280、顶部推广图 1400×560 已通过尺寸检查。
- [x] 截图使用虚构文章和本地文件，并由原有插件界面代码渲染。
- [x] 已备妥商店中文文案、权限理由、远程代码声明、数据使用说明、审核测试步骤和更新说明。
- [x] 已备妥公开仓库隐私政策与支持邮箱 `wzfh520@gmail.com`。
- [x] 已准备虚构的 Markdown 示例文件夹供审核测试。
- [x] 发布 ZIP 仅包含运行文件；未包含商店图片、测试、Git 数据或开发依赖。
- [x] 所有脚本通过语法检查；Markdown HTML 安全测试通过；依赖审计无已知漏洞。
- [x] Marked v12.0.2 的原始许可证随源码和上传包提供。

## 上架前在浏览器中确认

- [ ] 将 `dist/wechat-md-x-2.0.0/` 作为未打包扩展加载到 Chrome，使用公开公众号文章完整下载一次。
- [ ] 用拥有 X Articles 编辑权限的账号导入示例 Markdown，检查标题、封面、图文顺序和草稿自动保存。
- [ ] 在开发者后台逐项核对数据使用复选框，并填写 `store-assets/listing/permission-justifications.md` 中的理由。
- [ ] 将公开隐私政策 URL 填入开发者信息，并确认无登录状态下可访问。
- [ ] 选择地区、定价和成熟内容选项，上传 ZIP 和商店图片后提交审核。

## 物料位置

- 上传包：`dist/wechat-md-x-2.0.0.zip`
- 截图：`store-assets/screenshots/`
- 推广图：`store-assets/promo/`
- 商店文案：`store-assets/listing/`
- 隐私政策：`PRIVACY_POLICY.md`
- 审核示例：`examples/sample-article/`
