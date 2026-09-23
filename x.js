/* X 页面：导入本地 Markdown 文件夹 → 新建 X 文章草稿（标题、封面、正文、图片） */
(() => {
  if (window.__wx2x_x__) return;
  window.__wx2x_x__ = true;

  const { esc } = window.WX2X_UI;
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const isArticlesPage = () => /^\/compose\/articles/.test(location.pathname);

  /* ================= 读取本地文件 ================= */

  // 统一成 [{ path: 'a/b/c.png', file }]
  async function entriesFromDrop(items) {
    const out = [];
    const readAll = (reader) => new Promise((ok, no) => {
      const all = [];
      const next = () => reader.readEntries((batch) => {
        if (!batch.length) return ok(all);
        all.push(...batch); next();
      }, no);
      next();
    });
    const walk = async (entry, prefix) => {
      if (entry.isFile) {
        const file = await new Promise((ok, no) => entry.file(ok, no));
        out.push({ path: prefix + entry.name, file });
      } else if (entry.isDirectory) {
        for (const e of await readAll(entry.createReader())) await walk(e, prefix + entry.name + '/');
      }
    };
    const roots = [...items].map((it) => it.webkitGetAsEntry && it.webkitGetAsEntry()).filter(Boolean);
    for (const e of roots) await walk(e, '');
    return out;
  }
  const entriesFromInput = (files) => [...files].map((file) => ({ path: file.webkitRelativePath || file.name, file }));

  const normPath = (p) => {
    const parts = [];
    for (const seg of p.replace(/\\/g, '/').split('/')) {
      if (!seg || seg === '.') continue;
      if (seg === '..') parts.pop(); else parts.push(seg);
    }
    return parts.join('/');
  };
  const dirname = (p) => p.includes('/') ? p.slice(0, p.lastIndexOf('/')) : '';
  const basename = (p) => p.slice(p.lastIndexOf('/') + 1);

  /* ================= 解析 Markdown ================= */

  function parseFrontMatter(src) {
    const m = src.match(/^\uFEFF?---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
    if (!m) return { fm: {}, body: src };
    const fm = {};
    for (const line of m[1].split(/\r?\n/)) {
      const kv = line.match(/^([\w-]+):\s*(.*)$/);
      if (!kv) continue;
      let v = kv[2].trim();
      if (/^".*"$/.test(v)) { try { v = JSON.parse(v); } catch (e) { v = v.slice(1, -1); } }
      else if (/^'.*'$/.test(v)) v = v.slice(1, -1).replace(/''/g, "'");
      fm[kv[1].toLowerCase()] = v;
    }
    return { fm, body: src.slice(m[0].length) };
  }

  /* CommonMark 的定界规则对中文不友好：`用**加粗（注）**和` 这种写法，
     结尾的 ** 前面是标点、后面是汉字，会被当成普通字符原样显示。
     这里先把 **x** / *x* 换成 <strong>/<em>，代码块和行内代码不动。 */
  function fixCjkEmphasis(md) {
    let fence = null;
    return md.split('\n').map((line) => {
      const f = line.match(/^\s*(`{3,}|~{3,})/);
      if (f) {
        if (!fence) fence = f[1][0];
        else if (f[1][0] === fence) fence = null;
        return line;
      }
      if (fence || /^( {4}|\t)/.test(line)) return line;
      return line.split(/(`+[^`]*`+)/).map((part, i) => {
        if (i % 2) return part;
        return part
          .replace(/(^|[^\\*])\*\*(?=\S)([^*\n]*?[^\s\\*])\*\*(?!\*)/g, '$1<strong>$2</strong>')
          .replace(/(^|[^\\*])\*(?=[^\s*])([^*\n]*?[^\s\\*])\*(?!\*)/g, '$1<em>$2</em>');
      }).join('');
    }).join('\n');
  }

  const escHtml = (s = '') => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  /* Markdown → 片段序列：{type:'html', html} | {type:'img', src, alt}
     X 文章编辑器（Draft.js）只认 h1/h2、段落、列表、引用、粗斜体、链接；
     h3+ 会变普通段落、表格和分割线会丢，所以在这里先降级好。 */
  function mdToSegments(md) {
    const { fm, body } = parseFrontMatter(md);
    // Obsidian 的 ![[图片]] 语法
    const src = body.replace(/!\[\[([^\]|]+?)(?:\|[^\]]*)?\]\]/g, (_, p) => `![](${encodeURI(p.trim())})`);
    let tokens = marked.lexer(fixCjkEmphasis(src));
    const parser = new marked.Parser();
    const inlineHtml = (toks) => parser.parseInline(toks || []);

    let title = fm.title || '';
    const firstIdx = tokens.findIndex((t) => t.type !== 'space');
    const first = tokens[firstIdx];
    if (first && first.type === 'heading' && first.depth === 1 && (!title || first.text.trim() === title.trim())) {
      title = title || first.text.trim();
      tokens = tokens.filter((_, i) => i !== firstIdx);
    }

    const segs = [];
    const addHtml = (html) => {
      if (!html || !html.replace(/<[^>]+>/g, '').replace(/&nbsp;|\s/g, '')) return;
      const last = segs[segs.length - 1];
      if (last && last.type === 'html') last.html += html; else segs.push({ type: 'html', html });
    };
    const addImg = (src, alt) => segs.push({ type: 'img', src, alt: alt || '' });

    const imgInLink = (t) => t.type === 'link' && t.tokens && t.tokens.length === 1 && t.tokens[0].type === 'image';

    for (const t of tokens) {
      switch (t.type) {
        case 'space': break;
        case 'heading': {
          const tag = t.depth === 1 ? 'h1' : 'h2';
          addHtml(`<${tag}>${escHtml(t.text.replace(/[*_`]/g, ''))}</${tag}>`);
          break;
        }
        case 'paragraph': {
          let buf = [];
          const flush = () => { if (buf.length) addHtml(`<p>${inlineHtml(buf).trim()}</p>`); buf = []; };
          for (const it of t.tokens) {
            if (it.type === 'image') { flush(); addImg(it.href, it.text); }
            else if (imgInLink(it)) { flush(); addImg(it.tokens[0].href, it.tokens[0].text); }
            else if (it.type === 'html' && /<img\b/i.test(it.raw)) {
              flush();
              const s = it.raw.match(/\bsrc\s*=\s*["']([^"']+)["']/i);
              if (s) addImg(s[1], '');
            } else buf.push(it);
          }
          flush();
          break;
        }
        case 'html': {
          const parts = t.raw.split(/(<img\b[^>]*>)/i);
          for (const p of parts) {
            if (/^<img\b/i.test(p)) {
              const s = p.match(/\bsrc\s*=\s*["']([^"']+)["']/i);
              if (s) addImg(s[1], (p.match(/\balt\s*=\s*["']([^"']*)["']/i) || [])[1]);
            } else addHtml(p);
          }
          break;
        }
        case 'table': {
          const cell = (c) => inlineHtml(c.tokens);
          addHtml(`<p><strong>${t.header.map(cell).join(' ｜ ')}</strong></p>`);
          for (const row of t.rows) addHtml(`<p>${row.map(cell).join(' ｜ ')}</p>`);
          break;
        }
        case 'hr': addHtml('<p>———</p>'); break;
        case 'code': addHtml(`<pre>${escHtml(t.text)}</pre>`); break;
        default: {
          // list / blockquote 等交给 marked 渲染，再把里面的 h3+ 压成 h2、img 抽出来
          let html = parser.parse([t]).replace(/<(\/?)h[3-6]\b[^>]*>/gi, '<$1h2>');
          const parts = html.split(/(<img\b[^>]*>)/i);
          for (const p of parts) {
            if (/^<img\b/i.test(p)) {
              const s = p.match(/\bsrc\s*=\s*["']([^"']+)["']/i);
              if (s) addImg(s[1].replace(/&amp;/g, '&'), '');
            } else addHtml(p);
          }
        }
      }
    }
    return { title, fm, segs };
  }

  /* ================= 图片处理 ================= */

  const OK_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);
  const MAX_BYTES = 5 * 1024 * 1024;
  const MIME = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', gif: 'image/gif', webp: 'image/webp', svg: 'image/svg+xml', bmp: 'image/bmp', avif: 'image/avif' };

  async function decode(blob) {
    try { return await createImageBitmap(blob); } catch (e) {
      // SVG 等 createImageBitmap 不支持的，走 <img>
      const url = URL.createObjectURL(blob);
      try {
        const img = new Image();
        img.src = url;
        await img.decode();
        return img;
      } finally { URL.revokeObjectURL(url); }
    }
  }

  async function reencode(blob, type, quality) {
    const bmp = await decode(blob);
    const w = bmp.width || bmp.naturalWidth, h = bmp.height || bmp.naturalHeight;
    const scale = Math.min(1, 4096 / Math.max(w, h));
    const c = document.createElement('canvas');
    c.width = Math.round(w * scale); c.height = Math.round(h * scale);
    const g = c.getContext('2d');
    if (type === 'image/jpeg') { g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height); }
    g.drawImage(bmp, 0, 0, c.width, c.height);
    return await new Promise((ok) => c.toBlob(ok, type, quality));
  }

  // 保证 X 能接收：格式 jpg/png/webp/gif，体积不超过 5MB（GIF 不动）
  async function prepareImage(file, name) {
    let blob = file;
    let type = file.type || MIME[(name.split('.').pop() || '').toLowerCase()] || '';
    if (!OK_TYPES.has(type)) { blob = await reencode(file, 'image/png'); type = 'image/png'; }
    if (type !== 'image/gif' && blob.size > MAX_BYTES) {
      for (const q of [0.9, 0.8, 0.7, 0.6]) {
        blob = await reencode(file, 'image/jpeg', q); type = 'image/jpeg';
        if (blob.size <= MAX_BYTES) break;
      }
    }
    const ext = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif' }[type];
    return new File([blob], name.replace(/\.[^.]+$/, '') + '.' + ext, { type });
  }

  async function fetchRemote(url) {
    try {
      const res = await fetch(url, { credentials: 'omit' });
      if (res.ok) return await res.blob();
    } catch (e) { /* 跨域失败再交给后台 */ }
    const r = await chrome.runtime.sendMessage({ type: 'wx2x:fetch', url });
    if (!r || !r.ok) throw new Error((r && r.error) || '下载失败');
    return await (await fetch(r.dataUrl)).blob();
  }

  /* ================= 组装一篇文章 ================= */

  async function loadArticle(entries, mdEntry) {
    const text = await mdEntry.file.text();
    const { title, fm, segs } = mdToSegments(text);
    const mdDir = dirname(mdEntry.path);
    const byPath = new Map(entries.map((e) => [normPath(e.path).toLowerCase(), e]));
    const byName = new Map();
    for (const e of entries) {
      const k = basename(e.path).toLowerCase();
      byName.set(k, byName.has(k) ? null : e); // 重名就不做模糊匹配
    }

    const resolve = async (src) => {
      let s = (src || '').trim().replace(/^<|>$/g, '');
      if (/^https?:\/\//i.test(s) || s.startsWith('//')) {
        const url = s.startsWith('//') ? 'https:' + s : s;
        const blob = await fetchRemote(url);
        const name = basename(new URL(url).pathname) || 'image';
        return new File([blob], /\.\w+$/.test(name) ? name : name + '.' + ((blob.type.split('/')[1] || 'png').replace('jpeg', 'jpg')), { type: blob.type });
      }
      if (/^data:/i.test(s)) {
        const blob = await (await fetch(s)).blob();
        return new File([blob], 'image', { type: blob.type });
      }
      s = s.replace(/[?#].*$/, '');
      try { s = decodeURIComponent(s); } catch (e) { /* 保持原样 */ }
      const hit = byPath.get(normPath(mdDir + '/' + s).toLowerCase())
        || byPath.get(normPath(s).toLowerCase())
        || byName.get(basename(s).toLowerCase());
      if (!hit) throw new Error('文件夹里找不到 ' + s);
      return hit.file;
    };

    const missing = [];
    let n = 0;
    for (const seg of segs) {
      if (seg.type !== 'img') continue;
      seg.n = ++n;
      try {
        const f = await resolve(seg.src);
        seg.file = await prepareImage(f, f.name || `image-${n}`);
      } catch (e) {
        missing.push({ n, src: seg.src, why: e.message });
      }
    }

    let cover = null;
    if (fm.cover) {
      try { const f = await resolve(fm.cover); cover = await prepareImage(f, f.name || 'cover.jpg'); }
      catch (e) { missing.push({ n: '封面', src: fm.cover, why: e.message }); }
    }

    const finalTitle = (title || basename(mdEntry.path).replace(/\.(md|markdown)$/i, '')).trim();
    const chars = segs.filter((s) => s.type === 'html')
      .reduce((a, s) => a + s.html.replace(/<[^>]+>/g, '').replace(/\s/g, '').length, 0);
    return { title: finalTitle, cover, segs, missing, chars, imgCount: n, source: fm.source || '' };
  }

  /* ================= 操作 X 编辑器 ================= */

  const q = (s) => document.querySelector(s);
  const composer = () => q('[data-testid="composer"]');
  const titleBox = () => q('[data-testid="twitter-article-title"] textarea') || q('textarea[placeholder="Add a title"]');

  async function waitFor(fn, timeout = 15000, step = 200) {
    const end = Date.now() + timeout;
    while (Date.now() < end) {
      const v = fn();
      if (v) return v;
      await sleep(step);
    }
    return null;
  }

  const isEmptyDraft = () => {
    const ed = composer(), tb = titleBox();
    if (!ed || !tb) return false;
    return !tb.value.trim() && !ed.innerText.trim() && !ed.querySelector('section, img');
  };
  const draftId = () => (location.pathname.match(/\/compose\/articles\/edit\/(\d+)/) || [])[1] || '';

  function findCreateButton() {
    const labels = ['create', 'Create', '创建', '新建', '撰写', 'Write', '写作'];
    for (const l of labels) {
      const b = q(`[aria-label="${l}"]`);
      if (b) return b;
    }
    return [...document.querySelectorAll('button, [role="button"]')]
      .find((b) => /^(Write|写作|撰写|写文章)$/.test(b.innerText.trim())) || null;
  }

  async function ensureEmptyDraft(log) {
    if (draftId()) {
      await waitFor(() => composer() && titleBox(), 45000);
      if (isEmptyDraft()) return;
    }
    log('新建草稿…');
    const before = draftId();
    const btn = await waitFor(findCreateButton, 8000);
    if (!btn) throw new Error('没找到 X 的「新建文章」按钮，请手动新建一篇空白文章后再点导入');
    btn.click();
    const ok = await waitFor(() => draftId() && draftId() !== before && isEmptyDraft(), 45000);
    if (!ok) throw new Error('新建草稿超时，请手动新建一篇空白文章后再点导入');
    await sleep(600);
  }

  function setTitle(text) {
    const tb = titleBox();
    if (!tb) throw new Error('找不到标题输入框');
    tb.focus();
    Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set.call(tb, text);
    tb.dispatchEvent(new Event('input', { bubbles: true }));
    tb.blur();
  }

  async function setCover(file) {
    const inp = q('input[data-testid="fileInput"]');
    if (!inp) throw new Error('找不到封面上传入口');
    const dt = new DataTransfer();
    dt.items.add(file);
    inp.files = dt.files;
    inp.dispatchEvent(new Event('change', { bubbles: true }));
    const apply = await waitFor(() => q('[data-testid="applyButton"]'), 20000);
    if (!apply) throw new Error('裁剪框没出现');
    await sleep(400);
    apply.click();
    await waitFor(() => !q('[data-testid="applyButton"]'), 10000);
    await sleep(500);
  }

  /* 正文和图片交给 MAIN world 的 x-main.js：它能直接操作 Draft 编辑器实例 */
  function callMain(payload, onProgress) {
    return new Promise((resolve, reject) => {
      const onMsg = (e) => {
        if (e.source !== window || !e.data || e.data.source !== 'wx2x-main') return;
        const d = e.data;
        if (d.kind === 'progress') onProgress(d.msg, d.p);
        else if (d.kind === 'done') { window.removeEventListener('message', onMsg); resolve(d); }
        else if (d.kind === 'error') { window.removeEventListener('message', onMsg); reject(new Error(d.error)); }
      };
      window.addEventListener('message', onMsg);
      window.postMessage({ source: 'wx2x-iso', kind: 'run', payload }, '*');
    });
  }

  function buildPayload(art) {
    const prefix = 'WX2XIMG' + Math.random().toString(36).slice(2, 8).toUpperCase() + '_';
    const images = [];
    let html = '';
    for (const seg of art.segs) {
      if (seg.type === 'html') html += seg.html;
      else if (seg.file) {
        const marker = prefix + seg.n;
        html += `<p>${marker}</p>`;
        images.push({ marker, file: seg.file, n: seg.n });
      }
    }
    const safeHtml = window.WX2X_SANITIZE_HTML(html);
    const d = document.createElement('div');
    d.innerHTML = safeHtml;
    return { html: safeHtml, plain: d.innerText, images, prefix };
  }

  async function importArticle(art, { onProgress }) {
    await ensureEmptyDraft((m) => onProgress(m, 0));

    setTitle(art.title);
    onProgress('已填标题', 0.02);
    await sleep(400);

    const warnings = [];
    if (art.cover) {
      onProgress('上传封面…', 0.03);
      try {
        await setCover(art.cover);
      } catch (e) {
        warnings.push('封面没设置上（' + e.message + '），可以手动上传 images 里的 cover 图');
      }
    }

    const { failed } = await callMain(buildPayload(art), onProgress);
    if (failed && failed.length) warnings.push(`第 ${failed.join('、')} 张图没插进去，可以手动补上`);
    return { warnings };
  }

  /* ================= 面板 ================= */

  const ui = window.WX2X_UI.create({
    fabLabel: '⬆ 导入 Markdown',
    panelTitle: 'Markdown → X 文章',
    onFab: () => (ui.isOpen() ? ui.close() : openPicker())
  });
  let ARTICLE = null;
  let busy = false;

  const syncFab = () => ui.showFab(isArticlesPage());
  syncFab();
  setInterval(syncFab, 1000);

  function $(s) { return ui.shadow.querySelector(s); }

  function openPicker(msg) {
    if (busy) { ui.open(); return; }
    ARTICLE = null;
    ui.open();
    ui.body.innerHTML = `
      ${msg ? `<div class="err" style="margin-bottom:8px">${esc(msg)}</div>` : ''}
      <div class="drop" id="drop">
        <div style="font-weight:600">把文章文件夹拖到这里</div>
        <div class="muted">或点击选择文件夹（里面有 .md 和 images/）</div>
      </div>
      <div class="row"><button class="ghost" id="pickFiles">只选 .md 和图片文件</button></div>
      <input type="file" id="dir" webkitdirectory hidden>
      <input type="file" id="files" multiple accept=".md,.markdown,image/*" hidden>
      ${isArticlesPage() ? '' : `<div class="muted" style="margin-top:10px">导入需要在 X 的文章编辑器里进行：<a id="goArticles">打开 x.com/compose/articles</a></div>`}`;
    const drop = $('#drop'), dir = $('#dir'), files = $('#files');
    drop.onclick = () => dir.click();
    $('#pickFiles').onclick = () => files.click();
    dir.onchange = () => dir.files.length && intake(entriesFromInput(dir.files));
    files.onchange = () => files.files.length && intake(entriesFromInput(files.files));
    drop.ondragover = (e) => { e.preventDefault(); drop.classList.add('over'); };
    drop.ondragleave = () => drop.classList.remove('over');
    drop.ondrop = async (e) => {
      e.preventDefault(); drop.classList.remove('over');
      intake(await entriesFromDrop(e.dataTransfer.items));
    };
    const go = $('#goArticles');
    if (go) go.onclick = () => { location.href = 'https://x.com/compose/articles'; };
  }

  async function intake(entries, chosen) {
    const mds = entries.filter((e) => /\.(md|markdown)$/i.test(e.path) && !basename(e.path).startsWith('.'));
    if (!mds.length) return openPicker('没有找到 .md 文件');
    let md = chosen || mds[0];
    if (!chosen && mds.length > 1) {
      // 优先与所在文件夹同名的那个
      md = mds.find((e) => basename(e.path).replace(/\.\w+$/, '') === basename(dirname(e.path))) || mds[0];
    }
    ui.body.innerHTML = `<div class="muted">读取 ${esc(basename(md.path))}…</div>`;
    try {
      ARTICLE = await loadArticle(entries, md);
    } catch (e) {
      return openPicker('解析失败：' + e.message);
    }
    renderPreview(entries, mds, md);
  }

  function renderPreview(entries, mds, md) {
    const a = ARTICLE;
    const ok = a.imgCount - a.missing.filter((m) => m.n !== '封面').length;
    ui.body.innerHTML = `
      ${a.cover ? `<img class="cover" id="cv">` : ''}
      <div class="title">${esc(a.title)}</div>
      <div class="muted">${a.chars} 字 · 图片 ${ok}/${a.imgCount}${a.cover ? ' · 含封面' : ''}</div>
      ${mds.length > 1 ? `<select id="mdSel">${mds.map((m, i) => `<option value="${i}" ${m === md ? 'selected' : ''}>${esc(m.path)}</option>`).join('')}</select>` : ''}
      ${a.missing.length ? `<ul class="list err">${a.missing.map((m) => `<li>${m.n === '封面' ? '封面' : '图 ' + m.n}：${esc(m.why)}</li>`).join('')}</ul>` : ''}
      <div class="row" style="margin-top:12px"><button class="primary" id="go">导入到 X 草稿</button></div>
      <div class="row"><button class="ghost" id="back">换一篇</button></div>
      <div class="muted" style="margin-top:8px">会新建一篇草稿，不会动你已有的草稿。导入过程中别操作页面。</div>`;
    if (a.cover) {
      const url = URL.createObjectURL(a.cover);
      $('#cv').src = url;
    }
    const sel = $('#mdSel');
    if (sel) sel.onchange = () => intake(entries, mds[+sel.value]);
    $('#back').onclick = () => openPicker();
    $('#go').onclick = () => runImport();
    if (!isArticlesPage()) {
      $('#go').disabled = true;
      $('#go').textContent = '请先打开 X 文章编辑器';
    }
  }

  async function runImport() {
    if (busy || !ARTICLE) return;
    busy = true;
    ui.body.innerHTML = `
      <div class="title">${esc(ARTICLE.title)}</div>
      <div class="bar"><i id="pb"></i></div>
      <div class="muted" id="st">准备中…</div>`;
    const pb = $('#pb'), st = $('#st');
    try {
      const { warnings } = await importArticle(ARTICLE, {
        onProgress: (msg, p) => { st.textContent = msg; pb.style.width = Math.round(p * 100) + '%'; }
      });
      pb.style.width = '100%';
      const skipped = ARTICLE.missing.filter((m) => m.n !== '封面').length;
      ui.body.innerHTML = `
        <div class="title">${esc(ARTICLE.title)}</div>
        <div class="ok">✓ 已导入到草稿，X 会自动保存</div>
        ${skipped ? `<div class="err" style="margin-top:6px">有 ${skipped} 张图没找到，已跳过，可以手动补上</div>` : ''}
        ${warnings.map((w) => `<div class="err" style="margin-top:6px">${esc(w)}</div>`).join('')}
        <div class="muted" style="margin-top:8px">发布前用 X 的「预览」检查一遍排版。</div>
        <div class="row"><button class="ghost" id="again">再导入一篇</button></div>`;
      $('#again').onclick = () => openPicker();
    } catch (e) {
      ui.body.innerHTML = `
        <div class="err">导入中断：${esc(e.message)}</div>
        <div class="muted" style="margin-top:6px">已写入的内容保留在当前草稿里。</div>
        <div class="row"><button class="ghost" id="again">重新选择</button></div>`;
      $('#again').onclick = () => openPicker();
    } finally {
      busy = false;
    }
  }

  chrome.runtime.onMessage.addListener((msg) => {
    if (msg.type === 'wx2x:toggle') ui.isOpen() ? ui.close() : openPicker();
  });

})();
