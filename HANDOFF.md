# Spikey + Cole Handoff

As of 2026-10-09 · Nick (nick1400-ux) · live doc: https://claude.ai/code/artifact/61f8fb92-43b8-48d7-8606-9de10754a2f3

Spikey is Nick's voice-assistant HUD for his Windows laptop: it opens on the laptop screen when he docks, runs on Claude, controls Spotify, reads and writes Cole, logs backtests, builds new slides on request and understands casual speech. Cole (`Cole app/`) is his life/trading app. Nick treats them as ONE personal assistant with one shared memory.

## Where everything lives

| Piece | Where | Notes |
| --- | --- | --- |
| Spikey (live) | https://nick1400-ux.github.io/cole/spikey/ | Built file `spikey/index.html`, repo `nick1400-ux/cole`, branch `main` |
| Spikey source | `spikey-src/` | `src/*.js`, `buildspikey3.py`, `tests/`, `device/spikey-watch.txt`, `HANDOFF.md` |
| Cole Desk (desktop dashboard) | https://nick1400-ux.github.io/cole/desk/ | `desk/index.html` + `desk/manifest.json`; read-only view of every `cole_docs` path, same Cole login; installable as a desktop app |
| Cole app | `Cole app/index.html` (also Desktop\Cole app on the laptop) | Same GitHub Pages site |
| Laptop watcher | `Documents\Spikey\spikey-watch.txt` | Windows scheduled task "Spikey" (logon + every 5 min) |
| Laptop logs | `Documents\DockWatch\` | `dock-log.csv`, `heartbeat.txt`, `diag.txt`, `errors.txt` |
| Data | Cole's Supabase, table `cole_docs` (`user_id` + `path`) | Shared by Cole and Spikey |
| Keys | Spikey's own Chrome profile (`%LOCALAPPDATA%\SpikeyMainChrome`) | Claude key, Spotify client ID + login, Cole sign-in; set in ⚙ SETUP. Never put keys in the repo |

Look: "Night Ops Red Room" (black, red lead, UV-purple accents), Sledge B logo spinning in 3D at the centre. Laptop screen only; the two monitors stay free.

## Cole Desk
A wide-screen, read-only dashboard Nick opens on purpose (pinned to the Windows taskbar), separate from Spikey's dock HUD. **The Journal & mindset page is the front page and the most important part for Nick**: each day's check-in (mood, sleep, feelings, plan), trades in R with rules broken, and every journal entry and trade note together; filters by category, search, optional raw voice notes, red-flag words, and feeling/mood/sleep → R tables. Other sections: Overview, Trading (equity curve in R or $, by day/weekday/market, rules broken, every trade, check-ins, trading costs), Backtests, Fuel, Habits (heatmaps, triggers, slip hours), Mind (searchable journal, to-dos, ideas), Content (pipeline board), Money (logged spend), Day & week, Spikey (learned rules, shortcuts, slides). Live via Supabase realtime; reloads itself when `DESK_BUILD` changes. Logging still happens in Cole or Spikey. If Cole's plan constants (targets, PLAN) change, mirror them at the top of `desk/index.html`.

## How it opens
1. The watcher checks monitors every 3 s; on dock it opens Chrome in app mode, full screen on the laptop screen, at the live URL. It restarts itself when its file changes. (Smart App Control blocks .bat/.ps1, so it's a text file run with `Invoke-Expression`.)
2. `Documents\Spikey\relaunch.txt` → Spikey restarts; the file's text is appended to the URL and must start with `?` (e.g. `?v=1`).
3. `Documents\Spikey\shutdown.txt` → `shutdown /s /t 60` (`shutdown /a` cancels).
4. Spikey checks for a new published version about every 90 s and reloads quietly when idle (no repeat briefing).

## What Spikey can do
- Wake word "Spikey"; keeps listening ~20 s after a reply; "stop" cuts it off.
- Understanding layer (`router.js`): quick phrases run instantly; anything else (slang, mis-heard words, several requests at once) goes through a Claude Haiku router that maps it to Spikey's commands, or to the full brain. 12/12 unseen casual phrasings understood on the laptop. New commands must be added to `CATALOG` in `router.js`.
- Opening briefing: P&L breakdown, rules followed, objectives; always ends "Let's make shit happen." No weather, no pop-up.
- Brain: Claude with tools (web search, Spotify, YouTube, TradingView, Cole read/write, slides, timers, protocols, learning).
- Screens (one at a time): Journal (all entries by category), backtest logging screen, capabilities sheet, websites/videos inside Spikey.
- Slides: Fuel, Money (bank = placeholder), Trading (in R), Habits, Agenda, plus slides Claude builds on request from live data.
- Home panel: Weekly R (not dollars), R per day, today's trades.
- Backtesting: "let's start backtesting", log by voice ("backtest long win 2R") or buttons; stats + equity curve; saved to Cole; idle sessions auto-close after 3 h.
- Objectives = Cole to-dos (add / complete / clear / refresh).
- Spotify Premium: play/pause/skip/previous, move devices; plays on this laptop (NICK), not the other PC (DESKTOP-L90GM74). "I can't hear the music" fixes it.
- Timers, alarms, reminders (missed ones announced once); protocols: market mode, backtest mode, morning, wrap-up, party, focus.
- Heads-ups: market open in 5, trading window closing/closed, high-impact news, 2-trade limit, loss cool-down, revenge check, protein and journal nudges.
- Learns rules and voice shortcuts ("from now on…", "when I say X, do Y"), synced through Cole.

## Shared data (`cole_docs` paths)
| Path | Holds | Written by |
| --- | --- | --- |
| `days/YYYY-MM-DD` | journal, meals, trades (with R), ideas, spend, tasks, habits, check-in | Cole + Spikey |
| `backtest/<date>-<start>` | backtest sessions | Spikey (shown on Cole Trade tab) |
| `spikey/learned` | learned rules + shortcuts | Spikey (shown on Cole Mind tab) |
| `spikey/slides` | slides built on request | Spikey |
| `meta/*` | Cole links, habits, pipeline, editable trading rules | Cole |

Trades said out loud are logged to the day's trades and checked against the 5 rules (plan, size, no revenge, no FOMO, 9:30–10:30 ET); rules are editable in Cole and Spikey follows them.

## How to change and ship
1. `git pull` first — several Claude sessions work in this repo.
2. Copy `spikey-src/` to a build folder (e.g. `/home/claude/Jarvis`), edit `src/`, run `python3 buildspikey3.py` (writes `final/spikey.html` and the repo's `spikey/index.html`). Script order: cole → learn → spotify → brain → engine6 → backtest → journal → custom → assist → router → setup → slides → selftest.
3. Run the Playwright tests in `spikey-src/tests/` (they mock Supabase, Claude and Spotify).
4. Copy changed sources back into `spikey-src/`, commit as `nick1400-ux`, push to `main`. The laptop picks it up by itself.
5. Silent check on the laptop: relaunch with `?routercheck=1`. Don't run `?selftest=1` unasked; never `?mictest`.

## Fix log (newest first)
| Date | Problem | Fix |
| --- | --- | --- |
| Oct 1 | Week shown in dollars | Home panel + Trading slide in R; trades without R count as 0 and are flagged |
| Oct 1 | Only exact phrases worked | Claude router |
| Oct 1 | "Clear it" didn't clear the objective | Any phrasing; completes across every Cole day and verifies |
| Oct 1 | Self-test looped "what time is it" | Old mic test unhooked |
| Oct 1 | Stale backtest session / pile of missed alarms | Auto-close after 3 h idle; missed reminders announced once |
| Sep 30 | Couldn't hear music | Was playing on another PC; now targets NICK |
| Sep 30 | Spotify "connection issues" | Retries, no login-refresh clash, real errors |
| Sep 30 | Slide vanished during follow-up; journal covered backtest | Slide stays; one screen at a time; two commands per sentence |
| Earlier | Mic not heard | Windows had the Realtek mic muted |
| Earlier | Every Cole dump landed in journal | Device-saved Claude key for Cole's AI |
| Earlier | Dock trigger died; .bat blocked | Polling watcher run from a text file by a self-restarting task |

## Open items
- [ ] Money slide bank balances: placeholder until Nick approves a source (e.g. Era Context)
- [ ] Spoken P&L still in dollars; switch to R if Nick wants
- [ ] Trades logged without R show as 0R
- [ ] TV / second Spikey screen on hold
- [ ] DAS Replay (app.dasreplay.com) is where he backtests; Spikey only logs
