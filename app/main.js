// Funboard's router. Hash routes, each with its own URL:
//   #/                              the bounty board
//   #/bounty/<slug>                 a bounty's page
//   #/bounty/<slug>/leaderboard     that bounty's leaderboard
//   #/profile/<handle>              an account's public profile
// Every route sets window.__shotReady to false while it loads and to true
// once its data has rendered, so screenshot tooling can wait for real data.

import { getBoard, getBounty, getLeaderboard, getProfile } from './api.js';
import { boardView, bountyView, leaderboardView, profileView, loadingView, errorView } from './views.js';
import { timeLeft } from './format.js';

const app = document.getElementById('app');

function render(html) {
  app.innerHTML = html;
  app.focus({ preventScroll: true });
  window.scrollTo(0, 0);
}

async function route() {
  window.__shotReady = false;
  const parts = location.hash.replace(/^#\/?/, '').split('/').filter(Boolean).map(decodeURIComponent);
  try {
    if (parts.length === 0) {
      render(loadingView());
      const data = await getBoard();
      const items = Array.isArray(data) ? data : data.items ?? [];
      render(boardView(items));
      wireBoard();
    } else if (parts[0] === 'bounty' && parts[1] && parts[2] === 'leaderboard') {
      render(loadingView());
      render(leaderboardView(await getLeaderboard(parts[1]), parts[1]));
    } else if (parts[0] === 'bounty' && parts[1]) {
      render(loadingView());
      render(bountyView(await getBounty(parts[1])));
    } else if (parts[0] === 'profile' && parts[1]) {
      render(loadingView());
      render(profileView(await getProfile(parts[1])));
    } else {
      render(errorView('No such page in this frontend.'));
    }
  } catch (e) {
    render(errorView(`The live data could not be read (${e.message}). Check your connection and try again.`));
  }
  window.__shotReady = true;
}

/** Board-only interactivity: type-to-filter and sorting, done on the DOM
 *  nodes the view rendered, so typing never loses focus or refetches. */
function wireBoard() {
  const grid = document.getElementById('grid');
  const input = document.getElementById('q');
  const sort = document.getElementById('sort');
  const empty = document.getElementById('empty');
  if (!grid || !input || !sort) return;
  const apply = () => {
    const q = input.value.trim().toLowerCase();
    const key = sort.value;
    const cards = [...grid.querySelectorAll('.card')];
    cards.sort((a, b) => {
      if (key === 'deadline') return new Date(a.dataset.deadline) - new Date(b.dataset.deadline);
      return Number(b.dataset[key]) - Number(a.dataset[key]);
    });
    let visible = 0;
    for (const c of cards) {
      const show = !q || c.dataset.search.includes(q);
      c.hidden = !show;
      if (show) visible++;
      grid.appendChild(c);
    }
    if (empty) empty.hidden = visible > 0;
  };
  input.addEventListener('input', apply);
  sort.addEventListener('change', apply);
}

/** One ticker for every countdown on the page, whatever route rendered it. */
setInterval(() => {
  const now = Date.now();
  document.querySelectorAll('[data-countdown]').forEach((el) => {
    el.textContent = timeLeft(el.dataset.countdown, now);
  });
}, 1000);

window.addEventListener('hashchange', route);
route();
