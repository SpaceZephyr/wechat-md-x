/* Reproducible store screenshots: real extension UI over fictional page content. */
const { chromium } = require('playwright-core');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');

const root = join(__dirname, '../..');
const output = __dirname;
const picture = readFileSync(join(output, 'demo-landscape.png'));
const pictureData = `data:image/png;base64,${picture.toString('base64')}`;
const chrome = process.env.CHROME_BIN || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const frame = `<style>
  *{box-sizing:border-box}body{margin:0;background:#08090b;color:#f3f5f7;font-family:-apple-system,BlinkMacSystemFont,'PingFang SC',sans-serif}
  header{height:74px;border-bottom:1px solid #20252b;display:flex;align-items:center;padding:0 48px;gap:24px}
  .brand{font-size:27px;font-weight:800;letter-spacing:-2px}.pill{margin-left:auto;border:1px solid #353b42;border-radius:30px;padding:9px 18px;color:#c8ced4}
  .shell{max-width:920px;margin:46px auto}.label{font-size:13px;letter-spacing:3px;color:#87929b;text-transform:uppercase}
  h1{font-size:42px;letter-spacing:-1px;margin:18px 0}.byline{color:#87929b;margin:0 0 26px}.rule{border-top:1px solid #2b3036;margin:22px 0}
  p{font-size:18px;line-height:1.9;color:#c9d0d6}.pic{height:265px;border:1px solid #323a42;background:linear-gradient(145deg,#16242a,#0a0c10 62%,#16394a);border-radius:14px;position:relative;overflow:hidden}
  .pic:before,.pic:after{content:'';position:absolute;transform:rotate(-25deg);border:1px solid #54819a;border-radius:50%;width:760px;height:270px;left:60px;top:95px}.pic:after{top:138px;left:190px;border-color:#2e566b}
  .grid{background-image:linear-gradient(#171a1e 1px,transparent 1px),linear-gradient(90deg,#171a1e 1px,transparent 1px);background-size:40px 40px}
  </style>`;

const wechatPage = `<!doctype html><meta charset="utf-8">${frame}
  <header><div class="brand">▣</div><span>公众号文章</span><span class="pill">文章页面 · 虚构示例</span></header>
  <main class="shell"><div class="label">WECHAT ARTICLE / DEMO</div><h1 id="activity-name">把内容带到下一个平台</h1>
  <p class="byline"><span id="js_name">示例作者</span>　2026 年 9 月 23 日</p><div class="rule"></div>
  <div id="js_content"><p>写好的内容可以继续流动。先把公众号文章保存成 Markdown，再用本地文件继续编辑。</p>
  <div class="pic"></div><img style="display:none" data-src="https://mmbiz.qpic.cn/demo-landscape.png">
  <p>图片跟随文章一起保存，标题、正文和图片可以在 X 文章草稿中继续使用。</p></div></main>`;

const xPage = `<!doctype html><meta charset="utf-8">${frame}
  <header><div class="brand">X</div><span>文章</span><span class="pill">虚构编辑区示意</span></header>
  <main class="shell"><div class="label">X ARTICLES / DRAFT</div><h1>创作你的下一篇文章</h1>
  <p class="byline">选择 Markdown 文件夹，预览内容后导入草稿</p>
  <div class="rule"></div><div class="grid" style="height:420px;border:1px solid #24282d;border-radius:14px;padding:32px">
  <div style="height:18px;width:42%;background:#252a30;border-radius:5px;margin-bottom:24px"></div>
  <div style="height:10px;width:80%;background:#1d2227;border-radius:5px;margin-bottom:16px"></div>
  <div style="height:10px;width:65%;background:#1d2227;border-radius:5px"></div></div></main>`;

async function main() {
  const browser = await chromium.launch({ executablePath: chrome, headless: true, args: ['--no-sandbox'] });
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1, colorScheme: 'dark' });
  await context.addInitScript((dataUrl) => {
    window.chrome = { runtime: {
      onMessage: { addListener() {} },
      sendMessage: async (message) => message.type === 'wx2x:fetch'
        ? { ok: true, dataUrl, type: 'image/png' }
        : { ok: true, id: 1, path: '下载/wechat-to-x/把内容带到下一个平台/把内容带到下一个平台.md' }
    } };
  }, pictureData);
  await context.route('**/*', (route) => {
    const url = route.request().url();
    if (url.includes('mp.weixin.qq.com/s/demo')) return route.fulfill({ contentType: 'text/html; charset=utf-8', body: wechatPage });
    if (url.includes('x.com/compose/articles')) return route.fulfill({ contentType: 'text/html; charset=utf-8', body: xPage });
    if (url.includes('mmbiz.qpic.cn/demo-landscape.png')) return route.fulfill({ contentType: 'image/png', body: picture });
    return route.abort();
  });

  const wx = await context.newPage();
  await wx.goto('https://mp.weixin.qq.com/s/demo');
  await wx.addScriptTag({ path: join(root, 'ui.js') });
  await wx.addScriptTag({ path: join(root, 'wechat.js') });
  await wx.locator('#wx2x-host .fab').click();
  await wx.locator('#wx2x-host .ok').waitFor();
  await wx.screenshot({ path: join(output, 'demo-wechat-saved.png') });

  const xp = await context.newPage();
  await xp.goto('https://x.com/compose/articles');
  for (const file of ['lib/marked.min.js', 'ui.js', 'sanitize.js', 'x.js']) {
    await xp.addScriptTag({ path: join(root, file) });
  }
  await xp.locator('#wx2x-host .fab').click();
  await xp.screenshot({ path: join(output, 'demo-x-picker.png') });
  const markdown = `---\ntitle: "把内容带到下一个平台"\ncover: "images/cover.png"\n---\n# 把内容带到下一个平台\n\n写好的内容可以继续流动。先把公众号文章保存成 Markdown。\n\n![示例图片](images/01.png)\n\n再把本地文件导入 X 文章草稿。`;
  await xp.locator('#wx2x-host #files').setInputFiles([
    { name: '把内容带到下一个平台.md', mimeType: 'text/markdown', buffer: Buffer.from(markdown) },
    { name: '01.png', mimeType: 'image/png', buffer: picture },
    { name: 'cover.png', mimeType: 'image/png', buffer: picture }
  ]);
  await xp.locator('#wx2x-host #go').waitFor();
  await xp.screenshot({ path: join(output, 'demo-x-preview.png') });
  await browser.close();
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
