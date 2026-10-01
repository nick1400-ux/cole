/* ===== JARVIS ENGINE v2 — shared by every look ===== */
(() => {
  const CONFIG = {
    name: 'Nick',
    address: 'sir',
    lat: 25.7617, lon: -80.1918, city: 'Miami',
    sites: {
      youtube:'https://www.youtube.com', gmail:'https://mail.google.com', email:'https://mail.google.com',
      calendar:'https://calendar.google.com', tradingview:'https://www.tradingview.com/chart/',
      'trading view':'https://www.tradingview.com/chart/', spotify:'https://open.spotify.com',
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
    'gold':'OANDA:XAUUSD','bitcoin':'BITSTAMP:BTCUSD','btc':'BITSTAMP:BTCUSD','oil':'TVC:USOIL','dollar':'TVC:DXY'
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
  const saveTasks = () => { store.set('tasks', tasks); renderTasks(); };
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

  // ---------- mic level for the visuals ----------
  async function startMeter(){
    try{
      const stream = await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true, noiseSuppression:true}});
      const c = audioCtx(); const src = c.createMediaStreamSource(stream);
      const an = c.createAnalyser(); an.fftSize = 512; src.connect(an);
      const buf = new Uint8Array(an.fftSize);
      JV.analyser = an;
      const loop = () => {
        an.getByteTimeDomainData(buf);
        let sum = 0; for (let i = 0; i < buf.length; i++){ const v = (buf[i]-128)/128; sum += v*v; }
        const rms = Math.min(1, Math.sqrt(sum/buf.length) * 4.5);
        if (!JV.speaking) JV.level += (rms - JV.level) * 0.35;
        requestAnimationFrame(loop);
      };
      loop();
    }catch(e){ /* visuals still animate without it */ }
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

  let talkTimer = null;
  function say(text){
    set('reply', text);
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
      const done = () => { JV.speaking = false; document.body.dataset.speaking = '0'; clearInterval(talkTimer); JV.level = 0; res(); };
      u.onend = done; u.onerror = done;
      speechSynthesis.speak(u);
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

  function briefing(opening){
    holo('DAILY BRIEFING',
      row('Time', new Date().toLocaleTimeString([], {hour:'numeric',minute:'2-digit'})) +
      (weather ? row('Weather', `${weather.temp}° · ${esc(weather.cond)}`) : '') +
      row('Objectives', tasks.length) +
      (battery ? row('Power', Math.round(battery.level*100) + '%') : ''), 12000);
    return say([opening || `${greetingWord()}, ${CONFIG.name}.`, timeSentence(), weatherSentence(), taskSentence(), powerSentence()].join(' '));
  }

  const HELP = [
    ['briefing', 'Full rundown'], ['what time is it', 'Time'], ['weather', CONFIG.city + ' conditions'],
    ['add task …', 'New objective'], ['read my tasks', 'List objectives'], ['complete task 2', 'Remove one'],
    ['clear tasks', 'Remove all'], ['show US30 / NAS100 / gold', 'Switch chart'], ['open chart · close chart', 'Big chart'], ['open YouTube · Gmail · TradingView', 'Launch site'],
    ['go to sleep · wake up', 'Standby']
  ];
  const numWords = {one:1,two:2,to:2,too:2,three:3,four:4,for:4,five:5,six:6,seven:7,eight:8,nine:9,ten:10,first:1,second:2,third:3,fourth:4,fifth:5};

  async function handle(raw){
    const clean = raw.replace(/[.,!?]/g,'').trim();
    const text = clean.toLowerCase();
    if (!text) return;
    set('reply', '');

    if (JV.mode === 'sleep'){
      if (/wake up|come online|i'?m back|online/.test(text)){ setMode('idle'); return briefing(`Welcome back, ${CONFIG.name}.`); }
      return;
    }
    if (/go to sleep|stand ?by|sleep mode|power down|that'?s all/.test(text)){ await say(`Standing by, ${CONFIG.address}.`); return setMode('sleep'); }
    if (/brief|status report|rundown|catch me up|good (morning|afternoon|evening)/.test(text)) return briefing();
    if (/\btime\b/.test(text)) return say(timeSentence());
    if (/\bdate\b|what day/.test(text)) return say(`Today is ${new Date().toLocaleDateString([], {weekday:'long', month:'long', day:'numeric'})}.`);
    if (/weather|temperature|outside|rain/.test(text)){
      if (weather) holo('ATMOSPHERICS', `<div class="hbig">${weather.temp}°</div>` + row('Conditions', esc(weather.cond)) + row('Feels like', weather.feels + '°') + row('High / Low', `${weather.hi}° / ${weather.lo}°`) + row('Rain chance', weather.rain + '%'));
      return say(weatherSentence());
    }
    let m;
    if ((m = clean.match(/(?:add (?:a )?(?:task|objective|to ?do)(?: to)?|remind me to|new task)\s+(.+)/i))){
      const t = m[1].charAt(0).toUpperCase() + m[1].slice(1);
      tasks.push(t); saveTasks();
      return say(`Added: ${t}.`);
    }
    if ((m = text.match(/(?:complete|finish|remove|delete|done with|check off)\s+(?:task|objective|number)?\s*(\d+|one|two|to|too|three|four|for|five|six|seven|eight|nine|ten|first|second|third|fourth|fifth)\b/))){
      const n = /\d/.test(m[1]) ? parseInt(m[1]) : numWords[m[1]];
      if (!tasks[n-1]) return say(`There's no objective number ${n}.`);
      const [t] = tasks.splice(n-1, 1); saveTasks();
      return say(`Marked complete: ${t}. ${tasks.length} remaining.`);
    }
    if (/clear (all )?(my )?(tasks|objectives|list)/.test(text)){ tasks = []; saveTasks(); return say('Objectives cleared.'); }
    if (/(tasks|objectives|to ?do|agenda|my list)/.test(text)){
      if (tasks.length) holo('OBJECTIVES', tasks.map((t,i) => row(esc(t), pad(i+1))).join(''));
      return say(tasks.length ? `Your objectives: ${tasks.map((t,i) => `${i+1}, ${t}`).join('. ')}.` : taskSentence());
    }
    // --- charts ---
    if (/(close|hide|dismiss|minimi[sz]e) (the )?(big )?chart/.test(text)){ if (window.JV_bigChart) window.JV_bigChart(false); return say('Chart closed.'); }
    const symKey = Object.keys(SYMBOLS).find(k => text.includes(k));
    const wantsChart = /(chart|show|switch|pull up|change|put up|load|open)/.test(text);
    if (symKey && wantsChart){
      const sym = SYMBOLS[symKey];
      store.set('symbol', sym); if (bus) bus.postMessage({type:'symbol', symbol:sym});
      if (window.JV_setSymbol) window.JV_setSymbol(sym);
      if (/big|full|expand|open/.test(text) && window.JV_bigChart) window.JV_bigChart(true);
      return say(`${symKey.toUpperCase()} is up.`);
    }
    if (/(show|open|pull up|bring up|expand|big|full)( me)?( the| my)? (big |full )?chart/.test(text)){
      if (window.JV_bigChart) window.JV_bigChart(true);
      return say('Chart is up.');
    }
    if ((m = text.match(/(?:open|launch|pull up|bring up|go to)\s+(.+)/))){
      const target = m[1].replace(/^(the|my)\s+/,'').trim();
      const key = Object.keys(CONFIG.sites).find(k => target.includes(k));
      if (key){ window.open(CONFIG.sites[key], '_blank'); return say(`Opening ${key}.`); }
      return say(`I don't have ${target} on file yet, ${CONFIG.address}.`);
    }
    if (/battery|power|systems|diagnostic/.test(text)) return say(`${powerSentence() || 'Power telemetry unavailable.'} Network ${navigator.onLine ? 'online' : 'offline'}. All systems nominal.`);
    if (/help|what can you do|commands/.test(text)){
      holo('CAPABILITIES', HELP.map(([a,b]) => row('“' + a + '”', b)).join(''), 14000);
      return say('Here is what I can do so far.');
    }
    if (/thank/.test(text)) return say(`Always, ${CONFIG.address}.`);
    if (/who are you|your name/.test(text)) return say(`I'm Spikey. Sledge B's own assistant. By outcasts, for outcasts.`);
    if (/^(hello|hey|hi)\b/.test(text)) return say(`${greetingWord()}, ${CONFIG.name}.`);
    return say(`That's beyond my current protocols, ${CONFIG.address}. Say "help" to see what I can do.`);
  }

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

  async function run(cmd){
    JV.awake = false; awakeUntil = 0;
    if (JV.mode !== 'sleep') setMode('thinking');
    const before = Date.now();
    await handle(cmd);
    logComms(cmd, ($('reply') || {}).textContent || '');
    if (JV.mode !== 'sleep') setMode('idle');
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
    rec.onstart = () => { recOn = true; micStatus(true, 'SAY “SPIKEY…” · OR PRESS SPACE'); };
    rec.onerror = e => {
      if (e.error === 'not-allowed' || e.error === 'service-not-allowed'){ recOn = false; micStatus(false, 'MIC BLOCKED — ALLOW MICROPHONE ACCESS'); rec = null; }
      else if (e.error === 'network'){ micStatus(false, 'SPEECH SERVICE UNREACHABLE — RETRYING'); }
    };
    rec.onend = () => { recOn = false; if (rec) setTimeout(() => { try{ rec.start(); }catch{} }, 250); };
    rec.onresult = e => {
      if (JV.speaking) return;
      for (let i = e.resultIndex; i < e.results.length; i++){
        const r = e.results[i];
        // check every alternative the recognizer offers for the wake word
        let text = r[0].transcript, hit = null;
        for (let a = 0; a < r.length; a++){ const mm = r[a].transcript.match(WAKE); if (mm){ hit = mm; text = r[a].transcript; break; } }
        const awakeNow = Date.now() < awakeUntil;
        const tr = $('transcript');
        if (tr){ tr.textContent = text.trim(); tr.dataset.live = (hit || awakeNow) ? '1' : '0'; }
        if (hit && !r.isFinal && JV.mode === 'idle'){ awakeUntil = Date.now() + 8000; JV.awake = true; setMode('listening'); }
        if (!r.isFinal) continue;
        if (hit){
          const after = text.slice(hit.index + hit[0].length).replace(/^[\s,.!?]+/, '');
          if (JV.mode === 'sleep'){ if (after) run(after); }
          else if (after) run(after);
          else wake();
        } else if (awakeNow){
          run(text);
        }
      }
    };
    try{ rec.start(); }catch{}
  }

  // push-to-talk: Space (when not typing) or click the orb
  document.addEventListener('keydown', e => {
    if (e.code === 'Space' && document.activeElement !== cmdBox){ e.preventDefault(); wake(); }
  });
  const orb = $('orb'); if (orb) orb.addEventListener('click', wake);

  // ---------- boot ----------
  async function boot(){
    setMode('idle', 'SYSTEMS ONLINE');
    await new Promise(r => setTimeout(r, 1500));
    const p = briefing(`${greetingWord()}, ${CONFIG.name}. Docking complete. All systems online.`);
    setTimeout(() => {
      if ('speechSynthesis' in window && !JV.speaking && !speechSynthesis.speaking){ const a = $('activate'); if (a) a.classList.add('show'); }
    }, 2500);
    await p;
    if (JV.mode !== 'sleep') setMode('idle');
  }
  const act = $('activate');
  if (act) act.addEventListener('click', () => {
    act.classList.remove('show'); audioCtx();
    briefing(`${greetingWord()}, ${CONFIG.name}. All systems online.`);
    if (!recOn) startRec();
  });
  document.addEventListener('click', () => audioCtx(), {once:true});

  let lastSym = null;
  const applySym = sym => { if (sym && sym !== lastSym && window.JV_setSymbol){ lastSym = sym; window.JV_setSymbol(sym); } };
  if (bus) bus.onmessage = e => { if (e.data && e.data.type === 'symbol') applySym(e.data.symbol); };
  window.addEventListener('storage', e => {
    if (e.key === 'jarvis.tasks'){ tasks = store.get('tasks', []); renderTasks(); }
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
})();
