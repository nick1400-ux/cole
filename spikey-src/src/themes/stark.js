(() => {
  const core = FX.mk('fx'), bg = FX.mk('bgfx');
  const glyphs = 'J.A.R.V.I.S // STARK INDUSTRIES // MK-VII TELEMETRY // ARC 3.0 GJ OUTPUT NOMINAL // ';
  function hexbg(t){
    if (!bg) return; const {ctx,W,H,D} = bg; ctx.clearRect(0,0,W,H);
    const s = 34*D, h = s*Math.sqrt(3)/2; ctx.lineWidth = 1*D;
    for (let y = 0, r = 0; y < H + h; y += h, r++){
      for (let x = (r%2)*s*0.75; x < W + s; x += s*1.5){
        const dx = (x - W/2)/W, dy = (y - H*.42)/H, d = Math.sqrt(dx*dx+dy*dy);
        const a = Math.max(0, .16 - d*.25) * (0.6 + 0.4*Math.sin(t*1.2 + x*.01 + y*.013));
        if (a < .01) continue;
        ctx.strokeStyle = `rgba(79,210,255,${a})`; ctx.beginPath();
        for (let k = 0; k < 6; k++){ const an = Math.PI/3*k; const px = x + s/2*Math.cos(an), py = y + s/2*Math.sin(an); k ? ctx.lineTo(px,py) : ctx.moveTo(px,py); }
        ctx.closePath(); ctx.stroke();
      }
    }
  }
  let rot = 0, last = 0;
  function frame(now){
    const t = now/1000, L = FX.lvl(), JV = window.JV || {};
    if (now - last > 90){ hexbg(t); last = now; }
    if (core){
      const {ctx,W,H,D} = core; ctx.clearRect(0,0,W,H);
      const cx = W/2, cy = H/2, R = Math.min(W,H)*0.2;
      const hot = JV.speaking, lis = JV.mode === 'listening', sleep = JV.mode === 'sleep';
      const C = hot ? '255,138,61' : lis ? '190,245,255' : '79,210,255';
      const fade = sleep ? .25 : 1;
      // lens glow
      let g = ctx.createRadialGradient(cx,cy,0,cx,cy,R*2.6);
      g.addColorStop(0,`rgba(${C},${(.28+L*.35)*fade})`); g.addColorStop(.35,`rgba(${C},${.08*fade})`); g.addColorStop(1,'rgba(0,0,0,0)');
      ctx.fillStyle = g; ctx.fillRect(0,0,W,H);
      // horizontal flare
      g = ctx.createLinearGradient(cx - R*3.2, 0, cx + R*3.2, 0);
      g.addColorStop(0,'rgba(0,0,0,0)'); g.addColorStop(.5,`rgba(${C},${(.35+L*.4)*fade})`); g.addColorStop(1,'rgba(0,0,0,0)');
      ctx.fillStyle = g; ctx.fillRect(cx - R*3.2, cy - 1*D, R*6.4, 2*D);
      // wireframe globe
      rot += .004 + L*.03;
      const tilt = .42, ct = Math.cos(tilt), st = Math.sin(tilt), wob = 1 + L*.18;
      const P = (lat, lon) => {
        let x = Math.cos(lat)*Math.cos(lon + rot), y = Math.sin(lat), z = Math.cos(lat)*Math.sin(lon + rot);
        const y2 = y*ct - z*st, z2 = y*st + z*ct; return [cx + x*R*wob, cy + y2*R*wob, z2];
      };
      ctx.lineWidth = 1*D;
      for (let la = -75; la <= 75; la += 15){
        ctx.beginPath(); for (let lo = 0; lo <= 360; lo += 6){ const [x,y,z] = P(la*Math.PI/180, lo*Math.PI/180); lo ? ctx.lineTo(x,y) : ctx.moveTo(x,y); }
        ctx.strokeStyle = `rgba(${C},${.28*fade})`; ctx.stroke();
      }
      for (let lo = 0; lo < 360; lo += 15){
        ctx.beginPath(); for (let la = -90; la <= 90; la += 6){ const [x,y] = P(la*Math.PI/180, lo*Math.PI/180); la > -90 ? ctx.lineTo(x,y) : ctx.moveTo(x,y); }
        ctx.strokeStyle = `rgba(${C},${.2*fade})`; ctx.stroke();
      }
      // voice spikes
      const bins = 90, rr = R*1.32;
      ctx.strokeStyle = `rgba(${C},${.8*fade})`; ctx.lineWidth = 2*D; ctx.beginPath();
      for (let i = 0; i < bins; i++){
        const a = i/bins*Math.PI*2, v = L*(0.3 + 0.7*Math.abs(Math.sin(i*1.7 + t*8))) + .04;
        ctx.moveTo(cx + Math.cos(a)*rr, cy + Math.sin(a)*rr); ctx.lineTo(cx + Math.cos(a)*(rr + v*R*.45), cy + Math.sin(a)*(rr + v*R*.45));
      }
      ctx.stroke();
      // rings
      const ring = (r, w, dash, sp, al, col) => { ctx.save(); ctx.translate(cx,cy); ctx.rotate(t*sp); ctx.setLineDash(dash.map(d=>d*D)); ctx.lineWidth = w*D;
        ctx.strokeStyle = `rgba(${col||C},${al*fade})`; ctx.beginPath(); ctx.arc(0,0,r,0,Math.PI*2); ctx.stroke(); ctx.restore(); };
      ring(R*1.2, 1, [3,5], .1, .5);
      ring(R*1.75, 6, [2,7], -.05, .35);
      ring(R*1.95, 1.5, [160,40,30,40], .07, .6);
      ring(R*2.25, 1, [1,10], -.03, .4);
      ctx.save(); ctx.translate(cx,cy); ctx.rotate(-t*.15); ctx.setLineDash([]); ctx.lineWidth = 3*D;
      ctx.strokeStyle = `rgba(255,138,61,${.85*fade})`;
      for (let k = 0; k < 2; k++){ ctx.beginPath(); ctx.arc(0,0,R*2.08, k*Math.PI + .2, k*Math.PI + .75); ctx.stroke(); }
      ctx.restore();
      // orbiting glyph text
      ctx.save(); ctx.translate(cx,cy); ctx.rotate(t*.06);
      ctx.fillStyle = `rgba(${C},${.55*fade})`; ctx.font = `${11*D}px 'Share Tech Mono', monospace`; ctx.textAlign = 'center';
      const rt = R*2.45; for (let i = 0; i < glyphs.length; i++){ ctx.save(); ctx.rotate(i/glyphs.length*Math.PI*2); ctx.fillText(glyphs[i], 0, -rt); ctx.restore(); }
      ctx.restore();
      // crosshair ticks
      ctx.strokeStyle = `rgba(${C},${.5*fade})`; ctx.lineWidth = 1*D; ctx.setLineDash([]);
      [[1,0],[-1,0],[0,1],[0,-1]].forEach(([a,b]) => { ctx.beginPath(); ctx.moveTo(cx + a*R*2.62, cy + b*R*2.62); ctx.lineTo(cx + a*R*2.85, cy + b*R*2.85); ctx.stroke(); });
    }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
})();
