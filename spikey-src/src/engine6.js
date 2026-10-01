/* ===== JARVIS ENGINE v2 — shared by every look ===== */
(() => {
  const CONFIG = {
    name: 'Nick',
    address: 'sir',
    lat: 25.7617, lon: -80.1918, city: 'Miami',
    sites: {
      youtube:'https://www.youtube.com', gmail:'https://mail.google.com', email:'https://mail.google.com',
      calendar:'https://calendar.google.com', tradingview:'https://www.tradingview.com/chart/',
      'trading view':'https://www.tradingview.com/chart/', spotify:'spotify:',
      claude:'https://claude.ai', instagram:'https://www.instagram.com', github:'https://github.com',
      maps:'https://maps.google.com', news:'https://news.google.com'
    }
  };
  // Speech recognition often mishears "Jarvis". Accept the common mishearings.
  const NAME = 'Spikey';
  // Speech recognition mishears "Spikey" a lot; accept the common versions (plus "Jarvis" as a backup).
  const WAKE = /\b(?:hey |ok |okay |yo )?(spikey|spiky|spikie|spikee|spikey'?s|spiky'?s|spike[ -]?(?:y|ee|e|he|key)|spy ?key|spicey|spicy|sparky|spooky|psyche?y?|jarvis)\b/i;

  const SIDE = new URLSearchParams(location.search).get('screen') === 'side';
  document.body.dataset.screen = SIDE ? 'side' : 'main';
  const bus = ('BroadcastChannel' in window) ? new BroadcastChannel('jarvis') : null;
  const SYMBOLS = {
    'nas 100':'OANDA:NAS100USD','nas100':'OANDA:NAS100USD','nasdaq':'OANDA:NAS100USD','nq':'OANDA:NAS100USD',
    'us 30':'OANDA:US30USD','us30':'OANDA:US30USD','dow':'OANDA:US30USD','ym':'OANDA:US30USD',
    's&p':'OANDA:SPX500USD','spx':'OANDA:SPX500USD','s and p':'OANDA:SPX500USD',
    'gold':'OANDA:XAUUSD','gc':'OANDA:XAUUSD','g c':'OANDA:XAUUSD','n q':'OANDA:NAS100USD','bitcoin':'BITSTAMP:BTCUSD','btc':'BITSTAMP:BTCUSD','oil':'TVC:USOIL','dollar':'TVC:DXY'
  };
  const $ = id => document.getElementById(id);
  const set = (id, v) => { const el = $(id); if (el) el.textContent = v; };
  const store = {
    get(k, d){ try{ const v = localStorage.getItem('jarvis.'+k); return v ? JSON.parse(v) : d; }catch{ return d; } },
    set(k, v){ try{ localStorage.setItem('jarvis.'+k, JSON.stringify(v)); }catch{} }
  };
  const pad = n => String(n).padStart(2,'0');
  const esc = s => String(s).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));

  // Public state the visuals read every frame
  const JV = window.JV = { level: 0, mode: 'idle', speaking: false, awake: false };
  const setMode = (m, label) => {
    JV.mode = m;
    document.body.dataset.mode = m;
    set('stateLabel', label || ({idle:'STANDING BY', listening:'LISTENING', thinking:'PROCESSING', sleep:'SLEEP — SAY “SPIKEY, WAKE UP”'})[m]);
  };

  // ---------- clock / systems ----------
  const started = Date.now();
  function tick(){
    const d = new Date();
    set('clock', d.toLocaleTimeString([], {hour:'numeric', minute:'2-digit'}).replace(/\s?[AP]M/i,''));
    set('ampm', d.getHours() < 12 ? 'AM' : 'PM');
    set('seconds', pad(d.getSeconds()));
    set('date', d.toLocaleDateString([], {weekday:'long', month:'long', day:'numeric'}));
    const s = Math.floor((Date.now()-started)/1000);
    set('uptime', `${pad(Math.floor(s/3600))}:${pad(Math.floor(s/60)%60)}:${pad(s%60)}`);
    set('net', navigator.onLine ? 'ONLINE' : 'OFFLINE');
  }
  function etNow(){
    const p = new Intl.DateTimeFormat('en-US',{timeZone:'America/New_York',hour12:false,weekday:'short',hour:'2-digit',minute:'2-digit'}).formatToParts(new Date());
    const g = t => p.find(x => x.type === t).value;
    return { day: g('weekday'), min: (parseInt(g('hour'))%24)*60 + parseInt(g('minute')) };
  }
  const SESSIONS = [
    {id:'asia', name:'Asia', s:19*60, e:4*60},
    {id:'london', name:'London', s:3*60, e:12*60},
    {id:'ny', name:'New York', s:9*60+30, e:16*60}
  ];
  const fmtDur = m => `${Math.floor(m/60)}h ${pad(m%60)}m`;
  function sessions(){
    const box = $('sessions'); if (!box) return;
    const {day, min} = etNow();
    const weekend = day === 'Sat' || (day === 'Sun' && min < 18*60) || (day === 'Fri' && min >= 17*60);
    box.innerHTML = SESSIONS.map(x => {
      const len = (x.e - x.s + 1440) % 1440, into = (min - x.s + 1440) % 1440;
      const live = !weekend && into < len;
      const until = (x.s - min + 1440) % 1440;
      return `<div class="sess ${live?'live':''}"><div class="sn"><span>${x.name}</span><span>${live ? 'LIVE · ' + fmtDur(len-into) + ' left' : weekend ? 'CLOSED' : 'opens in ' + fmtDur(until)}</span></div><div class="sb"><i style="width:${live ? (into/len*100).toFixed(1) : 0}%"></i></div></div>`;
    }).join('');
    const fut = weekend ? 'FUTURES CLOSED' : (min >= 17*60 && min < 18*60) ? 'FUTURES · DAILY BREAK' : 'FUTURES OPEN';
    set('futures', fut);
    document.body.dataset.market = weekend ? 'closed' : 'open';
  }
  tick(); setInterval(tick, 1000); sessions(); setInterval(sessions, 20000);

  let battery = null;
  if (navigator.getBattery) navigator.getBattery().then(b => {
    battery = b;
    const upd = () => {
      const pct = Math.round(b.level*100);
      set('batt', `${pct}%`); set('battState', b.charging ? 'CHARGING' : 'ON BATTERY');
      const bar = $('battBar'); if (bar) bar.style.width = pct + '%';
      document.body.dataset.lowbatt = (pct < 20 && !b.charging) ? '1' : '0';
    };
    upd(); b.addEventListener('levelchange', upd); b.addEventListener('chargingchange', upd);
  });

  // ---------- weather ----------
  const WMO = {0:'Clear skies',1:'Mostly clear',2:'Partly cloudy',3:'Overcast',45:'Fog',48:'Freezing fog',51:'Light drizzle',53:'Drizzle',55:'Heavy drizzle',
    61:'Light rain',63:'Rain',65:'Heavy rain',66:'Freezing rain',67:'Freezing rain',71:'Light snow',73:'Snow',75:'Heavy snow',80:'Rain showers',81:'Heavy showers',
    82:'Violent showers',95:'Thunderstorms',96:'Thunderstorms with hail',99:'Severe thunderstorms'};
  let weather = null;
  async function loadWeather(){
    try{
      const u = `https://api.open-meteo.com/v1/forecast?latitude=${CONFIG.lat}&longitude=${CONFIG.lon}&current=temperature_2m,apparent_temperature,weather_code,wind_speed_10m,relative_humidity_2m&hourly=temperature_2m,precipitation_probability&forecast_hours=10&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max&temperature_unit=fahrenheit&wind_speed_unit=mph&timezone=auto&forecast_days=1`;
      const j = await (await fetch(u)).json();
      weather = {
        temp: Math.round(j.current.temperature_2m), feels: Math.round(j.current.apparent_temperature),
        cond: WMO[j.current.weather_code] || 'Conditions unknown', wind: Math.round(j.current.wind_speed_10m),
        hum: j.current.relative_humidity_2m,
        hi: Math.round(j.daily.temperature_2m_max[0]), lo: Math.round(j.daily.temperature_2m_min[0]),
        rain: j.daily.precipitation_probability_max[0] ?? 0
      };
      set('temp', weather.temp + '°'); set('cond', weather.cond); set('feels', weather.feels + '°');
      set('hilo', `${weather.hi}° / ${weather.lo}°`); set('wind', `${weather.wind} mph`);
      set('rain', weather.rain + '%'); set('hum', weather.hum + '%');
      const hr = $('hourly');
      if (hr && j.hourly){
        const temps = j.hourly.temperature_2m.slice(0,10), mn = Math.min(...temps), mx = Math.max(...temps);
        hr.innerHTML = temps.map((tv,i) => {
          const h = new Date(j.hourly.time[i]).getHours(), lab = i === 0 ? 'NOW' : ((h%12)||12) + (h<12?'a':'p');
          const pct = mx === mn ? 50 : 20 + 80*(tv-mn)/(mx-mn);
          return `<div class="hr"><span class="ht">${Math.round(tv)}°</span><i style="height:${pct}%"></i><span class="hl">${lab}</span><span class="hp">${j.hourly.precipitation_probability[i] ?? 0}%</span></div>`;
        }).join('');
      }
    }catch(e){ set('cond', 'Weather feed offline'); }
  }
  loadWeather(); setInterval(loadWeather, 15*60*1000);

  // ---------- tasks ----------
  let tasks = store.get('tasks', []);
  function renderTasks(){
    const ol = $('tasks'); if (!ol) return;
    ol.innerHTML = '';
    set('taskCount', String(tasks.length).padStart(2,'0'));
    if (!tasks.length){ const li = document.createElement('li'); li.className='empty'; li.textContent='No open objectives'; ol.appendChild(li); return; }
    tasks.forEach((t,i) => { const li = document.createElement('li'); li.innerHTML = `<b>${pad(i+1)}</b><span>${esc(t)}</span>`; ol.appendChild(li); });
  }
  const saveTasks = () => { if (!coleOn()) store.set('tasks', tasks); renderTasks(); };
  // Cole's to-do list IS the objectives list once Cole is signed in
  const coleOn = () => !!(window.JV_coleTasks && window.JV_coleTasks.on());
  let migrated = false;
  window.addEventListener('cole-update', async () => {
    if (!coleOn()) return;
    const local = store.get('tasks', []);
    if (!migrated && local.length){                    // move any old Spikey-only objectives into Cole once
      migrated = true; store.set('tasks', []);
      for (const t of local){ try{ await window.JV_coleTasks.add(t); }catch{} }
      return;
    }
    migrated = true;
    tasks = window.JV_coleTasks.list(); renderTasks();
  });
  function addObjective(t){
    t = String(t).charAt(0).toUpperCase() + String(t).slice(1);
    tasks.push(t); renderTasks();
    if (coleOn()) window.JV_coleTasks.add(t).catch(e => say(e.message)); else saveTasks();
    return t;
  }
  renderTasks();

  // ---------- sound: short chime when it wakes ----------
  let actx = null;
  function audioCtx(){ if (!actx) try{ actx = new (window.AudioContext||window.webkitAudioContext)(); }catch{} if (actx && actx.state === 'suspended') actx.resume(); return actx; }
  function chime(up = true){
    const c = audioCtx(); if (!c) return;
    const t = c.currentTime, o = c.createOscillator(), g = c.createGain();
    o.type = 'sine'; o.frequency.setValueAtTime(up ? 660 : 880, t); o.frequency.exponentialRampToValueAtTime(up ? 1320 : 440, t + .12);
    g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(.18, t + .02); g.gain.exponentialRampToValueAtTime(.0001, t + .22);
    o.connect(g).connect(c.destination); o.start(t); o.stop(t + .25);
  }

  // ---------- mic diagnostics (?debug=1) ----------
  const DEBUG = new URLSearchParams(location.search).has('debug');
  const SELFTEST = new URLSearchParams(location.search).has('selftest');
  const D = JV.diag = {ev:{}, gum:'pending', track:'—', trackState:'—', devices:[], perm:'—', peak:0, lastText:'—', lastErr:'—', log:[]};
  const bump = (k, extra) => { D.ev[k] = (D.ev[k] || 0) + 1; D.log.push(new Date().toLocaleTimeString([], {hour12:false}) + ' ' + k + (extra ? ' ' + extra : '')); if (D.log.length > 14) D.log.shift(); };
  if (navigator.permissions) navigator.permissions.query({name:'microphone'}).then(p => { D.perm = p.state; p.onchange = () => D.perm = p.state; }).catch(() => D.perm = 'n/a');
  let peakWin = 0;
  setInterval(() => { D.peak = peakWin; peakWin = 0; }, 3000);
  if (DEBUG){
    const box = document.createElement('pre'); box.id = 'diag';
    box.style.cssText = 'position:fixed;left:12px;top:60px;z-index:50;background:rgba(0,0,0,.92);color:#9dffb8;font:13px/1.35 Consolas,monospace;padding:12px 14px;border:1px solid #3dff8f;max-width:560px;white-space:pre-wrap;pointer-events:none';
    document.body.appendChild(box);
    setInterval(() => {
      const bar = n => '█'.repeat(Math.round(n*20)).padEnd(20,'·');
      box.textContent =
        `SPIKEY MIC DIAGNOSTICS\n` +
        `page: ${location.protocol}  secure=${isSecureContext}  online=${navigator.onLine}\n` +
        `mic permission: ${D.perm}   getUserMedia: ${D.gum}\n` +
        `mic in use: ${D.track}  [${D.trackState}]\n` +
        `inputs: ${D.devices.join(' | ') || '—'}\n` +
        `level now  ${bar(JV.level)}\n` +
        `peak (3s)  ${bar(D.peak)} ${D.peak.toFixed(2)}\n` +
        `speech engine: ${Object.entries(D.ev).map(([k,v]) => k + '=' + v).join('  ')}\n` +
        `last heard: ${D.lastText}\nlast error: ${D.lastErr}\n` +
        `--- events ---\n${D.log.join('\n')}`;
    }, 300);
  }

  let mutedSaid = false;
  // ---------- mic level for the visuals ----------
  async function startMeter(){
    try{
      const stream = await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true, noiseSuppression:true}});
      D.gum = 'ok';
      const tr = stream.getAudioTracks()[0];
      if (tr){
        const shortName = (tr.label || 'microphone').replace(/^Default - /, '').replace(/\s*\(.*\)$/, '');
        const warn = () => { micStatus(false, 'MIC MUTED IN WINDOWS — PRESS THE MIC-MUTE KEY OR UNMUTE IN SOUND SETTINGS'); if (!mutedSaid){ mutedSaid = true; say('Heads up. Your microphone is muted in Windows, so I can’t hear you.'); } };
        const ok = () => { mutedSaid = false; micStatus(true, 'SAY “SPIKEY…” · OR PRESS SPACE · ' + shortName.toUpperCase()); };
        D.track = tr.label || '(unnamed)'; D.trackState = tr.readyState + (tr.muted ? ', MUTED' : '');
        tr.onmute = () => { D.trackState = 'MUTED'; warn(); };
        tr.onunmute = () => { D.trackState = 'live'; ok(); };
        tr.onended = () => D.trackState = 'ended';
        if (tr.muted) setTimeout(warn, 4000);
      }
      navigator.mediaDevices.enumerateDevices().then(ds => { D.devices = ds.filter(d => d.kind === 'audioinput').map(d => (d.deviceId === 'default' ? '*' : '') + (d.label || '?')); });
      const c = audioCtx(); const src = c.createMediaStreamSource(stream);
      const an = c.createAnalyser(); an.fftSize = 512; src.connect(an);
      const buf = new Uint8Array(an.fftSize);
      JV.analyser = an;
      const loop = () => {
        an.getByteTimeDomainData(buf);
        let sum = 0; for (let i = 0; i < buf.length; i++){ const v = (buf[i]-128)/128; sum += v*v; }
        const rms = Math.min(1, Math.sqrt(sum/buf.length) * 4.5);
        if (!JV.speaking) JV.level += (rms - JV.level) * 0.35;
        if (rms > peakWin) peakWin = rms;
        requestAnimationFrame(loop);
      };
      loop();
    }catch(e){ D.gum = 'FAILED: ' + e.name + ' ' + (e.message || ''); }
  }

  // ---------- voice out ----------
  let voice = null;
  function pickVoice(){
    const vs = speechSynthesis.getVoices();
    const prefs = [/Ryan.*Natural/i, /Thomas.*Natural/i, /Guy.*Natural/i, /Christopher.*Natural/i, /en-GB.*(Male|George|Ryan)/i, /George/i, /en-GB/i, /en-US/i];
    for (const p of prefs){ const v = vs.find(v => p.test(v.name + ' ' + v.lang)); if (v) { voice = v; return; } }
    voice = vs[0] || null;
  }
  if ('speechSynthesis' in window){ pickVoice(); speechSynthesis.onvoiceschanged = pickVoice; }

  let talkTimer = null, lastSpokeEnd = 0;
  window.JV_say = t => say(t);
  window.JV_chime = up => chime(up);
  // ---------- barge-in: "stop" while Spikey is talking cuts it off ----------
  let curDone = null, curText = '', hushUntil = 0, dropReply = false;
  const STOP_TAIL = /(?:^|\s)(stop|stop talking|stop it|shut up|be quiet|quiet|enough|that'?s enough|cancel|hold on|hold up|okay okay|all right all right)( spikey| spiky| please| now)?$/i;
  function stopTalking(why){
    hushUntil = Date.now() + 1200;                  // swallow the rest of a multi-part answer (like the briefing)
    try{ speechSynthesis.cancel(); }catch{}
    if (curDone) curDone();
    set('reply', '');
    D.lastStop = why || 'stop';
    setMode('idle', 'STOPPED');
    if (typeof openConvo === 'function') openConvo();   // still listening for what he says next
  }
  // is this transcript Nick telling Spikey to stop (and not Spikey hearing its own voice)?
  function heardStop(t){
    t = String(t || '').toLowerCase().replace(/[.,!?]/g, '').trim();
    const m = t.match(STOP_TAIL); if (!m) return false;
    const word = m[1].split(' ')[0];
    const named = WAKE.test(t);
    if (!named && new RegExp('\\b' + word + '\\b', 'i').test(curText)) return t.split(/\s+/).length <= 2 && !curText.toLowerCase().trim().endsWith(word);
    return true;
  }
  window.JV_stop = () => stopTalking('manual');

  function say(text){
    if (Date.now() < hushUntil) return Promise.resolve();
    if (dropReply){ dropReply = false; return Promise.resolve(); }
    set('reply', text);
    curText = String(text);
    return new Promise(res => {
      if (!('speechSynthesis' in window)) return res();
      speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      if (voice) u.voice = voice;
      u.rate = 1.02; u.pitch = 0.95;
      u.onstart = () => {
        JV.speaking = true; document.body.dataset.speaking = '1';
        talkTimer = setInterval(() => { JV.level = 0.35 + Math.random()*0.55; }, 70);
      };
      let finished = false;
      const done = () => { if (finished) return; finished = true; curDone = null; clearTimeout(safety); lastSpokeEnd = Date.now(); JV.speaking = false; document.body.dataset.speaking = '0'; clearInterval(talkTimer); JV.level = 0; res(); };
      // Chrome sometimes never reports the end of an utterance: don't let Spikey get stuck "talking"
      const safety = setTimeout(done, 4000 + String(text).length * 90);
      u.onend = done; u.onerror = done; curDone = done;
      try{ speechSynthesis.speak(u); }catch(e){ done(); }
    });
  }

  // ---------- holo popup ----------
  let holoTimer = null;
  function holo(title, html, ms = 9000){
    const h = $('holo'); if (!h) return;
    set('holoTitle', title); $('holoBody').innerHTML = html;
    h.classList.add('show');
    clearTimeout(holoTimer); holoTimer = setTimeout(() => h.classList.remove('show'), ms);
  }
  if ($('holo')) $('holo').addEventListener('click', () => $('holo').classList.remove('show'));
  const row = (a, b) => `<div class="hrow"><span>${a}</span><span>${b}</span></div>`;

  // ---------- skills ----------
  const greetingWord = () => { const h = new Date().getHours(); return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening'; };
  const timeSentence = () => `It's ${new Date().toLocaleTimeString([], {hour:'numeric', minute:'2-digit'})}.`;
  const weatherSentence = () => weather
    ? `It's ${weather.temp} degrees in ${CONFIG.city} and ${weather.cond.toLowerCase()}, with a high of ${weather.hi} and a ${weather.rain} percent chance of rain.`
    : `I haven't been able to reach the weather feed yet.`;
  const taskSentence = () => !tasks.length ? 'You have no open objectives.'
    : tasks.length === 1 ? `You have one open objective: ${tasks[0]}.`
    : `You have ${tasks.length} open objectives. First up: ${tasks[0]}.`;
  const powerSentence = () => !battery ? '' : `Battery at ${Math.round(battery.level*100)} percent${battery.charging ? ', and charging' : ''}.`;

  const listOut = arr => arr.length === 1 ? arr[0] : arr.slice(0, -1).join(', ') + ', and ' + arr[arr.length - 1];
  function todoSentences(){
    const out = [];
    if (tasks.length) out.push(`Your objectives: ${listOut(tasks.slice(0, 5))}${tasks.length > 5 ? `, plus ${tasks.length - 5} more` : ''}.`);
    else out.push('No open objectives. Your list is clear.');
    return out;
  }
  // the opening announcement when Spikey launches: no weather, no pop-up box
  function opening(greet){
    const pnl = window.JV_pnlBreakdown ? window.JV_pnlBreakdown() : null;
    return say([greet, timeSentence(), pnl || '', ...todoSentences(), "Let's make shit happen."].filter(Boolean).join(' '));
  }

  function briefing(opening, boot){
    holo('DAILY BRIEFING',
      row('Time', new Date().toLocaleTimeString([], {hour:'numeric',minute:'2-digit'})) +
      (weather && !boot ? row('Weather', `${weather.temp}° · ${esc(weather.cond)}`) : '') +
      row('Objectives', tasks.length) +
      (battery ? row('Power', Math.round(battery.level*100) + '%') : ''), 12000);
    const pnl = window.JV_pnlSentence && window.JV_pnlSentence();
    // opening greeting (dock/launch): no weather, always ends with the sign-off
    if (boot) return say([opening, timeSentence(), pnl || '', taskSentence(), "Let's make shit happen."].filter(Boolean).join(' '));
    return say([opening || `${greetingWord()}, ${CONFIG.name}.`, timeSentence(), weatherSentence(), pnl || '', taskSentence()].filter(Boolean).join(' '));
  }

  const HELP = [
    ['briefing', 'Full rundown'], ["what's my P&L", 'Weekly P&L'], ['what time is it', 'Time'], ['weather', CONFIG.city + ' conditions'],
    ['add task …', 'New objective'], ['read my tasks', 'List objectives'], ['complete task 2', 'Remove one'],
    ['clear tasks', 'Remove all'], ['show US30 / NAS100 / gold', 'Switch chart'], ['open chart · close chart', 'Big chart'], ['open YouTube · Gmail · TradingView', 'Launch site'],
    ['play Lose Yourself · pause · skip', 'Spotify'], ['show protein · money · habits · agenda', 'Slides'], ['stop slides · start slides', 'Slides'], ['open YouTube and find…', 'Ask anything'], ['log to Cole: …', 'Save to Cole'],
    ['go to sleep · wake up', 'Standby']
  ];
  const numWords = {one:1,two:2,to:2,too:2,three:3,four:4,for:4,five:5,six:6,seven:7,eight:8,nine:9,ten:10,first:1,second:2,third:3,fourth:4,fifth:5};

  const IGNORED = {ignored:true};
  const VERB = '(?:open|close|show|hide|start|stop|end|pause|resume|play|skip|minimi[sz]e|pull up|bring up|put up|exit|launch|add|log|read|delete|remove|turn|switch|go to|let\'?s)';
  const SPLIT = new RegExp('\\s+(?:and then|and|then)\\s+(?=(?:(?:can you|please|also|now)\\s+)?' + VERB + '\\b)', 'i');
  async function handle(raw, opts){
    // two commands in one breath → do them one after the other
    if (!(opts && opts.noSplit) && new RegExp('^(?:(?:can you|please)\\s+)?' + VERB + '\\b', 'i').test(raw.trim()) && SPLIT.test(raw)){
      const parts = raw.split(SPLIT).map(x => x.replace(/^(can you|please|also|now)\s+/i, '').trim()).filter(Boolean);
      if (parts.length > 1 && parts.length <= 4){
        for (const part of parts) await handle(part, {...(opts || {}), noSplit:true});
        return;
      }
    }
    const clean = raw.replace(/\bback[- ]?test/gi,'backtest').replace(/(?<!\d)\.|\.(?!\d)|[,!?]/g,'').trim();   // keep decimals like 1.5
    raw = raw.replace(/\bback[- ]?test/gi, 'backtest');
    const text = clean.toLowerCase();
    if (!text) return;
    if (!(opts && opts.followup)) set('reply', '');
    const brainOn = !!(window.JV_brain && window.JV_brain.hasKey());
    const brief = text.split(/\s+/).length <= 5;          // short phrases = quick commands; longer ones go to the brain
    const followup = !!(opts && opts.followup);
    const toBrain = async () => {
      try{
        const r = await window.JV_brain.ask(raw, {followup});
        if (followup && /^\s*IGNORE\b/i.test(r || '')) return IGNORED;
        return say(r);
      }
      catch(e){ return say(e.message || 'Something went wrong.'); }
    };

    if (JV.mode === 'sleep'){
      if (/wake up|come online|i'?m back|online/.test(text)){ setMode('idle'); return briefing(`Welcome back, ${CONFIG.name}.`); }
      return;
    }
    // --- timers, reminders, alarms, protocols, status report, news (assist.js) ---
    if (window.JV_assist && !(opts && opts.followup && text.split(' ').length > 8)){
      try{ const r = await window.JV_assist.quick(text); if (r) return say(r); }catch(e){ console.warn(e); }
    }
    // --- things Spikey learned: voice shortcuts and teaching ---
    if (window.JV_learn){
      const Ln = window.JV_learn;
      const sc = !(opts && opts.viaShortcut) && Ln.match(text);
      if (sc) return handle(sc, {...(opts || {}), viaShortcut:true});
      let lm = clean.match(/^when(?:ever)? i say\s+["“]?(.+?)["”]?\s+(?:you should|i want you to|then|just|do)\s+(.+)$/i);
      if (lm && !brainOn && !/^(you|it)\b/i.test(lm[2])) return say(Ln.teach(lm[1], lm[2]));   // with the brain on, Claude splits phrase/action properly
      if ((lm = text.match(/^(?:forget|unlearn|stop doing)(?: the| that)?(?: shortcut| rule)?\s+(.+)$/))) return say(Ln.forget(lm[1]));
      if (/^(what have you learned|what did you learn|what do you know about me|show what you learned)$/.test(text)){
        const x = Ln.list(); const n = x.rules.length + x.shortcuts.length;
        if (!n) return say("Nothing yet. Correct me or tell me how you like things and I'll remember.");
        holo('LEARNED', [...x.rules.map(r => row(esc(r.text), 'RULE')), ...x.shortcuts.map(c => row(esc('"' + c.phrase + '" → ' + c.command), 'SHORTCUT'))].join(''));
        return say(`I've learned ${x.rules.length} rule${x.rules.length === 1 ? '' : 's'} and ${x.shortcuts.length} shortcut${x.shortcuts.length === 1 ? '' : 's'}. They're on screen.`);
      }
    }
    if (/^(go to sleep|stand ?by|sleep mode|power down|that'?s all)$/.test(text) || (!brainOn && /go to sleep|stand ?by|sleep mode|power down|that'?s all/.test(text))){ await say(`Standing by, ${CONFIG.address}.`); return setMode('sleep'); }
    if (/^(brief|briefing|status report|rundown|catch me up|good (morning|afternoon|evening))/.test(text) || (!brainOn && /brief|status report|rundown|catch me up/.test(text))) return briefing();
    if (/^(what('?s| is) the )?time( is it)?( now)?$|^what time is it( now)?$/.test(text) || (!brainOn && /\btime\b/.test(text))) return say(timeSentence());
    if (/^(what('?s| is) )?(the |today'?s )?date$|^what day is (it|today)$/.test(text) || (!brainOn && /\bdate\b|what day/.test(text)))
      return say(`Today is ${new Date().toLocaleDateString([], {weekday:'long', month:'long', day:'numeric'})}.`);
    if ((brief || !brainOn) && /weather|temperature|outside|rain/.test(text) && !/tomorrow|week|weekend| in [a-z]/.test(text)){
      if (weather) holo('ATMOSPHERICS', `<div class="hbig">${weather.temp}°</div>` + row('Conditions', esc(weather.cond)) + row('Feels like', weather.feels + '°') + row('High / Low', `${weather.hi}° / ${weather.lo}°`) + row('Rain chance', weather.rain + '%'));
      return say(weatherSentence());
    }
    let m;
    if ((m = clean.match(/^(?:add (?:a )?(?:task|objective|to ?do)(?: to)?|remind me to|new task)\s+(.+)/i))){
      const t = addObjective(m[1]);
      return say(`Added: ${t}.${coleOn() ? ' It is on your Cole to-do list too.' : ''}`);
    }
    if ((m = text.match(/^(?:complete|finish|remove|delete|done with|check off)\s+(?:task|objective|number)?\s*(\d+|one|two|to|too|three|four|for|five|six|seven|eight|nine|ten|first|second|third|fourth|fifth)$/))){
      const n = /\d/.test(m[1]) ? parseInt(m[1]) : numWords[m[1]];
      return say(completeTask(n));
    }
    if (/^clear (all )?(my )?(tasks|objectives|list)$/.test(text)){ tasks = []; if (coleOn()) window.JV_coleTasks.completeAll().catch(e => say(e.message)); saveTasks(); return say('Objectives cleared.'); }
    if (/^(read |what('?s| is) on )?(my )?(tasks|objectives|to ?dos?|agenda|list)$|^what('?s| is) on my (list|agenda|to ?do list)$/.test(text) || (!brainOn && /(tasks|objectives|to ?do|agenda|my list)/.test(text))){
      if (tasks.length) holo('OBJECTIVES', tasks.map((t,i) => row(esc(t), pad(i+1))).join(''));
      return say(todoSentences().join(' '));
    }
    // --- weekly P&L ---
    if ((brief || !brainOn) && /\bp\s?(&|and|n)\s?l\b|\bpnl\b|profit|how('?s| is| am i)( my)? (week|trading|doing)|my week/.test(text)){
      const p = (window.JV_pnlBreakdown && window.JV_pnlBreakdown()) || (window.JV_pnlSentence && window.JV_pnlSentence());
      return say(p || "Your Cole numbers are still loading. Ask me again in a few seconds.");
    }
    // --- charts inside Spikey ---
    if (/^(close|hide|dismiss|minimi[sz]e) (the )?(big )?chart$/.test(text)){ if (window.JV_bigChart) window.JV_bigChart(false); return say('Chart closed.'); }
    const symKey = Object.keys(SYMBOLS).find(k => new RegExp('\\b' + k.replace(/[&]/g,'\\$&') + '\\b').test(text));
    if (brief && symKey && /(chart|show|switch|pull up|change|put up|load)/.test(text) && !/tradingview|trading view/.test(text)){
      const sym = SYMBOLS[symKey];
      store.set('symbol', sym); if (bus) bus.postMessage({type:'symbol', symbol:sym});
      if (window.JV_setSymbol) window.JV_setSymbol(sym);
      return say(`${symKey.toUpperCase()} is up.`);
    }
    if (/^(show|open|pull up|bring up|expand)( me)?( the| my)? (big |full )?chart$/.test(text)){
      if (window.JV_bigChart) window.JV_bigChart(true);
      return say('Chart is up.');
    }
    // --- "close that" closes whatever full screen is up ---
    if (/^(close|exit|hide|shut|minimi[sz]e)( it| that| this| the screen| the page| everything| all( of)? (it|them)| out)?$/.test(text)){
      let did = false;
      if (window.JV_journal && window.JV_journal.isOpen()){ window.JV_journal.hide(); did = true; }
      if (window.JV_custom && window.JV_custom.isOpen()){ window.JV_custom.closeScreen(); did = true; }
      if (window.JV_backtest && window.JV_backtest.active() && document.querySelector('#btPanel.open')){ window.JV_backtest.hide(); did = true; }
      const cap = document.getElementById('capPanel'); if (cap && cap.style.display === 'block'){ cap.style.display = 'none'; did = true; }
      if (!did && window.JV_slides && document.querySelector('#slides .slide.on')){ window.JV_slides.home(); return; }
      if (did) return say('Closed.');
    }
    // --- journal: every entry, grouped by category, on its own screen ---
    if (window.JV_journal){
      const J = window.JV_journal;
      if (/^(close|hide|exit|shut|minimi[sz]e|get rid of|take down|put away)( out of)?( the| my| that)? journals?( entries| entry| screen| page| logs?)?$/.test(text)){ J.hide(); return say('Journal closed.'); }
      if (/\bjournal/.test(text) && !/^(close|hide|exit|shut|minimi[sz]e|get rid of|take down|put away)\b/.test(text) && !/^(log|journal that|add|write|put|save|note)\b/.test(text) && !/\b(log|add|write|save|put) (this|that|it)\b/.test(text)
          && (brief || /\b(entries|entry|show|read|open|pull up|bring up|what('?s| is| did)|all)\b/.test(text))){
        const r = /\btoday\b/.test(text) ? 'today' : /\bthis week|\bweek\b/.test(text) ? 'week' : /\bmonth\b/.test(text) ? 'month' : 'all';
        return say(J.open(r));
      }
    }
    // --- backtesting ---
    if (window.JV_backtest){
      const B = window.JV_backtest;
      // anything like "open a backtesting screen", "can you start backtesting", "pull up my backtest"
      if (/\bbacktest/.test(text) && !/^when(ever)? i say/.test(text) && /\b(open|start|pull|bring|launch|begin|let'?s|lets|time to|fire up|load|up)\b/.test(text) && !/\b(end|stop|finish|close|minimi[sz]e|hide|undo|wrap|how|log|win|loss|long|short)\b/.test(text)){
        if (B.active()){ B.show(true); return say('Backtest screen is up.'); }
        return say(B.open().message);
      }
      if (/^(let'?s |lets |time to )?(open|start|pull up|launch|bring up|begin|do)?( my| the| a| some)? ?(backtest|backtesting|back test|back testing|replay)( screen| session| window| mode)?$/.test(text) && !/^(backtest|back test)$/.test(text)) return say(B.open().message);
      if (/^(minimi[sz]e|hide|close)( the)? (backtest|backtesting|back test)( screen)?$/.test(text)){ B.hide(); return say('Minimized. The session is still running.'); }
      if (/^(show|bring back|open)( the| my)? (backtest|backtesting|back test)( screen| stats)?$/.test(text) && B.active()){ B.show(true); return; }
      if (/^(end|stop|finish|close|wrap up)( my| the)? (backtest|backtesting|back test|back testing)( session)?$/.test(text)) return say(B.end());
      if (/^undo( the)?( last)? (backtest|back test)( trade)?$|^(scratch|delete) that( backtest)?$/.test(text) && B.active()) return say(B.undo());
      if (/^(how('?s| is)( my)? (backtest|back test|backtesting)( going)?|(backtest|back test) (stats|summary|status|score))$/.test(text)) return say(B.summary());
      let bm = text.match(/^(?:log )?(?:backtest|back test|bt|backtesting)\s+(.+)$/);
      if (!bm && B.active() && /^(long|short|buy|sell)?\s*(win|winner|won|loss|loser|lost|stopped( out)?|breakeven|break even|be|scratch)\b/.test(text)) bm = [null, text];
      if (bm){
        const w = bm[1];
        const nums = {one:1, two:2, too:2, to:2, three:3, four:4, for:4, five:5, six:6, seven:7, eight:8, nine:9, ten:10, half:.5};
        let r = null, mr = w.match(/(\d+(?:\.\d+)?)\s*(?:r|are|our|ar|rs|r's)\b/) || w.match(/(?:^|\s)(\d{1,2}(?:\.\d+)?)(?:\s|$)/);
        if (mr && +mr[1] <= 20) r = +mr[1]; else { const mw = w.match(/\b(one|two|too|to|three|four|for|five|six|seven|eight|nine|ten|half)\s*(?:and a half\s*)?(?:r|are|our|ar)\b/); if (mw) r = nums[mw[1]] + (/and a half/.test(w) ? .5 : 0); }
        const dir = (w.match(/\b(long|short|buy|sell)\b/) || [])[1] || '';
        const outcome = (w.match(/\b(win|winner|won|loss|loser|lost|stopped|stop|breakeven|break even|be|scratch)\b/) || [])[1] || (r != null ? 'win' : '');
        if (outcome) return say(B.logTrade({dir, outcome, r}));
      }
    }
    // --- slides ---
    if (window.JV_slides){
      if (/^(stop|pause|hold) (the )?slides$|^(show )?(the )?logo$/.test(text)){ window.JV_slides.stop(); return; }
      if (/^(start|resume|play) (the )?slides$|^next slide$/.test(text)){ window.JV_slides.resume(); return; }
      // built-in slides by any everyday name ("open my finances", "close my diet tracking")
      const SLIDE_WORDS = [
        ['fuel', /^(diet|diet tracking|diet tracker|protein|protein intake|fuel|macros|food|food tracking|meals?|calories|nutrition|eating|bulk|lean bulk)$/],
        ['money', /^(money|finances?|financials?|bank|banks|bank accounts?|accounts|spending|budget|expenses|cash)$/],
        ['trading', /^(trading|trades|discipline|p ?(and|&|n) ?l|pnl|trading week|week)$/],
        ['habits', /^(habits?|habit tracker|habit tracking|gym|streaks?)$/],
        ['agenda', /^(agenda|to ?dos?|to ?do list|schedule|objectives|tasks|day|plan)$/]
      ];
      const slideOf = w => { w = String(w || '').replace(/\b(slide|page|screen|tab|tracking screen)$/, '').trim(); const hit = SLIDE_WORDS.find(([, re]) => re.test(w)); return hit ? hit[0] : null; };
      let sm = text.match(/^(?:show|open|pull up|go to|put up|bring up|switch to|take me to)(?: me)?(?: to)?(?: my| the)? (.+)$/);
      if (sm && slideOf(sm[1])){ window.JV_slides.show(slideOf(sm[1]), 45000); return; }
      sm = text.match(/^(?:close|hide|exit|minimi[sz]e|get rid of|take down|put away)(?: out of)?(?: my| the| that)? (.+)$/);
      if (sm && slideOf(sm[1])){ window.JV_slides.home(); return; }
      // slides Spikey built on the spot
      if (window.JV_custom){
        const C = window.JV_custom;
        let cm = text.match(/^(?:show|open|pull up|go to|put up|bring up)(?: me)?(?: my| the)? (.+?)(?: slide| page)?$/);
        if (cm){ const c = C.find(cm[1]); if (c){ window.JV_slides.show(c.id, 45000); return say(`Here's ${c.title}.`); } }
        if ((cm = text.match(/^(?:delete|remove|get rid of|trash)(?: the| my| that)? (.+?) slide$/))) return say(C.remove(cm[1]));
        if (/^(close|exit|hide|shut)( the| that)? (screen|video|website|site|youtube|browser|window|page|player)$/.test(text) && C.isOpen()){ C.closeScreen(); return say('Closed.'); }
      }
    }
    // --- music: fast path straight to Spotify ---
    if ((m = clean.match(/^(?:play|put on|throw on)\s+(.+?)(?:\s+on spotify)?$/i)) && window.JV_spotify && window.JV_spotify.connected() && !/youtube/i.test(clean) && !/^play (it|the music|music|spotify) on\b/i.test(clean)){
      try{ return say((await window.JV_spotify.play(m[1], /\bplaylist\b/i.test(m[1]) ? 'playlist' : 'track')).message); }catch(e){ if (!brainOn) return say("Spotify didn't respond. " + (e.message || '')); }
    }
    if (window.JV_spotify && window.JV_spotify.connected()){
      const t2 = text.replace(/\b(please|as well|too|again|for me|spikey|spiky|now)\b/g, '').replace(/\s+/g, ' ').trim();
      const sp = /^(skip|next)( (it|this|that|this one|that one|the|this song|that song|song|track|this track))*$|^(play )?(the )?next (song|track|one)$/.test(t2) ? 'next'
        : /^(pause|stop)( (it|the|this|that|music|song|track|spotify|the music|the song))*$/.test(t2) ? 'pause'
        : /^(resume|unpause|keep playing|play)( (it|the|music|song|spotify|the music))*$/.test(t2) ? 'resume'
        : /^((go )?back|previous|last|play the last|play the previous)( (song|track|one))?$|^(previous|last) (song|track)$/.test(t2) ? 'previous' : null;
      if (sp){ try{ await window.JV_spotify.control(sp); return; }catch(e){ return say(e.message || "Spotify didn't respond."); } }
      if (/^(where('?s| is) (the )?(music|spotify|it) playing|what device is (spotify|the music|it) (playing )?on|which (device|speaker))$|can'?t hear|cannot hear|don'?t hear|no sound|hear (any|the|no) ?(music|spotify|nothing)/.test(text)){
        try{
          const w = await window.JV_spotify.where(), list = await window.JV_spotify.devices();
          const act = list.find(d => d.active);
          if (/can'?t|cannot|don'?t|no sound|hear/.test(text) && (!act || act.name.toLowerCase() !== window.JV_spotify.home())){ const r = await window.JV_spotify.ensureHome(); return say(w + ' ' + r); }
          if (/can'?t|cannot|don'?t|no sound|hear/.test(text) && act && act.volume === 0){ await window.JV_spotify.control('volume', 70); return say(w + ' Its volume was at zero, so I turned it up.'); }
          return say(w + (/can'?t|cannot|don'?t|no sound|hear/.test(text) ? ' That is this laptop, so check the Windows volume and which speaker it is using.' : ''));
        }catch(e){ return say(e.message); }
      }
      if ((m = text.match(/^(?:play (?:it |the music |music |spotify )?on|move (?:it|the music|spotify) to|switch (?:it|the music|spotify) to|put (?:it|the music) on) (?:my |the )?(.+)$/))){
        try{ return say(await window.JV_spotify.moveTo(m[1])); }catch(e){ return say(e.message); }
      }
      if (/^(reconnect|re connect|relink|log ?in to|connect) spotify$/.test(text)){ say('Reconnecting Spotify.'); setTimeout(() => window.JV_spotify.login().catch(() => {}), 1200); return; }
    }
    // --- websites: exact names open instantly ---
    if ((m = text.match(/^(?:open|launch|pull up|bring up|go to)\s+(?:the |my )?(.+)$/))){
      const target = m[1].trim();
      const key = Object.keys(CONFIG.sites).find(k => target === k);
      if (key){ const u = CONFIG.sites[key]; if (/^spotify:/.test(u)) location.href = u; else window.open(u, '_blank'); return say(`Opening ${key}.`); }
    }
    if (/^(help|what can you do|commands)$/.test(text) || (!brainOn && /help|what can you do|commands/.test(text))){
      holo('CAPABILITIES', HELP.map(([a,b]) => row('“' + a + '”', b)).join(''), 14000);
      return say(brainOn ? 'Here are the quick ones. Anything else, just ask me.' : 'Here is what I can do so far.');
    }
    if (/^(thanks|thank you|thank you spikey)$/.test(text)) return say(`Always, ${CONFIG.address}.`);
    if (/^(who are you|what('?s| is) your name)$/.test(text)) return say(`I'm Spikey. Sledge B's own assistant. By outcasts, for outcasts.`);
    if (/^(hello|hey|hi|yo)$/.test(text)) return say(`${greetingWord()}, ${CONFIG.name}.`);

    // --- everything else: ask the brain ---
    if (brainOn) return toBrain();
    if (followup) return IGNORED;                         // no brain: don't answer chatter that isn't a command
    if (/battery|power|systems|diagnostic/.test(text)) return say(`${powerSentence() || 'Power telemetry unavailable.'} Network ${navigator.onLine ? 'online' : 'offline'}.`);
    return say(`I need my Claude key to answer that. Add it in Setup, top right.`);
  }
  function completeTask(n){
    if (!tasks[n-1]) return `There's no objective number ${n}.`;
    const [t] = tasks.splice(n-1, 1);
    if (coleOn()) window.JV_coleTasks.complete(t).catch(e => say(e.message)); saveTasks();
    return `Marked complete: ${t}. ${tasks.length} remaining.`;
  }
  window.JV_tasks = {
    list: () => tasks.slice(),
    add: t => { addObjective(t); },
    complete: n => completeTask(n)
  };

  let comms = store.get('comms', []);
  function renderComms(){
    const box = $('comms'); if (!box) return;
    box.innerHTML = comms.length ? comms.slice(-6).reverse().map(c =>
      `<li><span class="ct">${c.t}</span><span class="cq">${esc(c.q)}</span><span class="ca">${esc(c.a)}</span></li>`).join('')
      : '<li class="empty">No transmissions yet</li>';
  }
  function logComms(q, a){
    comms.push({t: new Date().toLocaleTimeString([], {hour:'numeric', minute:'2-digit'}), q, a});
    comms = comms.slice(-20); store.set('comms', comms); renderComms();
  }
  renderComms();

  // ---------- conversation mode: after Spikey answers, keep listening without the wake word ----------
  const CONVO_MS = 20000;
  let convoUntil = 0, convoTimer = null;
  function openConvo(){
    convoUntil = Date.now() + CONVO_MS; JV.convo = true;
    setMode('listening', 'IN CONVERSATION · JUST TALK');
    clearTimeout(convoTimer);
    const check = () => {
      if (!JV.convo) return;
      if (JV.speaking || JV.mode === 'thinking'){ convoTimer = setTimeout(check, 500); return; }
      const left = convoUntil - Date.now();
      if (left <= 0) return closeConvo();
      set('stateLabel', 'IN CONVERSATION · ' + Math.ceil(left / 1000) + 'S');
      convoTimer = setTimeout(check, 500);
    };
    convoTimer = setTimeout(check, 500);
  }
  function closeConvo(quiet){
    if (!JV.convo) return;
    JV.convo = false; convoUntil = 0; clearTimeout(convoTimer);
    if (JV.mode !== 'sleep'){ setMode('idle'); if (!quiet) chime(false); }
  }
  const ENDERS = /^(that'?s (all|it)|never ?mind|stop listening|we'?re good|i'?m good|ok(ay)? thanks?|thanks?( you)?( spikey)?|cool thanks?|bye|later)$/;
  async function run(cmd, followup){
    JV.awake = false; awakeUntil = 0;
    const t = cmd.toLowerCase().replace(/[.,!?]/g, '').trim();
    if (followup && ENDERS.test(t)){ closeConvo(); set('transcript', cmd); return; }
    const wasConvo = JV.convo;
    if (JV.mode !== 'sleep') setMode('thinking');
    const res = await handle(cmd, {followup});
    if (res === IGNORED){                                  // wasn't meant for Spikey: stay quiet, keep the window running
      if (JV.mode !== 'sleep'){ if (wasConvo && Date.now() < convoUntil) setMode('listening', 'IN CONVERSATION · JUST TALK'); else setMode('idle'); }
      return;
    }
    logComms(cmd, ($('reply') || {}).textContent || '');
    if (JV.mode === 'sleep'){ closeConvo(true); return; }
    openConvo();
  }

  // ---------- typed commands ----------
  const cmdBox = $('cmd');
  if (cmdBox) cmdBox.addEventListener('keydown', e => {
    if (e.key === 'Enter'){ const v = e.target.value; e.target.value = ''; set('transcript', v); run(v.replace(WAKE, '').replace(/^[\s,]+/, '')); }
  });

  // ---------- listening ----------
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  let rec = null, awakeUntil = 0, recOn = false;
  const micStatus = (on, label) => { const d = $('micDot'); if (d) d.className = 'dot ' + (on ? 'on' : 'off'); set('micLabel', label); };

  function wake(){
    if (JV.mode === 'sleep') return;
    awakeUntil = Date.now() + 8000; JV.awake = true;
    setMode('listening'); chime(true);
    setTimeout(() => { if (Date.now() >= awakeUntil && JV.mode === 'listening'){ JV.awake = false; setMode('idle'); } }, 8200);
  }

  function startRec(){
    if (!SR){ micStatus(false, 'VOICE INPUT UNSUPPORTED — USE EDGE OR CHROME'); return; }
    rec = new SR(); rec.continuous = true; rec.interimResults = true; rec.lang = 'en-US'; rec.maxAlternatives = 3;
    rec.onstart = () => { bump('start'); recOn = true; if (!(JV.diag && /MUTED/.test(JV.diag.trackState))) micStatus(true, 'SAY “SPIKEY…” · OR PRESS SPACE'); };
    rec.onaudiostart = () => bump('audio');
    rec.onsoundstart = () => bump('sound');
    rec.onspeechstart = () => bump('speech');
    rec.onnomatch = () => bump('nomatch');
    rec.onerror = e => {
      bump('err:' + e.error); D.lastErr = e.error + (e.message ? ' ' + e.message : '');
      if (e.error === 'not-allowed' || e.error === 'service-not-allowed'){ recOn = false; micStatus(false, 'MIC BLOCKED — ALLOW MICROPHONE ACCESS'); rec = null; }
      else if (e.error === 'network'){ micStatus(false, 'SPEECH SERVICE UNREACHABLE — CHECK INTERNET'); }
      else if (e.error === 'audio-capture'){ micStatus(false, 'NO MICROPHONE FOUND'); }
    };
    rec.onend = () => { bump('end'); recOn = false; if (rec) setTimeout(() => { try{ rec.start(); }catch{} }, 250); };
    rec.onresult = e => {
      // barge-in: listen for "stop" even while Spikey is talking or thinking
      if (JV.speaking || JV.mode === 'thinking'){
        for (let i = e.resultIndex; i < e.results.length; i++){
          const r = e.results[i];
          for (let a = 0; a < r.length; a++){
            if (heardStop(r[a].transcript)){
              if (JV.speaking) stopTalking('voice');
              else { dropReply = true; setMode('idle', 'CANCELLED'); }
              return;
            }
          }
        }
      }
      if (JV.mode === 'thinking') return;
      bump('result');
      try{ D.lastText = e.results[e.results.length-1][0].transcript; }catch{}
      if (JV.speaking && !SELFTEST) return;
      for (let i = e.resultIndex; i < e.results.length; i++){
        const r = e.results[i];
        // check every alternative the recognizer offers for the wake word
        let text = r[0].transcript, hit = null;
        for (let a = 0; a < r.length; a++){ const mm = r[a].transcript.match(WAKE); if (mm){ hit = mm; text = r[a].transcript; break; } }
        const awakeNow = Date.now() < awakeUntil;
        const inConvo = JV.convo && Date.now() < convoUntil && JV.mode !== 'thinking';
        const tr = $('transcript');
        if (tr){ tr.textContent = text.trim(); tr.dataset.live = (hit || awakeNow || inConvo) ? '1' : '0'; }
        if (inConvo && !r.isFinal) convoUntil = Math.max(convoUntil, Date.now() + 6000);   // he's mid-sentence: don't close on him
        if (hit && !r.isFinal && JV.mode === 'idle'){ awakeUntil = Date.now() + 8000; JV.awake = true; setMode('listening'); }
        if (!r.isFinal) continue;
        if (hit){
          const after = text.slice(hit.index + hit[0].length).replace(/^[\s,.!?]+/, '');
          if (JV.mode === 'sleep'){ if (after) run(after); }
          else if (after) run(after);
          else wake();
        } else if (awakeNow){
          run(text);
        } else if (inConvo && Date.now() - lastSpokeEnd > 900){          // ignore the tail of Spikey's own voice
          const words = text.trim().split(/\s+/).length;
          if (words >= 2 || /^(yes|yeah|yep|no|nope|pause|skip|next|stop|thanks|bye)$/i.test(text.trim())) run(text, true);
        }
      }
    };
    try{ rec.start(); }catch{}
  }

  // push-to-talk: Space (when not typing) or click the orb
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && JV.speaking){ stopTalking('esc'); return; }
    if (e.code === 'Space' && document.activeElement !== cmdBox){ e.preventDefault(); if (JV.speaking) stopTalking('space'); wake(); }
  });
  const orb = $('orb'); if (orb) orb.addEventListener('click', () => { if (JV.speaking) stopTalking('click'); else wake(); });

  // ---------- boot ----------
  async function boot(){
    setMode('idle', 'SYSTEMS ONLINE');
    await new Promise(r => setTimeout(r, 1500));
    await Promise.race([window.JV_coleReady || Promise.resolve(), new Promise(r => setTimeout(r, 6000))]);   // let Cole's numbers load first
    // a quiet self-update (new version published) shouldn't replay the whole docking briefing
    let silent = false; try{ silent = sessionStorage.getItem('spikey.silentReload') === '1'; sessionStorage.removeItem('spikey.silentReload'); }catch{}
    if (silent){ setMode('idle', 'UPDATED'); return; }
    const p = opening(`${greetingWord()}, ${CONFIG.name}. Docking complete. All systems online.`);
    setTimeout(() => {
      if ('speechSynthesis' in window && !JV.speaking && !speechSynthesis.speaking){ const a = $('activate'); if (a) a.classList.add('show'); }
    }, 2500);
    await p;
    if (JV.mode !== 'sleep') setMode('idle');
  }
  const act = $('activate');
  if (act) act.addEventListener('click', () => {
    act.classList.remove('show'); audioCtx();
    opening(`${greetingWord()}, ${CONFIG.name}. All systems online.`);
    if (!recOn) startRec();
  });
  document.addEventListener('click', () => audioCtx(), {once:true});

  let lastSym = null;
  const applySym = sym => { if (sym && sym !== lastSym && window.JV_setSymbol){ lastSym = sym; window.JV_setSymbol(sym); } };
  if (bus) bus.onmessage = e => { if (e.data && e.data.type === 'symbol') applySym(e.data.symbol); };
  window.addEventListener('storage', e => {
    if (e.key === 'jarvis.tasks' && !coleOn()){ tasks = store.get('tasks', []); renderTasks(); }
    if (e.key === 'jarvis.symbol') applySym(store.get('symbol', null));
  });
  if (SIDE){
    setMode('idle', 'MARKETS LINK ACTIVE');
    // The side screen may run in its own Edge window/profile, so it listens for chart commands itself.
    if (SR){
      const r = new SR(); r.continuous = true; r.interimResults = false; r.lang = 'en-US'; r.maxAlternatives = 3;
      r.onresult = e => {
        for (let i = e.resultIndex; i < e.results.length; i++){
          for (let a = 0; a < e.results[i].length; a++){
            const t = e.results[i][a].transcript.toLowerCase();
            if (!WAKE.test(t) || !/(chart|show|switch|pull up|change|put up|load)/.test(t)) continue;
            const k = Object.keys(SYMBOLS).find(k => t.includes(k));
            if (k){ applySym(SYMBOLS[k]); set('stateLabel', 'CHART · ' + k.toUpperCase()); setTimeout(() => set('stateLabel','MARKETS LINK ACTIVE'), 4000); return; }
          }
        }
      };
      r.onend = () => setTimeout(() => { try{ r.start(); }catch{} }, 300);
      try{ r.start(); }catch{}
    }
    return;
  }
  startRec();
  startMeter();
  boot();
  if (SELFTEST){
    const phrase = () => { const u = new SpeechSynthesisUtterance('Testing, one two three. Spikey, what time is it?'); u.volume = 1; speechSynthesis.speak(u); bump('selftest-say'); };
    setTimeout(phrase, 16000); setInterval(phrase, 25000);
  }
})();

/* ===== auto-update: when a new Spikey is published, reload itself while idle ===== */
(() => {
  let base = null;
  const sig = t => t.length + ':' + (t.match(/Spikey[^<]{0,0}/g) || []).length + ':' + t.slice(-400);
  async function check(){
    try{
      const t = await (await fetch(location.pathname + '?v=' + Date.now(), {cache:'no-store'})).text();
      const s = sig(t);
      if (base === null){ base = s; return; }
      if (s !== base){
        const J = window.JV || {};
        if (J.mode === 'idle' && !J.speaking && !J.awake && !document.querySelector('#setupPanel.show')){ try{ sessionStorage.setItem('spikey.silentReload', '1'); }catch{} location.reload(); }
      }
    }catch{}
  }
  check(); setInterval(check, 90000);
})();

