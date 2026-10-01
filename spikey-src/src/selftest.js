/* ===== On-device self-test: open Spikey with ?selftest=1 and it runs real commands end to end, then shows PASS/FAIL ===== */
(() => {
  const Q = new URLSearchParams(location.search);
  if (!Q.get('selftest') || Q.get('screen') === 'side') return;
  // run once per manual launch only: never again after a self-update reload, and drop the flag from the address
  let silent = false; try{ silent = sessionStorage.getItem('spikey.silentReload') === '1'; }catch{}
  try{ Q.delete('selftest'); history.replaceState(null, '', location.pathname + (Q.toString() ? '?' + Q : '')); }catch{}
  if (silent) return;
  const $ = id => document.getElementById(id);
  const wait = ms => new Promise(r => setTimeout(r, ms));
  const reply = () => (($('reply') || {}).textContent || '').trim();
  const slide = () => (((document.querySelector('#slides .slide.on h2') || {}).innerText || 'logo').split('\n')[0]).trim().toUpperCase();
  const open = sel => !!document.querySelector(sel);
  const idle = async (max = 30000) => { const t0 = Date.now(); await wait(400); while (Date.now() - t0 < max && window.JV && (window.JV.mode === 'thinking' || window.JV.speaking)) await wait(250); await wait(500); };
  async function cmd(text, max){
    const box = $('cmd'); if (!box) throw new Error('no command box');
    box.value = text; box.dispatchEvent(new KeyboardEvent('keydown', {key:'Enter', bubbles:true}));
    await idle(max);
    if (window.JV_stop && window.JV && window.JV.speaking) window.JV_stop();   // keep the run moving
    return reply();
  }
  const TESTS = [
    ['status report', async () => { const r = await cmd('status report', 20000); return [/brain online/i.test(r) && /cole synced/i.test(r), r]; }],
    ['timer set + cancel', async () => { await cmd('set a 1 minute timer for selftest'); const set = window.JV_assist.items().some(i => i.label === 'selftest'); await cmd('cancel the selftest timer'); return [set && !window.JV_assist.items().some(i => i.label === 'selftest'), 'set=' + set]; }],
    ['open journal', async () => { await cmd('open my journal'); return [window.JV_journal.isOpen(), reply()]; }],
    ['close journal + open backtest (one sentence)', async () => { await cmd('close my journal and open the backtesting screen'); return [!window.JV_journal.isOpen() && open('#btPanel.open'), 'journal=' + window.JV_journal.isOpen() + ' backtest=' + open('#btPanel.open')]; }],
    ['minimize backtest', async () => { await cmd('minimize backtest'); return [!open('#btPanel.open'), reply()]; }],
    ['open finances slide', async () => { await cmd('open my finances'); await wait(900); return [slide() === 'MONEY', slide()]; }],
    ['close diet + open habits', async () => { await cmd('open my diet tracking'); await wait(900); const a = slide(); await cmd('close my diet tracking and open my habits'); await wait(900); return [a === 'FUEL' && slide() === 'HABITS', a + ' → ' + slide()]; }],
    ['close it', async () => { await cmd('close it'); await wait(900); return [slide() === 'LOGO', slide()]; }],
    ['capabilities screen', async () => { await cmd('what can you do'); const s = ($('capPanel') || {}).style; const ok = s && s.display === 'block'; await cmd('close it'); return [ok, 'shown=' + ok]; }],
    ['focus mode on/off', async () => { await cmd('focus mode'); const on = window.JV_assist.focused(); await cmd('focus off'); return [on && !window.JV_assist.focused(), 'on=' + on]; }],
    ['spotify: where is music', async () => { if (!(window.JV_spotify && window.JV_spotify.connected())) return [false, 'Spotify not connected']; const r = await cmd("where's the music playing", 20000); return [/spotify is/i.test(r), r]; }],
    ['spotify: music on this laptop', async () => {
      if (!(window.JV_spotify && window.JV_spotify.connected())) return [false, 'Spotify not connected'];
      let w = await window.JV_spotify.where();
      if (!new RegExp('on ' + window.JV_spotify.home() + '\\b', 'i').test(w)){ await cmd("I can't hear the music", 30000); await wait(2500); w = await window.JV_spotify.where(); }
      return [new RegExp('on ' + window.JV_spotify.home() + '\\b', 'i').test(w) || /not playing/i.test(w), w];
    }],
    ['brain answers (Claude)', async () => { const r = await cmd('quick math, what is 12 times 12', 30000); return [/144|one hundred forty.?four/i.test(r), r]; }],
    ['economic news (Claude + web)', async () => { const r = await cmd('any economic news today', 60000); return [/news|calendar|event|cpi|fomc|claims/i.test(r), r]; }],
    ['learned memory', async () => { const r = await cmd('what have you learned'); return [/learned|nothing yet/i.test(r), r]; }],
    ['agenda from Cole', async () => { await cmd('open my to do list'); await wait(900); return [slide() === 'AGENDA', slide()]; }]
  ];

  const panel = document.createElement('section');
  panel.style.cssText = 'position:fixed;left:14px;top:66px;z-index:60;width:min(640px,46vw);max-height:82vh;overflow:auto;background:#07060a;border:1px solid var(--a2);border-radius:12px;padding:12px 14px;font:13px/1.45 var(--f-mono);color:var(--txt)';
  panel.innerHTML = '<b style="color:var(--a2);letter-spacing:.2em">SPIKEY SELF-TEST</b><div id="stRows" style="margin-top:8px"></div>';
  async function runAll(){
    document.body.appendChild(panel);
    const rows = panel.querySelector('#stRows'), results = [];
    for (const [name, fn] of TESTS){
      const row = document.createElement('div'); row.style.cssText = 'padding:5px 0;border-bottom:1px solid rgba(255,255,255,.08)';
      row.innerHTML = `<span style="color:var(--mute)">… ${name}</span>`; rows.appendChild(row);
      let ok = false, info = '';
      try{ [ok, info] = await fn(); }catch(e){ ok = false; info = 'ERROR ' + (e.message || e); }
      results.push({name, ok, info: String(info).slice(0, 160)});
      row.innerHTML = `<b style="color:${ok ? 'var(--good)' : 'var(--red, #ff2d55)'}">${ok ? 'PASS' : 'FAIL'}</b> ${name}<div style="color:var(--mute);font-size:11.5px">${String(info).replace(/</g, '&lt;').slice(0, 160)}</div>`;
    }
    const pass = results.filter(r => r.ok).length;
    const sum = document.createElement('div'); sum.style.cssText = 'margin-top:10px;font:600 15px var(--f-display);color:' + (pass === results.length ? 'var(--good)' : 'var(--red, #ff2d55)');
    sum.textContent = `${pass}/${results.length} passed · ${new Date().toLocaleTimeString()}`; panel.appendChild(sum);
    try{ localStorage.setItem('spikey.selftest', JSON.stringify({at: Date.now(), pass, total: results.length, results})); }catch{}
    if (window.JV_coleSaveDoc) window.JV_coleSaveDoc('spikey/selftest', {at: Date.now(), pass, total: results.length, results}).catch(() => {});
    if (window.JV_say) window.JV_say(pass === results.length ? `Self test complete. All ${pass} checks passed.` : `Self test complete. ${pass} of ${results.length} passed.`);
  }
  // wait for boot + Cole, skip the long opening briefing
  (async () => {
    await wait(9000);
    if (window.JV_stop && window.JV && window.JV.speaking) window.JV_stop();
    try{ await Promise.race([window.JV_coleReady, wait(8000)]); }catch{}
    await wait(1500);
    runAll();
  })();
})();
