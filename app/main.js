// Funboard's router. Hash routes, each with its own URL:
//   #/                              the bounty board
//   #/bounty/<slug>                 a bounty's page
//   #/bounty/<slug>/leaderboard     that bounty's leaderboard
//   #/profile/<handle>              an account's public profile
// While a route loads, window.__shotReady is false; it flips back to
// true once the route's data has rendered, so screenshot tooling can
// wait for real data instead of guessing at timings.

import { getBoard, getBounty, getLeaderboard, getProfile } from './api.js';
import { boardView, bountyView, leaderboardView, profileView, loadingView, errorView } from './views.js';
import { timeLeft } from './format.js';

const app = document.getElementById('app');

function paint(html) {
  app.innerHTML = html;
  app.focus({ preventScroll: true });
  window.scrollTo(0, 0);
}

/** The current hash as decoded path segments: [] is the board. */
function pathParts() {
  return location.hash
    .replace(/^#\/?/, '')
    .split('/')
    .filter(Boolean)
    .map(decodeURIComponent);
}

// The route table. Each run() loads its data and resolves to the HTML to
// paint; the board's entry also carries an after() hook that wires its
// filter and sort controls once the cards are in the DOM. Order matters:
// the leaderboard route is tried before the plainer bounty route.
const routes = [
  {
    match: (p) => p.length === 0,
    run: async () => {
      const data = await getBoard();
      const items = Array.isArray(data) ? data : data.items ?? [];
      return { html: boardView(items), after: wireBoard };
    },
  },
  {
    match: (p) => p[0] === 'bounty' && !!p[1] && p[2] === 'leaderboard',
    run: async (p) => ({ html: leaderboardView(await getLeaderboard(p[1]), p[1]) }),
  },
  {
    match: (p) => p[0] === 'bounty' && !!p[1],
    run: async (p) => ({ html: bountyView(await getBounty(p[1])) }),
  },
  {
    match: (p) => p[0] === 'profile' && !!p[1],
    run: async (p) => ({ html: profileView(await getProfile(p[1])) }),
  },
];

async function route() {
  window.__shotReady = false;
  const parts = pathParts();
  const found = routes.find((r) => r.match(parts));
  try {
    if (!found) {
      paint(errorView('No such page in this frontend.'));
    } else {
      paint(loadingView());
      const { html, after } = await found.run(parts);
      paint(html);
      after?.();
    }
  } catch (e) {
    paint(errorView(`The live data could not be read (${e.message}). Check your connection and try again.`));
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

  // Ending soonest sorts by date ascending; every other key is a number
  // in a data attribute and sorts descending.
  const comparator = (key) => (a, b) =>
    key === 'deadline'
      ? new Date(a.dataset.deadline) - new Date(b.dataset.deadline)
      : Number(b.dataset[key]) - Number(a.dataset[key]);

  const apply = () => {
    const q = input.value.trim().toLowerCase();
    const cards = [...grid.querySelectorAll('.card')].sort(comparator(sort.value));
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
