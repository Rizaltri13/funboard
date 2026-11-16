// Funboard's four surfaces, each a pure function from API data to HTML:
// the bounty board, a bounty's page, its leaderboard, and an account's
// public profile. Views never fetch — main.js routes, loads the data and
// hands it in; everything a view needs from format.js is imported above.

import { esc, money, num, dateTime, dateOnly, timeLeft, isOpen, mediaUrl, shortAddr, md } from './format.js';

/** An avatar image when the API gave one, nothing otherwise. */
const avatar = (url, cls = 'avatar') =>
  url ? `<img class="${cls}" crossorigin="anonymous" src="${esc(mediaUrl(url))}" alt="" loading="lazy">` : '';

/** A row of pill labels; empty entries drop out. */
const chips = (items) => items.filter(Boolean).map((t) => `<span class="chip">${esc(t)}</span>`).join('');

/** One labelled statistic cell, the shape every meta grid is built from. */
const stat = (label, valueHtml) =>
  `<div><span class="num-label">${label}</span><strong>${valueHtml}</strong></div>`;

/** "Free entry", or the fee as money when the bounty charges one. */
function feeLabel(b) {
  const fee = Number(b?.entryFeeUsd);
  return Number.isFinite(fee) && fee > 0 ? `${money(fee)} entry` : 'Free entry';
}

/* ---------------- The bounty board ---------------- */

function card(b, now) {
  const open = isOpen(b, now);
  const pot = b.potUsd !== null && b.potUsd !== undefined ? Number(b.potUsd) : Number(b.rewardAmount);
  const search = `${b.title} ${b.slug} ${b.category ?? ''} ${(b.skills ?? []).join(' ')}`.toLowerCase();
  const attrs = `data-search="${esc(search)}" data-deadline="${esc(b.deadline ?? '')}" data-pot="${pot || 0}" data-reward="${Number(b.rewardAmount) || 0}" data-entries="${Number(b.submissionCount) || 0}"`;
  return `<article class="card${open ? '' : ' is-closed'}" ${attrs}>
    <div class="card-top">
      <span class="card-cat">${esc(b.category ?? 'Bounty')}</span>
      <span class="cd ${open ? '' : 'cd-closed'}" data-countdown="${esc(b.deadline ?? '')}">${open ? timeLeft(b.deadline, now) : 'Closed'}</span>
    </div>
    <h3 class="card-title"><a href="#/bounty/${esc(b.slug)}">${esc(b.title)}</a></h3>
    <p class="card-by">${esc(b.sponsor?.name ?? 'make.fun')}${b.sponsor?.isVerified ? ' ✓' : ''}</p>
    <div class="card-nums">
      ${stat('Reward', money(b.rewardAmount))}
      ${stat('Live pot', money(b.potUsd ?? b.rewardAmount))}
      ${stat('Entries', num(b.submissionCount))}
    </div>
    <div class="card-foot">${chips([feeLabel(b), ...(b.skills ?? []).slice(0, 2)])}</div>
  </article>`;
}

export function boardView(items) {
  const now = Date.now();
  const open = items.filter((b) => isOpen(b, now));
  const closed = items.filter((b) => !isOpen(b, now));
  const potTotal = open.reduce((s, b) => s + (Number(b.potUsd ?? b.rewardAmount) || 0), 0);
  const endingSoonest = [...open].sort((a, b2) => new Date(a.deadline) - new Date(b2.deadline));
  const closedSection = closed.length ? `<h2 class="section-title">Recently closed</h2>
  <section class="grid">${closed.slice(0, 6).map((b) => card(b, now)).join('')}</section>` : '';
  return `
  <section class="hero">
    <h1>The bounty board</h1>
    <p class="lede">Every live bounty on make.fun, read straight from its public API.
      <strong>${open.length} open</strong> right now, playing for <strong>${money(potTotal)}</strong> in live pots.</p>
    <div class="controls">
      <label class="search">
        <span class="visually-hidden">Filter bounties</span>
        <input id="q" type="search" placeholder="Filter by name, category or skill…" autocomplete="off">
      </label>
      <label class="sort">Sort
        <select id="sort">
          <option value="deadline">Ending soonest</option>
          <option value="pot">Biggest pot</option>
          <option value="reward">Biggest reward</option>
          <option value="entries">Most entries</option>
        </select>
      </label>
    </div>
  </section>
  <section class="grid" id="grid" aria-live="polite">
    ${endingSoonest.map((b) => card(b, now)).join('')}
  </section>
  <p class="empty" id="empty" hidden>No bounty matches that filter.</p>
  ${closedSection}`;
}

/* ---------------- A bounty's page ---------------- */

const rewardRow = (place, base, feeShare, total) =>
  `<tr><td>#${place}</td><td>${money(base)}</td><td>${feeShare}</td><td><strong>${money(total)}</strong></td></tr>`;

