/* Samayam - tiny Markdown renderer for the built-in user guide.
 * Supports what the guides use: headings (with GitHub-style ids so the
 * table of contents links work), paragraphs, nested lists, tables,
 * blockquotes, code blocks, horizontal rules, **bold**, *italic*, `code`,
 * [links](url) and <https://autolinks>. Output is screen-reader friendly. */
(function (root) {
  'use strict';

  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  // Same rule GitHub uses for heading anchors.
  function slug(text) {
    return String(text)
      .replace(/`/g, '')
      .replace(/\*\*/g, '')
      .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
      .toLowerCase()
      .trim()
      .replace(/[^\p{L}\p{M}\p{N}\s_-]/gu, '')
      .replace(/\s/g, '-');
  }

  function inline(s) {
    let h = esc(s);
    h = h.replace(/`([^`]+)`/g, '<code>$1</code>');
    h = h.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    h = h.replace(/(^|[\s(])\*([^*\s][^*]*?)\*(?=[\s.,;:)!?]|$)/g, '$1<em>$2</em>');
    h = h.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (m, text, url) => link(url, text));
    h = h.replace(/&lt;(https?:\/\/[^\s&]+?)&gt;/g, (m, url) => link(url, url));
    return h;
  }

  function link(url, text) {
    if (/\.md(#.*)?$/i.test(url)) return `<a href="#" data-guide-file="${url}">${text}</a>`;
    if (url.startsWith('#')) return `<a href="${url}" data-anchor="${url.slice(1)}">${text}</a>`;
    return `<a href="${url}" data-external="1">${text}</a>`;
  }

  const indentOf = (l) => l.match(/^\s*/)[0].length;
  const LIST = /^(\s*)([-*]|\d+\.)\s+(.*)$/;

  function render(src) {
    const lines = src.replace(/\r/g, '').split('\n');
    const n = lines.length;
    let i = 0;
    const out = [];
    const headings = [];

    const isBlockStart = (l) => /^#{1,6}\s/.test(l) || /^```/.test(l) || /^>/.test(l) || /^\|/.test(l) || LIST.test(l) || /^-{3,}\s*$/.test(l);

    function paragraphs(parts) {
      // parts: array of strings ('' = paragraph break) and {html}
      const html = [];
      let buf = [];
      const flush = () => { if (buf.length) { html.push({ p: buf.join(' ') }); buf = []; } };
      for (const p of parts) {
        if (typeof p === 'string') { if (p === '') flush(); else buf.push(p); } else { flush(); html.push(p); }
      }
      flush();
      const onlyOneText = html.length && html.filter((x) => x.p !== undefined).length === 1 && html[0].p !== undefined;
      return html.map((x, k) => (x.p !== undefined ? (onlyOneText && k === 0 ? inline(x.p) : `<p>${inline(x.p)}</p>`) : x.html)).join('');
    }

    function parseList(indent) {
      const ordered = /^\s*\d+\./.test(lines[i]);
      let html = ordered ? '<ol>' : '<ul>';
      while (i < n) {
        const m = LIST.exec(lines[i]);
        if (!m || m[1].length !== indent) break;
        i++;
        const parts = [m[3]];
        while (i < n) {
          const l = lines[i];
          if (l.trim() === '') {
            let j = i;
            while (j < n && lines[j].trim() === '') j++;
            if (j < n && indentOf(lines[j]) > indent) { parts.push(''); i = j; continue; }
            break;
          }
          const ind = indentOf(l);
          if (ind <= indent) break;
          if (LIST.test(l)) { parts.push({ html: parseList(ind) }); continue; }
          if (/^\s*```/.test(l)) { parts.push({ html: codeBlock() }); continue; }
          parts.push(l.trim());
          i++;
        }
        html += `<li>${paragraphs(parts)}</li>`;
      }
      return html + (ordered ? '</ol>' : '</ul>');
    }

    function codeBlock() {
      i++;
      const body = [];
      while (i < n && !/^\s*```/.test(lines[i])) body.push(lines[i++]);
      i++;
      return `<pre><code>${esc(body.join('\n'))}</code></pre>`;
    }

    function table() {
      const rows = [];
      while (i < n && /^\|/.test(lines[i])) rows.push(lines[i++]);
      const cells = (r) => r.replace(/^\|/, '').replace(/\|\s*$/, '').split('|').map((c) => c.trim());
      const head = cells(rows[0]);
      const body = rows.slice(2).map(cells);
      return `<div class="tablewrap"><table class="data"><thead><tr>${head.map((c) => `<th scope="col">${inline(c)}</th>`).join('')}</tr></thead>
        <tbody>${body.map((r) => `<tr>${r.map((c, k) => (k === 0 ? `<th scope="row">${inline(c)}</th>` : `<td>${inline(c)}</td>`)).join('')}</tr>`).join('')}</tbody></table></div>`;
    }

    while (i < n) {
      const l = lines[i];
      if (l.trim() === '') { i++; continue; }
      let m;
      if ((m = /^(#{1,6})\s+(.*)$/.exec(l))) {
        const level = m[1].length, text = m[2].trim(), id = slug(text);
        headings.push({ level, text, id });
        out.push(`<h${level} id="${esc(id)}" tabindex="-1">${inline(text)}</h${level}>`);
        i++;
      } else if (/^```/.test(l)) {
        out.push(codeBlock());
      } else if (/^-{3,}\s*$/.test(l)) {
        out.push('<hr>');
        i++;
      } else if (/^>/.test(l)) {
        const parts = [];
        while (i < n && /^>/.test(lines[i])) { const t = lines[i++].replace(/^>\s?/, ''); parts.push(t.trim() === '' ? '' : t); }
        out.push(`<blockquote class="msg">${paragraphs(parts.length > 1 ? parts.concat('') : parts).replace(/^(?!<p>)(.*)$/s, '<p>$1</p>')}</blockquote>`);
      } else if (/^\|/.test(l)) {
        out.push(table());
      } else if (LIST.test(l)) {
        out.push(parseList(indentOf(l)));
      } else {
        const buf = [];
        while (i < n && lines[i].trim() !== '' && !(buf.length && isBlockStart(lines[i]))) buf.push(lines[i++].trim());
        out.push(`<p>${inline(buf.join(' '))}</p>`);
      }
    }
    return { html: out.join('\n'), headings };
  }

  const api = { render, slug };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.SamayamMD = api;
})(typeof self !== 'undefined' ? self : this);
