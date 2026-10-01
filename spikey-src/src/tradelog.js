/* ===== Shared trading rules (editable in Cole's Trade tab, saved to Cole doc meta/rules, read live by Spikey) ===== */
const COLE_RULES = (() => {
  const DEFAULT = {maxTrades:2, winStart:'09:30', winEnd:'10:30', cooldown:15, evalCap:2, list:[
    {id:'plan', text:'Entry came from my pre-market plan', spoken:'a trade off your plan', check:'false if off his plan or impulsive'},
    {id:'size', text:'Size matched the plan (no oversizing)', spoken:'oversizing', check:'false if more contracts than planned or he says oversized'},
    {id:'noRevenge', text:'Not a revenge trade', spoken:'a revenge trade', check:'false if he was trying to win back a loss'},
    {id:'noFomo', text:'Not a FOMO chase', spoken:'a FOMO chase', check:'false if chasing'},
    {id:'window', text:'Inside my trading window', spoken:'trading outside your window', check:'window'}], retired:{}};
  const hhmm = v => /^\d{1,2}:\d{2}$/.test(String(v || '')) ? String(v).padStart(5, '0') : null;
  const intIn = (v, lo, hi, d) => { const n = Math.round(+v); return isFinite(n) && n >= lo && n <= hi ? n : d; };
  function normalize(x){
    x = x && typeof x === 'object' ? x : {};
    const list = (Array.isArray(x.list) ? x.list : DEFAULT.list).filter(r => r && r.id && String(r.text || '').trim()).slice(0, 15)
      .map(r => ({id:String(r.id).slice(0, 40), text:String(r.text).trim().slice(0, 120), spoken:r.spoken ? String(r.spoken).slice(0, 80) : '', check:r.check ? String(r.check).slice(0, 160) : ''}));
    return {maxTrades:intIn(x.maxTrades, 1, 20, 2), winStart:hhmm(x.winStart) || '09:30', winEnd:hhmm(x.winEnd) || '10:30',
      cooldown:intIn(x.cooldown, 0, 240, 15), evalCap:intIn(x.evalCap, 0, 20, 2), list, retired:(x.retired && typeof x.retired === 'object') ? x.retired : {}, updated:x.updated || 0};
  }
  let cfg = normalize(DEFAULT); const subs = [];
  const t12 = v => { const [h, m] = v.split(':').map(Number); return (h % 12 || 12) + ':' + String(m).padStart(2, '0') + (h < 12 ? ' AM' : ' PM'); };
  const short = v => { const [h, m] = v.split(':').map(Number); return (h % 12 || 12) + (m ? ':' + String(m).padStart(2, '0') : ''); };
  const mins = v => { const [h, m] = v.split(':').map(Number); return h * 60 + m; };
  const winText = () => `${short(cfg.winStart)}–${short(cfg.winEnd)}`;
  const text = r => r.id === 'window' ? `Inside the ${winText()} window` : r.text;
  const spoken = r => r.id === 'window' ? `trading outside the ${t12(cfg.winStart)} to ${t12(cfg.winEnd)} window` : (r.spoken || 'breaking your rule: ' + r.text.toLowerCase());
  const label = id => { const r = cfg.list.find(x => x.id === id); return r ? text(r) : (cfg.retired[id] || id); };
  const spokenOf = id => { const r = cfg.list.find(x => x.id === id); return r ? spoken(r) : 'breaking your old rule: ' + String(cfg.retired[id] || id).toLowerCase(); };
  const tradeClean = t => !!(t && t.rules && Object.keys(t.rules).length) && Object.values(t.rules).every(Boolean) && cfg.list.every(r => !(r.id in t.rules) || t.rules[r.id]);
  const dayClean = trades => trades.length <= cfg.maxTrades && trades.every(tradeClean);
  const summary = () => `max ${cfg.maxTrades} trade${cfg.maxTrades === 1 ? '' : 's'}/day, trade only ${winText()} ET${cfg.cooldown ? `, ${cfg.cooldown}-minute walk-away after a loss` : ''}; rules: ${cfg.list.map(text).join('; ')}`;
  function set(x){ cfg = normalize(x); subs.forEach(f => { try { f(cfg); } catch(e){} }); return cfg; }
  // a fresh id for a new rule
  const newId = () => 'r' + Date.now().toString(36);
  return {DEFAULT, get:() => cfg, set, normalize, onChange:f => subs.push(f), keys:() => cfg.list.map(r => r.id), list:() => cfg.list, text, spoken, label, spokenOf,
    tradeClean, dayClean, summary, winText, t12, mins, newId};
})();

/* ===== Shared trade detector (same code lives in Cole app/index.html and Spikey's cole.js) =====
   Pulls REAL trades Nick says he took out of a brain-dump / voice note and writes them into
   today's Cole page (days/<date>.trades) — the same trade log Cole's Trade tab uses. */
