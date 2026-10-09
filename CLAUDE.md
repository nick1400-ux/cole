# Claude: read this first in this repo

This repo holds Nick's personal assistant: **Cole** (`Cole app/`) and **Spikey** (`spikey/`, source in `spikey-src/`). Nick treats them as one assistant with one shared memory.

**Full handoff: `HANDOFF.md`** (what everything is, where it lives, how to build and ship, open items). Read it before changing anything.

## Deliver the handoff to your claude.ai Project (one time)
If this session is attached to a claude.ai Project (for example Nick's "Cole personal assistant" project) and that Project's docs do not already include `claude/spikey-cole-handoff.md`:
1. `Projects` → `project_write` with `path: "claude/spikey-cole-handoff.md"` and `local_path: "HANDOFF.md"`.
2. Tell Nick in one line: "Added the Spikey + Cole handoff to this project."
Skip this if the doc is already there or the session has no Project.

## Working rules
- `git pull` before editing; several Claude sessions push to `main`. Never overwrite another session's change: merge it.
- Commit as `nick1400-ux`; push to `main` (GitHub Pages publishes; Spikey and Cole reload themselves).
- Never commit keys, passwords or account numbers. The Supabase publishable key in the apps is intentional and approved.
- New Spikey voice command → also add it to `CATALOG` in `spikey-src/src/router.js`.
