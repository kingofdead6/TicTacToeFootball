# ⚽ Tic Tac Toe Football

A 3×3 grid where every row and column is a category (club, nation or trophy). To claim a square, name a footballer who fits both its row and its column. Get three in a row to win. Play on one screen, against the computer, or **live online against a friend with a room code**.

```
client/   React 19 + Vite + Tailwind CSS 4 + Framer Motion + socket.io-client
server/   Express + Socket.io + MongoDB (Mongoose)
```

## Run locally

```bash
npm install && npm run install:all
cp server/.env.example server/.env   # then put your MONGODB_URI in server/.env
npm run dev                          # API + sockets on :4000, game on http://localhost:5180
```

Without `MONGODB_URI` the server still runs. Online play works as guests, and player cards and the leaderboard are switched off.

## Deploy
- **Render (server):** start command `npm start`, root `server/`. Set the env var `MONGODB_URI` (and optionally `CLIENT_ORIGIN=https://your-app.vercel.app`).
- **MongoDB Atlas:** under *Network Access*, allow `0.0.0.0/0`, because Render's IPs change.
- **Vercel (client):** uses `https://tictactoefootball.onrender.com` in production. Override it with the env var `VITE_API_ORIGIN`.

## Features
- **Player cards:** a unique username and avatar, with no password. A secret token is kept in the browser, and the card can be moved to another device with its **login key**.
- **Live online matches:** create a room, then share the 6-letter code or invite link (`/?room=CODE`).
  - The server runs the game: it checks every answer, runs the turn timer, and decides wins.
  - Best of 1, 3 or 5 series, with marks swapped on rematch.
  - A live "opponent is looking at this square" indicator, a match feed with commentary, chat and emoji reactions.
  - Refresh or lose connection and you rejoin your seat. If you're gone for more than 30s, or leave, it's a forfeit.
- **Ranked Elo leaderboard:** only card-vs-card matches count (K = 32). Each card has stats (W-D-L, win %, guess accuracy) and streaks, plus a podium and profile pages.
- **Footballer stats:** every guess is counted, giving "most picked" lists and accuracy.

## Data models (`server/src/models`)
| Model | Purpose |
|---|---|
| `Profile` | username, avatar, hashed token, rating / peakRating, stats, streaks |
| `Match` | mode (online/local/cpu), ranked, settings, players (with rating before/after), every round and move |
| `Footballer` | 61k footballers mirrored from the dataset: Wikidata id, nationality, position, birth year, fame, clubs, awards, pick/correct counters. Set `active: false` to hide one |
| `Category` | every club, nation and trophy category with its player count |
| `Meta` | which dataset version is mirrored (the mirror only re-runs when it changes) |

## REST API (`/api`)
| Method | Endpoint | Description |
|---|---|---|
| GET | `/health` | Status, DB state, live room counts |
| GET | `/dataset` | Dataset version, source and counts |
| GET | `/categories?type=club\|nation\|award&tier=&q=` | Clubs, nations and trophies with player counts |
| GET | `/categories/:id` | One category and its best-known players |
| GET | `/players?q=&nation=&club=&award=&position=&sort=fame\|name\|picked&page=&limit=` | Paged, filterable browsing (max 100 per page) |
| GET | `/players/search?q=` | Autocomplete, ranked by match quality then fame |
| GET | `/players/:id` | One footballer |
| GET | `/answers?row=&col=` | Every valid answer for two categories |
| GET | `/grid?difficulty=` · `/grid/:id/solutions` | Grids for offline modes |
| POST | `/validate` · `/cpu-answer` | Offline answer checking / AI answers |
| POST | `/profiles` `{username, avatar}` | Create a card, returns `{token, profile}` |
| GET/PATCH | `/profiles/me` (header `x-profile-token`) | Your card |
| GET | `/profiles/:username` · `/profiles/available?username=` | Public card + recent matches / name check |
| GET | `/leaderboard` · `/matches?mode=online` · `/stats` | Rankings, history, stats |
| GET | `/rooms/:code` | Room preview before joining |

## Socket events
Client → server (with an ack callback): `room:create {settings}`, `room:join {code}`, `room:rejoin {code, seatToken}`, `room:leave`, `game:guess {cell, footballerId}`, `game:skip`, `game:focus {cell}`, `game:ready`, `game:rematch`, `chat:send {text | reaction}`

Server → client: `room:state` (the full room state), `game:event` (correct / wrong / timeout / round_over / match_over / …), `game:focus`, `chat:message`

## Footballer data
The dataset (`server/src/data/generated/dataset.json.gz`, ~1.6 MB) has **61,265 footballers**, **131 clubs**, **73 nations** and 5 trophies. It's built from **Wikidata** (CC0) by:

```bash
cd server && npm run import:players      # about 3 minutes
```

- **Players:** everyone who played for a club in `src/data/clubs.js`. To add a club, give it a colour, short code, tier and Wikipedia title there, then re-run the import.
- **Names:** taken from the player's English Wikipedia article title, which is less exposed to label vandalism than Wikidata labels.
- **Fame:** the number of Wikipedia language editions. It ranks search results, guides the AI's picks, and keeps easy and medium grids to well-known players (12 or more editions).
- **Awards:** Ballon d'Or, FIFA World Player / The Best and the European Golden Shoe come from Wikidata.
- **World Cup / Champions League winners** are found automatically by [`scripts/trophies.js`](server/scripts/trophies.js). Wikidata says who won each edition. Players come from the winning squad on Wikipedia's "*year* FIFA World Cup squads" page, or from the winning team's line-up (substitutes included) on the final's page. Players are matched by Wikidata id, not by name. Re-running the import picks up new tournaments automatically.
- The hand-checked list in `src/data/players.js` is merged in last, and its spellings take priority.

Commit the new dataset file and redeploy. On start, the server mirrors a new version into MongoDB, and pick stats are kept.
