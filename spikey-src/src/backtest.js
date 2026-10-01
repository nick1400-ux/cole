/* ===== Backtest mode: a backtesting window on its own screen + a live session Spikey keeps score of ===== */
(() => {
  if (new URLSearchParams(location.search).get('screen') === 'side') return;
  const LS = 'spikey.backtest.';
  const get = (k, d) => { try{ const v = localStorage.getItem(LS + k); return v == null ? d : JSON.parse(v); }catch{ return d; } };
  const put = (k, v) => { try{ localStorage.setItem(LS + k, JSON.stringify(v)); }catch{} };
  const $ = id => document.getElementById(id);
  const pad = n => String(n).padStart(2, '0');
  const keyOf = d => `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;

  const DEFAULTS = {
    tvUrl: 'https://www.tradingview.com/chart/?symbol=CBOT_MINI%3AMYM1%21',   // MYM; use Bar Replay on this chart
    dasUrl: '',                                                                  // second backtest tool (DAS replay)
    screen: null,                                                                // {label,left,top,width,height}
    openOnDock: true,
    breakEvery: 50                                                               // minutes between break reminders
  };
  const cfg = () => Object.assign({}, DEFAULTS, get('cfg', {}));
  const saveCfg = c => put('cfg', Object.assign(cfg(), c));

  // ---------- start: no window, your backtest lives on your other screen; Spikey just monitors it ----------
  function openWindow(){
    const was = !!session();
    if (!was) start();
    show(true);
    return {ok:true, message: was ? 'Your backtest session is already running.' : 'Backtest panel is up. Log your trades as you go and I will keep score.'};
  }

  // ---------- the session ----------
  const session = () => get('session', null);
  function start(){
    const s = {started: Date.now(), trades: [], lastBreak: Date.now()};
    put('session', s); render(); return s;
  }
  function stats(s = session()){
    if (!s) return null;
    const t = s.trades, n = t.length;
    const wins = t.filter(x => x.r > 0).length, losses = t.filter(x => x.r < 0).length;
    const totalR = t.reduce((a, x) => a + x.r, 0);
    const winR = t.filter(x => x.r > 0).reduce((a, x) => a + x.r, 0), lossR = -t.filter(x => x.r < 0).reduce((a, x) => a + x.r, 0);
    let streak = 0, best = 0; t.forEach(x => { streak = x.r > 0 ? streak + 1 : 0; best = Math.max(best, streak); });
    const mins = Math.max(1, (Date.now() - s.started) / 60000);
    return {n, wins, losses, be:n - wins - losses, winRate: n ? Math.round(100 * wins / n) : 0, totalR, avgR: n ? totalR / n : 0,
      pf: lossR ? winR / lossR : (winR ? Infinity : 0), bestStreak: best, mins, perHour: n / (mins / 60),
      longs: t.filter(x => x.dir === 'long').length, shorts: t.filter(x => x.dir === 'short').length};
  }
  function logTrade({dir, outcome, r, note}){
    let s = session() || start();
    let R = (r != null && r !== '' && !isNaN(+r)) ? Math.abs(+r) : null;
    const o = String(outcome || '').toLowerCase();
    let val;
    if (/^(be|breakeven|break even|scratch)/.test(o)) val = 0;
    else if (/^(loss|lose|lost|stop|stopped)/.test(o)) val = -(R == null ? 1 : R);
    else val = (R == null ? 1 : R);
    s.trades.push({dir: /short|sell/.test(String(dir)) ? 'short' : /long|buy/.test(String(dir)) ? 'long' : '', r: val, note: note || '', at: Date.now()});
    put('session', s); render(); persist();
    const st = stats(s);
    const fmtR = v => (v > 0 ? '+' : '') + (+v.toFixed(2)) + ' R';
    return `Logged ${val > 0 ? 'a win' : val < 0 ? 'a loss' : 'a breakeven'}, ${fmtR(val)}. ${st.n} trade${st.n === 1 ? '' : 's'}, ${st.winRate} percent wins, ${fmtR(st.totalR)} total.`;
  }
  function undo(){ const s = session(); if (!s || !s.trades.length) return 'Nothing to undo.'; s.trades.pop(); put('session', s); render(); persist(); return 'Removed the last backtest trade.'; }
  function end(){
    const s = session(); if (!s) return 'No backtest session is running.';
    const st = stats(s);
    const hist = get('history', []); hist.push({...s, ended: Date.now()}); put('history', hist.slice(-60));
    put('session', null); persist(s); shown = false; render();
    const m = Math.round(st.mins);
    return st.n ? `Session ended. ${st.n} trade${st.n === 1 ? '' : 's'} in ${m} minute${m === 1 ? '' : 's'}, ${st.winRate} percent wins, ${(st.totalR >= 0 ? 'plus ' : 'minus ') + Math.abs(+st.totalR.toFixed(2))} R, profit factor ${isFinite(st.pf) ? st.pf.toFixed(2) : 'perfect'}.` : 'Session ended. No trades logged.';
  }
  function summary(){
    const st = stats();
    if (!st) return 'No backtest running. Say open backtesting to start one.';
    const m = Math.round(st.mins), mm = m + ' minute' + (m === 1 ? '' : 's');
    if (!st.n) return `Backtesting for ${mm}, no trades logged yet.`;
    return `${mm} in. ${st.n} trade${st.n === 1 ? '' : 's'}, ${st.winRate} percent wins, average ${st.avgR.toFixed(2)} R, ${(st.totalR >= 0 ? 'plus ' : 'minus ') + Math.abs(+st.totalR.toFixed(2))} R total, profit factor ${isFinite(st.pf) ? st.pf.toFixed(2) : 'perfect'}.`;
  }
  // save sessions into Cole too (so they're on the phone and survive a new browser)
  async function persist(s = session()){
    if (!s || !window.JV_coleSaveDoc) return;
    try{ await window.JV_coleSaveDoc('backtest/' + keyOf(new Date(s.started)) + '-' + s.started, {...s, stats: stats(s)}); }catch{}
  }

  // ---------- break reminders ----------
  setInterval(() => {
    const s = session(); if (!s) return;
    const every = (cfg().breakEvery || 50) * 60000;
    if (Date.now() - (s.lastBreak || s.started) > every){
      s.lastBreak = Date.now(); put('session', s);
      if (window.JV_say) window.JV_say(`You've been backtesting ${Math.round((Date.now() - s.started) / 60000)} minutes. Take five, stand up, then get back to it.`);
    }
  }, 30000);

  // ---------- on-screen badge + slide ----------
  const css = document.createElement('style');
  css.textContent = `
  #btBadge{display:none;cursor:pointer;border:1px solid var(--a2);color:var(--a2);padding:6px 10px}
  #btBadge.on{display:inline-flex}
  .bt-kpis{display:grid;grid-template-columns:repeat(4,1fr);gap:12px}
  .bt-kpis div{border:1px solid var(--line);border-radius:10px;padding:12px}
  .bt-kpis .k{font:500 10px var(--f-mono);letter-spacing:.24em;color:var(--mute);text-transform:uppercase}
  .bt-kpis b{display:block;font:500 clamp(24px,2.2vw,36px) var(--f-display);color:var(--hi);margin-top:4px}
  .bt-kpis b.up{color:var(--good)} .bt-kpis b.down{color:var(--red)}
  .bt-curve{width:100%;height:140px;display:block;margin-top:8px}
  .bt-row{display:flex;gap:6px;flex-wrap:wrap;margin-top:8px}
  .bt-row i{font-style:normal;font:500 11px var(--f-mono);padding:4px 7px;border-radius:5px;background:rgba(255,255,255,.06);color:var(--mute)}
  .bt-row i.w{background:rgba(61,255,143,.18);color:var(--good)} .bt-row i.l{background:rgba(255,34,51,.22);color:#ff8a95}
  #btPanel{position:fixed;inset:66px 14px 66px 14px;z-index:18;display:grid;grid-template-columns:1.45fr 1fr;grid-template-rows:auto auto 1fr auto;gap:12px;
    background:linear-gradient(160deg,#1a0a10,#08070c);border:1px solid var(--a2);border-radius:14px;padding:16px 18px;
    box-shadow:0 0 60px rgba(181,123,255,.18);opacity:0;transform:scale(.96) translateY(14px);pointer-events:none;transition:opacity .45s,transform .6s cubic-bezier(.2,.9,.2,1)}
  #btPanel.open{opacity:1;transform:none;pointer-events:auto}
  #btPanel .hd{grid-column:1/-1;display:flex;align-items:center;gap:14px}
  #btPanel .hd h2{font:600 13px var(--f-mono);letter-spacing:.34em;color:var(--a2)}
  #btPanel .hd .tm{font:500 26px var(--f-display);color:var(--hi);letter-spacing:-.02em}
  #btPanel .hd .sp{flex:1}
  #btPanel .kp{grid-column:1/-1;display:grid;grid-template-columns:repeat(6,1fr);gap:10px}
  #btPanel .kp div{background:rgba(255,255,255,.035);border:1px solid var(--line);border-radius:10px;padding:10px 12px}
  #btPanel .kp span{display:block;font:500 9.5px var(--f-mono);letter-spacing:.2em;color:var(--mute)}
  #btPanel .kp b{font:500 clamp(22px,2.2vw,34px) var(--f-display);color:var(--hi)} #btPanel .kp b.up{color:var(--good)} #btPanel .kp b.down{color:var(--red)}
  #btPanel .cv{background:rgba(255,255,255,.025);border:1px solid var(--line);border-radius:10px;padding:10px 12px;min-height:0;display:flex;flex-direction:column}
  #btPanel .cv .bt-curve{flex:1;height:auto;min-height:120px}
  #btPanel .lst{grid-row:3/5;grid-column:2;background:rgba(255,255,255,.025);border:1px solid var(--line);border-radius:10px;padding:10px 12px;overflow:auto;min-height:0}
  #btPanel table{width:100%;border-collapse:collapse;font:400 13px var(--f-mono)}
  #btPanel th{font:500 9.5px var(--f-mono);letter-spacing:.18em;color:var(--mute);text-align:left;padding:4px 6px;border-bottom:1px solid var(--line);position:sticky;top:0;background:#120a10}
  #btPanel td{padding:6px;border-bottom:1px solid rgba(255,255,255,.05);color:var(--txt)} #btPanel td.w{color:var(--good)} #btPanel td.l{color:#ff8a95}
  #btPanel .ctl{display:flex;flex-direction:column;gap:8px}
  #btPanel .row{display:flex;gap:8px;align-items:stretch}
  #btPanel button{font:600 12px var(--f-mono);letter-spacing:.12em;padding:12px 10px;border:1px solid var(--line);background:rgba(255,255,255,.04);color:var(--txt);cursor:pointer;border-radius:8px;flex:1}
  #btPanel button:hover{border-color:var(--a2)}
  #btPanel button.win{color:var(--good);border-color:rgba(61,255,143,.4)} #btPanel button.loss{color:#ff8a95;border-color:rgba(255,34,51,.45)}
  #btPanel .dir{display:flex;gap:6px;flex:none} #btPanel .dir button{flex:none;width:86px} #btPanel .dir button.on{background:var(--a2);color:#000;border-color:var(--a2)}
  #btPanel input{flex:1;background:rgba(255,255,255,.04);border:1px solid var(--line);color:var(--hi);font:400 13px var(--f-mono);padding:10px;border-radius:8px;outline:none}
  #btPanel .hint{font:400 11.5px var(--f-mono);color:var(--mute)}
  #btPanel .x{flex:none;padding:8px 12px}
  #btBadge{cursor:pointer}`;
  document.head.appendChild(css);
  const badge = document.createElement('span'); badge.id = 'btBadge'; badge.className = 'chip';
  const top = document.querySelector('.top'), state = $('stateLabel');
  if (top && state) top.insertBefore(badge, state);
  badge.onclick = () => show(!shown);
  // ---------- the Backtest panel (right column, slides in during a session) ----------
  const panel = document.createElement('section'); panel.id = 'btPanel';
  document.body.appendChild(panel);
  let dirSel = 'long', shown = false;
  const show = v => { shown = v; if (v) window.dispatchEvent(new CustomEvent('spikey-screen', {detail:'backtest'})); drawPanel(); };
  window.addEventListener('spikey-screen', e => { if (e.detail !== 'backtest' && shown){ shown = false; drawPanel(); } });
  function drawPanel(){
    const s = session(), st = stats(s);
    const on = !!s && shown;
    panel.classList.toggle('open', on);
    if (!s){ panel.innerHTML = ''; return; }
    if (!on) return;
    const mins = Math.round(st.mins), cls = v => v > 0 ? 'up' : v < 0 ? 'down' : '';
    let acc = 0; const rows = s.trades.map((t, i) => { acc += t.r; return {i:i + 1, t, acc}; }).reverse();
    const keepNote = (panel.querySelector('#btNote') || {}).value || '';
    panel.innerHTML = `
      <div class="hd"><h2>BACKTEST</h2><span class="tm">${Math.floor(mins / 60) ? Math.floor(mins / 60) + 'h ' : ''}${mins % 60}m</span>
        <span class="hint">${st.mins >= 10 ? st.perHour.toFixed(1) + ' trades/hr · ' : ''}${st.longs}L / ${st.shorts}S · best streak ${st.bestStreak}</span><span class="sp"></span>
        <button class="x" id="btMin">MINIMIZE</button><button class="x loss" id="btEnd">END SESSION</button></div>
      <div class="kp"><div><span>TRADES</span><b>${st.n}</b></div><div><span>WIN RATE</span><b>${st.winRate}%</b></div>
        <div><span>TOTAL R</span><b class="${cls(st.totalR)}">${(st.totalR >= 0 ? '+' : '') + st.totalR.toFixed(2)}</b></div>
        <div><span>AVG R</span><b class="${cls(st.avgR)}">${(st.avgR >= 0 ? '+' : '') + st.avgR.toFixed(2)}</b></div>
        <div><span>PROFIT FACTOR</span><b>${st.n ? (isFinite(st.pf) ? st.pf.toFixed(2) : '∞') : '—'}</b></div>
        <div><span>W / L / BE</span><b>${st.wins}/${st.losses}/${st.be}</b></div></div>
      <div class="cv"><span class="hint">EQUITY CURVE (R)</span>${curve(s.trades)}</div>
      <div class="lst"><table><thead><tr><th>#</th><th>SIDE</th><th>RESULT</th><th>TOTAL</th><th>NOTE</th></tr></thead><tbody>
        ${rows.length ? rows.map(x => `<tr><td>${x.i}</td><td>${x.t.dir ? x.t.dir.toUpperCase() : '—'}</td><td class="${x.t.r > 0 ? 'w' : x.t.r < 0 ? 'l' : ''}">${(x.t.r > 0 ? '+' : '') + x.t.r}R</td><td>${(x.acc >= 0 ? '+' : '') + (+x.acc.toFixed(2))}R</td><td>${String(x.t.note || '').replace(/</g, '&lt;')}</td></tr>`).join('') : '<tr><td colspan="5" style="color:var(--mute);padding:14px 6px">No trades yet. Say “long win 2R”, or use the buttons.</td></tr>'}
      </tbody></table></div>
      <div class="ctl">
        <div class="row"><div class="dir"><button data-d="long" class="${dirSel === 'long' ? 'on' : ''}">LONG</button><button data-d="short" class="${dirSel === 'short' ? 'on' : ''}">SHORT</button></div>
          <input id="btNote" placeholder="note (optional): setup, reason, mistake…" value="${keepNote.replace(/"/g, '&quot;')}"></div>
        <div class="row"><button class="win" data-w="1">WIN +1R</button><button class="win" data-w="1.5">WIN +1.5R</button><button class="win" data-w="2">WIN +2R</button><button class="win" data-w="3">WIN +3R</button></div>
        <div class="row"><button class="loss" data-o="loss">LOSS −1R</button><button data-o="be">BREAKEVEN</button><button data-o="undo">UNDO LAST</button></div>
        <div class="hint">Voice works too: “long win 2R” · “short loss” · “breakeven” · “undo” · “how's my backtest” · “minimize backtest”</div>
      </div>`;
    const note = () => { const n = panel.querySelector('#btNote'); const v = n ? n.value.trim() : ''; if (n) n.value = ''; return v; };
    panel.querySelectorAll('[data-d]').forEach(b => b.onclick = () => { dirSel = b.dataset.d; drawPanel(); });
    panel.querySelectorAll('[data-w]').forEach(b => b.onclick = () => logTrade({dir:dirSel, outcome:'win', r:+b.dataset.w, note:note()}));
    panel.querySelectorAll('[data-o]').forEach(b => b.onclick = () => b.dataset.o === 'undo' ? undo() : logTrade({dir:dirSel, outcome:b.dataset.o === 'be' ? 'breakeven' : 'loss', r:1, note:note()}));
    const ni = panel.querySelector('#btNote'); if (ni) ni.addEventListener('keydown', e => e.stopPropagation());
    panel.querySelector('#btMin').onclick = () => show(false);
    panel.querySelector('#btEnd').onclick = () => { const m = end(); if (window.JV_say) window.JV_say(m); };
  }
  function render(){
    const st = stats();
    drawPanel();
    badge.classList.toggle('on', !!st);
    if (st) badge.textContent = `BACKTEST ${Math.floor(st.mins / 60) ? Math.floor(st.mins / 60) + 'h ' : ''}${Math.round(st.mins % 60)}m · ${st.n} · ${(st.totalR >= 0 ? '+' : '') + st.totalR.toFixed(1)}R`;
    window.dispatchEvent(new Event('backtest-update'));
  }
  setInterval(render, 30000); render();

  function curve(t){
    if (!t.length) return '<div style="color:var(--mute);margin-top:30px;text-align:center">Log trades by voice: “Spikey, backtest long win 2R”</div>';
    let acc = 0; const pts = [0, ...t.map(x => acc += x.r)];
    const mn = Math.min(0, ...pts), mx = Math.max(0.5, ...pts), W = 600, H = 140, sx = W / Math.max(1, pts.length - 1);
    const y = v => H - 8 - (v - mn) / (mx - mn || 1) * (H - 16);
    const path = pts.map((v, i) => (i ? 'L' : 'M') + (i * sx).toFixed(1) + ' ' + y(v).toFixed(1)).join(' ');
    return `<svg class="bt-curve" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none"><line x1="0" x2="${W}" y1="${y(0)}" y2="${y(0)}" stroke="rgba(255,255,255,.15)" stroke-dasharray="4 6"/>
      <path d="${path}" fill="none" stroke="${acc >= 0 ? 'var(--good)' : 'var(--red)'}" stroke-width="3" stroke-linejoin="round" style="filter:drop-shadow(0 0 6px ${acc >= 0 ? 'rgba(61,255,143,.5)' : 'rgba(255,34,51,.5)'})"/></svg>`;
  }
  window.JV_backtestSlide = () => {
    const s = session(), st = stats(s);
    const hist = get('history', []).slice(-5).reverse();
    if (!s) return `<h2>BACKTEST <em>no session running</em></h2><div class="sgrid">
      <div class="scard"><div class="k">Start</div><div class="big" style="font-size:28px;margin-top:10px">“Spikey, start backtesting”</div><p style="color:var(--mute);margin-top:10px;line-height:1.5">Starts the session timer and keeps this panel up while you backtest on your other screen. Log each trade by voice: “backtest long win 2R”, “backtest short loss”, “undo backtest”.</p></div>
      <div class="scard"><div class="k">Recent sessions</div><ul class="slist" style="margin-top:8px">${hist.length ? hist.map(h => { const x = stats(h); return `<li><span>${new Date(h.started).toLocaleDateString([], {weekday:'short', month:'short', day:'numeric'})} · ${x.n} trades</span><span>${x.winRate}% · ${(x.totalR >= 0 ? '+' : '') + x.totalR.toFixed(1)}R</span></li>`; }).join('') : '<li class="none">No sessions yet</li>'}</ul></div></div>`;
    const cls = v => v > 0 ? 'up' : v < 0 ? 'down' : '';
    return `<h2>BACKTEST <em>${Math.floor(st.mins / 60) ? Math.floor(st.mins / 60) + 'h ' : ''}${Math.round(st.mins % 60)}m${st.mins >= 10 ? ' · ' + st.perHour.toFixed(1) + ' trades/hr' : ''}</em></h2>
      <div class="bt-kpis"><div><span class="k">Trades</span><b>${st.n}</b></div><div><span class="k">Win rate</span><b>${st.winRate}%</b></div>
        <div><span class="k">Total R</span><b class="${cls(st.totalR)}">${(st.totalR >= 0 ? '+' : '') + st.totalR.toFixed(2)}</b></div><div><span class="k">Profit factor</span><b>${isFinite(st.pf) ? st.pf.toFixed(2) : '∞'}</b></div></div>
      <div class="scard" style="flex:1"><div class="k">Equity curve (R) · avg ${st.avgR.toFixed(2)}R · best streak ${st.bestStreak} · ${st.longs}L / ${st.shorts}S</div>${curve(s.trades)}
        <div class="bt-row">${s.trades.slice(-24).map(t => `<i class="${t.r > 0 ? 'w' : t.r < 0 ? 'l' : ''}">${t.dir ? t.dir[0].toUpperCase() : '·'} ${(t.r > 0 ? '+' : '') + t.r}R</i>`).join('')}</div></div>`;
  };

  // ---------- screen picker for Setup ----------
  async function screens(){
    if (!('getScreenDetails' in window)) return null;
    const d = await window.getScreenDetails();
    return d.screens.map(s => ({label:(s.isInternal ? 'Laptop' : (s.label || 'Screen')), left:s.availLeft, top:s.availTop, width:s.availWidth, height:s.availHeight, internal:s.isInternal, current:s === d.currentScreen}));
  }

  window.JV_backtest = {show, hide:() => show(false), open:openWindow, start, end, logTrade, undo, summary, stats, cfg, saveCfg, screens, active:() => !!session()};

})();
