(() => {
  const core = FX.mk('fx'), bg = FX.mk('bgfx');
  // palette comes from CSS vars (r,g,b triplets) so variants can recolor without touching code
  let P = {};
  const read = () => { const g = n => FX.rgb(n) || '255,255,255';
    P = {top:g('--r-top'), bot:g('--r-bot'), speak:g('--r-speak'), listen:g('--r-listen'), arc:g('--r-arc'), g1:g('--r-glow1'), g2:g('--r-glow2'), ring:g('--r-ring')}; };
  read(); setInterval(read, 1000);
  const mix = (a, b, k) => { const A = a.split(',').map(Number), B = b.split(',').map(Number); return A.map((v,i) => Math.round(v + (B[i]-v)*k)).join(','); };
  function drawBg(t){
    if (!bg) return; const {ctx,W,H} = bg; ctx.clearRect(0,0,W,H);
    const g1 = ctx.createRadialGradient(W*.3 + Math.sin(t*.1)*W*.05, H*.2, 0, W*.3, H*.2, W*.5);
    g1.addColorStop(0,`rgba(${P.g1},.18)`); g1.addColorStop(1,'rgba(0,0,0,0)'); ctx.fillStyle = g1; ctx.fillRect(0,0,W,H);
    const g2 = ctx.createRadialGradient(W*.75, H*.85 + Math.cos(t*.12)*H*.04, 0, W*.75, H*.85, W*.45);
    g2.addColorStop(0,`rgba(${P.g2},.13)`); g2.addColorStop(1,'rgba(0,0,0,0)'); ctx.fillStyle = g2; ctx.fillRect(0,0,W,H);
  }
  let last = 0;
  function frame(now){
    const t = now/1000, L = FX.lvl(), JV = window.JV || {};
    if (now - last > 100){ drawBg(t); last = now; }
    if (core){
      const {ctx,W,H,D} = core; ctx.clearRect(0,0,W,H);
      const sleep = JV.mode === 'sleep', hot = JV.speaking, lis = JV.mode === 'listening';
      const cx = W/2, cy = H/2, R = Math.min(W,H)*0.36;
      const lines = 34, pts = 90;
      for (let i = 0; i < lines; i++){
        const yy = -1 + 2*(i + .5)/lines, half = Math.sqrt(Math.max(0, 1 - yy*yy));
        const y0 = cy + yy*R;
        ctx.beginPath();
        for (let j = 0; j <= pts; j++){
          const u = -1 + 2*j/pts, x = cx + u*R*half;
          const env = Math.exp(-u*u*5);
          const n = Math.sin(u*9 + t*2.2 + i*.8)*.5 + Math.sin(u*23 - t*3.1 + i*1.7)*.3 + Math.sin(u*41 + t*5 + i*2.3)*.2;
          const amp = (sleep ? .03 : .12 + L*1.1 + (lis ? .15 : 0)) * env * R*.28;
          j ? ctx.lineTo(x, y0 - Math.abs(n)*amp) : ctx.moveTo(x, y0 - Math.abs(n)*amp);
        }
        const k = i/lines;
        const c = hot ? mix(P.speak, P.top, .15*(1-k)) : lis ? P.listen : mix(P.top, P.bot, k);
        const a = hot ? .4 + .5*k : .28 + .6*(1 - Math.abs(k - .5)*1.2);
        ctx.lineWidth = 1.6*D; ctx.strokeStyle = sleep ? 'rgba(122,115,140,.25)' : `rgba(${c},${a*(window.JV_ridgeDim ?? 1)})`;
        ctx.fillStyle = (window.JV_ridgeDim ?? 1) < 1 ? 'rgba(6,6,8,0)' : '#060608'; ctx.lineTo(cx + R*half, y0 + 4*D); ctx.lineTo(cx - R*half, y0 + 4*D); ctx.closePath(); ctx.fill(); ctx.stroke();
      }
      ctx.lineWidth = 1*D; ctx.strokeStyle = `rgba(${P.ring},.32)`; ctx.beginPath(); ctx.arc(cx,cy,R*1.12,0,Math.PI*2); ctx.stroke();
      ctx.lineWidth = 3*D; ctx.strokeStyle = `rgba(${P.arc},.95)`; ctx.beginPath(); ctx.arc(cx,cy,R*1.12,t*.4,t*.4 + .35 + L); ctx.stroke();
      ctx.beginPath(); ctx.arc(cx,cy,R*1.12,t*.4 + Math.PI,t*.4 + Math.PI + .12 + L*.4); ctx.stroke();
      ctx.fillStyle = 'rgba(230,225,240,.55)'; ctx.font = `${11*D}px 'JetBrains Mono', monospace`; ctx.textAlign = 'center';
      ctx.fillText('J.A.R.V.I.S — ' + (sleep ? 'STANDBY' : hot ? 'TRANSMITTING' : lis ? 'RECEIVING' : 'ONLINE'), cx, cy + R*1.24);
    }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
})();
