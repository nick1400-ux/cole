/* ===== Shared trade detector (same code lives in Cole app/index.html and Spikey's cole.js) =====
   Pulls REAL trades Nick says he took out of a brain-dump / voice note and writes them into
   today's Cole page (days/<date>.trades) — the same trade log Cole's Trade tab uses. */
const COLE_TRADES = (() => {
  const KEYS = ['plan','size','noRevenge','noFomo','window'];
  const PER_PT = {MYM:0.5, YM:5, MNQ:2, NQ:20, MGC:10, GC:100};   // $ per point per contract
  const CONTRACTS = Object.keys(PER_PT);
  const num = v => (v === null || v === undefined || v === '' || isNaN(+v)) ? '' : +v;
  const summary = (t, i) => `#${i}: ${t.dir || '?'} ${t.qty || 1} ${t.contract || '?'}, result ${t.pnl !== '' && t.pnl !== undefined ? '$' + t.pnl : 'not logged yet'}${t.note ? ', "' + String(t.note).slice(0, 60) + '"' : ''}`;
  // extra JSON field + rules appended to the sort prompt
  function prompt(existing, plan){
    const now = new Date().toLocaleTimeString('en-US', {hour:'numeric', minute:'2-digit', timeZone:'America/New_York'});
    const list = (existing || []).map(summary).join('; ') || 'none';
    return {
      schema: `"trades":[{"existing":int|null,"contract":"MYM|YM|MNQ|NQ|MGC|GC","dir":"LONG|SHORT","qty":int,"pnl":number|null,"r":number|null,"note":string,"rules":{"plan":bool,"size":bool,"noRevenge":bool,"noFomo":bool,"window":bool}}]`,
      rules: `trades: ONLY real trades he says he actually entered today on his live or funded account ("took a short", "got long 2 MYM", "entered at 42,100", "stopped out", "closed it for 40 points"). NOT backtests, replay or sim, NOT setups he watched, planned, wanted or almost took, NOT trades from other days. Trades already logged today: ${list}. If he's adding to one of those (closing it, its result, how it went), set existing to its # and fill only what he said; otherwise existing null. Never log the same trade twice. contract: Dow = YM (micro Dow = MYM), Nasdaq = NQ (micro Nasdaq = MNQ), gold = GC (micro gold = MGC); if he doesn't name the market, use the one in his plan, else MYM. dir from long/short/buy/sell, "" if he didn't say. qty: contracts, default 1. pnl: dollar result (negative for a loss) if he says it; if he gives points or ticks, pnl = points x qty x dollars per point (MYM $0.50, YM $5, MNQ $2, NQ $20, MGC $10, GC $100); null if unknown or still open. r: R multiple if he says it, else null. note: why he took it / what he felt, in his words. rules: true unless what he said shows it was broken: plan false if off his plan or impulsive (his plan today: ${plan ? '"' + String(plan).slice(0, 200) + '"' : 'none written'}); size false if more contracts than planned or he says oversized; noRevenge false if he was trying to win back a loss; noFomo false if chasing; window false if entered outside 9:30-10:30 ET (use the entry time he says, else now: ${now} ET). The trade itself goes in trades; only his mindset about it also goes in journal.`
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
      const rules = {}; KEYS.forEach(k => rules[k] = !(t.rules && t.rules[k] === false));
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
        tr.rules = tr.rules || {}; KEYS.forEach(k => tr.rules[k] = tr.rules[k] !== false && t.rules[k]);
        done.push({...tr, updated:true});
      } else {
        tr = {contract:t.contract, dir:t.dir, qty:t.qty, pnl:t.pnl, r:t.r, note:t.note, rules:t.rules, at, via};
        d.trades.push(tr); done.push(tr);
      }
      if ((+tr.pnl || 0) < 0 || (+tr.r || 0) < 0) d.lossAt = at;
    });
    return done;
  }
  const broken = t => KEYS.filter(k => !(t.rules && t.rules[k]));
  return {KEYS, CONTRACTS, PER_PT, prompt, clean, apply, broken, summary};
})();