const COLE_TRADES = (() => {
  const KEYS_ = () => COLE_RULES.keys();
  const PER_PT = {MYM:0.5, YM:5, MNQ:2, NQ:20, MGC:10, GC:100};   // $ per point per contract
  const CONTRACTS = Object.keys(PER_PT);
  const num = v => (v === null || v === undefined || v === '' || isNaN(+v)) ? '' : +v;
  const summary = (t, i) => `#${i}: ${t.dir || '?'} ${t.qty || 1} ${t.contract || '?'}, result ${t.pnl !== '' && t.pnl !== undefined ? '$' + t.pnl : 'not logged yet'}${t.note ? ', "' + String(t.note).slice(0, 60) + '"' : ''}`;
  // extra JSON field + rules appended to the sort prompt
  function prompt(existing, plan){
    const now = new Date().toLocaleTimeString('en-US', {hour:'numeric', minute:'2-digit', timeZone:'America/New_York'});
    const list = (existing || []).map(summary).join('; ') || 'none';
    return {
      schema: `"trades":[{"existing":int|null,"contract":"MYM|YM|MNQ|NQ|MGC|GC","dir":"LONG|SHORT","qty":int,"pnl":number|null,"r":number|null,"note":string,"rules":{${KEYS_().map(k => '"' + k + '":bool').join(',')}}}]`,
      rules: `trades: ONLY real trades he says he actually entered today on his live or funded account ("took a short", "got long 2 MYM", "entered at 42,100", "stopped out", "closed it for 40 points"). NOT backtests, replay or sim, NOT setups he watched, planned, wanted or almost took, NOT trades from other days. Trades already logged today: ${list}. If he's adding to one of those (closing it, its result, how it went), set existing to its # and fill only what he said; otherwise existing null. Never log the same trade twice. contract: Dow = YM (micro Dow = MYM), Nasdaq = NQ (micro Nasdaq = MNQ), gold = GC (micro gold = MGC); if he doesn't name the market, use the one in his plan, else MYM. dir from long/short/buy/sell, "" if he didn't say. qty: contracts, default 1. pnl: dollar result (negative for a loss) if he says it; if he gives points or ticks, pnl = points x qty x dollars per point (MYM $0.50, YM $5, MNQ $2, NQ $20, MGC $10, GC $100); null if unknown or still open. r: R multiple if he says it, else null. note: why he took it / what he felt, in his words. rules (his own trading rules, one key each): true unless what he said shows it was broken. ${COLE_RULES.list().map(r => r.id === 'window' ? `${r.id} ("${COLE_RULES.text(r)}"): false if entered outside ${COLE_RULES.winText()} ET (use the entry time he says, else now: ${now} ET)` : `${r.id} ("${r.text}"): ${r.check && r.check !== 'window' ? r.check : 'false if what he said shows he broke it'}`).join('; ')}. His plan today: ${plan ? '"' + String(plan).slice(0, 200) + '"' : 'none written'}. He allows ${COLE_RULES.get().maxTrades} trade${COLE_RULES.get().maxTrades === 1 ? '' : 's'} a day. The trade itself goes in trades; only his mindset about it also goes in journal.`
    };
  }
  // validate the model's trades
  function clean(arr, existing){
    const n = (existing || []).length;
    return (Array.isArray(arr) ? arr : []).filter(t => t && typeof t === 'object').map(t => {
      const ex = Number.isInteger(+t.existing) && t.existing !== null && t.existing !== '' && +t.existing >= 0 && +t.existing < n ? +t.existing : null;
      const c = String(t.contract || '').toUpperCase().replace(/[^A-Z]/g, '');
      const contract = CONTRACTS.includes(c) ? c : /NASDAQ|NAS|NQ/.test(c) ? (/MICRO|^M/.test(c) ? 'MNQ' : 'NQ') : /GOLD|GC/.test(c) ? (/MICRO|^M/.test(c) ? 'MGC' : 'GC') : /^YM$|DOW/.test(c) ? 'YM' : 'MYM';
      const d = String(t.dir || '').toUpperCase();
      const dir = /SHORT|SELL/.test(d) ? 'SHORT' : /LONG|BUY/.test(d) ? 'LONG' : '';
      const rules = {}; KEYS_().forEach(k => rules[k] = !(t.rules && t.rules[k] === false));
      return {existing:ex, contract, dir, qty:Math.max(1, Math.round(+t.qty || 1)), pnl:num(t.pnl), r:num(t.r), note:String(t.note || '').slice(0, 300), rules};
    }).filter(t => t.existing !== null || t.dir || t.pnl !== '' || t.r !== '' || t.note);   // drop empty junk
  }
  // write into a Cole day doc
  function apply(d, list, at, via){
    if (!Array.isArray(d.trades)) d.trades = [];
    const done = [];
    list.forEach(t => {
      let tr;
      if (t.existing !== null && d.trades[t.existing]){
        tr = d.trades[t.existing];
        if (t.pnl !== '') tr.pnl = t.pnl;
        if (t.r !== '') tr.r = t.r;
        if (t.note) tr.note = tr.note ? tr.note + ' · ' + t.note : t.note;
        tr.rules = tr.rules || {}; KEYS_().forEach(k => tr.rules[k] = tr.rules[k] !== false && t.rules[k]);
        done.push({...tr, updated:true});
      } else {
        tr = {contract:t.contract, dir:t.dir, qty:t.qty, pnl:t.pnl, r:t.r, note:t.note, rules:t.rules, at, via};
        d.trades.push(tr); done.push(tr);
      }
      if ((+tr.pnl || 0) < 0 || (+tr.r || 0) < 0) d.lossAt = at;
    });
    return done;
  }
  const broken = t => Object.keys((t && t.rules) || {}).filter(k => !t.rules[k]).concat(t && t.rules && Object.keys(t.rules).length ? [] : KEYS_());
  return {KEYS:KEYS_, CONTRACTS, PER_PT, prompt, clean, apply, broken, summary};
})();
