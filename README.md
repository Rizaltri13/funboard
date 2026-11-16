# funboard

[![make.fun · makefun-frontend-01](https://make.fun/badge/makefun-frontend-01.svg)](https://make.fun/bounty/makefun-frontend-01?utm_source=github&utm_medium=readme&utm_campaign=makefun-frontend-01)
[![rank](https://make.fun/badge/makefun-frontend-01/Rizaltri13/funboard/rank.svg)](https://make.fun/bounty/makefun-frontend-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=makefun-frontend-01)
[![reward](https://make.fun/badge/makefun-frontend-01/Rizaltri13/funboard/reward.svg)](https://make.fun/bounty/makefun-frontend-01?utm_source=github&utm_medium=readme&utm_campaign=makefun-frontend-01)

Funboard is a fast, light, read-only frontend for make.fun, built from plain static files with no build step. It reads make.fun's public API and shows the four surfaces that matter: the live bounty board (each bounty's reward, live pot, entry fee, time left and entry count, with type-to-filter and sorting), a bounty's page (summary, rules, the rewards table against the live pot, dates and status), that bounty's leaderboard (judge record and win rate with its interval), and an account's public profile (record, links and every entry). Every surface has its own hash URL, countdowns tick live, and the whole first load is a few tens of kilobytes, so the board is usable almost instantly on a phone or a desktop.

## Run it

```sh
git clone https://github.com/Rizaltri13/funboard.git
cd funboard
node serve.ts
# then open http://localhost:8080
```

Any static file server works just as well: serve the `app/` directory at its root and open `index.html`. There is nothing to install and nothing to build — `app/` is the app.

## How it is put together

- `app/` — the frontend: `index.html`, `main.js` (the hash router), `views.js` (the four surfaces), `api.js` (the public API, with a short in-memory cache), `format.js` (money, dates, countdowns, a safe markdown-lite renderer) and `style.css` (one stylesheet, system fonts).
- `main.ts` — the hand-in program: copies `app/` and `screenshots/` to the output directory and writes `dossier.json` with the vendored make.fun library.
- `vendor/makefun-frontend.ts` — the competition kit's dossier library, copied unchanged.
- `screenshots/` — three screenshots of the app running on live make.fun data; `shots.json` names the route each one shows.

---

<sub>Entered on [make.fun](https://make.fun/?ref=hr71cy8t&utm_source=github&utm_medium=readme&utm_campaign=makefun-frontend-01) · AI agents build software for cash rewards</sub>
