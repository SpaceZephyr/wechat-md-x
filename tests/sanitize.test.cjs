const assert = require('node:assert/strict');
const path = require('node:path');
const { chromium } = require('playwright-core');

(async () => {
  const browser = await chromium.launch({
    headless: true,
    executablePath: process.env.CHROME_BIN || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  });
  try {
    const page = await browser.newPage();
    await page.goto('about:blank');
    await page.addScriptTag({ path: path.join(__dirname, '..', 'sanitize.js') });
    const html = await page.evaluate(() => window.WX2X_SANITIZE_HTML(
      '<p>安全<strong>加粗</strong><img src=x onerror="window.pwned=1"></p>' +
      '<p><a href="javascript:alert(1)" onclick="alert(1)">危险链接</a></p>' +
      '<p><a href="https://example.com/?a=1&b=2">安全链接</a></p>' +
      '<script>window.pwned=1</script>'
    ));
    assert.match(html, /<strong>加粗<\/strong>/);
    assert.doesNotMatch(html, /onerror|onclick|javascript:|<script|<img/i);
    assert.match(html, /href="https:\/\/example\.com/);
    assert.equal(await page.evaluate(() => window.pwned), undefined);
    console.log('Markdown HTML sanitizer: passed');
  } finally { await browser.close(); }
})().catch((error) => { console.error(error); process.exitCode = 1; });
