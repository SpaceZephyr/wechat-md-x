/* Keep only the formatting X Articles accepts before HTML enters the live page. */
(() => {
  const allowed = new Set(['P', 'H1', 'H2', 'STRONG', 'EM', 'A', 'UL', 'OL', 'LI', 'BLOCKQUOTE', 'PRE', 'CODE', 'BR']);
  const discarded = new Set(['SCRIPT', 'STYLE', 'IFRAME', 'OBJECT', 'EMBED', 'SVG', 'MATH', 'FORM', 'INPUT', 'BUTTON', 'IMG']);

  function sanitize(html) {
    const source = new DOMParser().parseFromString(html, 'text/html');
    const safe = document.implementation.createHTMLDocument('');

    function copy(node) {
      if (node.nodeType === Node.TEXT_NODE) return safe.createTextNode(node.nodeValue);
      if (node.nodeType !== Node.ELEMENT_NODE || discarded.has(node.tagName)) return safe.createDocumentFragment();
      const container = allowed.has(node.tagName)
        ? safe.createElement(node.tagName.toLowerCase())
        : safe.createDocumentFragment();
      if (node.tagName === 'A') {
        const href = node.getAttribute('href') || '';
        try {
          const url = new URL(href);
          if (url.protocol === 'http:' || url.protocol === 'https:') container.setAttribute('href', url.href);
        } catch (_) { /* Ignore invalid and relative destinations. */ }
      }
      for (const child of node.childNodes) container.appendChild(copy(child));
      return container;
    }

    const output = safe.createElement('div');
    for (const child of source.body.childNodes) output.appendChild(copy(child));
    return output.innerHTML;
  }

  window.WX2X_SANITIZE_HTML = sanitize;
})();
