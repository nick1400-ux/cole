/* ===== Setup panel: Claude key, Spotify, Cole ===== */
(() => {
  if (new URLSearchParams(location.search).get('screen') === 'side') return;
  const $ = id => document.getElementById(id);
  const css = document.createElement('style');
  css.textContent = `
  #setupBtn{cursor:pointer;border:1px solid var(--line);padding:6px 10px;color:var(--txt)}
  #setupBtn:hover{border-color:var(--a)}
  #setupBtn.needs{color:#fff;background:var(--a);border-color:var(--a)}
  #setupPanel{background:var(--bg) !important;box-shadow:0 20px 80px rgba(0,0,0,.7);position:fixed;left:50%;top:50%;transform:translate(-50%,-50%);z-index:26;width:min(620px,94vw);max-height:90vh;overflow:auto;display:none}
  #setupPanel.show{display:block}
  #setupPanel section{border-top:1px solid var(--line);padding:14px 0}
  #setupPanel section:first-of-type{border-top:0}
  #setupPanel h4{font:600 11px var(--f-mono);letter-spacing:.24em;color:var(--a);margin-bottom:8px;display:flex;justify-content:space-between}
  #setupPanel h4 em{font-style:normal;color:var(--mute)} #setupPanel h4 em.ok{color:var(--good)}
  #setupPanel p{font-size:14px;line-height:1.45;color:var(--txt);margin-bottom:8px}
  #setupPanel ol{margin:0 0 8px 18px;font-size:13.5px;line-height:1.6}
  #setupPanel input{width:100%;background:rgba(255,255,255,.04);border:1px solid var(--line);color:var(--hi);font:400 13px var(--f-mono);padding:9px 11px;outline:none;margin-bottom:8px}
  #setupPanel input:focus{border-color:var(--a)}
  #setupPanel .btns{display:flex;gap:8px;flex-wrap:wrap}
  #setupPanel button{padding:8px 12px;font:600 10.5px var(--f-mono);letter-spacing:.18em;border:1px solid var(--line);background:transparent;color:var(--txt);cursor:pointer}
  #setupPanel button.go{background:var(--a);border-color:var(--a);color:#fff}
  #setupPanel code{font:400 12px var(--f-mono);color:var(--a2);word-break:break-all}
  #setupPanel .lrow{display:flex;gap:8px;align-items:center;justify-content:space-between;border:1px solid var(--line);padding:6px 8px;margin-bottom:6px;font-size:13px}
  #setupPanel .lrow button{padding:3px 8px}
  #nowPlaying{display:none;gap:12px;align-items:center;background:rgba(255,255,255,.03);border-radius:12px;padding:10px}
  #nowPlaying img{width:64px;height:64px;border-radius:6px;object-fit:cover;flex:none;background:#222}
  #nowPlaying .np{display:flex;flex-direction:column;gap:2px;min-width:0}
  #nowPlaying .np b{font-size:15px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;color:var(--hi)}
  #nowPlaying .np span{font-size:12.5px;color:var(--mute);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  #nowPlaying .npc{display:flex;gap:6px;margin-top:6px}
  #nowPlaying .npc button{background:transparent;border:1px solid var(--line);color:var(--hi);width:34px;height:28px;cursor:pointer;font-size:13px}
  #nowPlaying .npc button:hover{border-color:var(--a)}`;
  document.head.appendChild(css);

  // "SETUP" button in the top bar
  const btn = document.createElement('span');
  btn.id = 'setupBtn'; btn.className = 'chip'; btn.textContent = '⚙ SETUP';
  const top = document.querySelector('.top'); const state = $('stateLabel');
  if (top && state) top.insertBefore(btn, state);

  // now-playing card goes under the Spotify embed
  const emb = $('spotifyMain');
  if (emb && !$('nowPlaying')){ const np = document.createElement('div'); np.id = 'nowPlaying'; emb.after(np); }

  const panel = document.createElement('section');
  panel.id = 'setupPanel'; panel.className = 'panel';
  document.body.appendChild(panel);

  function draw(){
    const brain = window.JV_brain, sp = window.JV_spotify;
    const esc = t => String(t).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'})[c]);
    const learned = window.JV_learn ? window.JV_learn.list() : {rules:[], shortcuts:[]};
    const hasKey = brain && brain.hasKey(), spOn = sp && sp.connected(), coleOn = window.JV_coleSignedIn && window.JV_coleSignedIn();
    btn.classList.toggle('needs', !hasKey);
    panel.innerHTML = `
      <h3>Setup <em style="cursor:pointer" id="setupClose">CLOSE ✕</em></h3>
      <section>
        <h4>1 · Claude brain <em class="${hasKey ? 'ok' : ''}">${hasKey ? 'ON ✓' : 'OFF'}</em></h4>
        <p>Lets Spikey answer any question, search the web, and do things for you. Paste your key from <code>console.anthropic.com</code> → API keys. It's saved only in this window.</p>
        <input id="setKey" type="password" autocomplete="off" placeholder="${hasKey ? 'saved · paste a new one to replace' : 'sk-ant-…'}">
        <div class="btns"><button class="go" id="saveKey">SAVE KEY</button>${hasKey ? '<button id="delKey">REMOVE</button>' : ''}</div>
      </section>
      <section>
        <h4>2 · Spotify (Premium) <em class="${spOn ? 'ok' : ''}">${spOn ? 'CONNECTED ✓' : 'NOT CONNECTED'}</em></h4>
        ${spOn ? `<p>Say “Spikey, play …”, “pause”, “skip”.</p>${sp.lastError() ? `<p style="color:var(--mute);font-size:12px">Last Spotify error: <code>${esc(sp.lastError())}</code></p>` : ''}<div class="btns"><button id="spRe" class="go">RECONNECT</button><button id="spOut">DISCONNECT</button></div>` : `
        <ol>
          <li>Open <code>developer.spotify.com/dashboard</code> and log in → <b>Create app</b>.</li>
          <li>Any name and description. <b>Redirect URI</b>: <code id="spRedir">${sp ? sp.redirect : ''}</code> <button id="copyRedir" style="padding:3px 8px">COPY</button></li>
          <li>Tick <b>Web API</b>, save, then copy the app's <b>Client ID</b> here.</li>
        </ol>
        <input id="setSp" autocomplete="off" placeholder="${sp && sp.hasClientId() ? 'client ID saved' : 'Spotify Client ID'}">
        <div class="btns"><button class="go" id="spGo">CONNECT SPOTIFY</button></div>`}
      </section>
      <section>
        <h4>3 · Cole <em class="${coleOn ? 'ok' : ''}">${coleOn ? 'SIGNED IN ✓' : 'NOT SIGNED IN'}</em></h4>
        <p>${coleOn ? 'Spikey reads your trades and to-dos, and “log to Cole …” saves into the right sections.' : 'Sign in with your Cole email and password.'}</p>
        ${coleOn ? '' : '<div class="btns"><button class="go" id="coleGoSetup">SIGN IN TO COLE</button></div>'}
      </section>
      <section>
        <h4>4 · What Spikey has learned <em>${learned.rules.length + learned.shortcuts.length}</em></h4>
        <p>Correct Spikey or say “from now on …”, “next time …”, or “when I say X, do Y”. It remembers on every device through Cole.</p>
        ${[...learned.rules.map((r, i) => `<div class="lrow"><span>${esc(r.text)}</span><button data-k="rule" data-i="${i}">✕</button></div>`),
           ...learned.shortcuts.map((c, i) => `<div class="lrow"><span>“${esc(c.phrase)}” → ${esc(c.command)}</span><button data-k="shortcut" data-i="${i}">✕</button></div>`)].join('') || '<p style="color:var(--mute)">Nothing yet.</p>'}
      </section>`;
    panel.querySelectorAll('.lrow button').forEach(b => b.onclick = () => { window.JV_learn.removeAt(b.dataset.k, +b.dataset.i); draw(); });
    $('setupClose').onclick = () => panel.classList.remove('show');
    $('saveKey').onclick = () => { const v = $('setKey').value.trim(); if (v){ brain.setKey(v); draw(); } };
    if ($('delKey')) $('delKey').onclick = () => { brain.setKey(''); draw(); };
    if ($('spRe')) $('spRe').onclick = () => sp.login().catch(() => {});
    if ($('spOut')) $('spOut').onclick = () => { sp.disconnect(); draw(); location.reload(); };
    if ($('copyRedir')) $('copyRedir').onclick = () => navigator.clipboard.writeText(sp.redirect).then(() => $('copyRedir').textContent = 'COPIED');
    if ($('spGo')) $('spGo').onclick = () => { const v = $('setSp').value.trim(); if (v) sp.setClientId(v); if (!sp.hasClientId()) return; sp.login(); };
    if ($('coleGoSetup')) $('coleGoSetup').onclick = () => { panel.classList.remove('show'); const s = $('coleState'); if (s) s.click(); };
    panel.querySelectorAll('input').forEach(i => i.addEventListener('keydown', e => e.stopPropagation()));
   // typing here isn't push-to-talk
  }
  btn.onclick = () => { draw(); panel.classList.add('show'); };
  window.addEventListener('spikey-learned', () => { if (panel.classList.contains('show')) draw(); });
  setTimeout(draw, 1500);
  // first run: open setup automatically if the brain has no key
  setTimeout(() => { if (window.JV_brain && !window.JV_brain.hasKey()){ draw(); panel.classList.add('show'); } }, 9000);
})();