function rewardsTable(b) {
  // With a live pot the API sends per-place rows (base + fee share);
  // before that, a plain place -> amount map. Both render the same table.
  const rows = Array.isArray(b.rewardsNow) && b.rewardsNow.length
    ? b.rewardsNow.map((r) => rewardRow(r.place, r.baseUsd, money(r.feeShareUsd), r.amountUsd))
    : Object.entries(b.rewards ?? {}).map(([place, amt]) => rewardRow(place, amt, '—', amt));
  if (!rows.length) return '';
  const feeNote = Number(b.entryFeesUsd) > 0
    ? `<p class="note">${money(b.entryFeesUsd)} of the pot is entry fees paid by ${num(b.entryFeePayers)} entrants — the pot grows with every entry.</p>`
    : '';
  return `<h2 class="section-title">Rewards — live pot ${money(b.potUsd ?? b.rewardAmount)}</h2>
  <div class="table-wrap"><table class="table">
    <thead><tr><th>Place</th><th>Base</th><th>Fee share</th><th>Total</th></tr></thead>
    <tbody>${rows.join('')}</tbody>
  </table></div>
  ${feeNote}`;
}

export function bountyView(b) {
  const now = Date.now();
  const open = isOpen(b, now);
  const subs = Array.isArray(b.submissions) ? b.submissions.slice(0, 8) : [];
  const latestEntries = subs.length ? `<h2 class="section-title">Latest entries</h2>
      <ul class="entries-list">${subs.map((s) => `<li>${avatar(s.image ?? s.avatar)}<a href="#/profile/${esc(s.hunter ?? s.handle ?? '')}">@${esc(s.hunter ?? s.handle ?? 'unknown')}</a> <span class="muted">${esc(s.title ?? '')}</span></li>`).join('')}</ul>` : '';
  return `
  <p class="crumb"><a href="#/">← Bounty board</a></p>
  <article class="bounty">
    <div class="card-top">
      <span class="card-cat">${esc(b.category ?? 'Bounty')}</span>
      <span class="cd ${open ? '' : 'cd-closed'}" data-countdown="${esc(b.deadline ?? '')}">${open ? timeLeft(b.deadline, now) : 'Closed'}</span>
    </div>
    <h1>${esc(b.title)}</h1>
    ${b.summary ? `<p class="lede">${esc(b.summary)}</p>` : ''}
    <div class="meta-grid">
      ${stat('Status', open ? 'Open for entries' : 'Closed')}
      ${stat('Reward', money(b.rewardAmount))}
      ${stat('Live pot', money(b.potUsd ?? b.rewardAmount))}
      ${stat('Entry fee', feeLabel(b))}
      ${stat('Entries', num(b.submissionCount))}
      ${stat('Sponsor', esc(b.sponsor?.name ?? 'make.fun'))}
      ${stat('Published', dateTime(b.publishedAt))}
      ${stat('Deadline', dateTime(b.deadline))}
    </div>
    <p class="actions">
      <a class="btn" href="#/bounty/${esc(b.slug)}/leaderboard">Leaderboard</a>
      <a class="btn btn-ghost" href="https://make.fun/bounty/${esc(b.slug)}" rel="noopener">Open on make.fun ↗</a>
    </p>
    ${rewardsTable(b)}
    ${b.description ? `<h2 class="section-title">About this bounty</h2><div class="prose">${md(b.description)}</div>` : ''}
    ${b.rules ? `<h2 class="section-title">Rules</h2><div class="prose">${md(b.rules)}</div>` : ''}
    ${latestEntries}
  </article>`;
}

/* ---------------- A bounty's leaderboard ---------------- */

// The API's judge columns are micro units: 1,000,000 = a 100% win rate,
// so a percentage is the raw value over 10,000.
function winRate(e) {
  const v = e.values?.judge;
  if (typeof v === 'number') return (v / 10_000).toFixed(1) + '%';
  const j = e.judge;
  if (j && j.matches > 0) return ((j.wins / j.matches) * 100).toFixed(1) + '%';
  return '—';
}

function winInterval(e) {
  const lo = e.values?.judge_low;
  const hi = e.values?.judge_high;
  if (typeof lo === 'number' && typeof hi === 'number') {
    return `<span class="muted"> (${(lo / 10_000).toFixed(0)}–${(hi / 10_000).toFixed(0)})</span>`;
  }
  return '';
}

function record(e) {
  const j = e.judge;
  if (!j || !j.matches) return '—';
  return `${j.wins}W – ${j.losses}L${j.draws ? ` – ${j.draws}D` : ''}`;
}

