/* 运行在 X 页面的 MAIN world：直接拿到 Draft.js 编辑器实例来写正文。
   做法：整篇正文一次性粘贴（图片位置放占位段落）→ 逐张粘贴图片，让 X 自己上传
   → 新图片块出现后挪到对应占位段落的位置、替换掉占位。文字只粘一次，图片位置由占位决定。 */
(() => {
  if (window.__wx2x_main__) return;
  window.__wx2x_main__ = true;

  const SRC_IN = 'wx2x-iso', SRC_OUT = 'wx2x-main';
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const post = (kind, data = {}) => window.postMessage({ source: SRC_OUT, kind, ...data }, '*');

  const editorEl = () => document.querySelector('[data-testid="composer"]');

  // 顺着 React fiber 往上找持有 editorState 的 Draft 组件
  function draft() {
    const el = editorEl();
    if (!el) return null;
    const key = Object.keys(el).find((k) => k.startsWith('__reactFiber$') || k.startsWith('__reactInternalInstance$'));
    let f = key && el[key];
    for (let i = 0; i < 80 && f; i++) {
      const sn = f.stateNode;
      if (sn && sn.props && sn.props.editorState && typeof sn.props.onChange === 'function') return sn;
      f = f.return;
    }
    return null;
  }
  const state = () => draft().props.editorState;
  const content = () => state().getCurrentContent();
  // 图片块的 key 在上传过程中可能变，用实体里的 localMediaId 认图
  const atomId = (c, b) => {
    const ek = b.getEntityAt(0);
    const d = ek ? c.getEntity(ek).getData() : null;
    const m = d && d.mediaItems && d.mediaItems[0];
    return m && m.localMediaId != null ? 'L' + m.localMediaId : 'K' + b.getKey();
  };
  const atoms = () => {
    const c = content(), out = new Map();
    c.getBlockMap().forEach((b, k) => { if (b.getType() === 'atomic') out.set(atomId(c, b), k); });
    return out;
  };
  const findMarker = (m) => content().getBlockMap().find((b) => b.getType() !== 'atomic' && b.getText().trim() === m);

  async function waitFor(fn, timeout, step = 200) {
    const end = Date.now() + timeout;
    while (Date.now() < end) {
      const v = fn();
      if (v) return v;
      await sleep(step);
    }
    return null;
  }

  // 等 Draft 把一次 onChange 提交完
  async function commit(prev, timeout = 2000) {
    await waitFor(() => state() !== prev, timeout, 30);
  }

  function pasteEvent(dt) {
    const el = editorEl();
    el.focus();
    const ev = new ClipboardEvent('paste', { bubbles: true, cancelable: true, clipboardData: dt });
    if (ev.clipboardData !== dt) Object.defineProperty(ev, 'clipboardData', { value: dt });
    el.dispatchEvent(ev);
  }

  function selectEndOf(block) {
    const sn = draft(), es = sn.props.editorState;
    const ES = es.constructor, SS = es.getSelection().constructor;
    const len = block.getLength();
    const sel = SS.createEmpty(block.getKey()).merge({ anchorOffset: len, focusOffset: len, hasFocus: true });
    sn.props.onChange(ES.forceSelection(es, sel));
    return es;
  }

  function moveToEnd() {
    const sn = draft(), es = sn.props.editorState;
    sn.props.onChange(es.constructor.moveFocusToEnd(es));
    return es;
  }

  function removeBlocks(pred) {
    const sn = draft(), es = sn.props.editorState;
    const ES = es.constructor, SS = es.getSelection().constructor;
    const c = es.getCurrentContent();
    let bm = c.getBlockMap();
    const keys = [];
    bm.forEach((b, k) => { if (b.getType() !== 'atomic' && pred(b)) keys.push(k); });
    if (!keys.length) return null;
    keys.forEach((k) => { bm = bm.delete(k); });
    const sel = SS.createEmpty(bm.last().getKey());
    const next = c.set('blockMap', bm).set('selectionBefore', sel).set('selectionAfter', sel);
    sn.props.onChange(ES.moveSelectionToEnd(ES.push(es, next, 'remove-range')));
    return es;
  }

  // X 上传/处理图片期间会忽略新的图片粘贴
  const BUSY_RE = /Processing media|Uploading|Cancel upload|正在处理|处理媒体|上传中|正在上传|取消上传/i;
  const mediaBusy = () => !!document.querySelector('[role="progressbar"]') ||
    [...document.querySelectorAll('h2, button, [role="button"]')].some((el) => BUSY_RE.test(el.textContent));

  // X 的图片是异步插入的：插在「上传处理完那一刻」光标所在的位置，所以不能靠光标定位。
  // 做法：粘贴后等出现一个新的图片块，再把它挪到占位段落的位置并删掉占位。
  function moveIntoMarker(atomKey, marker) {
    const sn = draft(), es = sn.props.editorState;
    const ES = es.constructor, SS = es.getSelection().constructor;
    const c = es.getCurrentContent();
    const bm = c.getBlockMap();
    const mk = findMarker(marker);
    const atom = bm.get(atomKey);
    if (!mk || !atom) return null;
    const mKey = mk.getKey();
    const next = bm.clear().withMutations((m) => {
      bm.forEach((blk, k) => {
        if (k === atomKey) return;
        if (k === mKey) m.set(atomKey, atom);
        else m.set(k, blk);
      });
    });
    const sel = SS.createEmpty(next.last().getKey());
    const nc = c.set('blockMap', next).set('selectionBefore', sel).set('selectionAfter', sel);
    sn.props.onChange(ES.push(es, nc, 'insert-fragment'));
    return es;
  }

  async function insertImage(marker, file) {
    for (let attempt = 1; attempt <= 3; attempt++) {
      await waitFor(() => !mediaBusy(), 90000, 300);
      if (!findMarker(marker)) return false;
      const known = new Set(atoms().keys());
      const prev = selectEndOf(findMarker(marker));
      await commit(prev);
      await sleep(80);
      const dt = new DataTransfer();
      dt.items.add(file);
      pasteEvent(dt);
      const newId = () => [...atoms().keys()].find((id) => !known.has(id));
      let id = await waitFor(newId, 20000, 150);
      // X 处理完之前不要动编辑器，否则会被它的异步回调覆盖
      await waitFor(() => !mediaBusy(), 90000, 300);
      await sleep(1000);
      id = id || newId();
      if (id) {
        const key = atoms().get(id);
        const p = key && moveIntoMarker(key, marker);
        if (p) await commit(p);
        await sleep(300);
        return true;
      }
    }
    return false;
  }

  // 清掉 X 插图时顺手留下的空段落（最后一个块保留，编辑器需要）
  function removeEmptyBlocks() {
    const c = content();
    const lastKey = c.getBlockMap().last().getKey();
    return removeBlocks((b) => !b.getText().trim() && b.getType() === 'unstyled' && b.getKey() !== lastKey);
  }

  async function run({ html, plain, images, prefix }) {
    const sn = await waitFor(draft, 30000);
    if (!sn) throw new Error('找不到 X 编辑器，请刷新页面后重试');

    post('progress', { msg: '写入正文…', p: 0.05 });
    let prev = moveToEnd();
    await commit(prev);
    const dt = new DataTransfer();
    dt.setData('text/html', `<meta charset="utf-8">${html}`);
    dt.setData('text/plain', plain);
    pasteEvent(dt);

    const markersIn = () => images.filter((im) => findMarker(im.marker)).length;
    if (!(await waitFor(() => (images.length ? markersIn() === images.length : content().hasText()), 8000, 100))) {
      if (!content().hasText()) throw new Error('正文没有写进去，请刷新页面后重试');
    }

    const failed = [];
    for (let i = 0; i < images.length; i++) {
      const im = images[i];
      post('progress', { msg: `插入第 ${i + 1} / ${images.length} 张图…`, p: 0.1 + 0.85 * (i / Math.max(images.length, 1)) });
      const ok = await insertImage(im.marker, im.file);
      if (!ok) failed.push(im.n);
    }

    images.forEach((im) => { if (findMarker(im.marker) && !failed.includes(im.n)) failed.push(im.n); });
    failed.sort((a, b) => a - b);
    // 没插成功的图，占位段落也清掉
    prev = removeBlocks((b) => b.getText().trim().startsWith(prefix));
    if (prev) await commit(prev);
    prev = removeEmptyBlocks();
    if (prev) await commit(prev);
    await waitFor(() => !mediaBusy(), 90000, 300);
    await sleep(1500); // 给 X 自动保存留点时间
    return { failed };
  }

  window.addEventListener('message', (e) => {
    if (e.source !== window || !e.data || e.data.source !== SRC_IN) return;
    if (e.data.kind === 'ping') { post('pong'); return; }
    if (e.data.kind === 'run') {
      run(e.data.payload)
        .then((r) => post('done', r))
        .catch((err) => post('error', { error: String((err && err.message) || err) }));
    }
  });
  post('pong');
})();
