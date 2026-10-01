# Spikey — handoff (saved 2026-10-01 00:15 ET)

Live app: https://nick1400-ux.github.io/cole/spikey/ (built file: `spikey/index.html`).
Cole app: `Cole app/index.html` (also copied to Nick's Desktop\Cole app).

## Rebuild
```
mkdir -p /home/claude/Jarvis && cp -r spikey-src/* /home/claude/Jarvis/ && mkdir -p /home/claude/Jarvis/final
cd /home/claude/Jarvis && python3 buildspikey3.py   # writes final/spikey.html + /home/claude/cole/spikey/index.html
```
Script order: cole → learn → spotify → brain → engine6 → backtest → journal → custom → assist → setup → slides → selftest.
Tests in `tests/` (Playwright, mocks Supabase/Claude/Spotify). On-device: relaunch with `?selftest=1` → last run 15/15 PASS (00:10 ET).

## Laptop (NICK) plumbing
- Scheduled task "Spikey" runs `Documents\Spikey\spikey-watch.txt` (copy in `device/`). Logs: `Documents\DockWatch\`.
- `Documents\Spikey\relaunch.txt` → restarts Spikey with its text as the query string (must start with `?`).
- `Documents\Spikey\shutdown.txt` → `shutdown /s /t 60` (added at Nick's request; not used yet).
- Spikey self-updates (silently reloads) when a new version is published.

## Status (updated 2026-10-01 18:50 ET)
- Dock auto-open WORKS: watcher logged `docked → launched` at 18:31 today (last night's "undocked" readings were taken with the monitors asleep / before docking settled).
- Spotify: "Spikey, I can't hear the music" moves playback from DESKTOP-L90GM74 (another PC) to this laptop (NICK).
- Restart-safe: stale backtest sessions auto-close; reminders missed while Spikey was closed are announced once.
- Self-test (`?selftest=1`) is one-shot and optional; Nick said he doesn't need it — don't run it unasked.
- Another chat also edits this repo (e.g. tradelog.js): always `git pull` and copy `spikey-src/` into the build folder before rebuilding.

- Understanding layer (`router.js`): anything that isn't an exact quick phrase (long, compound, slang, mis-heard) goes through a fast Claude call that maps it onto the command catalog, or to the full brain. Live check on the laptop: 12/12 unseen casual phrasings understood. Silent re-check: relaunch with `?routercheck=1` (nothing executed or spoken). When adding a new command, add it to CATALOG in router.js.

## Still open
- Bank slide still placeholder (Era Context needs Nick's OK).
