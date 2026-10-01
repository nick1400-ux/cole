/* ===== JARVIS-style capabilities: timers/alarms/reminders, protocols (routines), proactive heads-ups,
   status report, focus mode, end-of-day wrap-up, economic-news watch ===== */
(() => {
  if (new URLSearchParams(location.search).get('screen') === 'side') return;
  const LS = 'spikey.assist.';
  const get = (k, d) => { try{ const v = localStorage.getItem(LS + k); return v == null ? d : JSON.parse(v); }catch{ return d; } };
  const put = (k, v) => { try{ localStorage.setItem(LS + k, JSON.stringify(v)); }catch{} };
  const say = t => window.JV_say ? window.JV_say(t) : Promise.resolve();
  const pad = n => String(n).padStart(2, '0');
  const keyOf = d => `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
  const esc = t => String(t == null ? '' : t).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'})[c]);
  const NUM = {a:1, an:1, one:1, two:2, three:3, four:4, five:5, six:6, seven:7, eight:8, nine:9, ten:10, fifteen:15, twenty:20, thirty:30, forty:40, 'forty five':45, fifty:50, sixty:60, ninety:90, half:0.5};
  const num = w => { w = String(w).trim(); return /^\d+(\.\d+)?$/.test(w) ? +w : NUM[w]; };
  // New York time pieces (Nick trades on ET even if the laptop clock drifts)
  const et = () => { const p = new Intl.DateTimeFormat('en-US', {timeZone:'America/New_York', hour12:false, weekday:'short', hour:'2-digit', minute:'2-digit'}).formatToParts(new Date()); const o = {}; p.forEach(x => o[x.type] = x.value); return {wd:o.weekday, h:+o.hour % 24, m:+o.minute, hm:(+o.hour % 24) * 60 + +o.minute}; };
  const fmtLeft = ms => { const s = Math.max(0, Math.round(ms / 1000)), h = Math.floor(s / 3600), m = Math.floor(s % 3600 / 60), x = s % 60; return h ? `${h}:${pad(m)}:${pad(x)}` : `${m}:${pad(x)}`; };
  const spokenDur = ms => { const m = Math.round(ms / 60000); if (m < 1){ const s = Math.round(ms / 1000); return s + ' second' + (s === 1 ? '' : 's'); } if (m < 60) return m + ' minute' + (m === 1 ? '' : 's'); const h = Math.floor(m / 60), r = m % 60; return h + ' hour' + (h === 1 ? '' : 's') + (r ? ' ' + r + ' minutes' : ''); };

  // ---------- timers, alarms, reminders ----------
  let items = get('items', []);                 // {id, kind:'timer'|'alarm'|'reminder', at, label, made}
  const saveItems = () => { put('items', items); drawChip(); };
  function add(kind, at, label){
    const it = {id: Date.now().toString(36) + Math.random().toString(36).slice(2, 5), kind, at, label: label || '', made: Date.now()};
    items.push(it); items.sort((a, b) => a.at - b.at); saveItems(); return it;
  }
  function cancel(q){
    if (!items.length) return 'Nothing is set.';
    q = String(q || '').toLowerCase();
    const byLabel = items.filter(i => i.label && q.includes(i.label.toLowerCase().slice(0, 12)));
    let hit = /\ball\b|every/.test(q) ? items.slice() : byLabel.length ? byLabel : items.filter(i => (q.includes('timer') && i.kind === 'timer') || (q.includes('alarm') && i.kind === 'alarm') || (q.includes('remind') && i.kind === 'reminder')).slice(0, 1);
    if (!hit.length) hit = [items[items.length - 1]];
    items = items.filter(i => !hit.includes(i)); saveItems();
    return hit.length === 1 ? `Cancelled the ${hit[0].kind}${hit[0].label ? ' for ' + hit[0].label : ''}.` : `Cancelled ${hit.length}.`;
  }
  function list(){
    if (!items.length) return 'No timers, alarms or reminders set.';
    return items.map(i => i.kind === 'timer' ? `a timer${i.label ? ' for ' + i.label : ''} with ${spokenDur(i.at - Date.now())} left`
      : `${i.kind === 'alarm' ? 'an alarm' : 'a reminder' + (i.label ? ' to ' + i.label : '')} at ${new Date(i.at).toLocaleTimeString([], {hour:'numeric', minute:'2-digit'})}`).join(', ') + '.';
  }
  // "10 minutes", "an hour and a half", "90 seconds", "2 hours 15 minutes"
  function parseDur(t){
    t = t.replace(/an hour and a half|one and a half hours?/, '90 minutes').replace(/half an hour|half hour/, '30 minutes').replace(/a minute and a half/, '90 seconds');
    let ms = 0, any = false;
    const re = /(\d+(?:\.\d+)?|a|an|one|two|three|four|five|six|seven|eight|nine|ten|fifteen|twenty|thirty|forty five|forty|fifty|sixty|ninety)\s*(hours?|hrs?|minutes?|mins?|seconds?|secs?)\b/g;
    let m; while ((m = re.exec(t))){ const n = num(m[1]); if (n == null) continue; any = true; ms += n * (/^h/.test(m[2]) ? 3600e3 : /^m/.test(m[2]) ? 60e3 : 1e3); }
    return any ? ms : null;
  }
  // "3pm", "3:15 pm", "15:30", "noon", "7 in the morning"
  function parseClock(t){
    if (/\bnoon\b/.test(t)) return mk(12, 0);
    if (/\bmidnight\b/.test(t)) return mk(0, 0);
    const m = t.match(/\b(\d{1,2})(?::|\s)?(\d{2})?\s*(a\.?m\.?|p\.?m\.?|in the morning|in the afternoon|in the evening|tonight|at night)?\b/);
    if (!m) return null;
    let h = +m[1], mi = m[2] ? +m[2] : 0; if (h > 23 || mi > 59) return null;
    const ap = m[3] || '';
    if (/p|afternoon|evening|tonight|night/.test(ap) && h < 12) h += 12;
    if (/a|morning/.test(ap) && h === 12) h = 0;
    if (!ap && h < 12){ const now = new Date(); if (mk(h, mi) < now.getTime() && mk(h + 12, mi) > now.getTime() && h + 12 < 24) h += 12; }
    return mk(h, mi);
    function mk(H, M){ const d = new Date(); d.setHours(H, M, 0, 0); if (d.getTime() < Date.now() - 30000) d.setDate(d.getDate() + 1); return d.getTime(); }
  }
  function mk(H, M){ const d = new Date(); d.setHours(H, M, 0, 0); if (d.getTime() < Date.now() - 30000) d.setDate(d.getDate() + 1); return d.getTime(); }

  // ring
  let ringing = null;
  function ring(it){
    const c = window.JV_chime; let n = 0;
    ringing = setInterval(() => { if (c) c(true); if (++n >= 6){ clearInterval(ringing); ringing = null; } }, 900);
    const text = it.kind === 'timer' ? `Your ${it.label ? it.label + ' ' : ''}timer is done.` : it.kind === 'alarm' ? `It's ${new Date().toLocaleTimeString([], {hour:'numeric', minute:'2-digit'})}. ${it.label ? it.label + '.' : 'Time to get up.'}` : `Reminder: ${it.label || 'you asked me to remind you.'}`;
    showToast(it.kind === 'timer' ? 'TIMER' : it.kind === 'alarm' ? 'ALARM' : 'REMINDER', it.label || text);
    setTimeout(() => say(text), 1200);
  }
  setInterval(() => {
    const now = Date.now(), due = items.filter(i => i.at <= now);
    if (due.length){ items = items.filter(i => i.at > now); saveItems(); due.forEach(ring); }
    drawChip();
  }, 1000);

  // top-bar chip with the next countdown
  const css = document.createElement('style');
  css.textContent = `
  #timerChip{cursor:pointer;border:1px solid var(--a2);color:var(--a2);padding:6px 10px;display:none}
  #toast{position:fixed;left:50%;top:84px;transform:translateX(-50%) translateY(-20px);z-index:40;min-width:320px;max-width:70vw;padding:14px 20px;border:1px solid var(--a);border-radius:12px;
    background:linear-gradient(160deg,#1a0a10,#08070c);box-shadow:0 0 40px rgba(255,34,51,.35);opacity:0;pointer-events:none;transition:all .4s}
  #toast.show{opacity:1;transform:translateX(-50%) translateY(0);pointer-events:auto}
  #toast b{display:block;font:600 11px var(--f-mono);letter-spacing:.3em;color:var(--a);margin-bottom:6px}
  #toast span{font:500 20px var(--f-display);color:var(--hi)}`;
  document.head.appendChild(css);
  const chip = document.createElement('span'); chip.id = 'timerChip'; chip.className = 'chip';
  const top = document.querySelector('.top'), state = document.getElementById('stateLabel');
  if (top && state) top.insertBefore(chip, state);
  chip.onclick = () => say(list());
  function drawChip(){
    const n = items[0];
    chip.style.display = n ? '' : 'none';
    if (n) chip.textContent = (n.kind === 'timer' ? '⏱ ' + fmtLeft(n.at - Date.now()) : (n.kind === 'alarm' ? '⏰ ' : '🔔 ') + new Date(n.at).toLocaleTimeString([], {hour:'numeric', minute:'2-digit'})) + (items.length > 1 ? ' +' + (items.length - 1) : '');
  }
  const toast = document.createElement('div'); toast.id = 'toast'; document.body.appendChild(toast);
  let toastT = null;
  function showToast(title, text, ms = 12000){
    toast.innerHTML = `<b>${esc(title)}</b><span>${esc(text)}</span>`; toast.classList.add('show');
    clearTimeout(toastT); toastT = setTimeout(() => toast.classList.remove('show'), ms);
    toast.onclick = () => { toast.classList.remove('show'); if (ringing){ clearInterval(ringing); ringing = null; } };
  }

  // ---------- focus mode: proactive heads-ups go quiet except the critical ones ----------
  let focusUntil = get('focusUntil', 0);
  const focused = () => Date.now() < focusUntil;
  function setFocus(on, mins){ focusUntil = on ? Date.now() + (mins || 60) * 60000 : 0; put('focusUntil', focusUntil); }

  // ---------- proactive heads-ups (once per day each) ----------
  const fired = () => { const f = get('fired', {}); return f.day === keyOf(new Date()) ? f : {day:keyOf(new Date())}; };
  const once = (id, fn, critical) => { const f = fired(); if (f[id]) return; f[id] = 1; put('fired', f); if (!critical && focused()) return; fn(); };
  const weekday = () => !['Sat', 'Sun'].includes(et().wd);
  const todayTrades = () => { const d = (window.JV_coleDays || {})[keyOf(new Date())]; return (d && d.trades) || []; };
  const todayDoc = () => (window.JV_coleDays || {})[keyOf(new Date())] || {};
  let news = get('news', null);                  // {day, events:[{time:'08:30', title, impact}]}
  function proactive(){
    const t = et(); if (window.JV && window.JV.mode === 'sleep') return;
    if (weekday()){
      if (t.hm >= 9 * 60 + 25 && t.hm < 9 * 60 + 30) once('open5', () => {
        const d = todayDoc(), ci = d.checkin;
        alert('MARKET OPEN', `Market opens in five minutes. ${ci ? '' : "You haven't done your check-in yet. "}Max two trades, no revenge, no FOMO, out by ten thirty.`);
      }, true);
      if (t.hm >= 10 * 60 + 25 && t.hm < 10 * 60 + 30) once('close5', () => alert('WINDOW', 'Five minutes left in your trading window.'), true);
      if (t.hm >= 10 * 60 + 30 && t.hm < 10 * 60 + 35) once('closed', () => alert('WINDOW CLOSED', "Trading window's closed. Hands off the keyboard. Good time to journal the session."), true);
      (news && news.day === keyOf(new Date()) ? news.events : []).forEach(ev => {
        const [h, m] = String(ev.time || '').split(':').map(Number); if (isNaN(h)) return;
        const at = h * 60 + m;
        if (t.hm >= at - 5 && t.hm < at) once('news-' + ev.time + ev.title, () => alert('NEWS', `${ev.title} drops in ${at - t.hm} minute${at - t.hm === 1 ? '' : 's'}. Expect volatility.`), true);
      });
    }
    if (t.hm >= 19 * 60 && t.hm < 22 * 60){
      const d = todayDoc(), p = (d.meals || []).reduce((s, x) => s + (+x.p || 0), 0);
      if (window.JV_coleSignedIn && window.JV_coleSignedIn() && p < 100) once('protein', () => alert('FUEL', `You're at ${Math.round(p)} grams of protein. ${150 - Math.round(p)} to go to hit 150.`));
    }
    if (t.hm >= 21 * 60 && t.hm < 23 * 60 + 30){
      const d = todayDoc(), j = (d.journal || []).filter(x => !x.hidden).length;
      if (window.JV_coleSignedIn && window.JV_coleSignedIn() && !j) once('journal', () => alert('WRAP-UP', 'Nothing in your journal today. Say "Spikey, wrap up my day" and I will walk you through it.'));
    }
  }
  function alert(title, text){
    showToast(title, text);
    const go = () => { if (window.JV && (window.JV.speaking || window.JV.mode === 'thinking')) return setTimeout(go, 3000); say(text); };
    go();
  }
  setInterval(proactive, 20000); setTimeout(proactive, 15000);

  // trade watch: hitting the limit, or trading again right after a loss
  let lastTradeCount = null;
  window.addEventListener('cole-update', () => {
    const tr = todayTrades(), n = tr.length;
    if (lastTradeCount != null && n > lastTradeCount){
      const last = tr[n - 1], prev = tr[n - 2];
      if (n === 2) alert('LIMIT', "That's two trades. You're done for the day. Protect the account.");
      else if (n > 2) alert('OVER LIMIT', `That's trade number ${n}. You're over your two-trade limit. Step away from the charts.`);
      else if (last && +last.pnl < 0) alert('LOSS', 'Loss logged. Take five minutes before anything else. No revenge.');
      if (prev && +prev.pnl < 0 && last && last.at && prev.at && last.at - prev.at < 10 * 60000) alert('REVENGE CHECK', 'That trade came within ten minutes of a loss. Was it on your plan?');
    }
    lastTradeCount = n;
  });

  // economic calendar: high-impact USD news for today, fetched once each trading morning through Claude + web search
  async function loadNews(force){
    const today = keyOf(new Date());
    if (!force && news && news.day === today) return news;
    if (!weekday() || !(window.JV_brain && window.JV_brain.hasKey())) return null;
    try{
      const j = await window.JV_brain.askJSONWeb(`Today is ${new Date().toLocaleDateString('en-US', {timeZone:'America/New_York', weekday:'long', month:'long', day:'numeric', year:'numeric'})}. Search an economic calendar (Forex Factory, Investing.com or similar) for TODAY's high-impact USD events (red folder: CPI, NFP, FOMC, PPI, GDP, jobless claims, retail sales, ISM, Powell speeches). Return {"events":[{"time":"HH:MM" (24h Eastern time), "title":"short name", "impact":"high"}]} sorted by time; empty array if none.`);
      news = {day: today, events: (j.events || []).filter(e => e && e.time && e.title).slice(0, 8), at: Date.now()};
      put('news', news);
      return news;
    }catch{ return null; }
  }
  setTimeout(() => { const t = et(); if (t.hm >= 6 * 60 && t.hm < 16 * 60) loadNews(); }, 20000);
  setInterval(() => { const t = et(); if (t.hm >= 6 * 60 && t.hm < 16 * 60) loadNews(); }, 30 * 60000);
  const newsSentence = n => !n ? "I couldn't check the economic calendar." : !n.events.length ? 'No high-impact USD news today.'
    : 'High-impact news today: ' + n.events.map(e => `${e.title} at ${fmt12(e.time)}`).join(', ') + '.';
  const fmt12 = hm => { const [h, m] = hm.split(':').map(Number); return `${((h + 11) % 12) + 1}${m ? ':' + pad(m) : ''} ${h < 12 ? 'AM' : 'PM'}`; };

  // ---------- status report ----------
  async function status(){
    const parts = [];
    const sp = window.JV_spotify;
    parts.push(window.JV_brain && window.JV_brain.hasKey() ? 'Brain online.' : 'Brain offline, no Claude key.');
    parts.push(window.JV_coleSignedIn && window.JV_coleSignedIn() ? 'Cole synced.' : 'Cole still connecting.');
    if (sp && sp.connected()){ try{ parts.push((await sp.where()).replace('Spotify is playing', 'Music playing')); }catch(e){ parts.push('Spotify: ' + e.message); } }
    else parts.push('Spotify not connected.');
    const D = window.JV && window.JV.diag;
    parts.push(D && D.gum === 'ok' ? 'Microphone live.' : D ? 'Microphone: ' + D.gum + '.' : '');
    try{ const b = await navigator.getBattery(); parts.push(`Battery ${Math.round(b.level * 100)} percent${b.charging ? ', charging' : ''}.`); }catch{}
    parts.push(navigator.onLine ? 'Network up.' : 'Network down.');
    if (window.JV_backtest && window.JV_backtest.active()) parts.push('Backtest session running: ' + window.JV_backtest.summary());
    if (items.length) parts.push('Pending: ' + list());
    if (focused()) parts.push('Focus mode is on.');
    return parts.filter(Boolean).join(' ');
  }

  // ---------- day summary + wrap-up ----------
  function daySummary(){
    const d = todayDoc(), tr = d.trades || [], pnl = tr.reduce((s, x) => s + (+x.pnl || 0), 0);
    const p = (d.meals || []).reduce((s, x) => s + (+x.p || 0), 0), k = (d.meals || []).reduce((s, x) => s + (+x.kcal || 0), 0);
    const habits = ['gym', 'reel', 'family'].filter(h => d[h]);
    const obj = (window.JV_tasks && window.JV_tasks.list()) || [];
    const bits = [];
    bits.push(tr.length ? `${tr.length} trade${tr.length > 1 ? 's' : ''}, ${pnl >= 0 ? 'up' : 'down'} ${Math.abs(Math.round(pnl))} dollars.` : 'No trades today.');
    bits.push(`${Math.round(p)} grams of protein and ${Math.round(k)} calories.`);
    bits.push(habits.length ? 'Done: ' + habits.map(h => ({gym:'gym', reel:'reel posted', family:'family time'})[h]).join(', ') + '.' : 'No habits checked off yet.');
    bits.push(obj.length ? `${obj.length} objective${obj.length > 1 ? 's' : ''} still open.` : 'Objectives all clear.');
    return bits.join(' ');
  }

  // ---------- protocols (JARVIS-style routines) ----------
  const PROTOCOLS = {
    market: {names:/^(market|trading|trade|session|game ?day|war ?room)( mode| protocol| time)?$/, title:'Market protocol', steps: async () => {
      try{ if (window.JV_spotify && window.JV_spotify.connected()) await window.JV_spotify.control('pause'); }catch{}
      setFocus(true, 90);
      if (window.JV_slides) window.JV_slides.show('trading', 60000);
      const d = todayDoc(); const n = (d.trades || []).length;
      const nws = await loadNews();
      return `Market protocol. Music's paused and I'm going quiet except for the important stuff. ${n ? `You've taken ${n} of 2 trades.` : 'Zero of two trades so far.'} ${d.checkin ? '' : 'Do your check-in first. '}${newsSentence(nws)} Rules: plan only, no oversizing, no revenge, no FOMO, out by ten thirty.`;
    }},
    backtest: {names:/^(backtest|backtesting|replay|practice)( mode| protocol)$/, title:'Backtest protocol', steps: async () => {
      setFocus(true, 120);
      if (window.JV_backtest) window.JV_backtest.open();
      return 'Backtest protocol. Logging screen is up and I will keep the interruptions down. Call your trades as you take them.';
    }},
    party: {names:/^(house party|party|turn up|hype|vibe|rave)( mode| protocol| time)?$/, title:'Party protocol', steps: async () => {
      setFocus(false);
      try{ if (window.JV_spotify && window.JV_spotify.connected()) return (await window.JV_spotify.play('techno bunker', 'playlist')).message + ' Party protocol engaged.'; }catch(e){ return 'Party protocol, but Spotify said: ' + e.message; }
      return 'Party protocol engaged. Connect Spotify and I will bring the music.';
    }},
    focus: {names:/^(focus|do not disturb|dnd|deep work|lock in|locked in)( mode| protocol)?$/, title:'Focus', steps: async () => { setFocus(true, 90); return 'Focus mode for ninety minutes. I will only speak up for timers, market times and trade limits.'; }},
    unfocus: {names:/^(end|stop|exit|turn off|cancel) (focus|do not disturb|dnd|deep work)( mode)?$|^focus (mode )?off$/, title:'Focus off', steps: async () => { setFocus(false); return 'Focus mode off.'; }},
    wrap: {names:/^(wrap up|wrap|end of day|eod|close out|night ?time|good ?night)( my day| the day| protocol| mode)?$/, title:'Wrap-up protocol', steps: async () => {
      if (window.JV_slides) window.JV_slides.show('habits', 60000);
      return `Here's your day. ${daySummary()} Tell me how the day went, starting with "log to Cole", and I'll file it in your journal.`;
    }},
    morning: {names:/^(morning|good morning|wake up|rise and grind|start my day|start the day)( protocol| routine| brief(ing)?)?$/, title:'Morning protocol', steps: async () => {
      const nws = await loadNews();
      const obj = (window.JV_tasks && window.JV_tasks.list()) || [];
      if (window.JV_slides) window.JV_slides.show('agenda', 60000);
      return `Morning. ${newsSentence(nws)} ${obj.length ? `${obj.length} objective${obj.length > 1 ? 's' : ''} on deck. First up: ${obj[0]}.` : 'No open objectives.'} Market opens at nine thirty. Let's make shit happen.`;
    }}
  };
  async function protocol(text){
    const t = String(text || '').toLowerCase().replace(/^(engage|activate|run|start|initiate|begin|enable|go into|put me in|turn on|let'?s do|lets do|it'?s)\s+(the |my )?/, '').replace(/\s+(protocol|routine)$/, ' protocol').trim();
    for (const [id, p] of Object.entries(PROTOCOLS)) if (p.names.test(t) || p.names.test(t.replace(/ protocol$/, ''))){ const msg = await p.steps(); return {id, message:msg}; }
    return null;
  }

  // ---------- quick voice commands, checked by the engine before the brain ----------
  async function quick(text){
    let m;
    // timers
    if ((m = text.match(/^(?:set|start|put|make)?\s*(?:a|an)?\s*(.+?)\s*timer(?: for (.+))?$/)) || (m = text.match(/^(?:set |start )?(?:a |an )?timer (?:for |of )?(.+?)(?: (?:for|called|named) (.+))?$/))){
      let dur = parseDur(m[1]), label = m[2] || '';
      if (dur == null && m[2]){ dur = parseDur(m[2]); label = m[1]; }
      label = String(label).replace(/^(set |start |make |put )?(a |an |the |my )?/, '').trim();
      if (/^(a|an|set|the|my)$/.test(label) || parseDur(label) != null) label = '';
      if (dur != null && dur > 0){ add('timer', Date.now() + dur, label.replace(/^(the|my)\s+/, '')); return `Timer set for ${spokenDur(dur)}${label ? ', ' + label : ''}.`; }
    }
    // reminders: "remind me in 20 minutes to …", "remind me at 3pm to …", "remind me to … at 3pm / in 10 minutes"
    if ((m = text.match(/^remind me (?:in|after) (.+?) (?:to|that|about) (.+)$/))){ const d = parseDur(m[1]); if (d){ add('reminder', Date.now() + d, m[2]); return `I'll remind you in ${spokenDur(d)} to ${m[2]}.`; } }
    if ((m = text.match(/^remind me (?:at|by) (.+?) (?:to|that|about) (.+)$/))){ const at = parseClock(m[1]); if (at){ add('reminder', at, m[2]); return `I'll remind you at ${new Date(at).toLocaleTimeString([], {hour:'numeric', minute:'2-digit'})} to ${m[2]}.`; } }
    if ((m = text.match(/^remind me (?:to|that|about) (.+?) (in|at|by) (.+)$/))){
      const at = m[2] === 'in' ? (parseDur(m[3]) ? Date.now() + parseDur(m[3]) : null) : parseClock(m[3]);
      if (at){ add('reminder', at, m[1]); return `Got it. ${new Date(at).toLocaleTimeString([], {hour:'numeric', minute:'2-digit'})}, ${m[1]}.`; }
    }
    // alarms
    if ((m = text.match(/^(?:set (?:an |my )?alarm|wake me(?: up)?|alarm)(?: for| at)? (.+?)(?: to (.+))?$/))){ const at = parseClock(m[1]); if (at){ add('alarm', at, m[2] || ''); return `Alarm set for ${new Date(at).toLocaleString([], {weekday:'long', hour:'numeric', minute:'2-digit'})}.`; } }
    if (/^(cancel|stop|delete|clear|remove|kill|turn off)\b.*\b(timers?|alarms?|reminders?)\b/.test(text) && text.split(' ').length <= 8) return cancel(text);
    if (/^(what|which|any) (timers?|alarms?|reminders?)( do i have| are set| are there)?$|^(how much|how long) (time )?(is )?(left|remaining)( on (the|my) timer)?$|^list (my )?(timers|alarms|reminders)$/.test(text)) return list();
    if (ringing && /^(ok|okay|stop|thanks|thank you|got it|dismiss|shut up)$/.test(text)){ clearInterval(ringing); ringing = null; toast.classList.remove('show'); return 'Done.'; }
    // status, news, summary
    if (/^(status( report)?|system(s)? (check|status|report)|diagnostics?|run (a )?diagnostics?|how are (you|we) (doing|looking)|sitrep)$/.test(text)) return await status();
    if (/(economic|eco|red folder|high impact|market) (news|calendar|events)|news (today|this morning)|any news today|what news is (out|coming) today/.test(text)){ const n = await loadNews(true); return newsSentence(n); }
    if (/^(how('?s| is| was) my day|day summary|summari[sz]e my day|daily summary|recap( my day)?)$/.test(text)) return daySummary();
    if (/^(what can you do|what are your (capabilities|skills|commands)|help|capabilities|list (your )?(commands|protocols)|what protocols (do you have|are there))$/.test(text)){ showCapabilities(); return 'Here is what I can do. It is on screen.'; }
    // protocols
    const p = await protocol(text); if (p) return p.message;
    return null;
  }

  // capabilities sheet (uses the journal-style full screen)
  function showCapabilities(){
    let el = document.getElementById('capPanel');
    if (!el){
      el = document.createElement('section'); el.id = 'capPanel';
      el.style.cssText = 'position:fixed;inset:66px 14px 66px 14px;z-index:21;background:linear-gradient(160deg,#1a0a10,#08070c);border:1px solid var(--a2);border-radius:14px;padding:16px 20px;overflow:auto;display:none';
      document.body.appendChild(el);
      window.addEventListener('spikey-screen', e => { if (e.detail !== 'caps') el.style.display = 'none'; });
    }
    const G = [
      ['PROTOCOLS', ['"Market mode": pauses music, focus on, trading slide, rules + news', '"Backtest mode": logging screen + focus', '"Morning protocol": news, objectives, market times', '"Wrap up my day": day summary + journal it', '"House party protocol": music up', '"Focus mode" / "focus off"']],
      ['TIME', ['"Set a 10 minute timer for eggs"', '"Remind me at 3pm to call uncle"', '"Remind me in 20 minutes to stretch"', '"Wake me up at 7"', '"What timers do I have" · "cancel the timer"']],
      ['HEADS-UPS', ['Market opens in 5 · window closing · window closed', 'High-impact news 5 minutes before release', 'Two-trade limit, loss cool-down, revenge check', 'Protein check at night · journal nudge']],
      ['DATA', ['"Show my journal entries" (all, by category)', '"Open my finances / diet / habits / agenda"', '"Build a slide of …" (any stat, built live)', '"What did I eat yesterday?" · "How\'s my week?"']],
      ['CONTROL', ['"Play …" · "skip" · "pause" · "I can\'t hear the music"', '"Play it on my phone / laptop"', '"Open YouTube / a video / a map" inside Spikey', '"Let\'s start backtesting" · "long win 2R"']],
      ['SYSTEM', ['"Status report"', '"Economic news today?"', '"What have you learned?" · "from now on …"', '"Stop" mid-sentence · "close it"']]
    ];
    el.innerHTML = `<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px"><h2 style="font:600 13px var(--f-mono);letter-spacing:.34em;color:var(--a2)">WHAT SPIKEY CAN DO</h2><button id="capClose" style="font:600 11px var(--f-mono);letter-spacing:.14em;padding:8px 12px;border:1px solid var(--line);background:transparent;color:var(--txt);border-radius:8px;cursor:pointer">CLOSE ✕</button></div>
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px">${G.map(([h, l]) => `<div style="border:1px solid var(--line);border-radius:10px;padding:12px 14px;background:rgba(255,255,255,.025)"><div style="font:600 11px var(--f-mono);letter-spacing:.26em;color:var(--a);margin-bottom:8px">${h}</div>${l.map(x => `<div style="padding:6px 0;border-bottom:1px solid rgba(255,255,255,.06);font-size:14px;color:var(--hi)">${esc(x)}</div>`).join('')}</div>`).join('')}</div>`;
    window.dispatchEvent(new CustomEvent('spikey-screen', {detail:'caps'}));
    el.style.display = 'block';
    el.querySelector('#capClose').onclick = () => el.style.display = 'none';
    clearTimeout(el._t); el._t = setTimeout(() => el.style.display = 'none', 60000);
  }

  window.JV_assist = {
    quick, protocol, status, daySummary, loadNews, list, cancel, setFocus, focused,
    timer: (ms, label) => add('timer', Date.now() + ms, label), reminder: (at, label) => add('reminder', at, label), alarm: (at, label) => add('alarm', at, label),
    parseDur, parseClock, items: () => items.slice(), showCapabilities, _proactive: proactive
  };
  drawChip();
})();
