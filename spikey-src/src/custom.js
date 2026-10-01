/* ===== On-the-spot slides and screens: Spikey builds new slides (with live data) and opens websites/videos inside itself ===== */
(() => {
  if (new URLSearchParams(location.search).get('screen') === 'side') return;
  const LS = 'spikey.customSlides', DOC = 'spikey/slides';
  const MODEL = 'claude-sonnet-5-5';
  const pad = n => String(n).padStart(2, '0');
  const keyOf = d => `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
  const esc = t => String(t == null ? '' : t).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'})[c]);
  const slug = t => String(t).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'slide';
  const norm = t => String(t || '').toLowerCase().replace(/[^a-z0-9 ]+/g, ' ').replace(/\b(the|my|a|an|slide|screen|page)\b/g, ' ').replace(/\s+/g, ' ').trim();

  let slides = (() => { try{ return JSON.parse(localStorage.getItem(LS) || '[]'); }catch{ return []; } })();
  function save(){
    try{ localStorage.setItem(LS, JSON.stringify(slides)); }catch{}
    if (window.JV_coleSaveDoc) window.JV_coleSaveDoc(DOC, {slides, at: Date.now()}).catch(() => {});
    if (window.JV_slides && window.JV_slides.sync) window.JV_slides.sync();
  }
  // slides made on another device come in through Cole
  async function pull(){
    try{
      await window.JV_coleReady;
      const r = window.JV_coleGetDoc && await window.JV_coleGetDoc(DOC);
      if (r && Array.isArray(r.slides)){
        const m = new Map(slides.map(s => [s.id, s]));
        r.slides.forEach(s => { const o = m.get(s.id); if (!o || (s.made || 0) > (o.made || 0)) m.set(s.id, s); });
        if (Array.isArray(r.deleted)) r.deleted.forEach(id => m.delete(id));
        slides = [...m.values()];
        try{ localStorage.setItem(LS, JSON.stringify(slides)); }catch{}
        if (window.JV_slides && window.JV_slides.sync) window.JV_slides.sync();
      } else if (slides.length) save();
    }catch{}
  }
  let pulled = false;
  window.addEventListener('cole-update', () => { if (!pulled && window.JV_coleSignedIn && window.JV_coleSignedIn()){ pulled = true; pull(); } });

  // ---------- everything Spikey knows, handed to a slide as window.SPIKEY_DATA ----------
  function data(){
    const days = window.JV_coleDays || {}, cut = new Date(); cut.setDate(cut.getDate() - 90);
    const ck = keyOf(cut), out = {};
    Object.keys(days).sort().filter(k => k >= ck).forEach(k => {
      const d = days[k] || {};
      out[k] = {
        journal: (d.journal || []).filter(j => j && j.text && !j.hidden && j.tag !== 'raw').map(j => ({tag:j.tag || 'journal', text:j.text, at:j.at || 0})),
        trades: (d.trades || []).map(t => ({...t})), meals: d.meals || [], spend: d.spend || [], ideas: d.ideas || [],
        tasks: d.tasks || [], gym: !!d.gym, reel: !!d.reel, family: !!d.family, checkin: d.checkin || null, slips: d.slips || {}
      };
    });
    let bt = null;
    try{ bt = {active: window.JV_backtest && window.JV_backtest.active() ? window.JV_backtest.stats() : null, sessions: JSON.parse(localStorage.getItem('spikey.backtest.history') || '[]').map(s => ({started:s.started, ended:s.ended, trades:s.trades}))}; }catch{}
    return {
      now: new Date().toISOString(), today: keyOf(new Date()), timezone: 'America/New_York',
      targets: {kcal:2700, protein:150, carbs:350, fat:75, foodBudgetMonth:180, maxTradesPerDay:2, tradingWindow:'9:30-10:30 ET'},
      tradeRules: ['plan','size','noRevenge','noFomo','window'],
      days: out, objectives: (window.JV_tasks && window.JV_tasks.list()) || [], backtest: bt
    };
  }
  const SCHEMA = `window.SPIKEY_DATA = {
  now: ISO string, today: "YYYY-MM-DD", timezone,
  targets: {kcal, protein, carbs, fat, foodBudgetMonth, maxTradesPerDay, tradingWindow},
  tradeRules: ["plan","size","noRevenge","noFomo","window"],
  days: { "YYYY-MM-DD": {            // last 90 days from Cole, only days with data
      journal: [{tag: "trading"|"journal"|"family"|"business"|"fitness", text, at}],
      trades: [{pnl: number, rules: {plan:bool,size:bool,noRevenge:bool,noFomo:bool,window:bool}, ...maybe sym, side, note}],
      meals: [{name, kcal, p, c, f, cost}], spend: [{what, amt, cat}], ideas: [{area, text}],
      tasks: [{text, done}], gym: bool, reel: bool, family: bool, checkin: {sleep, mood, feel:[], plan}|null } },
  objectives: [string],              // open to-dos (same list as Cole)
  backtest: {active: {n,wins,losses,be,winRate,totalR,avgR,pf,mins}|null, sessions: [{started, ended, trades:[{dir:"long"|"short", r:number, note}]}]}
}`;

  // ---------- the slide's own little page, sandboxed (it can't touch Spikey's keys) ----------
  function theme(){
    const cs = getComputedStyle(document.documentElement), v = n => cs.getPropertyValue(n).trim();
    return {a:v('--a') || '#ff2233', a2:v('--a2') || '#b57bff', good:v('--good') || '#3dff8f', red:v('--red') || v('--alert') || '#ff2d55', txt:v('--txt') || '#e6e1f0', hi:v('--hi') || '#fff', mute:v('--mute') || '#7a738c', line:v('--line') || 'rgba(255,255,255,.12)'};
  }
  function doc(s){
    const t = theme();
    const json = JSON.stringify(data()).replace(/</g, '\\u003c');
    return `<!doctype html><html><head><meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet">
<style>:root{--a:${t.a};--a2:${t.a2};--good:${t.good};--red:${t.red};--txt:${t.txt};--hi:${t.hi};--mute:${t.mute};--line:${t.line};--f-display:'Space Grotesk',sans-serif;--f-mono:'JetBrains Mono',monospace}
*{box-sizing:border-box;margin:0;padding:0}html,body{height:100%;background:transparent;color:var(--txt);font:400 15px var(--f-display);overflow:hidden}
.card{background:rgba(255,255,255,.035);border:1px solid var(--line);border-radius:10px;padding:14px 16px}
.k{font:500 10px var(--f-mono);letter-spacing:.24em;color:var(--mute);text-transform:uppercase}
.big{font:500 clamp(30px,4.2vw,58px) var(--f-display);letter-spacing:-.03em;color:var(--hi);line-height:1}
.up{color:var(--good)}.down{color:var(--red)}</style>
<script>window.SPIKEY_DATA=${json};
window.onerror=function(m,s,l){parent.postMessage({cs:${JSON.stringify(s.id)},err:String(m)+' (line '+l+')'},'*')};
addEventListener('load',function(){setTimeout(function(){parent.postMessage({cs:${JSON.stringify(s.id)},ok:true},'*')},400)});<\/script>
</head><body>${s.html || ''}</body></html>`;
  }
  const errors = {};
  addEventListener('message', e => { const m = e.data; if (m && m.cs && m.err) errors[m.cs] = m.err; });

  // ---------- Claude writes the slide ----------
  async function claude(body){
    const key = (() => { try{ return localStorage.getItem('spikey.claudeKey') || ''; }catch{ return ''; } })();
    if (!key) throw new Error('I need my Claude key in Setup to build slides.');
    const r = await fetch('https://api.anthropic.com/v1/messages', {method:'POST', headers:{'content-type':'application/json', 'x-api-key':key, 'anthropic-version':'2023-06-01', 'anthropic-dangerous-direct-browser-access':'true'}, body:JSON.stringify(body)});
    if (!r.ok){ let m = ''; try{ m = (await r.json()).error.message; }catch{} throw new Error('Claude error while building the slide. ' + m); }
    return r.json();
  }
  const GEN_SYS = `You build one slide for Spikey, Nick's voice-assistant dashboard (dark "night ops" look: near-black background, red/purple accents, Space Grotesk + JetBrains Mono). The slide is shown in a 16:9-ish box about 900x520 px and rotates with the others.
Write the slide as an HTML fragment for the <body> (inline <style> and <script> allowed). It runs in a sandboxed iframe: no cookies, no localStorage, no parent access. CSS variables available: --a (main accent), --a2 (second accent), --good, --red, --txt, --hi, --mute, --line, --f-display, --f-mono. Helper classes: .card, .k (small label), .big (large number), .up, .down. Background must stay transparent.
LIVE DATA: read Nick's real data from window.SPIKEY_DATA (already defined before your code, refreshed every time the slide is shown) and compute everything in JavaScript at load time, so the slide stays current. Never hard-code his numbers. Handle empty data gracefully ("nothing logged yet").
Schema:
${SCHEMA}
Charts: you may load Chart.js from https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.min.js (set responsive:true, maintainAspectRatio:false, animation on, dark styling). No other external scripts. Images only from https URLs you are sure exist.
For information that is not in SPIKEY_DATA (news, sports, events, prices, facts), use web_search first and bake what you found into the slide with the date it was checked.
Fill the whole box with a clean, glanceable layout: a grid of 2-4 cards, big numbers, at most ~8 list rows, no scrollbars, nothing tiny. No title bar (Spikey adds the title above the slide).
Reply in EXACTLY this format and nothing else:
TITLE: <2-4 word title>
SUBTITLE: <short subtitle>
LIVE: <yes if it uses SPIKEY_DATA, no if it is static>
<<<HTML
...fragment...
HTML>>>`;
  function parse(t){
    const title = (t.match(/TITLE:\s*(.+)/) || [])[1], sub = (t.match(/SUBTITLE:\s*(.+)/) || [])[1], live = (t.match(/LIVE:\s*(\w+)/) || [])[1];
    const html = (t.match(/<<<HTML\s*([\s\S]*?)\s*HTML>>>/) || [])[1];
    if (!html) throw new Error('The slide came back empty.');
    return {title:(title || 'New slide').trim().slice(0, 40), subtitle:(sub || '').trim().slice(0, 60), live:!/^no/i.test(live || 'yes'), html};
  }
  async function generate(request, prev){
    const user = prev
      ? `Here is the current slide "${prev.title}":\n<<<HTML\n${prev.html}\nHTML>>>\n\nChange it like this: ${request}${prev.err ? '\nIt also threw this error, fix it: ' + prev.err : ''}`
      : `Nick asked: "${request}". Build that slide.`;
    const messages = [{role:'user', content:user}];
    let text = '';
    for (let step = 0; step < 5; step++){
      const res = await claude({model:MODEL, max_tokens:9000, system:GEN_SYS, tools:[{type:'web_search_20250305', name:'web_search', max_uses:4}], messages});
      messages.push({role:'assistant', content:res.content});
      text = (res.content || []).filter(b => b.type === 'text').map(b => b.text).join('');
      if (res.stop_reason !== 'pause_turn') break;
    }
    return parse(text);
  }
  // render it off-screen first; if it throws, let Claude fix its own code once
  function trial(s){
    return new Promise(res => {
      const f = document.createElement('iframe');
      f.sandbox = 'allow-scripts'; f.style.cssText = 'position:fixed;left:-3000px;top:0;width:900px;height:520px;opacity:0';
      let done = false; const fin = err => { if (done) return; done = true; removeEventListener('message', on); f.remove(); res(err || null); };
      const on = e => { const m = e.data; if (m && m.cs === s.id){ if (m.err) fin(m.err); else if (m.ok) setTimeout(() => fin(errors[s.id] || null), 600); } };
      addEventListener('message', on); delete errors[s.id];
      f.srcdoc = doc(s); document.body.appendChild(f);
      setTimeout(() => fin(errors[s.id] || null), 7000);
    });
  }

  async function create(request, opts = {}){
    const prev = opts.editOf ? find(opts.editOf) : null;
    if (opts.editOf && !prev) return {message:`I don't have a slide called ${opts.editOf}.`};
    let s = await generate(request, prev);
    s = {...s, id: prev ? prev.id : slug(s.title) + '-' + Date.now().toString(36).slice(-4), kind:'html', request: prev ? prev.request + ' / ' + request : request, made: Date.now()};
    const err = await trial(s);
    if (err){
      try{ const fixed = await generate('Fix the error so it renders correctly.', {...s, err}); s = {...s, ...fixed, made: Date.now()}; }catch{}
    }
    slides = slides.filter(x => x.id !== s.id); slides.push(s); save();
    if (window.JV_slides) window.JV_slides.show(s.id, 45000);
    return {message: prev ? `Updated the ${s.title} slide.` : `Built a new slide: ${s.title}. It's in the rotation now.`, slide:s};
  }
  function addEmbed(title, url){
    const u = embedUrl(url); if (!u) return {message:"That site doesn't allow being shown inside Spikey."};
    const s = {id: slug(title) + '-' + Date.now().toString(36).slice(-4), kind:'embed', title:String(title).slice(0, 40), subtitle:hostOf(url), url:u, made:Date.now()};
    slides.push(s); save();
    if (window.JV_slides) window.JV_slides.show(s.id, 45000);
    return {message:`Added a ${s.title} slide.`, slide:s};
  }
  function find(q){
    const n = norm(q); if (!n) return null;
    return slides.find(s => s.id === q) || slides.find(s => norm(s.title) === n) || slides.find(s => { const t = norm(s.title); return t.length > 2 && (t.includes(n) || n.includes(t)); });
  }
  function remove(q){
    const s = find(q); if (!s) return `I don't have a slide called ${q}.`;
    slides = slides.filter(x => x !== s); save();
    if (window.JV_coleSaveDoc) window.JV_coleSaveDoc(DOC, {slides, deleted:[s.id], at:Date.now()}).catch(() => {});
    return `Deleted the ${s.title} slide.`;
  }

  // ---------- websites / videos inside Spikey ----------
  const hostOf = u => { try{ return new URL(u).hostname.replace(/^www\./, ''); }catch{ return ''; } };
  // sites that refuse to be shown inside other pages
  const NO_FRAME = /(^|\.)(google\.com|gmail\.com|mail\.google\.com|accounts\.google|facebook\.com|instagram\.com|x\.com|twitter\.com|tiktok\.com|linkedin\.com|reddit\.com|amazon\.com|netflix\.com|chase\.com|bankofamerica\.com|github\.com|claude\.ai|chatgpt\.com|tradingview\.com|discord\.com|apple\.com|microsoft\.com|outlook\.com|live\.com)$/;
  function embedUrl(url){
    let u = String(url || '').trim(); if (!u) return null;
    if (!/^https?:\/\//.test(u)) u = 'https://' + u;
    let x; try{ x = new URL(u); }catch{ return null; }
    const h = x.hostname.replace(/^www\.|^m\./, '');
    // YouTube video / shorts / playlist → embeddable player
    if (/youtube\.com$|youtu\.be$/.test(h)){
      let id = x.searchParams.get('v') || (h === 'youtu.be' ? x.pathname.slice(1) : '') || (x.pathname.match(/\/(?:shorts|embed|live)\/([\w-]{6,})/) || [])[1];
      const list = x.searchParams.get('list');
      if (id) return `https://www.youtube.com/embed/${id}?autoplay=1&rel=0${list ? '&list=' + list : ''}`;
      if (list) return `https://www.youtube.com/embed/videoseries?list=${list}&autoplay=1`;
      return null;                                   // a search page can't be embedded
    }
    if (h === 'open.spotify.com' && !/\/embed\//.test(x.pathname)) return 'https://open.spotify.com/embed' + x.pathname;
    if (/(^|\.)google\.com$/.test(h) && /^\/maps/.test(x.pathname)){ const q = x.searchParams.get('q') || decodeURIComponent((x.pathname.split('/place/')[1] || '').split('/')[0]); return q ? 'https://maps.google.com/maps?q=' + encodeURIComponent(q) + '&output=embed' : null; }
    if (/(^|\.)tradingview\.com$/.test(h)){ const sym = x.searchParams.get('symbol'); if (sym) return 'https://s.tradingview.com/widgetembed/?symbol=' + encodeURIComponent(sym) + '&interval=5&theme=dark&style=1&timezone=America%2FNew_York&hide_side_toolbar=0'; }
    if (NO_FRAME.test(h)) return null;
    return x.href;
  }

  const css = document.createElement('style');
  css.textContent = `
  .cslide-frame{flex:1;min-height:0;width:100%;border:0;border-radius:10px;background:transparent}
  #webPanel{position:fixed;inset:66px 14px 66px 14px;z-index:20;display:flex;flex-direction:column;gap:10px;background:linear-gradient(160deg,#1a0a10,#08070c);border:1px solid var(--a2);border-radius:14px;padding:12px 14px;
    box-shadow:0 0 60px rgba(181,123,255,.18);opacity:0;transform:scale(.96) translateY(14px);pointer-events:none;transition:opacity .45s,transform .6s cubic-bezier(.2,.9,.2,1)}
  #webPanel.open{opacity:1;transform:none;pointer-events:auto}
  #webPanel .hd{display:flex;align-items:center;gap:10px}
  #webPanel .hd h2{font:600 13px var(--f-mono);letter-spacing:.3em;color:var(--a2);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  #webPanel .hd span{flex:1;font:400 12px var(--f-mono);color:var(--mute);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  #webPanel button{font:600 11px var(--f-mono);letter-spacing:.14em;padding:8px 12px;border:1px solid var(--line);background:rgba(255,255,255,.04);color:var(--txt);cursor:pointer;border-radius:8px;white-space:nowrap}
  #webPanel iframe{flex:1;width:100%;border:0;border-radius:10px;background:#000}`;
  document.head.appendChild(css);
  const web = document.createElement('section'); web.id = 'webPanel';
  web.innerHTML = `<div class="hd"><h2 id="webTitle">SCREEN</h2><span id="webUrl"></span><button id="webOut">OPEN IN CHROME ↗</button><button id="webPin">+ SLIDE</button><button id="webClose">CLOSE ✕</button></div><iframe id="webFrame" allow="autoplay; encrypted-media; picture-in-picture; fullscreen; clipboard-write" allowfullscreen referrerpolicy="strict-origin-when-cross-origin"></iframe>`;
  document.body.appendChild(web);
  let webState = null;
  web.querySelector('#webClose').onclick = () => closeScreen();
  web.querySelector('#webOut').onclick = () => { if (webState) window.open(webState.orig, '_blank'); };
  web.querySelector('#webPin').onclick = () => { if (webState){ addEmbed(webState.title, webState.orig); closeScreen(); } };
  function openScreen(url, title){
    const u = embedUrl(url);
    if (!u){                                          // can't live inside Spikey: open it in Chrome instead
      const full = /^https?:/.test(url) ? url : 'https://' + url;
      const w = window.open(full, '_blank');
      return w ? `Opened ${hostOf(full) || 'it'} in Chrome. That site won't run inside Spikey.` : 'Chrome blocked the window.';
    }
    webState = {url:u, orig:url, title:title || hostOf(url)};
    web.querySelector('#webTitle').textContent = String(webState.title).toUpperCase();
    web.querySelector('#webUrl').textContent = hostOf(url);
    web.querySelector('#webFrame').src = u;
    window.dispatchEvent(new CustomEvent('spikey-screen', {detail:'web'}));
    web.classList.add('open');
    return `${webState.title} is up on screen.`;
  }
  window.addEventListener('spikey-screen', e => { if (e.detail !== 'web' && webState) closeScreen(); });
  function closeScreen(){ web.classList.remove('open'); const f = web.querySelector('#webFrame'); f.src = 'about:blank'; webState = null; }

  // slides.js asks us to fill a custom slide when it comes on screen
  window.JV_customMount = (el, id) => {
    const s = slides.find(x => x.id === id); if (!s) return;
    const f = document.createElement('iframe'); f.className = 'cslide-frame';
    if (s.kind === 'embed'){ f.src = s.url; f.allow = 'autoplay; encrypted-media; picture-in-picture; fullscreen'; }
    else { f.sandbox = 'allow-scripts'; f.srcdoc = doc(s); }
    el.appendChild(f);
  };

  window.JV_custom = {
    list: () => slides.map(s => ({id:s.id, title:s.title, subtitle:s.subtitle, kind:s.kind})),
    slides: () => slides.slice(),
    create, addEmbed, remove, find, openScreen, closeScreen, isOpen: () => !!webState, embedUrl, data
  };
  pull();
})();
