/* ===== Understanding layer: turns ANY way Nick says something into Spikey's exact commands =====
   Fast regex commands still run instantly for the phrasings they know. Everything else (new wording,
   mis-heard words, two or three requests in one breath, slang) goes through a quick Claude call that
   maps it onto the command catalog below, or hands it to the full brain for questions and open requests. */
(() => {
  if (new URLSearchParams(location.search).get('screen') === 'side') return;
  const MODEL = 'claude-haiku-4-5-20251001';
  const key = () => { try{ return localStorage.getItem('spikey.claudeKey') || ''; }catch{ return ''; } };

  const CATALOG = `SCREENS
- "open my journal" | "open my journal today" | "open my journal this week" | "open my journal this month" | "close journal"
- "let's start backtesting" (opens the backtest logging screen) | "show backtest" | "minimize backtest" | "end backtest" | "undo last backtest trade" | "how's my backtest going"
- "backtest <long|short> <win|loss|breakeven> <R>R"  e.g. "backtest long win 2R", "backtest short loss 1R", "backtest long breakeven 0R"
- "what can you do" (capabilities screen) | "close it" (closes whatever screen/slide is up)
SLIDES (center screen)
- "open my diet tracking" (fuel: protein, calories, meals) | "open my finances" (money) | "open my trading" (week P&L, discipline) | "open my habits" | "open my agenda" (objectives)
- "show <custom slide title>" | "delete the <custom slide title> slide" | "stop slides" | "start slides" | "next slide"
OBJECTIVES (same list as Cole to-dos)
- "add task <text>" | "complete objective <number>" | "clear the objective list" | "read my objectives" | "refresh the objective list"
MUSIC (Spotify)
- "play <song/artist/album>" | "play playlist <name>" | "pause" | "resume" | "skip" | "previous song" | "where's the music playing" | "I can't hear the music" | "play it on <laptop|phone|device name>" | "reconnect spotify"
TIME
- "set a <N minute|N second|N hour> timer for <label>" | "remind me in <N minutes> to <thing>" | "remind me at <3pm|15:30> to <thing>" | "wake me up at <time>" | "cancel the <label> timer" | "cancel all timers" | "what timers do I have"
PROTOCOLS / SYSTEM
- "market mode" | "backtest mode" | "morning protocol" | "wrap up my day" | "house party protocol" | "focus mode" | "focus off"
- "status report" | "economic news today" | "how was my day" | "what's my P&L" | "briefing" | "what time is it" | "weather"
- "what have you learned" | "forget <rule or shortcut>" | "go to sleep" | "show <NAS100|US30|SPX500|GOLD|BTC|OIL|DXY>" (big chart) | "close chart"
- "open <youtube|gmail|calendar|tradingview|instagram|github|claude>" (in Chrome)`;

  const SYS = ctx => `You are the ears of Spikey, Nick's voice assistant. Speech-to-text is imperfect and Nick talks naturally (slang, filler, run-on requests, several requests in one sentence). Your job: understand what he MEANS and translate it into Spikey's exact commands.

Command catalog (use these exact phrasings, fill the <slots>):
${CATALOG}
${ctx}

Reply with ONE JSON object only:
{"intent":"commands","commands":["exact command", ...]}  when the request maps onto the catalog (keep his order; up to 5 commands; one per action)
{"intent":"brain"}   for questions, conversation, anything needing judgement, web search, logging to Cole (journal/meals/trades/spending), building a new slide, opening a website/video inside Spikey, teaching Spikey a rule or shortcut ("from now on…", "when I say…"), or anything not in the catalog
{"intent":"ignore"}  ONLY when the text is clearly not meant for Spikey (talking to someone else, TV, lyrics, fragments)${ctx.includes('FOLLOW-UP') ? '' : ' — this message used the wake word, so never ignore it'}

Rules:
- Prefer a catalog command whenever one plausibly fits; only use "brain" when nothing in the catalog does what he wants.
- Nick talks Miami/street casual. Slang: "bread", "bag", "racks", "paper", "my money", "my bank" = finances; "run it back" = previous song (or replay); "cut it", "kill it", "shut that off", "shush" = pause/close depending on what's playing or open; "pull up", "throw on", "bring up" = open/show/play; "what do I got going on", "what's on deck", "what's the move today" = read my objectives; "lock in" = focus mode (or market mode if he mentions trading); "I'm out", "I'm done for the night" = wrap up my day; "ping me / hit me / holla at me at 4" = remind me at 4.
- Fix mis-hearings using context: "back testing"/"back to sting"/"backtrace" → backtest; "objective list"/"to do"/"tasks" are the same list; "spiky/spikey/sparky" is his name for you, drop it.
- "clear it/that", "get rid of that objective", "I did it" while objectives are on screen → "clear the objective list" if only one is open, else "complete objective <n>" when he names which.
- Mixed requests: split into several commands, e.g. "kill the journal and pull up backtesting" → ["close journal","let's start backtesting"].
- If one part is a catalog command and another part needs judgement, use {"intent":"brain"}.
- Never invent things he didn't ask for.
- Hiding vs ending: "get rid of / close / hide / put away the backtest screen" = "minimize backtest" (the session keeps running). Use "end backtest", "clear the objective list", "cancel all timers" or "delete the … slide" ONLY when he clearly says end/finish/stop the session, clear/delete everything, etc.
- Money questions: "how much did I make", "am I up or down", "how's my week" = "what's my P&L" (spoken answer); "show/pull up my trading" = "open my trading".

Examples:
"bring my bread back up" → {"intent":"commands","commands":["open my finances"]}
"run it back on that last song" → {"intent":"commands","commands":["previous song"]}
"what do i got going on today" → {"intent":"commands","commands":["read my objectives"]}
"yo cut the music and throw a 20 minute timer on" → {"intent":"commands","commands":["pause","set a 20 minute timer for timer"]}
"how many trades did i take this week and was i disciplined" → {"intent":"brain"}`;

  function context(){
    const bits = [];
    const C = window.JV_custom; if (C){ const l = C.list(); if (l.length) bits.push('Custom slides: ' + l.map(s => '"' + s.title + '"').join(', ')); }
    const L = window.JV_learn; if (L){ const x = L.list(); if (x.shortcuts.length) bits.push('His voice shortcuts (say them exactly as a command): ' + x.shortcuts.map(s => '"' + s.phrase + '"').join(', ')); }
    const T = window.JV_tasks; if (T){ const t = T.list(); bits.push(`Open objectives (${t.length}): ` + t.slice(0, 8).map((x, i) => (i + 1) + '. ' + x).join(' | ')); }
    const open = [];
    if (window.JV_journal && window.JV_journal.isOpen()) open.push('journal');
    if (document.querySelector('#btPanel.open')) open.push('backtest screen');
    if (window.JV_custom && window.JV_custom.isOpen()) open.push('website/video screen');
    const sl = document.querySelector('#slides .slide.on h2'); if (sl) open.push('slide "' + sl.innerText.split('\n')[0] + '"');
    bits.push('On screen now: ' + (open.join(', ') || 'just the logo'));
    if (window.JV_backtest && window.JV_backtest.active()) bits.push('A backtest session is running (bare "long win 2R" style phrases are backtest trades).');
    return bits.join('\n');
  }

  async function route(text, opts = {}){
    if (!key()) return null;
    const alts = (opts.alts || []).filter(a => a && a.trim() && a.trim().toLowerCase() !== text.trim().toLowerCase()).slice(0, 3);
    const ctx = context() + (opts.followup ? '\nThis is a FOLLOW-UP heard without the wake word, a few seconds after Spikey spoke.' : '');
    const user = `Nick said: "${text}"` + (alts.length ? `\nOther ways the speech engine heard it: ${alts.map(a => '"' + a + '"').join(', ')}` : '');
    const ctl = new AbortController(); const timer = setTimeout(() => ctl.abort(), 6000);
    try{
      const r = await fetch('https://api.anthropic.com/v1/messages', {method:'POST', signal:ctl.signal,
        headers:{'content-type':'application/json', 'x-api-key':key(), 'anthropic-version':'2023-06-01', 'anthropic-dangerous-direct-browser-access':'true'},
        body:JSON.stringify({model:MODEL, max_tokens:300, system:SYS(ctx), messages:[{role:'user', content:user}]})});
      if (!r.ok) return null;
      const j = await r.json();
      const t = (j.content || []).filter(b => b.type === 'text').map(b => b.text).join('');
      const m = t.match(/\{[\s\S]*\}/); if (!m) return null;
      const out = JSON.parse(m[0]);
      if (out.intent === 'commands' && Array.isArray(out.commands) && out.commands.length) return {commands: out.commands.map(String).filter(Boolean).slice(0, 5)};
      if (out.intent === 'ignore') return opts.followup ? {ignore: true} : {brain: true};   // he used the wake word: never drop it
      if (out.intent === 'brain') return {brain: true};
      return null;
    }catch{ return null; }
    finally{ clearTimeout(timer); }
  }
  window.JV_router = {route, catalog: CATALOG};
})();
