(() => {
  const core = FX.mk('fx'), bg = FX.mk('bgfx');
  const sparks = Array.from({length:70}, () => ({x:Math.random(), y:Math.random(), v:.0005 + Math.random()*.0015, s:Math.random()}));
  function drawBg(){
    if (!bg) return; const {ctx,W,H,D} = bg; ctx.clearRect(0,0,W,H);
    for (const p of sparks){ p.y -= p.v; if (p.y < -.02){ p.y = 1.02; p.x = Math.random(); }
      ctx.fillStyle = `rgba(255,${150 + p.s*80|0},80,${.15 + p.s*.35})`; ctx.fillRect(p.x*W, p.y*H, 1.6*D, 1.6*D); }
  }
  function frame(now){
    const t = now/1000, L = FX.lvl(), JV = window.JV || {};
    drawBg();
    if (core){
      const {ctx,W,H,D} = core; ctx.clearRect(0,0,W,H);
      const cx = W/2, cy = H/2, R = Math.min(W,H)*0.3;
      const sleep = JV.mode === 'sleep', lis = JV.mode === 'listening', hot = JV.speaking;
      const fade = sleep ? .3 : 1, pulse = 1 + L*.12 + .015*Math.sin(t*2.2);
      const core_c = hot ? '255,236,200' : lis ? '200,255,240' : '180,240,255';
      // outer casing: brushed gold ring
      let g = ctx.createRadialGradient(cx,cy,R*.9,cx,cy,R*1.12);
      g.addColorStop(0,'rgba(120,70,20,.0)'); g.addColorStop(.4,`rgba(255,200,87,${.55*fade})`); g.addColorStop(.7,`rgba(140,80,25,${.5*fade})`); g.addColorStop(1,'rgba(0,0,0,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx,cy,R*1.12,0,Math.PI*2); ctx.fill();
      // red hot-rod ring with bolts
      ctx.lineWidth = 10*D; ctx.strokeStyle = `rgba(200,30,35,${.9*fade})`; ctx.beginPath(); ctx.arc(cx,cy,R*1.0,0,Math.PI*2); ctx.stroke();
      for (let i = 0; i < 12; i++){ const a = i/12*Math.PI*2 + .13;
        ctx.fillStyle = `rgba(255,210,120,${.9*fade})`; ctx.beginPath(); ctx.arc(cx + Math.cos(a)*R, cy + Math.sin(a)*R, 3.2*D, 0, Math.PI*2); ctx.fill(); }
      // copper coil segments (10), light up with voice
      for (let i = 0; i < 10; i++){
        const a0 = i/10*Math.PI*2 + t*.05, a1 = a0 + Math.PI*2/10 - .07;
        const lit = .35 + .65*Math.max(0, Math.sin(t*3 - i*.63 + L*6)) * (.3 + L);
        ctx.lineWidth = R*.2; ctx.strokeStyle = `rgba(255,${120 + lit*110|0},60,${(.35 + lit*.55)*fade})`;
        ctx.beginPath(); ctx.arc(cx,cy,R*.77,a0,a1); ctx.stroke();
        ctx.lineWidth = 1*D; ctx.strokeStyle = `rgba(40,10,5,.8)`;
        for (let k = 1; k < 6; k++){ const a = a0 + (a1-a0)*k/6; ctx.beginPath(); ctx.moveTo(cx + Math.cos(a)*R*.67, cy + Math.sin(a)*R*.67); ctx.lineTo(cx + Math.cos(a)*R*.87, cy + Math.sin(a)*R*.87); ctx.stroke(); }
      }
      // inner glow
      g = ctx.createRadialGradient(cx,cy,0,cx,cy,R*.72*pulse);
      g.addColorStop(0,`rgba(255,255,255,${.95*fade})`); g.addColorStop(.35,`rgba(${core_c},${.75*fade})`); g.addColorStop(1,'rgba(0,0,0,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx,cy,R*.72*pulse,0,Math.PI*2); ctx.fill();
      // Mark VI triangle
      ctx.save(); ctx.translate(cx,cy); ctx.rotate(-Math.PI/2);
      const tr = R*.5*pulse; ctx.lineWidth = 7*D; ctx.lineJoin = 'round';
      ctx.shadowColor = `rgba(${core_c},1)`; ctx.shadowBlur = 30*D*(.6 + L);
      ctx.strokeStyle = `rgba(255,255,255,${.95*fade})`; ctx.beginPath();
      for (let k = 0; k < 3; k++){ const a = k/3*Math.PI*2; k ? ctx.lineTo(Math.cos(a)*tr, Math.sin(a)*tr) : ctx.moveTo(Math.cos(a)*tr, Math.sin(a)*tr); }
      ctx.closePath(); ctx.stroke();
      ctx.lineWidth = 2*D; ctx.strokeStyle = `rgba(${core_c},${.8*fade})`; ctx.beginPath();
      for (let k = 0; k < 3; k++){ const a = k/3*Math.PI*2; k ? ctx.lineTo(Math.cos(a)*tr*.62, Math.sin(a)*tr*.62) : ctx.moveTo(Math.cos(a)*tr*.62, Math.sin(a)*tr*.62); }
      ctx.closePath(); ctx.stroke(); ctx.restore(); ctx.shadowBlur = 0;
      // outer gold instrument ring + readout arcs
      ctx.save(); ctx.translate(cx,cy); ctx.rotate(t*.08); ctx.setLineDash([2*D, 9*D]); ctx.lineWidth = 1.5*D;
      ctx.strokeStyle = `rgba(255,200,87,${.5*fade})`; ctx.beginPath(); ctx.arc(0,0,R*1.32,0,Math.PI*2); ctx.stroke(); ctx.restore();
      ctx.setLineDash([]); ctx.lineWidth = 4*D;
      ctx.strokeStyle = `rgba(255,75,62,${.9*fade})`; ctx.beginPath(); ctx.arc(cx,cy,R*1.45,-Math.PI*.85,-Math.PI*.85 + Math.PI*.5*(.3 + L*1.4)); ctx.stroke();
      ctx.strokeStyle = `rgba(255,200,87,${.9*fade})`; ctx.beginPath(); ctx.arc(cx,cy,R*1.45,Math.PI*.15,Math.PI*.15 + Math.PI*.5*(.55 + .1*Math.sin(t))); ctx.stroke();
      ctx.fillStyle = `rgba(255,200,87,${.7*fade})`; ctx.font = `${11*D}px 'IBM Plex Mono', monospace`; ctx.textAlign = 'center';
      ctx.fillText('OUTPUT ' + (3 + L*0.9).toFixed(2) + ' GJ/s', cx, cy + R*1.62);
      ctx.fillText(sleep ? 'STANDBY' : hot ? 'VOICE · TRANSMITTING' : lis ? 'VOICE · RECEIVING' : 'REACTOR · STABLE', cx, cy - R*1.56);
    }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
})();
