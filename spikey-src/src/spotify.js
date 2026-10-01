/* ===== Spotify (Premium): log in once, then Spikey can search + play anything on your Spotify app ===== */
(() => {
  if (new URLSearchParams(location.search).get('screen') === 'side') return;
  const LS = k => 'spikey.spotify.' + k;
  const get = k => { try{ return localStorage.getItem(LS(k)) || ''; }catch{ return ''; } };
  const put = (k, v) => { try{ v ? localStorage.setItem(LS(k), v) : localStorage.removeItem(LS(k)); }catch{} };
  const REDIRECT = location.origin + location.pathname;          // e.g. https://nick1400-ux.github.io/cole/spikey/
  const SCOPES = 'user-read-playback-state user-modify-playback-state user-read-currently-playing';
  const $ = id => document.getElementById(id);
  const sleep = ms => new Promise(r => setTimeout(r, ms));

  const b64url = buf => btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
  async function login(){
    const cid = get('clientId'); if (!cid) throw new Error('no-client-id');
    const verifier = b64url(crypto.getRandomValues(new Uint8Array(48)));
    const challenge = b64url(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier)));
    put('verifier', verifier);
    location.href = 'https://accounts.spotify.com/authorize?' + new URLSearchParams({client_id:cid, response_type:'code', redirect_uri:REDIRECT, scope:SCOPES, code_challenge_method:'S256', code_challenge:challenge});
  }
  async function tokenRequest(params){
    const r = await fetch('https://accounts.spotify.com/api/token', {method:'POST', headers:{'Content-Type':'application/x-www-form-urlencoded'}, body:new URLSearchParams({client_id:get('clientId'), ...params})});
    if (!r.ok) throw new Error('token ' + r.status);
    const j = await r.json();
    put('access', j.access_token); put('expires', String(Date.now() + (j.expires_in - 60) * 1000));
    if (j.refresh_token) put('refresh', j.refresh_token);
  }
  // back from Spotify's login page with ?code=
  async function finishLogin(){
    const q = new URLSearchParams(location.search), code = q.get('code');
    if (!code || !get('verifier')) return;
    try{ await tokenRequest({grant_type:'authorization_code', code, redirect_uri:REDIRECT, code_verifier:get('verifier')}); }
    catch(e){ console.warn('spotify login failed', e); }
    put('verifier', '');
    history.replaceState(null, '', location.pathname);
  }
  // one refresh at a time: Spotify rotates the refresh token, so two refreshes racing each other
  // (the now-playing poll + a voice command) used to knock the login out
  let refreshing = null;
  function refresh(){
    if (!refreshing) refreshing = (async () => {
      for (let i = 0; i < 3; i++){
        try{ await tokenRequest({grant_type:'refresh_token', refresh_token:get('refresh')}); return get('access'); }
        catch(e){ if (/token 400/.test(e.message)) break; await sleep(800 * (i + 1)); }   // 400 = refresh token dead; others are network blips
      }
      return null;
    })().finally(() => { setTimeout(() => refreshing = null, 0); });
    return refreshing;
  }
  async function token(force){
    if (!get('refresh') && !get('access')) return null;
    if (!force && Date.now() < +get('expires')) return get('access');
    if (!get('refresh')) return null;
    return refresh();
  }
  async function api(path, opts = {}, attempt = 0){
    const t = await token(); if (!t) throw Object.assign(new Error('The Spotify login expired. Say "reconnect Spotify" or reconnect it in Setup.'), {status:401, raw:'no token'});
    let r;
    try{ r = await fetch('https://api.spotify.com/v1' + path, {...opts, headers:{Authorization:'Bearer ' + t, 'Content-Type':'application/json', ...(opts.headers || {})}}); }
    catch(e){                                                      // network blip / Spotify hiccup: try again
      if (attempt < 2){ await sleep(700 * (attempt + 1)); return api(path, opts, attempt + 1); }
      put('lastError', new Date().toLocaleTimeString() + ' · network ' + (e.message || e) + ' [' + path.split('?')[0] + ']');
      throw Object.assign(new Error("I couldn't reach Spotify. Check the internet connection."), {raw:'network'});
    }
    if (r.status === 401 && attempt < 1){ await token(true); return api(path, opts, attempt + 1); }      // token went stale early
    if ((r.status === 429 || r.status >= 500) && attempt < 2){ await sleep(+(r.headers.get('Retry-After') || 1) * 1000); return api(path, opts, attempt + 1); }
    if (r.status === 204 || r.status === 202) return null;
    const txt = await r.text(); let j = null;
    try{ j = txt ? JSON.parse(txt) : null; }catch{ j = null; }    // Spotify sometimes answers player commands with non-JSON text
    if (!r.ok){
      const reason = (j && j.error && j.error.reason) || '', msg = (j && j.error && j.error.message) || '';
      const err = new Error(explain(r.status, reason, msg)); err.status = r.status; err.raw = `${r.status} ${reason} ${msg} [${(opts.method || 'GET')} ${path.split('?')[0]}]`;
      put('lastError', new Date().toLocaleTimeString() + ' · ' + err.raw);
      throw err;
    }
    return j;
  }
  // plain-English version of Spotify's error, with the fix
  function explain(status, reason, msg){
    const m = (reason + ' ' + msg).toLowerCase();
    if (/premium/.test(m)) return 'Spotify says this account is not Premium. Spikey is logged into a Spotify account without Premium; disconnect in Setup and log in with your Premium account.';
    if (/not be registered|user may not|developer\.spotify/.test(m)) return 'Spotify blocked it because your account is not added to the Spikey app. On developer.spotify.com, open your app, User Management, and add the email of your Spotify account.';
    if (/restriction|no active device|not found/.test(m) || status === 404) return 'Spotify has no active player. Open the Spotify app, play anything for a second, then ask again.';
    if (status === 401) return 'The Spotify login expired. Reconnect Spotify in Setup.';
    if (status === 403) return 'Spotify refused: ' + (msg || reason || 'forbidden') + '.';
    return 'Spotify error ' + status + ': ' + (msg || reason);
  }
  // Spikey lives on the laptop, so music goes to THIS computer's Spotify app (not a phone/TV that happens
  // to be "active"), unless Nick asks for another device by name
  let lastDevice = null, preferName = get('preferDevice');
  // this laptop's name as Spotify shows it (Windows computer name). Another PC on the account
  // (e.g. DESKTOP-…) is NOT here, so music sent there is silent for Nick.
  const HOME = (new URLSearchParams(location.search).get('pc') || get('homeDevice') || 'NICK').toLowerCase();
  const isHome = x => x && x.type === 'Computer' && x.name.toLowerCase() === HOME;
  async function device(opts = {}){
    let {devices} = await api('/me/player/devices');
    const pick = list => (preferName && list.find(x => x.name.toLowerCase().includes(preferName.toLowerCase()))) || list.find(isHome) || null;
    if (opts.control){                                    // pause/skip/volume act on whatever is playing right now
      const d0 = devices.find(x => x.is_active) || devices.find(isHome) || devices[0] || null; lastDevice = d0; return d0;
    }
    let d = pick(devices);
    if (!d){
      location.href = 'spotify:';                         // open the Spotify desktop app, then wait for it to show up
      for (let i = 0; i < 10 && !d; i++){ await sleep(1500); ({devices} = await api('/me/player/devices')); d = pick(devices); }
    }
    if (!d) d = devices.find(x => x.type === 'Computer' && x.is_active) || devices.find(x => x.is_active) || devices[0] || null;   // last resort
    // music is going somewhere else (phone, TV, web player): move it here
    const active = devices.find(x => x.is_active);
    if (d && active && active.id !== d.id && opts.transfer !== false){
      try{ await api('/me/player', {method:'PUT', body:JSON.stringify({device_ids:[d.id], play:true})}); await sleep(600); }catch{}
    }
    lastDevice = d;
    return d || null;
  }

  // public API used by Spikey's brain + quick commands
  window.JV_spotify = {
    connected: () => !!(get('refresh') || get('access')),
    hasClientId: () => !!get('clientId'),
    setClientId: v => put('clientId', (v || '').trim()),
    login, redirect: REDIRECT,
    disconnect(){ ['access','refresh','expires'].forEach(k => put(k, '')); },
    async play(query, type = 'track'){
      type = ['track','artist','album','playlist'].includes(type) ? type : 'track';
      const res = await api('/search?' + new URLSearchParams({q:query, type, limit:'10'}));
      const items = ((res && res[type + 's'] && res[type + 's'].items) || []).filter(Boolean);
      // pick the result that actually matches what was said (Spotify's first hit is often a related artist)
      const norm = x => String(x || '').toLowerCase().replace(/[^a-z0-9 ]/g, '').replace(/\s+/g, ' ').trim();
      const q = norm(query);
      const score = it => {
        const name = norm(it.name), artists = (it.artists || []).map(a => norm(a.name));
        let sc = 0;
        if (name === q) sc += 10;
        else if (name && q.includes(name)) sc += 6;
        else if (name && name.includes(q)) sc += 4;
        artists.forEach(a => { if (a && q.includes(a)) sc += 4; });
        return sc + (it.popularity || 0) / 100;
      };
      const item = items.slice().sort((a, b) => score(b) - score(a))[0];
      if (!item) return {ok:false, message:`Couldn't find ${query} on Spotify.`};
      const d = await device();
      if (!d) return {ok:false, message:'Spotify isn’t open on any device. Open the Spotify app and try again.'};
      const body = type === 'track' ? {uris:[item.uri]} : {context_uri:item.uri};
      await api('/me/player/play?device_id=' + encodeURIComponent(d.id), {method:'PUT', body:JSON.stringify(body)});
      const who = item.artists ? ' by ' + item.artists.map(a => a.name).join(', ') : (item.owner ? ' from ' + item.owner.display_name : '');
      setTimeout(nowPlaying, 1500);
      return {ok:true, message:`Playing ${item.name}${who}${d.type === 'Computer' ? '' : ' on ' + d.name}.`, device:d.name};
    },
    async control(action, value){
      const d = await device({control:true}); const q = d ? '?device_id=' + encodeURIComponent(d.id) : '';
      if (action === 'pause') await api('/me/player/pause' + q, {method:'PUT'});
      else if (action === 'resume' || action === 'play') await api('/me/player/play' + q, {method:'PUT'});
      else if (action === 'next') await api('/me/player/next' + q, {method:'POST'});
      else if (action === 'previous') await api('/me/player/previous' + q, {method:'POST'});
      else if (action === 'volume') await api('/me/player/volume?volume_percent=' + Math.max(0, Math.min(100, Math.round(+value || 50))) + (d ? '&device_id=' + encodeURIComponent(d.id) : ''), {method:'PUT'});
      else if (action === 'shuffle') await api('/me/player/shuffle?state=' + (value ? 'true' : 'false') + (d ? '&device_id=' + encodeURIComponent(d.id) : ''), {method:'PUT'});
      setTimeout(nowPlaying, 1200);
      return {ok:true};
    },
    lastError: () => get('lastError'),
    lastDevice: () => lastDevice && lastDevice.name,
    home: () => HOME,
    async ensureHome(){                                   // start Spotify on the laptop if it isn't running, then move music here
      let {devices} = await api('/me/player/devices'); let h = devices.find(isHome);
      if (!h){ location.href = 'spotify:'; for (let i = 0; i < 10 && !h; i++){ await sleep(1500); ({devices} = await api('/me/player/devices')); h = devices.find(isHome); } }
      if (!h) return "I couldn't get Spotify running on this laptop. Open the Spotify app here, then ask again.";
      put('preferDevice', ''); preferName = '';
      await api('/me/player', {method:'PUT', body:JSON.stringify({device_ids:[h.id], play:true})});
      setTimeout(nowPlaying, 1500);
      return 'Moved the music to this laptop.';
    },
    async devices(){ const {devices} = await api('/me/player/devices'); return devices.map(d => ({name:d.name, type:d.type, active:d.is_active, volume:d.volume_percent})); },
    async moveTo(name){
      const {devices} = await api('/me/player/devices');
      const want = String(name || '').toLowerCase();
      const d = /laptop|computer|pc|here|this/.test(want) && !/desktop/.test(want) ? (devices.find(isHome) || devices.find(x => x.type === 'Computer')) : devices.find(x => x.name.toLowerCase().includes(want) || x.type.toLowerCase() === want || (want.includes('phone') && x.type === 'Smartphone'));
      if (!d) return 'I don\'t see that device. Spotify sees: ' + (devices.map(x => x.name).join(', ') || 'nothing') + '.';
      put('preferDevice', isHome(d) ? '' : d.name); preferName = get('preferDevice');
      await api('/me/player', {method:'PUT', body:JSON.stringify({device_ids:[d.id], play:true})});
      setTimeout(nowPlaying, 1500);
      return 'Music is on ' + d.name + ' now.';
    },
    async where(){
      const {devices} = await api('/me/player/devices'); const a = devices.find(x => x.is_active);
      return a ? `Spotify is playing on ${a.name}${a.volume_percent != null ? ' at volume ' + a.volume_percent : ''}.` : 'Spotify is not playing on any device right now.';
    },
    async current(){
      const j = await api('/me/player');
      if (!j || !j.item) return null;
      return {device:j.device && j.device.name, dtype:j.device && j.device.type, vol:j.device && j.device.volume_percent, name:j.item.name, artist:(j.item.artists || []).map(a => a.name).join(', '), playing:j.is_playing, art:(j.item.album && j.item.album.images[1] || j.item.album.images[0] || {}).url};
    }
  };

  // now-playing card replaces the embed once you're connected
  async function nowPlaying(){
    const box = $('nowPlaying'); if (!box || !window.JV_spotify.connected()) return;
    let c = null; try{ c = await window.JV_spotify.current(); }catch{}
    const emb = $('spotifyMain'); if (emb) emb.style.display = 'none';
    box.style.display = 'flex';
    box.innerHTML = c
      ? `<img src="${c.art || ''}" alt=""><div class="np"><b>${c.name.replace(/</g,'&lt;')}</b><span>${c.artist.replace(/</g,'&lt;')}</span>${c.device ? `<span style="font-size:11px;color:${c.device.toLowerCase() === HOME ? 'var(--mute)' : 'var(--a)'}">🔊 ${c.device.replace(/</g,'&lt;')}${c.vol != null ? ' · ' + c.vol + '%' : ''}</span>` : ''}
         <div class="npc"><button data-sp="previous">⏮</button><button data-sp="${c.playing ? 'pause' : 'resume'}">${c.playing ? '⏸' : '▶'}</button><button data-sp="next">⏭</button></div></div>`
      : `<div class="np"><b>Spotify connected</b><span>Say “Spikey, play …”</span></div>`;
    box.querySelectorAll('[data-sp]').forEach(b => b.onclick = () => window.JV_spotify.control(b.dataset.sp).catch(() => {}));
  }
  window.JV_spotifyRefresh = nowPlaying;
  finishLogin().then(() => {
    nowPlaying(); setInterval(nowPlaying, 10000);
    const t = new URLSearchParams(location.search).get('sptest');
    if (t) setTimeout(async () => {
      const box = document.createElement('pre'); box.style.cssText = 'position:fixed;left:12px;top:60px;z-index:60;background:#000;color:#9dffb8;font:14px/1.4 Consolas,monospace;padding:12px;border:1px solid #3dff8f;max-width:640px;white-space:pre-wrap';
      document.body.appendChild(box);
      const show = x => { box.textContent += 'SPOTIFY TEST: ' + x + '\n'; };
      try{
        const {devices} = await api('/me/player/devices');
        show('devices: ' + (devices.map(d => d.name + '/' + d.type + (d.is_active ? '*' : '') + (d.is_restricted ? ' RESTRICTED' : '')).join(', ') || 'none') + ' … playing');
        const res = await window.JV_spotify.play(t, 'artist');
        show((res.ok ? 'OK ' : 'NO ') + res.message + ' · devices: ' + devices.map(d => d.name).join(', '));
      }catch(e){ show('FAILED ' + (e.raw || e.message)); }
    }, 12000);
  });
})();
