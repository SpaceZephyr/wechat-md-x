/* 公众号页和 X 页共用的浮动按钮 + 面板（Shadow DOM，样式不受页面影响） */
(() => {
  if (window.WX2X_UI) return;

  const CSS = `
  :host { all: initial; }
  * { box-sizing: border-box; font-family: -apple-system, BlinkMacSystemFont, "PingFang SC", "Helvetica Neue", sans-serif; }
  .wrap {
    --bg: #090a0c; --fg: #f4f6f8; --muted: #a2abb4; --line: #343a40; --soft: #171a1e;
    --accent: #f4f6f8; --accent-fg: #090a0c; --ok: #72e4c1; --err: #ff8c9d;
    position: fixed; right: 20px; bottom: 24px; z-index: 2147483000;
    display: flex; flex-direction: column; align-items: flex-end; gap: 10px;
    color: var(--fg); font-size: 14px; line-height: 1.5;
  }
  .fab {
    border: 0; border-radius: 999px; padding: 10px 16px; cursor: pointer;
    background: var(--fg); color: var(--bg); font-size: 14px; font-weight: 600;
    box-shadow: 0 4px 24px rgba(0,0,0,.38), 0 0 0 1px rgba(255,255,255,.16);
  }
  .fab:hover { opacity: .9; }
  .fab[hidden] { display: none; }
  .panel {
    width: 360px; max-height: 70vh; overflow: auto;
    background: var(--bg); border: 1px solid var(--line); border-radius: 14px;
    box-shadow: 0 16px 56px rgba(0,0,0,.55), 0 0 0 1px rgba(255,255,255,.04); padding: 16px;
  }
  .panel[hidden] { display: none; }
  .head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; }
  .head b { font-size: 15px; }
  .x { border: 0; background: none; color: var(--muted); font-size: 18px; cursor: pointer; padding: 0 4px; }
  .muted { color: var(--muted); font-size: 13px; }
  .err { color: var(--err); }
  .ok { color: var(--ok); }
  button.primary, button.ghost {
    width: 100%; border-radius: 999px; padding: 10px 14px; font-size: 14px; font-weight: 600; cursor: pointer;
  }
  button.primary { border: 0; background: var(--accent); color: var(--accent-fg); }
  button.primary:disabled { opacity: .5; cursor: default; }
  button.ghost { border: 1px solid var(--line); background: transparent; color: var(--fg); }
  .row { display: flex; gap: 8px; margin-top: 8px; }
  .drop {
    border: 1.5px dashed var(--line); border-radius: 12px; padding: 22px 12px; text-align: center;
    background: var(--soft); cursor: pointer;
  }
  .drop.over { border-color: var(--accent); }
  .title { font-size: 16px; font-weight: 700; margin: 4px 0 6px; word-break: break-word; }
  .cover { width: 100%; aspect-ratio: 5 / 2; object-fit: cover; border-radius: 8px; display: block; margin-bottom: 8px; background: var(--soft); }
  .list { margin: 8px 0 0; padding-left: 18px; font-size: 13px; color: var(--muted); }
  .bar { height: 4px; background: var(--soft); border-radius: 2px; overflow: hidden; margin: 10px 0 6px; }
  .bar i { display: block; height: 100%; width: 0; background: var(--accent); transition: width .2s; }
  select { width: 100%; padding: 6px; border-radius: 8px; border: 1px solid var(--line); background: var(--bg); color: var(--fg); margin-top: 6px; }
  code { background: var(--soft); padding: 1px 4px; border-radius: 4px; font-size: 12px; word-break: break-all; }
  a { color: var(--accent); cursor: pointer; }
  `;

  function create({ fabLabel, panelTitle, onFab }) {
    const host = document.createElement('div');
    host.id = 'wx2x-host';
    const shadow = host.attachShadow({ mode: 'open' });
    shadow.innerHTML = `<style>${CSS}</style>
      <div class="wrap">
        <div class="panel" hidden>
          <div class="head"><b></b><button class="x" title="关闭">×</button></div>
          <div class="body"></div>
        </div>
        <button class="fab"></button>
      </div>`;
    document.documentElement.appendChild(host);
    const $ = (s) => shadow.querySelector(s);
    const panel = $('.panel'), fab = $('.fab'), body = $('.body');
    $('.head b').textContent = panelTitle;
    fab.textContent = fabLabel;
    fab.onclick = () => onFab();
    $('.x').onclick = () => { panel.hidden = true; };
    return {
      shadow, body,
      open() { panel.hidden = false; },
      close() { panel.hidden = true; },
      isOpen() { return !panel.hidden; },
      showFab(v) { fab.hidden = !v; },
      setFab(text) { fab.textContent = text; },
      destroy() { host.remove(); }
    };
  }

  const esc = (s = '') => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  window.WX2X_UI = { create, esc };
})();
