// Talking to make.fun: read-only GET requests against the public API,
// which any origin may call (CORS is open). The whole surface is
// documented at https://make.fun/api/openapi.json.
//
// Responses sit in a short-lived in-memory cache, so bouncing between
// the board, a bounty and its leaderboard costs no extra requests and
// stays instant. Nothing is ever more than a few seconds stale, and the
// board's countdowns keep ticking locally between fetches regardless.
// Requests that overlap in time share a single fetch: the router can
// ask for the same path twice in quick succession (a hash change while
// the previous route is still loading), and there is no point paying
// for the same response twice.

const BASE = 'https://make.fun/api';
const CACHE_FOR_MS = 20_000;
const store = new Map(); // path -> { at, data }
const pending = new Map(); // path -> Promise<data>, one per live fetch

async function request(path) {
  const hit = store.get(path);
  if (hit !== undefined && Date.now() - hit.at < CACHE_FOR_MS) return hit.data;
  const inflight = pending.get(path);
  if (inflight !== undefined) return inflight;
  const job = (async () => {
    const res = await fetch(BASE + path);
    if (!res.ok) throw new Error(`make.fun API ${res.status} for ${path}`);
    const data = await res.json();
    store.set(path, { at: Date.now(), data });
    return data;
  })();
  pending.set(path, job);
  try {
    return await job;
  } finally {
    // A failed fetch caches nothing, so the next caller retries the
    // network instead of being handed a stale rejection.
    pending.delete(path);
  }
}

/** Builds a getter for one competition sub-resource, slug-escaped. */
const forCompetition = (suffix) => (slug) =>
  request(`/competitions/${encodeURIComponent(slug)}${suffix}`);

/** The bounty board: every competition, with activity timestamps. */
export const getBoard = () => request('/competitions?activity=times');

/** One bounty in full: summary, description, rules, rewards, live pot. */
export const getBounty = forCompetition('');

/** A bounty's leaderboard: columns, phase and ranked entries. */
export const getLeaderboard = forCompetition('/leaderboard');

/** An account's public profile: bio, links, record and their entries. */
export const getProfile = (handle) => request(`/profiles/${encodeURIComponent(handle)}`);
