/* ===== Cole link: weekly P&L from Cole's Supabase (read-only) ===== */
(() => {
  if (new URLSearchParams(location.search).get('screen') === 'side') return;
  // Cole's own sync connection (Nick approved Spikey reusing it). Read-only; he signs in with his Cole login.
  const SB_URL = 'https://ntuzsyfzgfgxkmyqniqz.supabase.co';
  const SB_KEY = 'sb_publishable_RxVn21A1NCVsMlCh03cvHw_vnBxCP2q';
  const RULES = ['plan', 'size', 'noRevenge', 'noFomo', 'window'];      // Cole's 5 trading rules
  const $ = id => document.getElementById(id);
  const pad = n => String(n).padStart(2, '0');
  const keyOf = d => `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
  const money = n => (n > 0 ? '+' : n < 0 ? '−' : '') + '$' + Math.abs(Math.round(n)).toLocaleString();
  const speakMoney = n => '$' + Math.abs(Math.round(n)).toLocaleString();
  const tradeClean = t => RULES.every(k => t.rules && t.rules[k]);
  const dayClean = trades => trades.length <= 2 && trades.every(tradeClean);
  let sb = null, uid = null, week = null, todos = [], todoRefs = [];
  const RULE_SPOKEN = {plan:'a trade off your plan', size:'oversizing', noRevenge:'a revenge trade', noFomo:'a FOMO chase', window:'trading outside the nine thirty to ten thirty window'};
  const andList = a => a.length === 1 ? a[0] : a.slice(0, -1).join(', ') + ', and ' + a[a.length - 1];
  const DAY_SPOKEN = {MON:'Monday', TUE:'Tuesday', WED:'Wednesday', THU:'Thursday', FRI:'Friday', SAT:'Saturday', SUN:'Sunday'};
  let readyResolve; window.JV_coleReady = new Promise(r => readyResolve = r);

  function weekKeys(){
    const now = new Date(), mon = new Date(now); mon.setHours(12,0,0,0);
    mon.setDate(mon.getDate() - ((now.getDay() + 6) % 7));
    return Array.from({length:7}, (_, i) => { const d = new Date(mon); d.setDate(mon.getDate() + i); return {key:keyOf(d), label:['MON','TUE','WED','THU','FRI','SAT','SUN'][i], d}; });
  }

  // turn Cole's day docs into this week's numbers
  function compute(rows){
    const byKey = {}; (rows || []).forEach(r => { byKey[r.path.split('/').pop()] = r.data || {}; });
    window.JV_coleDays = byKey;
    todoRefs = Object.keys(byKey).sort().reverse().flatMap(k => (byKey[k].tasks || []).map((t, i) => ({k, i, t})).filter(o => o.t && o.t.text && !o.t.done).map(o => ({key:o.k, i:o.i, text:String(o.t.text)})));
    todos = todoRefs.map(o => o.text);
    window.dispatchEvent(new Event('cole-update'));
    const today = keyOf(new Date());
    const days = weekKeys().map(w => {
      const trades = (byKey[w.key] && Array.isArray(byKey[w.key].trades)) ? byKey[w.key].trades : [];
      const pnl = trades.reduce((s, t) => s + (+t.pnl || 0), 0);
      return {...w, trades, pnl, clean: trades.length ? dayClean(trades) : null, today: w.key === today};
    });
    const traded = days.filter(d => d.trades.length);
    return {
      days, total: days.reduce((s, d) => s + d.pnl, 0),
      nTrades: days.reduce((s, d) => s + d.trades.length, 0),
      tradedDays: traded.length, cleanDays: traded.filter(d => d.clean).length,
      today: days.find(d => d.today)
    };
  }

  function render(w){
    week = w;
    const tot = $('pnlTotal'); if (!tot) return;
    tot.textContent = w.nTrades ? money(w.total) : '$0';
    tot.className = w.total > 0 ? 'up' : w.total < 0 ? 'down' : '';
    $('pnlSub').innerHTML = w.nTrades
      ? `${w.nTrades} trade${w.nTrades === 1 ? '' : 's'} this week<br>${w.cleanDays}/${w.tradedDays} clean day${w.tradedDays === 1 ? '' : 's'}`
      : 'no trades logged<br>this week yet';
    const show = w.days.filter((d, i) => i < 5 || d.trades.length);    // Mon–Fri, plus weekend days you actually traded
    const max = Math.max(1, ...show.map(d => Math.abs(d.pnl)));
    $('pnlBars').innerHTML = show.map(d => {
      const h = d.trades.length ? Math.max(4, Math.abs(d.pnl) / max * 50) : 0;
      const cls = !d.trades.length || d.pnl === 0 ? 'flat' : d.pnl > 0 ? 'up' : 'down';
      const state = d.clean === null ? '' : d.clean ? 'clean' : 'broken';
      return `<div class="pb ${d.today ? 'today' : ''} ${state}" title="${d.key}"><div class="col"><i class="${cls}" style="height:${h}%"></i></div><span>${d.trades.length ? money(d.pnl) : '·'}</span><small>${d.label}</small></div>`;
    }).join('');
    const t = w.today || {trades:[], pnl:0};
    $('pnlTodayTrades').textContent = `${t.trades.length}/2`;
    $('pnlTodayAmt').textContent = money(t.pnl) || '$0';
    $('pnlTodayAmt').style.color = t.pnl > 0 ? 'var(--good)' : t.pnl < 0 ? 'var(--red)' : '';
  }
  window.JV_renderPnl = rows => render(compute(rows));      // also used by tests
  // ---- write to Cole: sort what Nick said (same rules as Cole) and save it into today's page ----
  const SORT_PROMPT = (txt, tb) => `You are Cole, the personal assistant of Nick: a Miami Mercedes-Benz tech who day trades YM/MYM futures (rules: max 2 trades/day, no revenge, no oversizing, no FOMO, window 9:30-10:30), is on a lean bulk (2700 kcal, 150g protein), runs Sledge B (his personal content brand, by outcasts for outcasts, which also covers his rave events and their behind-the-scenes), and wants more time with his younger siblings (his brothers and sister, not his children).
Split this voice brain-dump into sectors. Keep his own words, lightly cleaned up; never invent facts.
Brain-dump: """${txt}"""
Return JSON only:
{"journal":[{"tag":"trading|journal|family|business|fitness","text":string}],
 "meals":[{"name":string,"kcal":int,"p":int,"c":int,"f":int,"cost":number|0}],
 "ideas":[{"area":"content|events|business|other","text":string}],
 "tasks":[{"text":string}],
 "spend":[{"what":string,"amt":number,"cat":"Food|Gas|Trading|Business|Other"}],
 "flags":["gym"|"reel"|"family"],
 ${tb.schema}}
Rules: ${tb.rules} Trade mindset and emotions go in journal with tag "trading". Food eaten goes in meals with estimated macros (typical chain values if named); if a price was said for food put it in that meal's cost, NOT in spend. Non-food purchases go in spend. flags only for things he says he already did today (worked out, posted a reel, spent time with my brothers & sister). Empty arrays when nothing fits.`;
  window.JV_coleLog = async (txt, askJSON) => {
    if (!sb || !uid) return {ok:false, message:"Cole is still connecting. Say it again in a few seconds and I will save it."};
    const A = v => Array.isArray(v) ? v : [];
    const path = 'days/' + keyOf(new Date());
    const {data:row, error:e1} = await sb.from('cole_docs').select('data').eq('path', path).maybeSingle();
    if (e1) return {ok:false, message:"Couldn't reach Cole right now."};
    const cur = (row && row.data) || {};
    const curTrades = Array.isArray(cur.trades) ? cur.trades : [];
    const out = await askJSON(SORT_PROMPT(txt, COLE_TRADES.prompt(curTrades, cur.checkin && cur.checkin.plan)));
    const TAGS = ['trading','journal','family','business','fitness'];
    const r = {
      journal: A(out.journal).filter(j => j && j.text).map(j => ({tag: TAGS.includes(j.tag) ? j.tag : 'journal', text:String(j.text)})),
      meals: A(out.meals).filter(m => m && m.name).map(m => ({name:String(m.name).slice(0,80), kcal:Math.round(+m.kcal||0), p:Math.round(+m.p||0), c:Math.round(+m.c||0), f:Math.round(+m.f||0), cost:+m.cost||0})),
      ideas: A(out.ideas).filter(x => x && x.text).map(x => ({area:String(x.area||'other'), text:String(x.text)})),
      tasks: A(out.tasks).filter(x => x && x.text).map(x => ({text:String(x.text), done:false})),
      spend: A(out.spend).filter(x => x && +x.amt).map(x => ({what:String(x.what||''), amt:+x.amt, cat:String(x.cat||'Other')})),
      flags: A(out.flags).filter(f => ['gym','reel','family'].includes(f)),
      trades: COLE_TRADES.clean(out.trades, curTrades)
    };
    const blank = {checkin:null,trades:[],meals:[],spend:[],gym:false,reel:false,family:false,lossAt:null,journal:[],ideas:[],tasks:[],sched:{},laptop:{},slips:{},slipLog:[]};
    const d = Object.assign(blank, (row && row.data) || {});
    ['journal','meals','ideas','tasks','spend'].forEach(k => { if (!Array.isArray(d[k])) d[k] = []; });
    const at = Date.now();
    r.journal.forEach(j => d.journal.push({...j, at}));
    r.meals.forEach(m => d.meals.push(m));
    r.ideas.forEach(x => d.ideas.push({...x, at}));
    r.tasks.forEach(x => d.tasks.push({...x, at}));
    r.spend.forEach(x => d.spend.push({...x, at}));
    r.flags.forEach(f => d[f] = true);
    const logged = COLE_TRADES.apply(d, r.trades, at, 'spikey');
    d.journal.push({tag:'raw', text:txt, at, hidden:true});
    const {error:e2} = await sb.from('cole_docs').upsert({user_id:uid, path, data:d, updated_at:new Date().toISOString()}, {onConflict:'user_id,path'});
    if (e2) return {ok:false, message:"Couldn't save to Cole: " + e2.message};
    refresh();
    const parts = [];
    const tradeSay = t => {
      const res = t.pnl !== '' && t.pnl !== undefined ? (+t.pnl >= 0 ? 'up ' : 'down ') + speakMoney(+t.pnl) : 'result not in yet';
      const br = COLE_TRADES.broken(t).map(k => RULE_SPOKEN[k]);
      return `${t.updated ? 'updated your' : ''} ${String(t.dir).toLowerCase()} ${t.qty} ${t.contract}, ${res}${br.length ? ', rules broken: ' + andList(br) : ''}`.trim();
    };
    const tradeMsg = logged.length ? `Logged in your trade log: ${logged.map(tradeSay).join('; ')}. That's ${d.trades.length} of 2 today. ` : '';
    if (r.journal.length) parts.push(r.journal.length + ' journal');
    if (r.meals.length) parts.push(r.meals.length + ' meal' + (r.meals.length > 1 ? 's' : ''));
    if (r.ideas.length) parts.push(r.ideas.length + ' idea' + (r.ideas.length > 1 ? 's' : ''));
    if (r.tasks.length) parts.push(r.tasks.length + ' to-do' + (r.tasks.length > 1 ? 's' : ''));
    if (r.spend.length) parts.push(r.spend.length + ' expense' + (r.spend.length > 1 ? 's' : ''));
    const rest = parts.length ? 'Also saved: ' + parts.join(', ') + '.' : (logged.length ? '' : 'Saved to Cole: journal.');
    return {ok:true, message:(tradeMsg + rest).trim(), sorted:r, trades:logged};
  };
  window.JV_coleSignedIn = () => !!uid;
  window.JV_coleSaveDoc = async (path, data) => {
    if (!sb || !uid) return false;
    const {error} = await sb.from('cole_docs').upsert({user_id:uid, path, data, updated_at:new Date().toISOString()}, {onConflict:'user_id,path'});
    return !error;
  };
  window.JV_coleTodos = () => (uid || todos.length) ? todos.slice() : null;
  // ---- Cole to-dos ARE Spikey's objectives: add / complete write straight into Cole ----
  const BLANK = () => ({checkin:null,trades:[],meals:[],spend:[],gym:false,reel:false,family:false,lossAt:null,journal:[],ideas:[],tasks:[],sched:{},laptop:{},slips:{},slipLog:[]});
  async function editDay(key, fn){
    const path = 'days/' + key;
    const {data:row, error:e1} = await sb.from('cole_docs').select('data').eq('path', path).maybeSingle();
    if (e1) throw new Error("Couldn't reach Cole.");
    const d = Object.assign(BLANK(), (row && row.data) || {});
    if (!Array.isArray(d.tasks)) d.tasks = [];
    fn(d);
    const {error:e2} = await sb.from('cole_docs').upsert({user_id:uid, path, data:d, updated_at:new Date().toISOString()}, {onConflict:'user_id,path'});
    if (e2) throw new Error("Couldn't save to Cole: " + e2.message);
    await refresh();
  }
  window.JV_coleTasks = {
    on: () => !!(sb && uid),
    list: () => todos.slice(),
    add: text => editDay(keyOf(new Date()), d => d.tasks.push({text:String(text), done:false, at:Date.now()})),
    complete: async text => {
      const ref = todoRefs.find(r => r.text === text); if (!ref) return false;
      await editDay(ref.key, d => {
        let i = ref.i;
        if (!d.tasks[i] || d.tasks[i].text !== ref.text) i = d.tasks.findIndex(t => t && !t.done && t.text === ref.text);
        if (i >= 0){ d.tasks[i].done = true; d.tasks[i].doneAt = Date.now(); }
      });
      return true;
    },
    completeAll: async () => {
      const keys = [...new Set(todoRefs.map(r => r.key))];
      for (const k of keys) await editDay(k, d => d.tasks.forEach(t => { if (t && !t.done){ t.done = true; t.doneAt = Date.now(); } }));
    }
  };
  window.JV_coleGetDoc = async path => {
    if (!sb || !uid) return null;
    const {data} = await sb.from('cole_docs').select('data').eq('path', path).maybeSingle();
    return data ? data.data : null;
  };
  // ---- read Cole's pages (journal, meals, trades, ideas, spending, to-dos) for any date range ----
  window.JV_coleRead = (from, to, sections) => {
    if (!uid) return null;
    const days = window.JV_coleDays || {};
    const want = (sections && sections.length) ? sections : ['journal','trades','meals','ideas','spend','tasks','habits'];
    const out = {};
    Object.keys(days).sort().filter(k => (!from || k >= from) && (!to || k <= to)).forEach(k => {
      const d = days[k] || {}, o = {};
      if (want.includes('journal')) o.journal = (d.journal || []).filter(j => j && !j.hidden && j.text).map(j => (j.tag ? '[' + j.tag + '] ' : '') + j.text);
      if (want.includes('trades')) o.trades = (d.trades || []).map(t => ({pnl:t.pnl, sym:t.sym || t.symbol, side:t.side || t.dir, note:t.note || t.notes, rulesBroken:RULES.filter(r => !(t.rules && t.rules[r]))}));
      if (want.includes('meals')) o.meals = (d.meals || []).map(m => `${m.name} (${m.kcal || 0} kcal, ${m.p || 0}g protein)`);
      if (want.includes('ideas')) o.ideas = (d.ideas || []).map(x => (x.area ? '[' + x.area + '] ' : '') + x.text);
      if (want.includes('spend')) o.spend = (d.spend || []).map(x => `${x.what} $${x.amt} (${x.cat})`);
      if (want.includes('tasks')) o.todos = (d.tasks || []).filter(t => t && t.text).map(t => (t.done ? '[done] ' : '') + t.text);
      if (want.includes('habits')) o.habits = {gym:!!d.gym, reel:!!d.reel, family:!!d.family};
      if (d.checkin && want.includes('journal')) o.checkin = d.checkin;
      Object.keys(o).forEach(x => { if (Array.isArray(o[x]) && !o[x].length) delete o[x]; });
      if (Object.keys(o).length) out[k] = o;
    });
    return out;
  };
  const signed = n => (n >= 0 ? 'up ' : 'down ') + speakMoney(n);

  // full spoken breakdown: P&L by day, which rules were broken, clean vs broken totals
  window.JV_pnlBreakdown = () => {
    if (!uid && !(week && week.nTrades)) return null;
    const w = week;
    if (!w || !w.nTrades) return 'No trades logged in Cole this week yet.';
    const out = [w.total === 0 ? `This week you're flat across ${w.nTrades} trades.` : `This week you're ${signed(w.total)} across ${w.nTrades} trade${w.nTrades === 1 ? '' : 's'}.`];
    w.days.filter(d => d.trades.length).forEach(d => {
      const broken = [...new Set(d.trades.flatMap(t => RULES.filter(k => !(t.rules && t.rules[k]))))].map(k => RULE_SPOKEN[k]);
      const over = d.trades.length > 2;
      const rule = d.clean ? 'rules followed.' : 'rules broken: ' + andList([...broken, ...(over ? ['going over the two-trade limit'] : [])]) + '.';
      out.push(`${d.today ? 'Today' : DAY_SPOKEN[d.label]}, ${d.pnl === 0 ? 'flat' : signed(d.pnl)}, ${rule}`);
    });
    out.push(`You followed your rules on ${w.cleanDays} of ${w.tradedDays} trading day${w.tradedDays === 1 ? '' : 's'}.`);
    const cleanP = w.days.filter(d => d.clean === true).reduce((s, d) => s + d.pnl, 0);
    const dirtyP = w.days.filter(d => d.clean === false).reduce((s, d) => s + d.pnl, 0);
    if (w.cleanDays && w.cleanDays < w.tradedDays) out.push(`Clean days made ${speakMoney(cleanP)}${cleanP < 0 ? ' in losses' : ''}. Rule-broken days ${dirtyP < 0 ? 'cost you ' + speakMoney(dirtyP) : 'made ' + speakMoney(dirtyP)}.`);
    if (w.today && !w.today.trades.length) out.push('No trades yet today.');
    return out.join(' ');
  };

  // spoken summary for "Spikey, what's my P&L" and the briefing
  window.JV_pnlSentence = () => {
    if (!uid && !(week && week.nTrades)) return null;   // not linked: let Spikey say so
    if (!week || !week.nTrades) return 'No trades logged in Cole this week yet.';
    const w = week, dir = w.total > 0 ? 'up' : w.total < 0 ? 'down' : 'flat';
    let s = dir === 'flat' ? `You're flat this week` : `You're ${dir} ${speakMoney(w.total)} this week`;
    s += ` across ${w.nTrades} trade${w.nTrades === 1 ? '' : 's'}, with ${w.cleanDays} of ${w.tradedDays} trading day${w.tradedDays === 1 ? '' : 's'} clean.`;
    const t = w.today;
    if (t && t.trades.length) s += ` Today: ${t.trades.length} of 2 trades, ${t.pnl >= 0 ? 'up' : 'down'} ${speakMoney(t.pnl)}.`;
    return s;
  };

  function state(text, on){ const e = $('coleState'); if (e){ e.textContent = text; e.classList.toggle('on', !!on); } }

  async function refresh(){
    if (!sb || !uid) return;
    const {data, error} = await sb.from('cole_docs').select('path,data').like('path', 'days/%');
    if (error){ state('COLE · OFFLINE'); readyResolve(); return; }
    render(compute(data));
    state('COLE ● LIVE', true);
    readyResolve();
  }

  function connected(user){
    uid = user.id;
    refresh();
    // live: redraw the moment you log a trade in Cole on any device
    sb.channel('spikey-' + uid)
      .on('postgres_changes', {event:'*', schema:'public', table:'cole_docs', filter:'user_id=eq.' + uid}, p => {
        const path = (p.new && p.new.path) || (p.old && p.old.path) || '';
        if (path.startsWith('days/')) refresh();
      }).subscribe();
    setInterval(refresh, 5 * 60 * 1000);   // backup poll + picks up the new week on Monday
  }

  // --- sign-in modal (you type your Cole login; it's stored only in this browser profile) ---
  const modal = () => $('coleLogin');
  function openLogin(){ if (uid){ refresh(); return; } modal().classList.add('show'); $('coleMsg').textContent = ''; setTimeout(() => $('coleEmail').focus(), 50); }
  function wire(){
    $('coleState').onclick = openLogin;
    $('coleCancel').onclick = () => modal().classList.remove('show');
    const go = async () => {
      if (!sb){ $('coleMsg').textContent = 'Still loading. Try again in a second.'; return; }
      $('coleMsg').textContent = 'Signing in…';
      const {data, error} = await sb.auth.signInWithPassword({email:$('coleEmail').value.trim(), password:$('colePass').value});
      if (error){ $('coleMsg').textContent = "Couldn't sign in: " + error.message; return; }
      $('colePass').value = ''; modal().classList.remove('show'); connected(data.user);
    };
    $('coleGo').onclick = go;
    $('colePass').addEventListener('keydown', e => { if (e.key === 'Enter') go(); });
    // keep typing in the login box from triggering Spikey's Space push-to-talk
    ['coleEmail','colePass'].forEach(id => $(id).addEventListener('keydown', e => e.stopPropagation()));
  }
  wire();
  render(compute([]));
  if (!SB_URL || !SB_KEY){
    state('COLE · NOT LINKED'); readyResolve();
    $('coleState').onclick = () => { modal().classList.add('show'); $('coleMsg').textContent = "Cole isn't linked to Spikey yet."; };
    return;
  }

  const s = document.createElement('script');
  s.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.js';
  s.onload = async () => {
    sb = window.supabase.createClient(SB_URL, SB_KEY, {auth:{persistSession:true, autoRefreshToken:true, storageKey:'spikey-cole-auth'}});
    const {data:{session}} = await sb.auth.getSession();
    if (session) connected(session.user); else { state('COLE · SIGN IN'); readyResolve(); }
  };
  s.onerror = () => { state('COLE · OFFLINE'); readyResolve(); };
  document.head.appendChild(s);
})();
