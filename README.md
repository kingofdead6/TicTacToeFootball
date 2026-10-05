# ⚽ Tic Tac Toe Football

A 3×3 grid where every row and column is a category (club, nation or trophy). To claim a square, name a footballer who fits both its row and its column. Get three in a row to win.

```
client/   React 19 + Vite + Tailwind CSS 4 + Framer Motion
server/   Express REST API: player database, grid generator, answer checking, match history
```

## Run it

```bash
npm install          # root (installs concurrently)
npm run install:all  # server + client deps
npm run dev          # API on :4000, game on http://localhost:5180
```

## Game features
- **Pass & Play** (2 players) or **vs Computer** (Rookie / Pro / Legend)
- Easy / Medium / Hard grids. Every generated grid is checked so each square has at least 4 / 2 / 1 valid answers
- Optional turn timer (15 / 30 / 60 s)
- A wrong answer, a timeout or a skip passes the turn. Each player can only be used once per grid
- Running score across rounds, "show answers" after a round, confetti, animated win line
- Pages for browsing the player database and viewing the leaderboard

## API

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/health` | Status + counts |
| GET | `/api/categories?type=club\|nation\|award` | All categories with player counts |
| GET | `/api/players?search=messi` | Autocomplete search (ignores accents) |
| GET | `/api/players?page=1&limit=50` | Full player list with clubs & trophies |
| GET | `/api/players/:id` | One player |
| GET | `/api/grid?difficulty=easy\|medium\|hard` | Generate a solvable grid |
| GET | `/api/grid/:id/solutions` | Every valid answer per square |
| POST | `/api/validate` `{playerId,rowId,colId}` | Check a guess |
| POST | `/api/cpu-answer` `{rowId,colId,exclude}` | Random valid answer (used by the AI) |
| GET/POST | `/api/matches` | Match history (saved to `server/storage/matches.json`) |
| GET | `/api/leaderboard` | Rankings: 3 pts for a win, 1 for a draw |
| GET | `/api/stats` | Total rounds and most-picked players |

## Adding data
- Players: `server/src/data/players.js`, one row each: `[name, nationality, position, [clubIds], 'BWU']` (B = Ballon d'Or, W = World Cup, U = Champions League)
- Clubs, nations and trophies: `server/src/data/categories.js`
