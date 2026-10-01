/* shared canvas helpers for the core + background */
const FX = (() => {
  const mk = (id) => {
    const cv = document.getElementById(id); if (!cv) return null;
    const o = {cv, ctx: cv.getContext('2d'), W:0, H:0, D:1};
    const rs = () => { o.D = Math.min(2, devicePixelRatio||1); const r = cv.getBoundingClientRect(); o.W = cv.width = Math.max(1,r.width*o.D); o.H = cv.height = Math.max(1,r.height*o.D); };
    addEventListener('resize', rs); setTimeout(rs, 60); rs(); return o;
  };
  const rgb = n => getComputedStyle(document.body).getPropertyValue(n).trim();
  let smooth = 0;
  const lvl = () => { const JV = window.JV || {level:0}; smooth += ((JV.level||0) - smooth)*0.12; return smooth; };
  return {mk, rgb, lvl};
})();
