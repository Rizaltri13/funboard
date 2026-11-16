// Small formatting helpers shared by every view: money, dates, countdowns,
// and a safe markdown-lite renderer for the API's description and rules text
// (those fields are markdown; the app renders a subset and escapes the rest).

export const esc = (s) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

/** USD amount the API sends as a number or a decimal string -> "$1,325" / "$0.50". */
export function money(v) {
  if (v === null || v === undefined || v === '') return '—';
  const n = Number(v);
  if (!Number.isFinite(n)) return '—';
  const cents = n % 1 !== 0 || (n > 0 && n < 10);
  return '$' + n.toLocaleString('en-US', { minimumFractionDigits: cents ? 2 : 0, maximumFractionDigits: 2 });
}

export function num(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n.toLocaleString('en-US') : '—';
}

/** "17 Nov 2026, 12:30 UTC" in the viewer's locale, short and unambiguous. */
export function dateTime(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export function dateOnly(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

/** Human time left from now until an ISO deadline: "3d 4h", "5h 12m", "41m", "Closed". */
export function timeLeft(iso, now = Date.now()) {
  if (!iso) return '—';
  const ms = new Date(iso).getTime() - now;
  if (!Number.isFinite(ms)) return '—';
  if (ms <= 0) return 'Closed';
  const m = Math.floor(ms / 60000);
  const d = Math.floor(m / 1440);
  const h = Math.floor((m % 1440) / 60);
  if (d > 0) return `${d}d ${h}h left`;
  if (h > 0) return `${h}h ${m % 60}m left`;
  return `${Math.max(m, 1)}m left`;
}

/** A bounty takes entries until its deadline, whatever its status field says. */
export const isOpen = (b, now = Date.now()) => !!b?.deadline && new Date(b.deadline).getTime() > now;

/** make.fun-relative media path -> absolute URL on make.fun's own origin. */
export const mediaUrl = (p) => (p ? (p.startsWith('http') ? p : 'https://make.fun' + p) : '');

/** 4axd…qdqjio style shortening for wallet addresses. */
export const shortAddr = (a) => (a && a.length > 12 ? `${a.slice(0, 4)}…${a.slice(-6)}` : a || '—');

/**
 * Markdown-lite: escape everything, then apply the subset the API's texts
 * actually use (headings, bold, italic, inline code, code fences, links,
 * lists, rules). Links are kept only for http(s) targets.
 */
export function md(src) {
  if (!src) return '';
  const lines = String(src).replace(/\r\n/g, '\n').split('\n');
  const out = [];
  let list = null; // 'ul' | 'ol' | null
  let fence = false;
  const closeList = () => { if (list) { out.push(`</${list}>`); list = null; } };
  const inline = (t) => esc(t)
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|[^*])\*([^*\n]+)\*/g, '$1<em>$2</em>')
    .replace(/\[([^\]]+)\]\((https?:[^)\s]+)\)/g, '<a href="$2" rel="noopener">$1</a>');
  for (const raw of lines) {
    const line = raw.trimEnd();
    if (line.startsWith('```')) { if (!fence) { closeList(); out.push('<pre>'); } else out.push('</pre>'); fence = !fence; continue; }
    if (fence) { out.push(esc(line)); continue; }
    const h = line.match(/^(#{1,4})\s+(.*)/);
    if (h) { closeList(); out.push(`<h${h[1].length + 1}>${inline(h[2])}</h${h[1].length + 1}>`); continue; }
    if (/^\s*(-{3,}|\*{3,})\s*$/.test(line)) { closeList(); out.push('<hr>'); continue; }
    const ul = line.match(/^\s*[-*]\s+(.*)/);
    const ol = line.match(/^\s*\d+[.)]\s+(.*)/);
    if (ul || ol) {
      const kind = ul ? 'ul' : 'ol';
      if (list !== kind) { closeList(); out.push(`<${kind}>`); list = kind; }
      out.push(`<li>${inline((ul || ol)[1])}</li>`);
      continue;
    }
    closeList();
    if (line.trim()) out.push(`<p>${inline(line)}</p>`);
  }
  closeList();
  if (fence) out.push('</pre>');
  return out.join('\n');
}
