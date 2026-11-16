// Formatting helpers shared by every view: HTML escaping, money, dates,
// countdowns, and a safe markdown-lite renderer for the description and
// rules text the API serves (those fields are markdown; the app renders
// a subset of it and escapes everything else).

const ENTITIES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ENTITIES[c]);

/** USD amount the API sends as a number or a decimal string -> "$1,325" / "$0.50". */
export function money(v) {
  if (v === null || v === undefined || v === '') return '—';
  const n = Number(v);
  if (!Number.isFinite(n)) return '—';
  // Cents are shown for fractional amounts and for small whole amounts,
  // where "$5" alone would look like a rounding of the real figure.
  const showCents = n % 1 !== 0 || (n > 0 && n < 10);
  return '$' + n.toLocaleString('en-US', {
    minimumFractionDigits: showCents ? 2 : 0,
    maximumFractionDigits: 2,
  });
}

export function num(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n.toLocaleString('en-US') : '—';
}

/** Parse an API date string once; null when absent or unparseable. */
function parseDate(iso) {
  if (!iso) return null;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** "17 Nov 2026, 12:30" in the viewer's locale, short and unambiguous. */
export function dateTime(iso) {
  const d = parseDate(iso);
  return d
    ? d.toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
    : '—';
}

export function dateOnly(iso) {
  const d = parseDate(iso);
  return d ? d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';
}

/** Human time left from now until an ISO deadline: "3d 4h", "5h 12m", "41m", "Closed". */
export function timeLeft(iso, now = Date.now()) {
  if (!iso) return '—';
  const ms = new Date(iso).getTime() - now;
  if (!Number.isFinite(ms)) return '—';
  if (ms <= 0) return 'Closed';
  const totalMinutes = Math.floor(ms / 60000);
  const days = Math.floor(totalMinutes / 1440);
  const hours = Math.floor((totalMinutes % 1440) / 60);
  const minutes = totalMinutes % 60;
  if (days > 0) return `${days}d ${hours}h left`;
  if (hours > 0) return `${hours}h ${minutes}m left`;
  return `${Math.max(totalMinutes, 1)}m left`;
}

/** A bounty takes entries until its deadline, whatever its status field says. */
export const isOpen = (b, now = Date.now()) => !!b?.deadline && new Date(b.deadline).getTime() > now;

/** make.fun-relative media path -> absolute URL on make.fun's own origin. */
export const mediaUrl = (p) => (p ? (p.startsWith('http') ? p : 'https://make.fun' + p) : '');

/** 4axd…qdqjio style shortening for wallet addresses. */
export const shortAddr = (a) => (a && a.length > 12 ? `${a.slice(0, 4)}…${a.slice(-6)}` : a || '—');

/**
 * Inline markdown-lite: the text is escaped first, then the inline
 * constructs the API's texts actually use are applied over the escaped
 * text — code spans, bold, italic, and links with http(s) targets only.
 */
function inline(t) {
  return esc(t)
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|[^*])\*([^*\n]+)\*/g, '$1<em>$2</em>')
    .replace(/\[([^\]]+)\]\((https?:[^)\s]+)\)/g, '<a href="$2" rel="noopener">$1</a>');
}

/**
 * Markdown-lite, block level: headings, rules, unordered and ordered
 * lists, fenced code blocks and plain paragraphs, built on inline().
 */
export function md(src) {
  if (!src) return '';
  const lines = String(src).replace(/\r\n/g, '\n').split('\n');
  const out = [];
  const state = { list: null, fence: false }; // list: 'ul' | 'ol' | null
  const closeList = () => {
    if (state.list) out.push(`</${state.list}>`);
    state.list = null;
  };
  const openList = (kind) => {
    if (state.list !== kind) {
      closeList();
      out.push(`<${kind}>`);
      state.list = kind;
    }
  };

  for (const raw of lines) {
    const line = raw.trimEnd();
    if (line.startsWith('```')) {
      if (state.fence) out.push('</pre>');
      else { closeList(); out.push('<pre>'); }
      state.fence = !state.fence;
      continue;
    }
    if (state.fence) { out.push(esc(line)); continue; }
    const h = line.match(/^(#{1,4})\s+(.*)/);
    if (h) {
      closeList();
      const level = h[1].length + 1;
      out.push(`<h${level}>${inline(h[2])}</h${level}>`);
      continue;
    }
    if (/^\s*(-{3,}|\*{3,})\s*$/.test(line)) { closeList(); out.push('<hr>'); continue; }
    const ul = line.match(/^\s*[-*]\s+(.*)/);
    const ol = ul ? null : line.match(/^\s*\d+[.)]\s+(.*)/);
    if (ul || ol) {
      openList(ul ? 'ul' : 'ol');
      out.push(`<li>${inline((ul || ol)[1])}</li>`);
      continue;
    }
    closeList();
    if (line.trim()) out.push(`<p>${inline(line)}</p>`);
  }
  closeList();
  if (state.fence) out.push('</pre>');
  return out.join('\n');
}
