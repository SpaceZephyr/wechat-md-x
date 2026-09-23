/* 后台：负责下载文件、跨域抓图、响应工具栏图标点击 */

const ROOT = 'wechat-to-x';

chrome.action.onClicked.addListener((tab) => {
  chrome.tabs.sendMessage(tab.id, { type: 'wx2x:toggle' }).catch(() => {});
});

function download(url, filename) {
  return new Promise((resolve, reject) => {
    chrome.downloads.download(
      { url, filename, conflictAction: 'overwrite', saveAs: false },
      (id) => {
        if (chrome.runtime.lastError || id === undefined) {
          return reject(new Error(chrome.runtime.lastError?.message || '下载失败'));
        }
        const onChange = (d) => {
          if (d.id !== id || !d.state) return;
          if (d.state.current === 'complete') { chrome.downloads.onChanged.removeListener(onChange); resolve(id); }
          if (d.state.current === 'interrupted') { chrome.downloads.onChanged.removeListener(onChange); reject(new Error('下载中断：' + filename)); }
        };
        chrome.downloads.onChanged.addListener(onChange);
      }
    );
  });
}

async function saveArticle({ folder, mdName, markdown, images }) {
  const base = `${ROOT}/${folder}`;
  for (const img of images) await download(img.dataUrl, `${base}/${img.path}`);
  const mdUrl = 'data:text/markdown;charset=utf-8,' + encodeURIComponent(markdown);
  const id = await download(mdUrl, `${base}/${mdName}`);
  const [item] = await chrome.downloads.search({ id });
  return { id, path: item ? item.filename : `${base}/${mdName}` };
}

async function fetchAsDataUrl(url) {
  const res = await fetch(url, { credentials: 'omit', referrerPolicy: 'no-referrer' });
  if (!res.ok) throw new Error('HTTP ' + res.status);
  const blob = await res.blob();
  const buf = new Uint8Array(await blob.arrayBuffer());
  let bin = '';
  for (let i = 0; i < buf.length; i += 0x8000) bin += String.fromCharCode.apply(null, buf.subarray(i, i + 0x8000));
  return { dataUrl: `data:${blob.type || 'application/octet-stream'};base64,${btoa(bin)}`, type: blob.type };
}

chrome.runtime.onMessage.addListener((msg, sender, reply) => {
  if (msg.type === 'wx2x:save') {
    saveArticle(msg).then((r) => reply({ ok: true, ...r })).catch((e) => reply({ ok: false, error: e.message }));
    return true;
  }
  if (msg.type === 'wx2x:show') {
    chrome.downloads.show(msg.id);
    return false;
  }
  if (msg.type === 'wx2x:fetch') {
    fetchAsDataUrl(msg.url).then((r) => reply({ ok: true, ...r })).catch((e) => reply({ ok: false, error: e.message }));
    return true;
  }
});