function leaderboardRow(e) {
  return `<tr${e.rank <= 3 ? ' class="podium"' : ''}>
      <td><strong>${e.rank ?? '—'}</strong></td>
      <td class="entrant">${avatar(e.image)}<a href="#/profile/${esc(e.handle ?? '')}">@${esc(e.handle ?? 'unknown')}</a>${e.house ? ' <span class="chip">house</span>' : ''}</td>
      <td>${esc(e.title ?? '')}</td>
      <td>${record(e)}</td>
      <td><strong>${winRate(e)}</strong>${winInterval(e)}</td>
      <td>${esc(e.status ?? '')}</td>
    </tr>`;
}

export function leaderboardView(lb, slug) {
  const entries = Array.isArray(lb.entries) ? lb.entries : [];
  const comp = lb.competition ?? {};
  const tallyNote = lb.metrics_withheld ? ' · scores are still being tallied, so win rates fill in as judging lands.' : '';
  const table = entries.length ? `<div class="table-wrap"><table class="table lb">
    <thead><tr><th>#</th><th>Entrant</th><th>Entry</th><th>Record</th><th>Judge win rate</th><th>Status</th></tr></thead>
    <tbody>${entries.map(leaderboardRow).join('')}</tbody>
  </table></div>` : '<p class="empty">No ranked entries yet.</p>';
  return `
  <p class="crumb"><a href="#/bounty/${esc(slug)}">← ${esc(comp.title ?? 'Bounty')}</a></p>
  <h1>Leaderboard</h1>
  <p class="lede">${esc(comp.title ?? '')} — ${esc(lb.phase?.title ?? 'Results')}${tallyNote}</p>
  ${table}`;
}

/* ---------------- An account's public profile ---------------- */

function profileLinks(p) {
  const ghost = (href, label) => `<a class="btn btn-ghost" href="${href}" rel="noopener">${label}</a>`;
  return [
    p.github_login ? ghost(`https://github.com/${esc(p.github_login)}`, `GitHub @${esc(p.github_login)} ↗`) : '',
    p.x?.url ? ghost(esc(p.x.url), `X @${esc(p.x.username ?? '')} ↗`) : '',
    p.discord?.url ? ghost(esc(p.discord.url), 'Discord ↗') : '',
    ghost(`https://make.fun/${esc(p.profile_url ?? '@' + (p.handle ?? ''))}`, 'On make.fun ↗'),
  ].join('');
}

function solutionRow(s) {
  const c = s.competition ?? {};
  const place = s.placement ? `<span class="chip chip-prize">#${num(s.placement)}</span>` : '';
  const prize = s.prize_usd ? `<span class="chip chip-prize">${money(s.prize_usd)}</span>` : '';
  return `<li>
      <div class="sol-main">
        <strong>${esc(s.title ?? 'Entry')}</strong>
        <span class="muted">in <a href="#/bounty/${esc(c.slug ?? '')}">${esc(c.title ?? c.slug ?? '')}</a> · ${money(c.reward_usd)} · ${esc(c.status ?? '')}</span>
      </div>
      <div class="sol-side">${place}${prize}</div>
    </li>`;
}

export function profileView(p) {
  const r = p.record ?? {};
  const sols = Array.isArray(p.solutions) ? p.solutions : [];
  const solutions = sols.length
    ? `<ul class="solutions">${sols.map(solutionRow).join('')}</ul>`
    : '<p class="empty">No entries yet.</p>';
  return `
  <p class="crumb"><a href="#/">← Bounty board</a></p>
  <section class="profile-head">
    ${avatar(p.image ?? p.avatar?.url, 'avatar avatar-lg')}
    <div>
      <h1>${esc(p.display_name ?? p.handle ?? 'Unknown')}</h1>
      <p class="muted">@${esc(p.handle ?? '')}${p.house ? ' · house account' : ''} · joined ${dateOnly(p.joined_at)}</p>
      ${p.bio ? `<p class="bio">${esc(p.bio)}</p>` : ''}
      ${p.wallet?.address ? `<p class="muted">Wallet <code title="${esc(p.wallet.address)}">${esc(shortAddr(p.wallet.address))}</code></p>` : ''}
      <p class="actions">${profileLinks(p)}</p>
    </div>
  </section>
  <section class="meta-grid">
    ${stat('Entered', num(r.competitions_entered))}
    ${stat('Placed', num(r.competitions_placed))}
    ${stat('Won', num(r.competitions_won))}
    ${stat('Podiums', num(r.podium_finishes))}
    ${stat('Best place', r.best_placement ? '#' + num(r.best_placement) : '—')}
    ${stat('Prizes', money(r.prize_usd))}
  </section>
  <h2 class="section-title">Entries (${sols.length})</h2>
  ${solutions}`;
}

/* ---------------- Shared states ---------------- */

export const loadingView = () => '<p class="loading" role="status">Loading live data from make.fun…</p>';

export const errorView = (msg) => `
  <section class="error" role="alert">
    <h1>That page could not be loaded</h1>
    <p>${esc(msg)}</p>
    <p><a class="btn" href="#/">Back to the bounty board</a></p>
  </section>`;
