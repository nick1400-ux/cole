/* ===== Slides: Cole-style cards on center stage (Fuel, Trading, Money, Habits, Agenda) with transitions ===== */
(() => {
  if (new URLSearchParams(location.search).get('screen') === 'side') return;
  const core = document.querySelector('.core'); if (!core) return;
  const TARGETS = {kcal:2700, p:150, c:350, f:75, foodMonth:180};
  const RULES = ['plan','size','noRevenge','noFomo','window'];
  const pad = n => String(n).padStart(2, '0');
  const keyOf = d => `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
  const esc = x => String(x == null ? '' : x).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  const money = n => (n < 0 ? '−' : '') + '$' + Math.abs(Math.round(n)).toLocaleString();
  const sum = (a, f) => (a || []).reduce((s, x) => s + (+x[f] || 0), 0);

  const css = document.createElement('style');
  css.textContent = `
  #slides{position:absolute;inset:0;z-index:3;pointer-events:none;perspective:1400px}
  .slide{position:absolute;inset:4% 3% 10%;display:flex;flex-direction:column;gap:14px;padding:22px 26px;border:1px solid var(--line);
    background:linear-gradient(160deg,rgba(30,10,16,.92),rgba(10,8,14,.94));backdrop-filter:blur(14px);border-radius:14px;
    opacity:0;transform:translateX(9%) rotateY(-14deg) scale(.94);filter:blur(6px);transition:opacity .7s ease,transform .8s cubic-bezier(.2,.9,.2,1),filter .7s;pointer-events:none;overflow:hidden}
  .slide.on{opacity:1;transform:none;filter:none;pointer-events:auto}
  .slide.off{opacity:0;transform:translateX(-9%) rotateY(14deg) scale(.94);filter:blur(6px)}
  .slide::before{content:"";position:absolute;left:0;top:0;height:2px;width:100%;background:linear-gradient(90deg,transparent,var(--a),transparent);animation:sweepx 3.5s linear infinite}
  @keyframes sweepx{from{transform:translateX(-100%)}to{transform:translateX(100%)}}
  .slide h2{display:flex;justify-content:space-between;align-items:baseline;font:600 12px var(--f-mono);letter-spacing:.34em;color:var(--a)}
  .slide h2 em{font-style:normal;color:var(--mute);letter-spacing:.14em}
  .sgrid{display:grid;grid-template-columns:1fr 1fr;gap:18px;flex:1;min-height:0}
  .scard{background:rgba(255,255,255,.035);border:1px solid var(--line);border-radius:10px;padding:14px 16px;min-height:0;overflow:hidden}
  .scard .k{font:500 10px var(--f-mono);letter-spacing:.24em;color:var(--mute);text-transform:uppercase}
  .big{font:500 clamp(34px,3.4vw,58px) var(--f-display);letter-spacing:-.03em;color:var(--hi);line-height:1}
  .big.up{color:var(--good)} .big.down{color:var(--red)}
  .ring{display:flex;align-items:center;gap:18px}
  .ring svg{width:clamp(120px,13vw,190px);height:auto;flex:none}
  .ring circle{fill:none;stroke-width:12}
  .ring .bg{stroke:rgba(255,255,255,.07)} .ring .fg{stroke:var(--a);stroke-linecap:round;transition:stroke-dashoffset 1.4s cubic-bezier(.2,.9,.2,1);filter:drop-shadow(0 0 8px var(--glow))}
  .ring .fg2{stroke:var(--a2)}
  .mbar{margin-top:10px} .mbar .t{display:flex;justify-content:space-between;font:400 12.5px var(--f-mono);color:var(--txt)}
  .mbar .b{height:7px;border-radius:7px;background:rgba(255,255,255,.07);margin-top:5px;overflow:hidden}
  .mbar .b i{display:block;height:100%;border-radius:7px;background:linear-gradient(90deg,var(--a2),var(--a));width:0;transition:width 1.2s cubic-bezier(.2,.9,.2,1)}
  .mbar .b i.over{background:var(--red)}
  .slist{list-style:none;display:flex;flex-direction:column;gap:6px;font-size:14.5px;overflow:hidden}
  .slist li{display:flex;justify-content:space-between;gap:12px;padding:6px 0;border-bottom:1px solid var(--line)}
  .slist li span:last-child{font:400 12.5px var(--f-mono);color:var(--mute);white-space:nowrap}
  .slist .none{color:var(--mute);border:0}
  .hab{display:grid;grid-template-columns:repeat(4,1fr);gap:10px}
  .hab div{border:1px solid var(--line);border-radius:10px;padding:12px;text-align:center;font:500 12px var(--f-mono);letter-spacing:.1em;color:var(--mute)}
  .hab div b{display:block;font-size:26px;margin-bottom:4px;color:var(--mute)}
  .hab div.done{border-color:var(--good);color:var(--good);box-shadow:0 0 18px rgba(61,255,143,.15)} .hab div.done b{color:var(--good)}
  .dots7{display:flex;gap:8px;margin-top:8px} .dots7 i{width:22px;height:22px;border-radius:6px;background:rgba(255,255,255,.06);display:grid;place-items:center;font:500 10px var(--f-mono);color:var(--mute);font-style:normal}
  .dots7 i.g{background:rgba(61,255,143,.25);color:var(--good)} .dots7 i.r{background:rgba(255,34,51,.3);color:#fff}
  .wbars{display:flex;gap:8px;align-items:stretch;height:120px;margin-top:10px}
  .wbars div{flex:1;display:flex;flex-direction:column;align-items:center;gap:4px;font:400 10.5px var(--f-mono);color:var(--mute)}
  .wbars .c{flex:1;width:100%;position:relative} .wbars .c::after{content:"";position:absolute;left:0;right:0;top:50%;height:1px;background:var(--line)}
  .wbars .c i{position:absolute;left:22%;right:22%;transition:height 1.2s cubic-bezier(.2,.9,.2,1)}
  .wbars .c i.u{bottom:50%;background:linear-gradient(to top,rgba(61,255,143,.3),var(--good))} .wbars .c i.d{top:50%;background:linear-gradient(to bottom,rgba(255,34,51,.3),var(--red))}
  #slideDots{position:absolute;left:50%;bottom:2%;transform:translateX(-50%);display:flex;gap:8px;z-index:4;pointer-events:auto}
  #slideDots button{width:26px;height:4px;border:0;border-radius:4px;background:rgba(255,255,255,.15);cursor:pointer;transition:all .4s}
  #slideDots button.on{width:44px;background:var(--a);box-shadow:0 0 10px var(--a)}
  body.slide-live #fx, body.slide-live #logo3d, body.slide-live #logoFallback{opacity:.12;transition:opacity .8s} #fx,#logo3d,#logoFallback{transition:opacity .8s}`;
  document.head.appendChild(css);

  const host = document.createElement('div'); host.id = 'slides'; core.appendChild(host);
  const dots = document.createElement('div'); dots.id = 'slideDots'; core.appendChild(dots);

  // ---------- data from Cole ----------
  const days = () => window.JV_coleDays || {};
  const today = () => days()[keyOf(new Date())] || {};
  const linked = () => !!(window.JV_coleSignedIn && window.JV_coleSignedIn()) || Object.keys(days()).length > 0;
  const ringSvg = (v, t, cls = 'fg', label = '', sub = '') => {
    const r = 70, c = 2 * Math.PI * r, pct = Math.max(0, Math.min(1, t ? v / t : 0));
    return `<svg viewBox="0 0 180 180"><circle class="bg" cx="90" cy="90" r="${r}"/><circle class="${cls}" cx="90" cy="90" r="${r}" stroke-dasharray="${c}" stroke-dashoffset="${c}" data-off="${c * (1 - pct)}" transform="rotate(-90 90 90)"/>
      <text x="90" y="88" text-anchor="middle" fill="var(--hi)" style="font:600 30px var(--f-display)">${label}</text><text x="90" y="112" text-anchor="middle" fill="var(--mute)" style="font:500 11px var(--f-mono);letter-spacing:.15em">${sub}</text></svg>`;
  };
  const bar = (lab, v, t, u = '') => `<div class="mbar"><div class="t"><span>${lab}</span><span>${Math.round(v)}${u} / ${t}${u}</span></div><div class="b"><i class="${v > t ? 'over' : ''}" data-w="${Math.min(100, t ? v / t * 100 : 0)}"></i></div></div>`;
  const notLinked = what => `<div class="scard" style="grid-column:1/-1;display:grid;place-items:center;text-align:center"><div><div class="big" style="font-size:28px">Cole is connecting…</div><p style="margin-top:10px;color:var(--mute)">Your ${what} will show up here in a moment.</p></div></div>`;

  const SLIDES = [
    {id:'spikey', name:'Spikey', html:() => null},
    {id:'fuel', name:'Fuel', html:() => {
      if (!linked()) return `<h2>FUEL <em>lean bulk</em></h2><div class="sgrid">${notLinked('protein and meals')}</div>`;
      const d = today(), m = d.meals || [], p = sum(m,'p'), k = sum(m,'kcal'), c = sum(m,'c'), f = sum(m,'f');
      return `<h2>FUEL <em>today · lean bulk</em></h2><div class="sgrid">
        <div class="scard"><div class="k">Protein</div><div class="ring">${ringSvg(p, TARGETS.p, 'fg', Math.round(p) + 'g', 'OF ' + TARGETS.p + 'G')}
          <div><div class="big" style="font-size:30px">${p >= TARGETS.p ? 'Hit ✓' : Math.max(0, TARGETS.p - Math.round(p)) + 'g'}</div><div style="color:var(--mute);margin-top:6px">${p >= TARGETS.p ? 'Protein done. Finish calories.' : 'protein to go'}</div></div></div>
          ${bar('Carbs', c, TARGETS.c, 'g')}${bar('Fat', f, TARGETS.f, 'g')}</div>
        <div class="scard"><div class="k">Calories</div><div class="ring">${ringSvg(k, TARGETS.kcal, 'fg fg2', Math.round(k).toLocaleString(), 'OF ' + TARGETS.kcal.toLocaleString())}
          <div><div class="big" style="font-size:30px">${Math.max(0, TARGETS.kcal - Math.round(k)).toLocaleString()}</div><div style="color:var(--mute);margin-top:6px">kcal left</div></div></div>
          <ul class="slist" style="margin-top:10px">${m.length ? m.slice(-4).reverse().map(x => `<li><span>${esc(x.name)}</span><span>${x.kcal} kcal · ${x.p}P</span></li>`).join('') : '<li class="none">No meals logged yet today</li>'}</ul></div></div>`;
    }},
    {id:'trading', name:'Trading', html:() => {
      if (!linked()) return `<h2>TRADING <em>this week</em></h2><div class="sgrid">${notLinked('trading week')}</div>`;
      const D = days(), now = new Date(), mon = new Date(now); mon.setDate(now.getDate() - ((now.getDay() + 6) % 7));
      const wk = Array.from({length:5}, (_, i) => { const x = new Date(mon); x.setDate(mon.getDate() + i); const k = keyOf(x), t = (D[k] && D[k].trades) || []; return {lab:['MON','TUE','WED','THU','FRI'][i], t, pnl:sum(t,'pnl'), clean:t.length ? (t.length <= 2 && t.every(tr => RULES.every(r => tr.rules && tr.rules[r]))) : null}; });
      const tot = wk.reduce((s, x) => s + x.pnl, 0), max = Math.max(1, ...wk.map(x => Math.abs(x.pnl)));
      const traded = Object.keys(D).filter(k => (D[k].trades || []).length).sort();
      const cleanOf = k => { const t = D[k].trades; return t.length <= 2 && t.every(tr => RULES.every(r => tr.rules && tr.rules[r])); };
      const last10 = traded.slice(-10), disc = last10.length ? Math.round(100 * last10.filter(cleanOf).length / last10.length) : null;
      let streak = 0; for (const k of traded.slice().reverse()){ if (cleanOf(k)) streak++; else break; }
      const nT = ((today().trades) || []).length;
      const recent = traded.slice().reverse().flatMap(k => D[k].trades.slice().reverse().map(t => ({k, t}))).slice(0, 5);
      const rLab = k => k === keyOf(new Date()) ? 'Today' : new Date(k + 'T12:00').toLocaleDateString([], {weekday:'short', month:'short', day:'numeric'});
      return `<h2>TRADING <em>DOW · NASDAQ · GOLD · this week</em></h2><div class="sgrid" style="grid-template-rows:auto auto">
        <div class="scard"><div class="k">Week P&amp;L</div><div class="big ${tot > 0 ? 'up' : tot < 0 ? 'down' : ''}" style="margin-top:8px">${tot > 0 ? '+' : ''}${money(tot)}</div>
          <div class="wbars">${wk.map(x => `<div><div class="c"><i class="${x.pnl >= 0 ? 'u' : 'd'}" data-h="${x.t.length ? Math.max(3, Math.abs(x.pnl) / max * 50) : 0}" style="height:0"></i></div><span style="color:var(--hi)">${x.t.length ? money(x.pnl) : '·'}</span><span>${x.lab}${x.clean === true ? ' ✓' : x.clean === false ? ' ✕' : ''}</span></div>`).join('')}</div></div>
        <div class="scard"><div class="k">Discipline</div><div class="ring">${ringSvg(disc || 0, 100, 'fg', disc == null ? '—' : disc + '%', 'LAST 10 DAYS')}
          <div><div class="big" style="font-size:30px">${streak}</div><div style="color:var(--mute);margin-top:6px">clean days in a row</div>
          <div class="big" style="font-size:30px;margin-top:14px">${nT}/2</div><div style="color:var(--mute);margin-top:6px">trades today</div></div></div></div>
        <div class="scard" style="grid-column:1/-1"><div class="k">Trade log · latest</div><ul class="slist" style="margin-top:8px">${recent.length ? recent.map(({k, t}) => { const ok = RULES.every(r => t.rules && t.rules[r]), has = t.pnl !== '' && t.pnl !== undefined; return `<li><span>${rLab(k)} · ${esc(t.dir || '?')} ${esc(t.qty || 1)} ${esc(t.contract || '')}${ok ? '' : ' <b style="color:var(--red)">✕ rule</b>'}</span><span style="color:${has ? (+t.pnl < 0 ? 'var(--red)' : 'var(--good)') : 'var(--mute)'}">${has ? (+t.pnl > 0 ? '+' : '') + money(+t.pnl) : 'open'}</span></li>`; }).join('') : '<li class="none">No trades logged yet</li>'}</ul></div></div>`;
    }},
    {id:'money', name:'Money', html:() => {
      const fin = window.JV_finance;       // bank balances plug in here once a source is linked
      const D = days(), pre = keyOf(new Date()).slice(0, 7);
      let food = 0; const cats = {};
      for (const k in D) if (k.startsWith(pre)){ food += sum(D[k].meals, 'cost'); (D[k].spend || []).forEach(s => { cats[s.cat || 'Other'] = (cats[s.cat || 'Other'] || 0) + (+s.amt || 0); if (s.cat === 'Food') food += +s.amt || 0; }); }
      const bank = fin && fin.accounts && fin.accounts.length
        ? `<ul class="slist">${fin.accounts.map(a => `<li><span>${esc(a.name)}</span><span style="color:var(--hi)">${money(a.balance)}</span></li>`).join('')}</ul><div style="color:var(--mute);font-size:12px;margin-top:8px">updated ${esc(fin.updated || '')}</div>`
        : `<div style="margin-top:12px;color:var(--mute);line-height:1.5">Bank accounts aren't linked to Spikey yet.</div>`;
      return `<h2>MONEY <em>${new Date().toLocaleString([], {month:'long'})}</em></h2><div class="sgrid">
        <div class="scard"><div class="k">Accounts</div>${bank}</div>
        <div class="scard"><div class="k">Food this month</div>${linked() ? `<div class="big ${food > TARGETS.foodMonth ? 'down' : ''}" style="margin-top:8px">${money(food)}</div>${bar('Budget', food, TARGETS.foodMonth)}
          <ul class="slist" style="margin-top:12px">${Object.keys(cats).length ? Object.entries(cats).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([c, v]) => `<li><span>${esc(c)}</span><span>${money(v)}</span></li>`).join('') : '<li class="none">No other spending logged this month</li>'}</ul>` : '<p style="color:var(--mute);margin-top:10px">Cole is connecting…</p>'}</div></div>`;
    }},
    {id:'habits', name:'Habits', html:() => {
      if (!linked()) return `<h2>HABITS <em>today</em></h2><div class="sgrid">${notLinked('habits')}</div>`;
      const d = today(), D = days(), now = new Date();
      const tiles = [['gym','GYM','🏋'],['reel','REEL POSTED','🎬'],['family','FAMILY TIME','♥'],['checkin','CHECK-IN','✓']];
      const week = Array.from({length:7}, (_, i) => { const x = new Date(now); x.setDate(now.getDate() - 6 + i); const k = keyOf(x), dd = D[k] || {}; const n = ['gym','reel','family'].filter(f => dd[f]).length; return {lab:'SMTWTFS'[x.getDay()], n}; });
      const slips = Object.values(d.slips || {}).reduce((s, v) => s + (+v || 0), 0);
      return `<h2>HABITS <em>today</em></h2><div class="sgrid" style="grid-template-rows:auto 1fr">
        <div class="scard" style="grid-column:1/-1"><div class="hab">${tiles.map(([f, lab, ic]) => `<div class="${d[f] ? 'done' : ''}"><b>${ic}</b>${lab}</div>`).join('')}</div></div>
        <div class="scard"><div class="k">Last 7 days (gym · reel · family)</div><div class="dots7">${week.map(w => `<i class="${w.n >= 2 ? 'g' : w.n === 0 ? '' : 'g'}" style="opacity:${.35 + w.n * .22}">${w.lab}</i>`).join('')}</div></div>
        <div class="scard"><div class="k">Slips today</div><div class="big ${slips ? 'down' : 'up'}" style="margin-top:8px">${slips}</div><div style="color:var(--mute);margin-top:6px">${slips ? 'Reset. Next hour is a new start.' : 'Clean so far.'}</div></div></div>`;
    }},
    {id:'backtest', name:'Backtest', html:() => window.JV_backtestSlide ? window.JV_backtestSlide() : null},
    {id:'agenda', name:'Agenda', html:() => {
      const mine = (window.JV_tasks && window.JV_tasks.list()) || [];
      const half = Math.ceil(Math.min(mine.length, 14) / 2), a = mine.slice(0, Math.max(half, 7)), b = mine.slice(Math.max(half, 7), 14);
      const li = (arr, off) => arr.map((t, i) => `<li><span>${esc(t)}</span><span>${pad(i + 1 + off)}</span></li>`).join('');
      return `<h2>AGENDA <em>${new Date().toLocaleDateString([], {weekday:'long', month:'short', day:'numeric'})} · Cole + Spikey</em></h2><div class="sgrid">
        <div class="scard"><div class="k">Objectives · ${mine.length}</div><ul class="slist" style="margin-top:8px">${mine.length ? li(a, 0) : '<li class="none">All clear. Say “Spikey, add task …”</li>'}</ul></div>
        <div class="scard"><div class="k">${b.length ? 'More' : 'Next up'}</div><ul class="slist" style="margin-top:8px">${b.length ? li(b, a.length) : (mine[0] ? `<li><span>${esc(mine[0])}</span><span>01</span></li>` : '<li class="none">Nothing on deck</li>')}</ul></div></div>`;
    }}
  ];
  // slides Spikey built on the spot (custom.js) join the rotation after the built-in ones
  const all = () => SLIDES.concat(((window.JV_custom && window.JV_custom.slides()) || []).map(c => ({id:c.id, name:c.title, custom:true,
    html:() => `<h2>${esc(String(c.title).toUpperCase())} <em>${esc(c.subtitle || (c.kind === 'embed' ? 'live' : 'built by Spikey'))}</em></h2>`})));

  // ---------- engine ----------
  let idx = 0, timer = null, holdUntil = 0, list = all(), want = null;   // want: a slide he asked for, to come back to after Spikey talks
  const DWELL = 12000;
  function drawDots(){
    dots.innerHTML = list.map((s, i) => `<button title="${esc(s.name)}" data-i="${i}" class="${i === idx ? 'on' : ''}"></button>`).join('');
    dots.querySelectorAll('button').forEach(b => b.onclick = () => { go(+b.dataset.i); holdUntil = Date.now() + 30000; });
  }
  drawDots();
  function animateIn(el){
    requestAnimationFrame(() => requestAnimationFrame(() => {
      el.querySelectorAll('[data-off]').forEach(c => c.style.strokeDashoffset = c.dataset.off);
      el.querySelectorAll('[data-w]').forEach(i => i.style.width = i.dataset.w + '%');
      el.querySelectorAll('[data-h]').forEach(i => i.style.height = i.dataset.h + '%');
    }));
  }
  function go(i){
    idx = (i + list.length) % list.length;
    dots.querySelectorAll('button').forEach((b, j) => b.classList.toggle('on', j === idx));
    const old = host.querySelector('.slide.on');
    if (old){ old.classList.remove('on'); old.classList.add('off'); setTimeout(() => old.remove(), 900); }
    const cur = list[idx], html = cur.html();
    document.body.classList.toggle('slide-live', !!html);
    if (!html) return;
    const el = document.createElement('section'); el.className = 'slide'; el.innerHTML = html;
    if (cur.custom && window.JV_customMount) window.JV_customMount(el, cur.id);
    host.appendChild(el);
    requestAnimationFrame(() => requestAnimationFrame(() => { el.classList.add('on'); animateIn(el); }));
  }
  // Spikey takes the stage while it talks, thinks, or was just called by name; NOT while it's quietly
  // waiting for a follow-up (conversation mode), or the slide you asked for would vanish
  const busy = () => { const JV = window.JV || {}; return !!(JV.speaking || JV.mode === 'thinking' || (JV.mode === 'listening' && !JV.convo)); };
  function tick(){
    const JV = window.JV || {};
    // Spikey takes the stage whenever it's listening or talking
    if (busy()){ if (idx !== 0) go(0); holdUntil = Date.now() + 6000; return; }
    if (Date.now() < holdUntil) return;
    let n = idx + 1; if (list[n % list.length].id === 'backtest') n++;   // backtest lives in its own panel now
    go(n);
  }
  const findIdx = name => {
    const n = String(name || '').toLowerCase().replace(/\b(the|my|slide)\b/g, '').trim();
    let i = list.findIndex(s => s.id === name);
    if (i < 0) i = list.findIndex(s => s.name.toLowerCase() === n);
    if (i < 0 && window.JV_custom){ const c = window.JV_custom.find(name); if (c) i = list.findIndex(s => s.id === c.id); }
    return i;
  };
  window.JV_slides = {
    show(name, ms){ list = all(); drawDots(); const i = findIdx(name); if (i >= 0){ window.dispatchEvent(new CustomEvent('spikey-screen', {detail:'slide'})); go(i); holdUntil = Date.now() + (ms || 30000); want = {id:list[i].id, until:holdUntil}; return true; } return false; },
    next(){ go(idx + 1); holdUntil = Date.now() + 30000; },
    stop(){ go(0); holdUntil = Date.now() + 10 * 60 * 1000; },
    home(){ want = null; go(0); holdUntil = Date.now() + 20000; },
    resume(){ holdUntil = 0; go(idx + 1); },
    sync(){ const id = list[idx] && list[idx].id; list = all(); const j = list.findIndex(s => s.id === id); idx = j >= 0 ? j : 0; drawDots(); },
    names: () => list.filter(s => s.id !== 'spikey' && s.id !== 'backtest').map(s => s.custom ? s.name : s.id)
  };
  addEventListener('keydown', e => { if (document.activeElement && /INPUT|TEXTAREA/.test(document.activeElement.tagName)) return; if (e.key === 'ArrowRight') window.JV_slides.next(); if (e.key === 'ArrowLeft'){ go(idx - 1); holdUntil = Date.now() + 30000; } });
  window.addEventListener('backtest-update', () => { const cur = host.querySelector('.slide.on'); if (cur && list[idx] && list[idx].id === 'backtest'){ cur.innerHTML = list[idx].html(); } });
  window.addEventListener('cole-update', () => { const cur = host.querySelector('.slide.on'); if (cur && idx && list[idx] && !list[idx].custom){ const html = list[idx].html(); if (html){ cur.innerHTML = html; animateIn(cur); } } });
  go(0);
  holdUntil = Date.now() + 25000;          // let the opening play first
  timer = setInterval(tick, DWELL);
  setInterval(() => {
    if (busy()){ if (idx !== 0){ go(0); } holdUntil = Math.max(holdUntil, Date.now() + 6000); if (want) want.until = Math.max(want.until, Date.now() + 25000); return; }
    if (want){
      if (Date.now() > want.until){ want = null; return; }
      if (!list[idx] || list[idx].id !== want.id){ const i = list.findIndex(s => s.id === want.id); if (i >= 0){ go(i); holdUntil = want.until; } else want = null; }
    }
  }, 400);
})();
