/* ===== Spikey learns: rules and voice shortcuts it picks up while running (shared with Cole) ===== */
(() => {
  if (new URLSearchParams(location.search).get('screen') === 'side') return;
  const LS = 'spikey.learned', DOC = 'spikey/learned';
  const norm = t => String(t || '').toLowerCase().replace(/[^a-z0-9' ]+/g, ' ').replace(/\s+/g, ' ').trim();
  const blank = () => ({rules: [], shortcuts: [], removed: []});
  let L = (() => { try{ return Object.assign(blank(), JSON.parse(localStorage.getItem(LS) || '{}')); }catch{ return blank(); } })();

  function save(){
    try{ localStorage.setItem(LS, JSON.stringify(L)); }catch{}
    if (window.JV_coleSaveDoc) window.JV_coleSaveDoc(DOC, L).catch(() => {});
    window.dispatchEvent(new Event('spikey-learned'));
  }
  // merge what Cole has (learned on another device) with what this window has
  async function sync(){
    try{
      await window.JV_coleReady;
      const remote = window.JV_coleGetDoc && await window.JV_coleGetDoc(DOC);
      if (!remote) { if (L.rules.length || L.shortcuts.length) save(); return; }
      const removed = new Set([...(L.removed || []), ...(remote.removed || [])]);
      const mergeBy = (a, b, key) => { const m = new Map(); [...a, ...b].forEach(x => { if (!x) return; const k = norm(x[key]); if (removed.has(k)) return; const o = m.get(k); if (!o || (x.at || 0) > (o.at || 0)) m.set(k, x); }); return [...m.values()]; };
      L = {rules: mergeBy(L.rules, remote.rules || [], 'text'), shortcuts: mergeBy(L.shortcuts, remote.shortcuts || [], 'phrase'), removed: [...removed].slice(-200)};
      save();
    }catch{}
  }
  sync();
  let synced = false; window.addEventListener('cole-update', () => { if (!synced && window.JV_coleSignedIn && window.JV_coleSignedIn()){ synced = true; sync(); } });

  const api = {
    list: () => JSON.parse(JSON.stringify({rules: L.rules, shortcuts: L.shortcuts})),
    remember(text){
      text = String(text || '').trim(); if (!text) return 'Nothing to learn.';
      const k = norm(text);
      L.removed = (L.removed || []).filter(r => r !== k);
      L.rules = L.rules.filter(r => norm(r.text) !== k); L.rules.push({text, at: Date.now()});
      if (L.rules.length > 60) L.rules.shift();
      save(); return 'Learned: ' + text;
    },
    teach(phrase, command){
      phrase = norm(phrase); command = String(command || '').trim();
      if (!phrase || !command) return 'I need both the phrase and what to do.';
      L.removed = (L.removed || []).filter(r => r !== phrase);
      L.shortcuts = L.shortcuts.filter(s => norm(s.phrase) !== phrase); L.shortcuts.push({phrase, command, at: Date.now()});
      save(); return `Got it. When you say "${phrase}", I will ${command}.`;
    },
    forget(query){
      const q = norm(query); if (!q) return 'Forget what?';
      const hit = x => { const t = norm(x); return t === q || t.includes(q) || q.includes(t); };
      const gone = [...L.rules.filter(r => hit(r.text)).map(r => r.text), ...L.shortcuts.filter(s => hit(s.phrase) || hit(s.command)).map(s => s.phrase)];
      if (!gone.length) return "I didn't find anything like that in what I've learned.";
      L.rules = L.rules.filter(r => !hit(r.text)); L.shortcuts = L.shortcuts.filter(s => !(hit(s.phrase) || hit(s.command)));
      L.removed = [...(L.removed || []), ...gone.map(norm)].slice(-200);
      save(); return 'Forgot: ' + gone.join('; ');
    },
    removeAt(kind, i){ const arr = kind === 'rule' ? L.rules : L.shortcuts; const [x] = arr.splice(i, 1); if (x) L.removed = [...(L.removed || []), norm(x.text || x.phrase)].slice(-200); save(); },
    // exact (or near-exact) shortcut phrase → the command to run instead
    match(text){ const t = norm(text); const s = L.shortcuts.find(x => x.phrase === t || t === x.phrase.replace(/^(let'?s|lets) /, '')); return s ? s.command : null; },
    prompt(){
      if (!L.rules.length && !L.shortcuts.length) return '';
      return '\nThings Nick has taught you (follow them; newer ones win over older ones):\n' +
        L.rules.map(r => '- ' + r.text).join('\n') +
        (L.shortcuts.length ? '\nHis voice shortcuts: ' + L.shortcuts.map(s => `"${s.phrase}" means: ${s.command}`).join('; ') : '');
    }
  };
  window.JV_learn = api;
})();
