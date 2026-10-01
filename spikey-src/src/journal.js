/* ===== Journal screen: every Cole journal entry, grouped into its own category ===== */
(() => {
  if (new URLSearchParams(location.search).get('screen') === 'side') return;
  const CATS = [
    {k:'trading',  name:'TRADING'},
    {k:'journal',  name:'PERSONAL'},
    {k:'family',   name:'FAMILY'},
    {k:'business', name:'BUSINESS'},
    {k:'fitness',  name:'FITNESS'},
    {k:'ideas',    name:'IDEAS'}
  ];
  const esc = t => String(t).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'})[c]);
  const pad = n => String(n).padStart(2, '0');
  const keyOf = d => `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
  const nice = k => new Date(k + 'T12:00:00').toLocaleDateString('en-US', {weekday:'short', month:'short', day:'numeric'});

  // all entries from Cole, grouped by category, newest first
  function grouped(from, to){
    const days = window.JV_coleDays || {}, g = {};
    CATS.forEach(c => g[c.k] = []);
    Object.keys(days).sort().reverse().filter(k => (!from || k >= from) && (!to || k <= to)).forEach(k => {
      const d = days[k] || {};
      (d.journal || []).filter(j => j && j.text && !j.hidden && j.tag !== 'raw').forEach(j => (g[g[j.tag] ? j.tag : 'journal']).push({date:k, text:String(j.text), at:j.at || 0}));
      (d.ideas || []).filter(x => x && x.text).forEach(x => g.ideas.push({date:k, text:(x.area && x.area !== 'other' ? x.area + ': ' : '') + x.text, at:x.at || 0}));
    });
    Object.values(g).forEach(a => a.sort((x, y) => (y.date.localeCompare(x.date)) || (y.at - x.at)));
    return g;
  }
  function rangeOf(r){
    const now = new Date(), t = keyOf(now);
    if (r === 'today') return [t, t];
    if (r === 'week'){ const m = new Date(now); m.setDate(now.getDate() - ((now.getDay() + 6) % 7)); return [keyOf(m), t]; }
    if (r === 'month'){ const m = new Date(now.getFullYear(), now.getMonth(), 1); return [keyOf(m), t]; }
    return [null, null];
  }

  const css = document.createElement('style');
  css.textContent = `
  #jrPanel{position:fixed;inset:66px 14px 66px 14px;z-index:19;display:flex;flex-direction:column;gap:12px;
    background:linear-gradient(160deg,#1a0a10,#08070c);border:1px solid var(--a2);border-radius:14px;padding:16px 18px;
    box-shadow:0 0 60px rgba(181,123,255,.18);opacity:0;transform:scale(.96) translateY(14px);pointer-events:none;transition:opacity .45s,transform .6s cubic-bezier(.2,.9,.2,1)}
  #jrPanel.open{opacity:1;transform:none;pointer-events:auto}
  #jrPanel .hd{display:flex;align-items:center;gap:10px;flex-wrap:wrap}
  #jrPanel .hd h2{font:600 13px var(--f-mono);letter-spacing:.34em;color:var(--a2);margin-right:8px}
  #jrPanel .hd .sp{flex:1}
  #jrPanel button{font:600 11px var(--f-mono);letter-spacing:.14em;padding:8px 12px;border:1px solid var(--line);background:rgba(255,255,255,.04);color:var(--txt);cursor:pointer;border-radius:8px}
  #jrPanel button.on{border-color:var(--a);color:#fff;background:rgba(255,34,51,.18)}
  #jrPanel .cols{flex:1;min-height:0;display:grid;grid-template-columns:repeat(3,1fr);grid-auto-rows:minmax(0,1fr);gap:12px}
  #jrPanel .cat{display:flex;flex-direction:column;min-height:0;border:1px solid var(--line);border-radius:10px;background:rgba(255,255,255,.025)}
  #jrPanel .cat h3{display:flex;justify-content:space-between;font:600 11px var(--f-mono);letter-spacing:.26em;color:var(--a);padding:10px 12px;border-bottom:1px solid var(--line)}
  #jrPanel .cat h3 em{font-style:normal;color:var(--mute)}
  #jrPanel .cat ul{list-style:none;margin:0;padding:6px 12px 10px;overflow:auto;flex:1}
  #jrPanel .cat li{padding:8px 0;border-bottom:1px solid rgba(255,255,255,.06);font-size:14px;line-height:1.4;color:var(--hi)}
  #jrPanel .cat li small{display:block;font:500 10.5px var(--f-mono);letter-spacing:.12em;color:var(--mute);margin-bottom:2px}
  #jrPanel .cat .none{color:var(--mute);font-size:13px;padding:10px 0}
  #jrPanel .msg{color:var(--mute);font-size:14px}`;
  document.head.appendChild(css);

  const panel = document.createElement('section');
  panel.id = 'jrPanel';
  document.body.appendChild(panel);
  let range = 'all', shown = false;

  function draw(){
    const [from, to] = rangeOf(range);
    const g = grouped(from, to);
    const total = Object.values(g).reduce((s, a) => s + a.length, 0);
    panel.innerHTML = `
      <div class="hd"><h2>JOURNAL</h2>
        ${['today','week','month','all'].map(r => `<button data-r="${r}" class="${r === range ? 'on' : ''}">${r === 'all' ? 'ALL' : r === 'today' ? 'TODAY' : 'THIS ' + r.toUpperCase()}</button>`).join('')}
        <span class="sp"></span><span class="msg">${total} entr${total === 1 ? 'y' : 'ies'} · from Cole</span><button id="jrClose">CLOSE ✕</button></div>
      ${window.JV_coleSignedIn && !window.JV_coleSignedIn() ? '<p class="msg">Cole is still connecting…</p>' : ''}
      <div class="cols">${CATS.map(c => `<div class="cat"><h3>${c.name}<em>${g[c.k].length}</em></h3><ul>${
        g[c.k].length ? g[c.k].map(e => `<li><small>${nice(e.date)}</small>${esc(e.text)}</li>`).join('') : '<li class="none">Nothing here yet.</li>'}</ul></div>`).join('')}</div>`;
    panel.querySelectorAll('[data-r]').forEach(b => b.onclick = () => { range = b.dataset.r; draw(); });
    panel.querySelector('#jrClose').onclick = hide;
    return g;
  }
  function show(r){
    if (r) range = r;
    window.dispatchEvent(new CustomEvent('spikey-screen', {detail:'journal'}));
    const g = draw(); shown = true; panel.classList.add('open');
    return g;
  }
  function hide(){ shown = false; panel.classList.remove('open'); }
  window.addEventListener('spikey-screen', e => { if (e.detail !== 'journal' && shown) hide(); });
  window.addEventListener('cole-update', () => { if (shown) draw(); });

  // spoken summary: how many per category, plus the newest one in each
  function spoken(g, r){
    const label = r === 'today' ? 'today' : r === 'week' ? 'this week' : r === 'month' ? 'this month' : 'in total';
    const parts = CATS.filter(c => g[c.k].length).map(c => `${g[c.k].length} ${c.name.toLowerCase()}`);
    if (!parts.length) return `No journal entries ${label === 'in total' ? 'yet' : label}.`;
    const last = parts.length > 1 ? parts.slice(0, -1).join(', ') + ' and ' + parts[parts.length - 1] : parts[0];
    const newest = CATS.filter(c => g[c.k].length).slice(0, 3).map(c => `Latest ${c.name.toLowerCase()}: ${g[c.k][0].text}`).join('. ');
    return `Here are all your journal entries ${label === 'in total' ? '' : label + ' '}by category: ${last}. ${newest}.`;
  }

  window.JV_journal = {
    show, hide, isOpen: () => shown, grouped, rangeOf,
    open: r => { const rr = r || 'all'; const g = show(rr); return spoken(g, rr); },
    text: (from, to) => { const g = grouped(from, to); const o = {}; CATS.forEach(c => { if (g[c.k].length) o[c.name.toLowerCase()] = g[c.k].map(e => e.date + ': ' + e.text); }); return o; }
  };
})();
