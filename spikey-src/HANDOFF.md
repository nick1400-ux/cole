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

## Open items for tomorrow
1. **Dock detection broken**: watcher sees only "Integrated Monitor" (WMI + PnP) even with HP 27f + HP E233 attached → `docked=False`, so Spikey doesn't auto-open on dock. Deployed extra diagnostics (video controllers, dock devices) — read `DockWatch\diag.txt`, then fix detection (likely DisplayLink/Synaptics dock).
2. **Spotify plays on DESKTOP-L90GM74 (another PC), not this laptop (NICK)** → that's why Nick couldn't hear it. Fixed in code: "Spikey, I can't hear the music" moves it to NICK (opens Spotify app on laptop if needed). Verify live.
3. Closing safety: stale backtest session (running 2h+, 0 trades) should auto-end; overdue timers/reminders after a restart should be announced once, not ring in a pile. Not done yet.
4. Turn laptop off only after tests pass (Nick's request) — shutdown flag ready.
5. Bank slide still placeholder (Era Context needs Nick's OK). "DAS replay" = app.dasreplay.com (seen on screen).
