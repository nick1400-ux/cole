/* ===== Spikey's brain: Claude with tools (answers questions, searches the web, controls Spotify/YouTube/TradingView, writes to Cole) ===== */
(() => {
  if (new URLSearchParams(location.search).get('screen') === 'side') return;
  const KEY_LS = 'spikey.claudeKey';
  const MODEL = 'claude-haiku-4-5-20251001';        // fast enough for voice
  const key = () => { try{ return localStorage.getItem(KEY_LS) || ''; }catch{ return ''; } };
  const history = [];                                 // short memory of this session (text turns only)

  async function call(body){
    let r;
    try{
      r = await fetch('https://api.anthropic.com/v1/messages', {method:'POST', headers:{'content-type':'application/json', 'x-api-key':key(), 'anthropic-version':'2023-06-01', 'anthropic-dangerous-direct-browser-access':'true'}, body:JSON.stringify(body)});
    }catch{ throw new Error("I can't reach my brain right now. Check the internet."); }
    if (r.status === 401 || r.status === 403) throw new Error('My Claude key was rejected. Check it in Setup.');
    if (r.status === 429 || r.status === 529) throw new Error("Claude is busy right now. Try me again in a minute.");
    if (!r.ok){ let m = ''; try{ m = (await r.json()).error.message; }catch{} throw new Error('Claude error. ' + m); }
    return r.json();
  }
  // JSON answer that may need fresh facts from the web (economic calendar etc.)
  async function askJSONWeb(prompt){
    const messages = [{role:'user', content:prompt + '\n\nUse web_search, then reply with the JSON object only. No prose, no code fences.'}];
    let t = '';
    for (let i = 0; i < 4; i++){
      const j = await call({model:'claude-sonnet-5-5', max_tokens:2000, tools:[{type:'web_search_20250305', name:'web_search', max_uses:4}], messages});
      messages.push({role:'assistant', content:j.content});
      t = (j.content || []).filter(b => b.type === 'text').map(b => b.text).join('');
      if (j.stop_reason !== 'pause_turn') break;
    }
    const m = t.match(/\{[\s\S]*\}/); return JSON.parse(m ? m[0] : t);
  }
  async function askJSON(prompt){
    const j = await call({model:'claude-sonnet-5-5', max_tokens:1500, messages:[{role:'user', content:prompt + '\n\nReply with the JSON object only. No prose, no code fences.'}]});
    const t = (j.content || []).filter(b => b.type === 'text').map(b => b.text).join('');
    const m = t.match(/\{[\s\S]*\}/); return JSON.parse(m ? m[0] : t);
  }

  const TOOLS = [
    {type:'web_search_20250305', name:'web_search', max_uses:3},
    {name:'play_spotify', description:'Play a song, artist, album or playlist on Nick\'s Spotify (Premium).', input_schema:{type:'object', properties:{query:{type:'string', description:'e.g. "Lose Yourself Eminem" or "techno bunker"'}, type:{type:'string', enum:['track','artist','album','playlist']}}, required:['query']}},
    {name:'spotify_where', description:'Which device Spotify is playing on (and its volume), plus all devices Spotify sees. Use when Nick cannot hear the music.', input_schema:{type:'object', properties:{}}},
    {name:'spotify_move', description:'Move Spotify playback to a device: "laptop" (this computer, named NICK) or a device name like phone, TV, DESKTOP-…. If Nick cannot hear music and it is playing on a device other than NICK, move it to "laptop".', input_schema:{type:'object', properties:{device:{type:'string'}}, required:['device']}},
    {name:'spotify_control', description:'Pause, resume, skip, go back, set volume (0-100) or shuffle on Spotify.', input_schema:{type:'object', properties:{action:{type:'string', enum:['pause','resume','next','previous','volume','shuffle']}, value:{type:'number'}}, required:['action']}},
    {name:'open_youtube', description:'Open YouTube search results in Chrome. To PLAY a specific video, find its youtube.com/watch URL with web_search and use open_screen so it plays inside Spikey.', input_schema:{type:'object', properties:{query:{type:'string'}}, required:['query']}},
    {name:'open_tradingview', description:'Open a TradingView chart. Futures use TradingView symbols like CME_MINI:NQ1!, CBOT_MINI:YM1!, CBOT_MINI:MYM1!, COMEX:GC1!, CME_MINI:ES1!.', input_schema:{type:'object', properties:{symbol:{type:'string'}}, required:['symbol']}},
    {name:'open_website', description:'Open any web page in a new window.', input_schema:{type:'object', properties:{url:{type:'string'}}, required:['url']}},
    {name:'show_chart', description:'Show a big chart inside Spikey\'s own screen. Use names like NAS100, US30, SPX500, GOLD, BTC, OIL, DXY.', input_schema:{type:'object', properties:{symbol:{type:'string'}}, required:['symbol']}},
    {name:'show_slide', description:'Show one of Spikey\'s existing slides on the center screen, by name (see the list of current slides in the system prompt).', input_schema:{type:'object', properties:{slide:{type:'string'}}, required:['slide']}},
    {name:'create_slide', description:'Build a brand-new slide on the spot when Nick wants to see something no existing slide shows (any stat, chart, breakdown, comparison, tracker, countdown, list, or outside info like news, scores or events). It is built from his live Cole and Spikey data and joins the rotation. Takes about a minute; it builds in the background and Spikey announces it when ready.', input_schema:{type:'object', properties:{request:{type:'string', description:'What the slide should show, in detail, in Nick\'s words plus anything you know he means'}}, required:['request']}},
    {name:'edit_slide', description:'Change a slide Spikey built earlier (add or remove things, restyle, fix it).', input_schema:{type:'object', properties:{slide:{type:'string'}, change:{type:'string'}}, required:['slide','change']}},
    {name:'delete_slide', description:'Delete a slide Spikey built.', input_schema:{type:'object', properties:{slide:{type:'string'}}, required:['slide']}},
    {name:'open_screen', description:'Show a website or video INSIDE Spikey on a full screen (YouTube videos, Spotify, Google Maps, TradingView charts, news articles and most sites). Sites that refuse to be embedded (Google, Gmail, Instagram, X...) open in Chrome automatically. For a YouTube video, first find its youtube.com/watch URL with web_search.', input_schema:{type:'object', properties:{url:{type:'string'}, title:{type:'string'}}, required:['url']}},
    {name:'add_web_slide', description:'Pin a website or video into the slide rotation permanently (a live embed), e.g. a YouTube livestream or a TradingView chart.', input_schema:{type:'object', properties:{url:{type:'string'}, title:{type:'string'}}, required:['url','title']}},
    {name:'close_screen', description:'Close the website/video screen.', input_schema:{type:'object', properties:{}}},
    {name:'backtest', description:'Nick\'s backtesting session (he backtests on another screen; Spikey only keeps score): start the session, log a backtest trade, get stats, undo the last trade, or end the session. Use for anything about backtesting or replay.', input_schema:{type:'object', properties:{action:{type:'string', enum:['start','show','minimize','log','summary','undo','end']}, direction:{type:'string', enum:['long','short']}, outcome:{type:'string', enum:['win','loss','breakeven']}, r:{type:'number', description:'R multiple, e.g. 2 for a 2R win'}}, required:['action']}},
    {name:'timer', description:'Set a timer, alarm or reminder that rings and speaks when due. For a timer give minutes; for an alarm or reminder at a clock time give time as HH:MM 24-hour local; for a reminder after a delay give minutes.', input_schema:{type:'object', properties:{kind:{type:'string', enum:['timer','alarm','reminder','cancel','list']}, minutes:{type:'number'}, time:{type:'string'}, label:{type:'string'}}, required:['kind']}},
    {name:'protocol', description:'Run one of Spikey\'s protocols (routines): market (trading mode: pause music, focus, trading slide, rules, news), backtest, morning (briefing), wrap (end-of-day summary + journal), party (music), focus (quiet mode), unfocus.', input_schema:{type:'object', properties:{name:{type:'string', enum:['market','backtest','morning','wrap','party','focus','unfocus']}}, required:['name']}},
    {name:'status_report', description:'System status: brain, Cole, Spotify device, microphone, battery, network, backtest session, timers, focus mode.', input_schema:{type:'object', properties:{}}},
    {name:'economic_news', description:'Today\'s high-impact USD economic events with Eastern times (CPI, NFP, FOMC...).', input_schema:{type:'object', properties:{}}},
    {name:'add_task', description:'Add an objective to Spikey\'s on-screen list.', input_schema:{type:'object', properties:{text:{type:'string'}}, required:['text']}},
    {name:'complete_task', description:'Mark one of Spikey\'s objectives done (it is also a Cole to-do), by its number on screen (1 = first), or number 0 with all=true to clear every objective. Always call get_todos first; never claim the list is empty without checking.', input_schema:{type:'object', properties:{number:{type:'integer'}, all:{type:'boolean'}}, required:['number']}},
    {name:'log_to_cole', description:'Save something Nick says into Cole (his life/trading app). Cole sorts it into trading journal, meals, ideas, to-dos and spending. ALWAYS use it when he talks about a real trade he took today (entered, got long/short, stopped out, closed it, took profit, the result): it is logged as a real trade in the shared Cole/Spikey trade log with his rules checked, and later details about the same trade update it instead of duplicating. Not for backtest/replay trades (use backtest). Also use when he says log, journal, note, tell Cole, or describes his food, spending or plans for the record.', input_schema:{type:'object', properties:{text:{type:'string', description:'What Nick said, in his words'}}, required:['text']}},
    {name:'get_trading_week', description:'Nick\'s P&L this week from Cole, by day, with which trading rules he broke.', input_schema:{type:'object', properties:{}}},
    {name:'get_todos', description:'Nick\'s open objectives (the same list as his Cole to-dos).', input_schema:{type:'object', properties:{}}},
    {name:'read_cole', description:'Read Nick\'s Cole pages for a date range: journal entries (tagged trading, family, business, fitness), trades with rules broken, meals with macros, ideas, spending, to-dos and habits. Use for anything about what he wrote, ate, spent, planned or felt on a day or over a period.', input_schema:{type:'object', properties:{from:{type:'string', description:'YYYY-MM-DD'}, to:{type:'string', description:'YYYY-MM-DD'}, sections:{type:'array', items:{type:'string', enum:['journal','trades','meals','ideas','spend','tasks','habits']}}}}},
    {name:'show_journal', description:'Open the Journal screen with ALL of Nick\'s journal entries grouped into their categories (trading, personal, family, business, fitness, ideas), and get them back as text. Use whenever he asks for journal entries or what he journaled.', input_schema:{type:'object', properties:{range:{type:'string', enum:['today','week','month','all']}}}},
    {name:'learn', description:'Permanently change how you behave. Use kind "rule" when Nick corrects you, states a preference, or says always / never / next time / from now on / remember that (store one short, clear instruction in your own words). Use kind "shortcut" when he defines a voice phrase that should trigger an action ("when I say game time, play my trading playlist and show the trading slide").', input_schema:{type:'object', properties:{kind:{type:'string', enum:['rule','shortcut']}, text:{type:'string', description:'the rule, for kind rule'}, phrase:{type:'string', description:'the trigger phrase, for kind shortcut'}, command:{type:'string', description:'what to do, written as a command Nick could say to you, for kind shortcut'}}, required:['kind']}},
    {name:'forget_learned', description:'Remove a rule or shortcut you learned earlier, when Nick asks you to forget or stop doing it.', input_schema:{type:'object', properties:{query:{type:'string'}}, required:['query']}}
  ];

  const open = url => { const w = window.open(url, '_blank'); return w ? 'Opened.' : 'The window was blocked.'; };
  async function run(name, input){
    try{
      switch (name){
        case 'play_spotify':
          if (window.JV_spotify && window.JV_spotify.connected()) return (await window.JV_spotify.play(input.query, input.type || 'track')).message;
          location.href = 'spotify:search:' + encodeURIComponent(input.query);
          return 'Spotify is not connected in Spikey Setup yet, so I opened the search in the Spotify app instead of playing it.';
        case 'spotify_where': return (await window.JV_spotify.where()) + ' Devices: ' + JSON.stringify(await window.JV_spotify.devices());
        case 'spotify_move': return await window.JV_spotify.moveTo(input.device);
        case 'spotify_control':
          if (!(window.JV_spotify && window.JV_spotify.connected())) return 'Spotify is not connected in Setup.';
          await window.JV_spotify.control(input.action, input.value); return 'Done.';
          // (errors fall through to the catch below with Spotify's exact reason)
        case 'open_youtube': return open('https://www.youtube.com/results?search_query=' + encodeURIComponent(input.query));
        case 'open_tradingview': return open('https://www.tradingview.com/chart/?symbol=' + encodeURIComponent(input.symbol));
        case 'open_website': return open(/^https?:\/\//.test(input.url) ? input.url : 'https://' + input.url);
        case 'show_chart': {
          const map = {NAS100:'OANDA:NAS100USD', NQ:'OANDA:NAS100USD', US30:'OANDA:US30USD', YM:'OANDA:US30USD', DOW:'OANDA:US30USD', SPX500:'OANDA:SPX500USD', ES:'OANDA:SPX500USD', GOLD:'OANDA:XAUUSD', GC:'OANDA:XAUUSD', BTC:'BITSTAMP:BTCUSD', OIL:'TVC:USOIL', DXY:'TVC:DXY'};
          const s = map[String(input.symbol).toUpperCase().replace(/\s/g,'')] || input.symbol;
          if (window.JV_setSymbol) window.JV_setSymbol(s); return 'Chart is up.';
        }
        case 'show_slide': return window.JV_slides && window.JV_slides.show(input.slide, 45000) ? 'Showing it.' : 'There is no slide called that. Offer to build it with create_slide, or just build it if he clearly wants it.';
        case 'create_slide': case 'edit_slide': {
          const C = window.JV_custom; if (!C) return 'Slide builder not available.';
          if (name === 'edit_slide' && !C.find(input.slide)){
            const builtIn = ['fuel','trading','money','habits','agenda'].includes(String(input.slide).toLowerCase());
            if (!builtIn) return 'No slide called that. Use create_slide instead.';
            input = {request: 'A new version of the built-in ' + input.slide + ' slide with this change: ' + input.change};
          }
          const job = name === 'edit_slide' && input.change ? C.create(input.change, {editOf: input.slide}) : C.create(input.request);
          job.then(r => window.JV_say && window.JV_say(r.message)).catch(e => window.JV_say && window.JV_say("I couldn't build that slide. " + (e.message || '')));
          return 'Building it now in the background; it will appear on screen and you will announce it when ready. Tell Nick briefly that you are on it.';
        }
        case 'delete_slide': return window.JV_custom ? window.JV_custom.remove(input.slide) : 'Not available.';
        case 'open_screen': return window.JV_custom ? window.JV_custom.openScreen(input.url, input.title) : open(input.url);
        case 'add_web_slide': return window.JV_custom ? window.JV_custom.addEmbed(input.title, input.url).message : 'Not available.';
        case 'close_screen': if (window.JV_custom) window.JV_custom.closeScreen(); return 'Closed.';
        case 'backtest': {
          const B = window.JV_backtest; if (!B) return 'Backtest mode is not available.';
          if (input.action === 'start') return B.open().message;
          if (input.action === 'show'){ B.show(true); return 'Backtest screen is up.'; }
          if (input.action === 'minimize'){ B.hide(); return 'Minimized; session still running.'; }
          if (input.action === 'log') return B.logTrade({dir:input.direction, outcome:input.outcome || 'win', r:input.r});
          if (input.action === 'undo') return B.undo();
          if (input.action === 'end') return B.end();
          return B.summary();
        }
        case 'timer': {
          const A = window.JV_assist; if (!A) return 'Not available.';
          if (input.kind === 'list') return A.list();
          if (input.kind === 'cancel') return A.cancel(input.label || 'last');
          let at = null;
          if (input.time){ const [h, m] = String(input.time).split(':').map(Number); const d = new Date(); d.setHours(h, m || 0, 0, 0); if (d < new Date()) d.setDate(d.getDate() + 1); at = d.getTime(); }
          if (input.kind === 'timer'){ if (!input.minutes) return 'Need minutes.'; A.timer(input.minutes * 60000, input.label); return 'Timer set.'; }
          if (!at && input.minutes) at = Date.now() + input.minutes * 60000;
          if (!at) return 'Need a time or minutes.';
          (input.kind === 'alarm' ? A.alarm : A.reminder)(at, input.label); return 'Set for ' + new Date(at).toLocaleTimeString([], {hour:'numeric', minute:'2-digit'}) + '.';
        }
        case 'protocol': { const r = window.JV_assist && await window.JV_assist.protocol(input.name + ' protocol'); return r ? r.message : 'Unknown protocol.'; }
        case 'status_report': return window.JV_assist ? await window.JV_assist.status() : 'Not available.';
        case 'economic_news': { const n = window.JV_assist && await window.JV_assist.loadNews(true); return n ? JSON.stringify(n.events) : 'Could not check the calendar.'; }
        case 'add_task': window.JV_tasks.add(input.text); return 'Added.';
        case 'complete_task':
          if (input.all){ if (window.JV_coleTasks && window.JV_coleTasks.on()){ await window.JV_coleTasks.completeAll(); } window.JV_tasks.list().forEach(() => window.JV_tasks.complete(1)); return 'Cleared. Open now: ' + JSON.stringify(window.JV_tasks.list()); }
          return window.JV_tasks.complete(input.number);
        case 'log_to_cole': return (await window.JV_coleLog(input.text, askJSON)).message;
        case 'get_trading_week': return (window.JV_pnlBreakdown && window.JV_pnlBreakdown()) || 'Cole data is still loading; try again shortly. Do not ask Nick to open or sign in to anything.';
        case 'get_todos': return JSON.stringify({objectives:window.JV_tasks.list(), cole_signed_in:!!(window.JV_coleSignedIn && window.JV_coleSignedIn())});
        case 'show_journal': {
          const J = window.JV_journal; if (!J) return 'Journal screen not available.';
          J.show(input.range || 'all');
          const t = JSON.stringify(J.text(...J.rangeOf(input.range || 'all')));
          return 'Journal screen is open, grouped by category. Entries: ' + t.slice(0, 12000);
        }
        case 'read_cole': {
          const r = window.JV_coleRead && window.JV_coleRead(input.from, input.to, input.sections);
          if (!r) return 'Cole data is still loading. Try again in a few seconds; do not ask Nick to open or sign in to anything.';
          const t = JSON.stringify(r); return t === '{}' ? 'Nothing logged in Cole for those dates.' : t.slice(0, 12000);
        }
        case 'learn': {
          const Ln = window.JV_learn; if (!Ln) return 'Learning is not available.';
          return input.kind === 'shortcut' ? Ln.teach(input.phrase, input.command) : Ln.remember(input.text);
        }
        case 'forget_learned': return window.JV_learn ? window.JV_learn.forget(input.query) : 'Learning is not available.';
      }
      return 'Unknown tool.';
    }catch(e){ return 'Failed. Tell Nick exactly this reason, word for word, do not paraphrase it as a connection issue: ' + (e.message || e); }
  }

  function system(){
    const now = new Date();
    return `You are Spikey, Nick's personal voice assistant, running on his laptop dashboard. Sledge B is his brand ("by outcasts for outcasts"). Nick is a Miami Mercedes-Benz technician who day trades MYM/YM futures with strict rules (max 2 trades a day, no revenge trades, no oversizing, no FOMO, trade only 9:30 to 10:30 ET) and runs Sledge B events and content.
Personality: like J.A.R.V.I.S. from Iron Man: calm, sharp, loyal, quietly confident, with a dry wit used sparingly. Anticipate what he needs next and offer it in a few words. Never sycophantic.
Your replies are SPOKEN ALOUD. Keep them to 1 to 3 short sentences, casual and direct, no markdown, no lists, no emojis, never read out URLs. Say numbers naturally.
Cole is Nick's other app and you and Cole are ONE personal assistant with one shared memory: his Cole to-dos are your objectives, everything in Cole (journal, meals, trades, ideas, spending, habits) is yours, and everything you record (objectives, backtests, what you learn) goes into Cole. Never ask Nick to open Cole, sign in, share or give access to his data, and never ask permission to look; just read it with your tools and answer. When he asks for journal entries, use show_journal and give him all of them organized by category, not just one day or one type. Today's date is ${(d => d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0'))(now)}.
You keep improving: whenever Nick corrects you, tells you how he wants something done, or says always, never, next time or from now on, call the learn tool so you remember it permanently, then confirm briefly.
Use your tools to act: play music on Spotify, open YouTube, TradingView or websites, show charts, manage objectives, log things into Cole, and look up his trading week and to-dos. Use web_search for anything current (news, prices, scores, weather elsewhere, facts you are unsure of).
Never give specific trade calls or financial advice. If he's clearly about to break a trading rule, remind him.
${window.JV_backtest && window.JV_backtest.active() ? 'A backtesting session is running right now: ' + window.JV_backtest.summary() + ' Short replies like "long win 2R" or "loss" are backtest trades to log.\n' : ''}Slides on screen right now: ${window.JV_slides && window.JV_slides.names ? window.JV_slides.names().join(', ') : 'fuel, trading, money, habits, agenda'}. If Nick asks to see something none of them covers, build it with create_slide instead of saying you can't. If he wants to watch or look at something on the web, show it inside Spikey with open_screen; "open Chrome" or "open it in Chrome" means open_website.
${window.JV_learn ? window.JV_learn.prompt() + '\n' : ''}Right now it is ${now.toLocaleString('en-US', {timeZone:'America/New_York', weekday:'long', month:'long', day:'numeric', hour:'numeric', minute:'2-digit'})} Eastern time, and he is in Miami.`;
  }

  async function ask(text, opts){
    if (!key()) return null;
    const followup = !!(opts && opts.followup);
    // follow-ups arrive without the wake word: let Claude judge whether Nick is talking to Spikey
    const content = followup
      ? `${text}\n\n[Heard WITHOUT the wake word, a few seconds after your last reply. If this is clearly not directed at you (Nick talking to someone else, a phone call, TV or song lyrics, background chatter, or unrelated half-sentences), reply with exactly IGNORE and nothing else. If it continues the conversation, is a question or request you can act on, or is about you, answer normally.]`
      : text;
    const messages = [...history, {role:'user', content}];
    let final = '';
    for (let step = 0; step < 6; step++){
      const res = await call({model:MODEL, max_tokens:700, system:system(), tools:TOOLS, messages});
      messages.push({role:'assistant', content:res.content});
      const uses = (res.content || []).filter(b => b.type === 'tool_use');
      final = (res.content || []).filter(b => b.type === 'text').map(b => b.text).join(' ').trim() || final;
      if (res.stop_reason === 'pause_turn') continue;                 // long web search: let it keep going
      if (!uses.length) break;
      const results = [];
      for (const u of uses) results.push({type:'tool_result', tool_use_id:u.id, content:String(await run(u.name, u.input || {}))});
      messages.push({role:'user', content:results});
    }
    final = final.replace(/[*_#`>]/g, '').replace(/https?:\/\/\S+/g, '').replace(/\s+/g, ' ').trim() || 'Done.';
    if (followup && /^IGNORE\b/i.test(final)) return 'IGNORE';          // not for Spikey: don't add it to the conversation
    history.push({role:'user', content:text}, {role:'assistant', content:final});
    while (history.length > 16) history.shift();
    return final;
  }

  window.JV_brain = {
    hasKey: () => !!key(),
    setKey: v => { try{ v ? localStorage.setItem(KEY_LS, v.trim()) : localStorage.removeItem(KEY_LS); }catch{} },
    ask, askJSON, askJSONWeb
  };
})();
