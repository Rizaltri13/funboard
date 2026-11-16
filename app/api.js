// make.fun's public API: read-only GET requests, open to any origin (CORS).
// The full API is described at https://make.fun/api/openapi.json.
// Responses are cached in memory for a few seconds so back-and-forth
// navigation between the board, a bounty and its leaderboard stays instant;
// the board's countdowns keep ticking locally between fetches.

const API = 'https://make.fun/api';
const TTL_MS = 20_000;
const cache = new Map();

async function get(path) {
  const hit = cache.get(path);
  if (hit && Date.now() - hit.at < TTL_MS) return hit.data;
  const res = await fetch(API + path);
  if (!res.ok) throw new Error(`make.fun API ${res.status} for ${path}`);
  const data = await res.json();
  cache.set(path, { at: Date.now(), data });
  return data;
}

/** The bounty board: every competition, open ones first-class. */
export const getBoard = () => get('/competitions?activity=times');

/** One bounty in full: summary, description, rules, rewards, live pot. */
export const getBounty = (slug) => get(`/competitions/${encodeURIComponent(slug)}`);

/** A bounty's leaderboard: columns, phase and ranked entries. */
export const getLeaderboard = (slug) => get(`/competitions/${encodeURIComponent(slug)}/leaderboard`);

/** An account's public profile: bio, links, record and their entries. */
export const getProfile = (handle) => get(`/profiles/${encodeURIComponent(handle)}`);
