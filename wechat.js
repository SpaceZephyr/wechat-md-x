/* 公众号文章页：抽取正文 → Markdown + 图片，下载到 下载/wechat-to-x/<标题>/ */
(() => {
  if (window.__wx2x_wechat__) return;
  window.__wx2x_wechat__ = true;

  const root = () => document.querySelector('#js_content') || document.querySelector('.rich_media_content');
  if (!root()) return;

  const BLOCK_SEL = 'img,p,section,div,h1,h2,h3,h4,h5,h6,ul,ol,blockquote,pre,table,hr,figure';
  const HEADINGS = { H1: 1, H2: 2, H3: 3, H4: 3, H5: 4, H6: 4 };
  const BLOCK_TAGS = new Set(['P', 'SECTION', 'DIV', 'FIGURE', 'ARTICLE', 'FIELDSET', 'CENTER']);

  const mdEsc = (s) => s.replace(/([*_`\[\]])/g, '\\$1');

  function isBold(el) {
    if (el.tagName === 'STRONG' || el.tagName === 'B') return true;
    const w = el.style && el.style.fontWeight;
    if (!w) return false;
    return w === 'bold' || w === 'bolder' || parseInt(w, 10) >= 600;
  }
  function isItalic(el) {
    if (el.tagName === 'EM' || el.tagName === 'I') return true;
    return !!(el.style && el.style.fontStyle === 'italic');
  }

  /* 行内节点 → {md, text} */
  function inline(node, state = { bold: false, italic: false }) {
    let md = '', text = '';
    for (const n of node.childNodes) {
      if (n.nodeType === 3) {
        const t = n.nodeValue.replace(/\u200b/g, '').replace(/\u00a0/g, ' ');
        if (!t) continue;
        md += mdEsc(t); text += t;
        continue;
      }
      if (n.nodeType !== 1) continue;
      const tag = n.tagName;
      if (tag === 'BR') { md += '  \n'; text += '\n'; continue; }
      if (tag === 'IMG') continue;
      if (tag === 'A') {
        const href = n.getAttribute('href') || '';
        const inner = inline(n, state);
        if (!inner.text.trim()) continue;
        md += /^https?:/.test(href) ? `[${inner.md}](${href})` : inner.md;
        text += inner.text;
        continue;
      }
      if (tag === 'CODE') {
        const t = n.textContent;
        md += '`' + t + '`'; text += t;
        continue;
      }
      const b = !state.bold && isBold(n);
      const i = !state.italic && isItalic(n);
      const inner = inline(n, { bold: state.bold || b, italic: state.italic || i });
      if (!inner.text) continue;
      let m = inner.md;
      // 标记符号不能贴着空白，否则 Markdown 不认
      if ((b || i) && inner.text.trim()) {
        const lead = m.match(/^\s*/)[0], tail = m.match(/\s*$/)[0];
        let core = m.trim();
        if (b) core = `**${core}**`;
        if (i) core = `*${core}*`;
        m = lead + core + tail;
      }
      md += m; text += inner.text;
    }
    return { md, text };
  }

  function imgUrl(el) {
    const u = el.getAttribute('data-src') || el.getAttribute('src') || '';
    if (!u || u.startsWith('data:')) return '';
    return u.startsWith('//') ? 'https:' + u : u;
  }
  function skipImg(el) {
    if (el.closest('.qr_code_pc_outer, .qr_code_pc, #js_pc_qr_code')) return true;
    const w = parseInt(el.getAttribute('data-w') || el.width || '0', 10);
    return !!(w && w <= 2);
  }

  function extractBlocks(rootEl) {
    const blocks = [];
    const push = (b) => {
      if (b.type === 'p' && !b.text.trim()) return;
      const last = blocks[blocks.length - 1];
      if (b.type === 'p' && last && last.type === 'p' && last.text === b.text) return;
      blocks.push(b);
    };
    const emitInline = (node) => {
      const r = inline(node);
      if (!r.text.trim()) return;
      const t = r.text.trim();
      // 整段加粗且较短：公众号常见的小标题写法
      if (/^\*\*[^\n]*\*\*$/.test(r.md.trim()) && t.length <= 42 && !/\*\*.*\*\*.*\*\*/.test(r.md.trim())) {
        push({ type: 'h', level: 3, text: t });
      } else {
        push({ type: 'p', md: r.md.trim(), text: r.text });
      }
    };
    const walk = (node) => {
      let buf = [];
      const flush = () => {
        if (!buf.length) return;
        const holder = document.createElement('div');
        buf.forEach((n) => holder.appendChild(n.cloneNode(true)));
        buf = [];
        emitInline(holder);
      };
      for (const el of node.childNodes) {
        if (el.nodeType === 3) {
          if (el.nodeValue.replace(/[\s\u200b]/g, '')) buf.push(el);
          continue;
        }
        if (el.nodeType !== 1) continue;
        const tag = el.tagName;
        if (tag === 'SCRIPT' || tag === 'STYLE') continue;
        if (el.classList.contains('code-snippet__fix')) {
          flush(); push({ type: 'code', text: el.innerText.replace(/\u200b/g, '') }); continue;
        }
        if (tag === 'IMG') {
          flush();
          if (!skipImg(el)) { const u = imgUrl(el); if (u) push({ type: 'img', url: u, alt: (el.getAttribute('alt') || '').replace(/^(Image|图片|img)$/i, '') }); }
          continue;
        }
        if (tag === 'HR') { flush(); push({ type: 'hr' }); continue; }
        if (tag === 'IFRAME' || tag === 'MPVOICE' || tag === 'MP-COMMON-MPVIDEO') {
          flush(); push({ type: 'embed' }); continue;
        }
        if (HEADINGS[tag]) {
          flush();
          const t = el.innerText.replace(/\u200b/g, '').trim();
          if (t) push({ type: 'h', level: HEADINGS[tag], text: t });
          continue;
        }
        if (tag === 'UL' || tag === 'OL') {
          flush();
          const items = [];
          for (const li of el.querySelectorAll(':scope > li')) {
            const r = inline(li);
            if (r.text.trim()) items.push(r.md.trim().replace(/\s*\n\s*/g, ' '));
          }
          if (items.length) push({ type: 'list', ordered: tag === 'OL', items });
          continue;
        }
        if (tag === 'BLOCKQUOTE') {
          flush();
          if (el.querySelector(BLOCK_SEL)) {
            const sub = extractBlocks(el).filter((b) => b.type === 'p' || b.type === 'h');
            if (sub.length) push({ type: 'quote', md: sub.map((b) => b.md || b.text).join('\n\n') });
            else walk(el);
          } else {
            const r = inline(el);
            if (r.text.trim()) push({ type: 'quote', md: r.md.trim() });
          }
          continue;
        }
        if (tag === 'PRE') { flush(); push({ type: 'code', text: el.innerText }); continue; }
        if (tag === 'TABLE') {
          flush();
          const rows = [...el.rows].map((tr) => [...tr.cells].map((c) => c.innerText.replace(/\s+/g, ' ').trim()));
          if (rows.length) push({ type: 'table', rows });
          continue;
        }
        if (el.querySelector(BLOCK_SEL)) { flush(); walk(el); continue; }
        if (BLOCK_TAGS.has(tag)) { flush(); emitInline(el); continue; }
        buf.push(el);
      }
      flush();
    };
    walk(rootEl);
    while (blocks.length && blocks[0].type === 'hr') blocks.shift();
    while (blocks.length && blocks[blocks.length - 1].type === 'hr') blocks.pop();
    return blocks;
  }

  function meta() {
    const txt = (sel) => {
      const el = document.querySelector(sel);
      return el ? (el.innerText || el.textContent || '').trim() : '';
    };
    const m = (sel) => (document.querySelector(sel) || {}).content || '';
    return {
      url: m('meta[property="og:url"]') || location.href,
      title: (txt('#activity-name') || txt('.rich_media_title') || m('meta[property="og:title"]') || document.title).trim(),
      account: txt('#js_name'),
      author: txt('#js_author_name') || txt('#meta_content .rich_media_meta_text') || m('meta[name="author"]'),
      date: txt('#publish_time'),
      cover: m('meta[property="og:image"]')
    };
  }

  /* ---------- Markdown ---------- */
  const yamlStr = (s) => JSON.stringify(s || '');

  function buildMarkdown(info, blocks, imgPath, coverPath) {
    const fm = ['---', `title: ${yamlStr(info.title)}`];
    if (info.author) fm.push(`author: ${yamlStr(info.author)}`);
    if (info.account) fm.push(`account: ${yamlStr(info.account)}`);
    if (info.date) fm.push(`date: ${yamlStr(info.date)}`);
    fm.push(`source: ${yamlStr(info.url)}`);
    if (coverPath) fm.push(`cover: ${yamlStr(coverPath)}`);
    fm.push('---', '');

    const out = [];
    for (const b of blocks) {
      switch (b.type) {
        case 'h': out.push((b.level <= 2 ? '## ' : '### ') + b.text.replace(/\s*\n\s*/g, ' ')); break;
        case 'p': out.push(b.md); break;
        case 'quote': out.push(b.md.split('\n').map((l) => '> ' + l).join('\n').replace(/> $/gm, '>')); break;
        case 'list': out.push(b.items.map((t, k) => (b.ordered ? `${k + 1}. ` : '- ') + t).join('\n')); break;
        case 'code': out.push('```\n' + b.text.replace(/\n+$/, '') + '\n```'); break;
        case 'table': {
          const cols = Math.max(...b.rows.map((r) => r.length));
          const line = (r) => '| ' + Array.from({ length: cols }, (_, i) => (r[i] || '').replace(/\|/g, '\\|')).join(' | ') + ' |';
          out.push([line(b.rows[0]), '|' + ' --- |'.repeat(cols), ...b.rows.slice(1).map(line)].join('\n'));
          break;
        }
        case 'hr': out.push('---'); break;
        case 'embed': out.push('> （原文此处有视频/音频）'); break;
        case 'img': {
          const p = imgPath.get(b);
          if (p) out.push(`![${mdEsc(b.alt)}](${p})`);
          break;
        }
      }
    }
    return fm.join('\n') + '\n' + out.join('\n\n') + '\n';
  }

  /* ---------- 抓图 ---------- */
  const EXT = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/gif': 'gif', 'image/webp': 'webp', 'image/svg+xml': 'svg', 'image/bmp': 'bmp' };
  function guessExt(type, url) {
    if (EXT[type]) return EXT[type];
    const f = (url.match(/wx_fmt=(\w+)/) || [])[1];
    if (f) return f === 'jpeg' ? 'jpg' : f;
    return 'jpg';
  }

  async function blobToDataUrl(blob) {
    return new Promise((ok, no) => {
      const fr = new FileReader();
      fr.onload = () => ok(fr.result);
      fr.onerror = () => no(new Error('读取失败'));
      fr.readAsDataURL(blob);
    });
  }

  async function fetchImage(url) {
    try {
      const res = await fetch(url, { credentials: 'omit' });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const blob = await res.blob();
      return { dataUrl: await blobToDataUrl(blob), type: blob.type };
    } catch (e) {
      const r = await chrome.runtime.sendMessage({ type: 'wx2x:fetch', url });
      if (!r || !r.ok) throw new Error((r && r.error) || e.message);
      return r;
    }
  }

  const safeName = (s) => (s || '未命名')
    .replace(/[\\/:*?"<>|\u0000-\u001f]/g, ' ')
    .replace(/[\s.]+$/g, '').replace(/^[\s.]+/g, '')
    .replace(/\s+/g, ' ').slice(0, 60).trim() || '未命名';

  /* ---------- UI ---------- */
  const { esc } = window.WX2X_UI;
  const ui = window.WX2X_UI.create({
    fabLabel: '⬇ 下载 Markdown',
    panelTitle: '公众号 → Markdown',
    onFab: () => run()
  });
  let busy = false;

  async function run() {
    if (busy) { ui.open(); return; }
    busy = true;
    ui.open();
    const body = ui.body;
    body.innerHTML = `<div class="muted">正在解析正文…</div>`;
    try {
      const info = meta();
      const blocks = extractBlocks(root());
      const imgs = blocks.filter((b) => b.type === 'img');
      const folder = safeName(info.title);
      body.innerHTML = `<div class="title">${esc(info.title)}</div>
        <div class="muted" id="st">下载图片 0 / ${imgs.length}</div>
        <div class="bar"><i id="pb"></i></div>`;
      const st = ui.shadow.querySelector('#st'), pb = ui.shadow.querySelector('#pb');

      const files = [];
      const imgPath = new Map();
      const failed = [];
      const pad = String(imgs.length).length < 2 ? 2 : String(imgs.length).length;
      let n = 0;
      for (const b of imgs) {
        n++;
        try {
          const r = await fetchImage(b.url);
          const path = `images/${String(n).padStart(pad, '0')}.${guessExt(r.type, b.url)}`;
          files.push({ path, dataUrl: r.dataUrl });
          imgPath.set(b, path);
        } catch (e) {
          failed.push(n);
          imgPath.set(b, b.url); // 抓不到就保留远程地址
        }
        st.textContent = `下载图片 ${n} / ${imgs.length}`;
        pb.style.width = (n / Math.max(imgs.length, 1) * 90) + '%';
      }

      let coverPath = '';
      if (info.cover) {
        try {
          const r = await fetchImage(info.cover);
          coverPath = `images/cover.${guessExt(r.type, info.cover)}`;
          files.push({ path: coverPath, dataUrl: r.dataUrl });
        } catch (e) { /* 封面可有可无 */ }
      }

      st.textContent = '写入文件…';
      const markdown = buildMarkdown(info, blocks, imgPath, coverPath);
      const r = await chrome.runtime.sendMessage({
        type: 'wx2x:save', folder, mdName: folder + '.md', markdown, images: files
      });
      if (!r || !r.ok) throw new Error((r && r.error) || '保存失败');
      pb.style.width = '100%';

      const chars = blocks.reduce((s, b) => s + (b.text || b.md || '').length, 0);
      body.innerHTML = `<div class="title">${esc(info.title)}</div>
        <div class="ok">✓ 已保存 ${imgs.length - failed.length} 张图${coverPath ? ' + 封面' : ''}，约 ${chars} 字</div>
        <div class="muted" style="margin-top:6px"><code>${esc(r.path)}</code></div>
        ${failed.length ? `<div class="err" style="margin-top:6px">第 ${failed.join('、')} 张图下载失败，Markdown 里保留了原图链接</div>` : ''}
        <div class="row"><button class="ghost" id="show">在 Finder 中显示</button></div>
        <div class="muted" style="margin-top:10px">到 X 的文章编辑器（x.com/compose/articles），点右下角「导入 Markdown」，选这个文件夹即可。</div>`;
      ui.shadow.querySelector('#show').onclick = () => chrome.runtime.sendMessage({ type: 'wx2x:show', id: r.id });
    } catch (e) {
      body.innerHTML = `<div class="err">出错了：${esc(e.message)}</div>
        <div class="row"><button class="ghost" id="retry">重试</button></div>`;
      ui.shadow.querySelector('#retry').onclick = () => run();
    } finally {
      busy = false;
    }
  }

  chrome.runtime.onMessage.addListener((msg) => {
    if (msg.type === 'wx2x:toggle') run();
  });
})();
