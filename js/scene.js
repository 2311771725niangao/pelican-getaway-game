// 背景：天空、太阳、星星、云、远岛、灯塔、帆船、海面，以及随“日落进度 tod(0~1)”变化的调色板
(function () {
  const G = window.G, TAU = G.TAU, L = G.L, R = G.Roadside;
  const S = (G.Scene = {});

  // 三个关键帧：黄金时刻 → 落日 → 暮色
  const T = {
    skyTop: ['#5a5bb5', '#3b2f87', '#16123f'], skyMid: ['#d9739b', '#b0508f', '#3d2a78'],
    skyLow: ['#ff9a6c', '#ff6f61', '#8a3f8f'], skyHor: ['#ffd58a', '#ffb45e', '#f0785f'],
    sunCol: ['#fff3b8', '#ffc46b', '#ff7a55'], sunGlow: ['#ffbe6e', '#ff8a5c', '#d05a8a'],
    seaFar: ['#f4a67d', '#e07a70', '#8a4a8f'], seaNear: ['#6a5aa8', '#4b3a8a', '#231a55'],
    sandWet: ['#c98d78', '#94627a', '#4a3560'], sand: ['#f0c69a', '#c99a86', '#7d5a7d'],
    sandDry: ['#f7d7a8', '#d9ac90', '#8e6a86'], foam: ['#fff2e6', '#f3d0d8', '#c9a0d8'],
    wall: ['#c88a7a', '#8f5a72', '#3a2a55'], wallTop: ['#f5c9a5', '#c98f8a', '#6a4d80'],
    walkFar: ['#c9a08e', '#93688a', '#57416e'], walkNear: ['#b68a86', '#7d5580', '#493561'],
    rail: ['#5a3d5c', '#43304f', '#2a1f42'], kerbA: ['#f3e2d2', '#c9b0bd', '#8f7aa5'],
    kerbB: ['#d4667a', '#a84a72', '#7a3f70'], roadFar: ['#6b5a78', '#4a3d66', '#2c2247'],
    roadNear: ['#4d3f62', '#372c55', '#1c1533'], glow: ['#ffb38a', '#ff8a66', '#ff7a66'],
    lane: ['#22b7a8', '#1a9a98', '#158a86'], centre: ['#ffd23f', '#f0c03a', '#d9a93a'],
    cloudLit: ['#ffc4a0', '#ff9a86', '#b0559a'], cloudShade: ['#e58fb0', '#b0558f', '#4a3a8a'],
    land: ['#b6799a', '#7f4a8a', '#241a4d'], tint: ['#ffffff', '#efe6f7', '#bfb6de'],
  };

  S.palette = (tod, out) => {
    out = out || {};
    const i = tod < 0.5 ? 0 : 1, u = tod < 0.5 ? tod * 2 : tod * 2 - 1;
    for (const k in T) out[k] = G.mix(T[k][i], T[k][i + 1], u);
    out.tod = tod;
    return out;
  };
  S.makeCam = () => ({ W: 960, H: 540, top: 0, bottom: 540, dist: 0, t: 0, tod: 0, pal: {}, sun: { x: 0, y: 0, r: 40, vis: 1 } });
  S.update = (cam, W, H, dist, t, tod) => {
    cam.W = W; cam.H = H; cam.dist = dist; cam.t = t; cam.tod = tod;
    S.palette(tod, cam.pal);
    const e = G.smooth(tod), s = cam.sun;
    s.x = W * 0.7; s.y = G.lerp(L.HORIZON - 140, L.HORIZON + 3, e); s.r = G.lerp(40, 54, e);
    s.vis = G.clamp((L.HORIZON + 40 - s.y) / 60, 0.3, 1);
  };

  function drawSky(ctx, cam) {
    const p = cam.pal, g = ctx.createLinearGradient(0, 0, 0, L.HORIZON);
    g.addColorStop(0, G.css(p.skyTop)); g.addColorStop(0.45, G.css(p.skyMid));
    g.addColorStop(0.78, G.css(p.skyLow)); g.addColorStop(1, G.css(p.skyHor));
    ctx.fillStyle = g; ctx.fillRect(0, 0, cam.W, L.HORIZON + 1);
    if (cam.top < 0) {
      // 竖屏时向上延伸的天空：从天顶色渐深，像更高处的夜空
      const e = ctx.createLinearGradient(0, cam.top, 0, 0);
      e.addColorStop(0, G.css(G.mix(p.skyTop, '#0a0824', 0.5))); e.addColorStop(1, G.css(p.skyTop));
      ctx.fillStyle = e; ctx.fillRect(0, cam.top - 1, cam.W, -cam.top + 1);
    }
  }

  function drawStars(ctx, cam) {
    const a = G.smooth((cam.tod - 0.45) / 0.4);
    if (a < 0.02) return;
    const span = cam.W + 200;
    ctx.fillStyle = '#fff7e0';
    const sky = L.HORIZON - 60 - cam.top, n = Math.min(200, Math.round((80 * sky) / (L.HORIZON - 60)));
    for (let i = 0; i < n; i++) {
      const y = cam.top + Math.pow(G.hash(i * 5.7 + 1), 1.4) * sky;
      let x = (G.hash(i * 2.3) * span - cam.dist * 0.008) % span; if (x < 0) x += span;
      const tw = 0.55 + 0.45 * Math.sin(cam.t * (1.5 + G.hash(i) * 2) + i * 3.1);
      ctx.globalAlpha = a * tw * G.clamp((1 - y / (L.HORIZON - 40)) * 1.3, 0.2, 1);
      const s = G.hash(i * 9.1) < 0.12 ? 2.2 : 1.2;
      ctx.fillRect(x - s / 2, y - s / 2, s, s);
      if (s > 2) { ctx.fillRect(x - 3.5, y - 0.4, 7, 0.8); ctx.fillRect(x - 0.4, y - 3.5, 0.8, 7); }
    }
    ctx.globalAlpha = 1;
  }

  function drawSun(ctx, cam) {
    const s = cam.sun, p = cam.pal;
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    let g = ctx.createRadialGradient(s.x, s.y, s.r * 0.6, s.x, s.y, 360);
    g.addColorStop(0, G.css(p.sunGlow, 0.5)); g.addColorStop(0.35, G.css(p.sunGlow, 0.18)); g.addColorStop(1, G.css(p.sunGlow, 0));
    ctx.fillStyle = g; ctx.fillRect(s.x - 360, s.y - 360, 720, 720);
    ctx.restore();
    g = ctx.createRadialGradient(s.x, s.y, s.r * 0.2, s.x, s.y, s.r);
    g.addColorStop(0, '#fffbe6'); g.addColorStop(0.7, G.css(p.sunCol)); g.addColorStop(1, G.css(p.sunCol));
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, TAU); ctx.fill();
  }

  function drawClouds(ctx, cam) {
    // 第 0 行是原来的云层；竖屏多出来的高空按行补云，越高越慢越稀
    for (let row = 0; row < 5 && 34 - 220 * row + 150 > cam.top - 30; row++) cloudRow(ctx, cam, row);
  }
  function cloudRow(ctx, cam, row) {
    const p = cam.pal, fake = { dist: cam.dist + cam.t * 150, W: cam.W }, seed = row * 101;
    R.each(fake, 0.04 - row * 0.006, 430 + row * 90, 260, (i, x) => {
      i += seed;
      const cy = row ? 34 - 220 * row + G.hash(i * 7 + 2) * 150 : 34 + G.hash(i * 7 + 2) * (L.HORIZON - 150), sc = 0.7 + G.hash(i * 5 + 1) * 0.9;
      const cx = x + G.hash(i * 3) * 160, rx = 120 * sc, ry = 11 * sc;
      ctx.fillStyle = G.css(p.cloudLit);
      ctx.beginPath(); ctx.ellipse(cx, cy, rx, ry, 0, 0, TAU); ctx.fill();
      ctx.beginPath(); ctx.ellipse(cx - rx * 0.35, cy - ry * 0.6, rx * 0.5, ry * 0.9, 0, 0, TAU); ctx.fill();
      ctx.beginPath(); ctx.ellipse(cx + rx * 0.3, cy - ry * 0.9, rx * 0.4, ry * 1.1, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = G.css(p.cloudShade);
      ctx.beginPath(); ctx.ellipse(cx + rx * 0.05, cy - ry * 0.5, rx * 0.86, ry * 0.5, 0, 0, TAU); ctx.fill();
      ctx.beginPath(); ctx.ellipse(cx + rx * 0.3, cy - ry * 1.3, rx * 0.34, ry * 0.5, 0, 0, TAU); ctx.fill();
    });
  }

  function drawBirds(ctx, cam) {
    const t = cam.t, span = cam.W + 300;
    ctx.strokeStyle = G.css(cam.pal.land, 0.85); ctx.lineWidth = 1.8; ctx.lineCap = 'round';
    for (let i = 0; i < 6; i++) {
      let x = (i * 47 + t * 26 - cam.dist * 0.05 + 120) % span; if (x < 0) x += span; x -= 150;
      const s = 1 - (i % 3) * 0.12, y = 90 + (i % 3) * 16 + i * 4 + Math.sin(t * 0.7 + i) * 6, fl = Math.sin(t * 7 + i * 1.9) * 4.5;
      ctx.beginPath(); ctx.moveTo(x - 8 * s, y - fl * s); ctx.quadraticCurveTo(x - 3 * s, y - 4 * s, x, y);
      ctx.quadraticCurveTo(x + 3 * s, y - 4 * s, x + 8 * s, y - fl * s); ctx.stroke();
    }
  }

  function ridge(ctx, cam, par, seed, hMax, col) {
    const off = cam.dist * par, base = L.HORIZON + 1;
    ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(0, base);
    for (let x = 0; x <= cam.W + 12; x += 12) {
      const w = x + off;
      let m = Math.sin(w * 0.0021 + seed) * 0.6 + Math.sin(w * 0.0053 + seed * 2) * 0.4 - 0.12;
      m = m > 0 ? Math.pow(m, 0.8) : 0;
      ctx.lineTo(x, base - hMax * m * (0.85 + 0.15 * Math.sin(w * 0.031 + seed)));
    }
    ctx.lineTo(cam.W + 12, base); ctx.closePath(); ctx.fill();
  }

  function drawLighthouse(ctx, cam) {
    const p = cam.pal, base = L.HORIZON + 2, on = G.smooth((cam.tod - 0.35) / 0.3), dim = 0.15 + 0.7 * G.smooth(cam.tod * 1.1);
    const tone = (c) => G.css(G.mix(c, p.land, dim));
    R.each(cam, 0.06, 2600, 120, (i, x) => {
      const lx = x + 380, top = base - 50;
      ctx.fillStyle = G.css(p.land); ctx.beginPath(); ctx.ellipse(lx, base, 44, 7, 0, Math.PI, TAU); ctx.fill();
      ctx.beginPath(); ctx.moveTo(lx - 7, base); ctx.lineTo(lx - 4.4, top); ctx.lineTo(lx + 4.4, top); ctx.lineTo(lx + 7, base); ctx.closePath();
      ctx.fillStyle = tone('#fff0e0'); ctx.fill();
      ctx.save(); ctx.clip(); ctx.fillStyle = tone('#d4667a');
      ctx.fillRect(lx - 8, base - 40, 16, 8); ctx.fillRect(lx - 8, base - 22, 16, 8); ctx.restore();
      ctx.fillStyle = tone('#5a3d5c'); ctx.fillRect(lx - 6.4, top - 2, 12.8, 2.4);
      ctx.fillStyle = on > 0.05 ? '#fff6c0' : tone('#cfe3ff'); ctx.fillRect(lx - 3.6, top - 8, 7.2, 6);
      ctx.fillStyle = tone('#d4667a'); ctx.beginPath(); ctx.moveTo(lx - 5, top - 8); ctx.lineTo(lx, top - 14); ctx.lineTo(lx + 5, top - 8); ctx.closePath(); ctx.fill();
      if (on > 0.02) {
        const ly = top - 5, sw = Math.cos(cam.t * 1.1), len = 340 * Math.abs(sw), dir = sw < 0 ? -1 : 1;
        const g = ctx.createRadialGradient(lx, ly, 0, lx, ly, 34);
        g.addColorStop(0, `rgba(255,246,190,${0.9 * on})`); g.addColorStop(1, 'rgba(255,246,190,0)');
        ctx.fillStyle = g; ctx.fillRect(lx - 34, ly - 34, 68, 68);
        const bg = ctx.createLinearGradient(lx, 0, lx + dir * len, 0);
        bg.addColorStop(0, `rgba(255,246,190,${0.32 * on})`); bg.addColorStop(1, 'rgba(255,246,190,0)');
        ctx.fillStyle = bg; ctx.beginPath(); ctx.moveTo(lx, ly); ctx.lineTo(lx + dir * len, ly - 16 * Math.abs(sw)); ctx.lineTo(lx + dir * len, ly + 12 * Math.abs(sw)); ctx.closePath(); ctx.fill();
      }
    });
  }

  function boat(ctx, x, y, k, p, dim) {
    const c = (col, m) => G.css(G.mix(col, p.land, m));
    ctx.save(); ctx.translate(x, y); ctx.scale(k, k);
    ctx.fillStyle = G.css(p.sunGlow, 0.25); ctx.fillRect(-2, 2, 4, 14);
    ctx.fillStyle = c('#5a3d5c', 0.5 + 0.5 * dim); ctx.beginPath(); ctx.moveTo(-14, -3); ctx.lineTo(14, -3); ctx.lineTo(9, 3); ctx.lineTo(-10, 3); ctx.closePath(); ctx.fill();
    ctx.fillStyle = c('#fff3e6', 0.1 + 0.75 * dim); ctx.beginPath(); ctx.moveTo(-1, -5); ctx.lineTo(-1, -34); ctx.lineTo(-12, -6); ctx.closePath(); ctx.fill();
    ctx.fillStyle = c('#ffc9a8', 0.1 + 0.75 * dim); ctx.beginPath(); ctx.moveTo(1, -6); ctx.lineTo(1, -28); ctx.lineTo(11, -6); ctx.closePath(); ctx.fill();
    ctx.restore();
  }
  function drawBoats(ctx, cam) {
    const span = cam.W + 500, dim = G.clamp(cam.tod * 1.2, 0, 1);
    for (let i = 0; i < 3; i++) {
      let x = (i * 0.37 * span + 0.3 * cam.W + cam.t * (5 + i * 2.5) - cam.dist * (0.06 + i * 0.03)) % span;
      if (x < 0) x += span;
      boat(ctx, x - 250, L.HORIZON + 11 + i * 15 + Math.sin(cam.t * 1.3 + i * 2) * 1.2, [0.7, 0.95, 1.3][i], cam.pal, dim);
    }
  }

  function drawSea(ctx, cam) {
    const { W, t, pal: p, sun } = cam, hz = L.HORIZON, sb = L.SEA_BOTTOM;
    let g = ctx.createLinearGradient(0, hz - 26, 0, hz + 8);
    g.addColorStop(0, G.css(p.skyHor, 0)); g.addColorStop(0.75, G.css(p.skyHor, 0.45)); g.addColorStop(1, G.css(p.skyHor, 0));
    ctx.fillStyle = g; ctx.fillRect(0, hz - 26, W, 34);
    g = ctx.createLinearGradient(0, hz, 0, sb);
    g.addColorStop(0, G.css(p.seaFar)); g.addColorStop(1, G.css(p.seaNear));
    ctx.fillStyle = g; ctx.fillRect(0, hz, W, sb - hz + 2);
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    ctx.translate(sun.x, hz); ctx.scale(1.5, 1);
    g = ctx.createRadialGradient(0, 0, 0, 0, 0, sb - hz);
    g.addColorStop(0, G.css(p.sunGlow, 0.55 * sun.vis)); g.addColorStop(0.6, G.css(p.sunGlow, 0.16 * sun.vis)); g.addColorStop(1, G.css(p.sunGlow, 0));
    ctx.fillStyle = g; ctx.fillRect(-110, 0, 220, sb - hz);
    ctx.restore();
    ctx.lineCap = 'round';
    for (let k = 0; k < 10; k++) {
      const u = k / 9, y = hz + 4 + (sb - hz - 8) * Math.pow(u, 1.5), seg = 22 + u * 36, gap = seg * 2.2;
      const off = cam.dist * (0.05 + u * 0.16) + t * (4 + u * 10);
      ctx.strokeStyle = G.css(p.foam, 0.1 + 0.16 * u); ctx.lineWidth = 0.8 + u * 1.6; ctx.beginPath();
      for (let j = Math.floor(off / gap) - 1; j * gap - off < W + 80; j++) {
        const x = j * gap - off + G.hash(j * 3 + k * 17) * seg * 0.8, len = seg * (0.5 + G.hash(j + k * 9) * 0.5), yy = y + Math.sin(t + j + k) * 0.6;
        ctx.moveTo(x, yy); ctx.lineTo(x + len, yy);
      }
      ctx.stroke();
    }
    for (let j = 0; j < 26; j++) {
      const u = j / 25, y = hz + 3 + (sb - hz - 6) * Math.pow(u, 1.45), hw = 10 + u * 95, cnt = 3 + Math.floor(u * 5), len = 5 + u * 14;
      for (let q = 0; q < cnt; q++) {
        const ph = t * (0.8 + G.hash(j * 7 + q) * 1.4) + G.hash(j * 13 + q * 5) * 20, tw = 0.5 + 0.5 * Math.sin(ph * 2.2);
        if (tw < 0.25) continue;
        const dx = (G.hash(j * 31 + q * 3.3) * 2 - 1 + Math.sin(ph * 0.5) * 0.12) * hw;
        ctx.fillStyle = G.css(p.sunCol, tw * (0.75 - u * 0.25) * sun.vis);
        ctx.fillRect(sun.x + dx - len / 2, y, len, 1.2 + u * 1.6);
      }
    }
  }

  S.drawBack = (ctx, cam) => {
    const p = cam.pal;
    drawSky(ctx, cam); drawStars(ctx, cam); drawSun(ctx, cam); drawClouds(ctx, cam); drawBirds(ctx, cam);
    ridge(ctx, cam, 0.02, 1.3, 26, G.css(G.mix(p.land, p.skyHor, 0.35)));
    ridge(ctx, cam, 0.045, 4.1, 40, G.css(p.land));
    drawLighthouse(ctx, cam); drawSea(ctx, cam); drawBoats(ctx, cam);
    R.drawSand(ctx, cam); R.drawUmbrellas(ctx, cam); R.drawPromenade(ctx, cam);
    R.drawPalms(ctx, cam); R.drawRailing(ctx, cam); R.drawLamps(ctx, cam);
  };
  S.drawRoad = (ctx, cam) => R.drawRoad(ctx, cam);
  S.drawTint = (ctx, cam) => {
    if (cam.tod < 0.02) return;
    ctx.save(); ctx.globalCompositeOperation = 'multiply';
    ctx.fillStyle = G.css(cam.pal.tint); ctx.fillRect(0, 0, cam.W, cam.bottom - cam.top);
    ctx.restore();
  };
})();
