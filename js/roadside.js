// 路边景物：棕榈、路灯、沙滩伞、栏杆、沙滩与道路（每个 draw* 接收 ctx 与 cam）
// cam = { W, H, dist, t, tod, pal }；dist 为世界滚动距离（像素）
(function () {
  const G = window.G, TAU = G.TAU;
  const L = (G.L = { H: 540, HORIZON: 300, SEA_BOTTOM: 372, SAND_BOTTOM: 410, WALK: 440, GROUND: 490 });
  const R = (G.Roadside = {});

  // ---------- 沿路循环摆放：parallax 视差系数，spacing 间距 ----------
  function each(cam, par, spacing, margin, fn) {
    const off = cam.dist * par;
    const i0 = Math.floor((off - margin) / spacing), i1 = Math.ceil((off + cam.W + margin) / spacing);
    for (let i = i0; i <= i1; i++) fn(i, i * spacing - off);
  }

  R.each = each;

  // ---------- 预渲染精灵 ----------
  const SP = {};
  function palmPaint(c, lean, seed, dusk) {
    const trunk = dusk ? '#2a1c3f' : '#7a5a45', leaf = dusk ? '#2d2046' : '#2c8a6a', hi = dusk ? '#4a3468' : '#5cc593';
    const h = 150 + seed * 34, tx = lean * 46;
    c.translate(70, 226); c.lineCap = 'round'; c.lineJoin = 'round';
    const N = 14, lt = [], rt = [];
    for (let i = 0; i <= N; i++) { const u = i / N, x = tx * u * u, y = -h * u, w = 7.2 - 3.4 * u; lt.push([x - w, y]); rt.push([x + w, y]); }
    c.beginPath(); lt.forEach((p, i) => (i ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1])));
    for (let i = N; i >= 0; i--) c.lineTo(rt[i][0], rt[i][1]);
    c.closePath(); c.fillStyle = trunk; c.fill();
    c.strokeStyle = dusk ? 'rgba(0,0,0,.28)' : 'rgba(58,33,64,.32)'; c.lineWidth = 1.5;
    for (let i = 1; i < N; i++) { const p = lt[i], q = rt[i]; c.beginPath(); c.moveTo(p[0], p[1]); c.lineTo(q[0], q[1] + 2.2); c.stroke(); }
    const top = [tx, -h], n = 9;
    for (let i = 0; i < n; i++) {
      const a = -Math.PI / 2 + (i - (n - 1) / 2) * 0.66 + (G.hash(i + seed * 9) - 0.5) * 0.18, len = 64 + G.hash(i * 3 + seed) * 22;
      const dx = Math.cos(a), dy = Math.sin(a), ex = top[0] + dx * len, ey = top[1] + dy * len + len * 0.42;
      const cx = top[0] + dx * len * 0.55, cy = top[1] + dy * len * 0.55 - len * 0.18, th = 9;
      const nx = -dy, ny = dx;
      c.beginPath(); c.moveTo(top[0], top[1]);
      c.quadraticCurveTo(cx + nx * th, cy + ny * th, ex, ey); c.quadraticCurveTo(cx - nx * th, cy - ny * th, top[0], top[1]);
      c.fillStyle = leaf; c.fill();
      c.strokeStyle = hi; c.globalAlpha = 0.65; c.lineWidth = 1.6;
      c.beginPath(); c.moveTo(top[0], top[1]); c.quadraticCurveTo(cx + nx * th * 0.5, cy + ny * th * 0.5, ex, ey); c.stroke(); c.globalAlpha = 1;
    }
    c.fillStyle = trunk; c.beginPath(); c.arc(top[0], top[1] + 2, 6, 0, TAU); c.fill();
    c.fillStyle = dusk ? '#3f2a58' : '#5a3d33';
    for (let i = 0; i < 3; i++) { c.beginPath(); c.arc(top[0] - 6 + i * 6, top[1] + 8 + (i % 2) * 2, 4, 0, TAU); c.fill(); }
  }
  function lampPaint(c) {
    c.translate(24, 150); c.lineCap = 'round'; c.lineJoin = 'round';
    c.fillStyle = '#2d1f42'; G.roundRect(c, -9, -8, 18, 8, 3); c.fill();
    G.roundRect(c, -5, -15, 10, 8, 2); c.fill();
    c.strokeStyle = '#2d1f42'; c.lineWidth = 5.2; c.beginPath(); c.moveTo(0, -12); c.lineTo(0, -116); c.quadraticCurveTo(0, -132, 15, -132); c.stroke();
    c.strokeStyle = 'rgba(255,190,150,.5)'; c.lineWidth = 1.4; c.beginPath(); c.moveTo(-1.4, -18); c.lineTo(-1.4, -114); c.stroke();
    c.fillStyle = '#2d1f42'; G.roundRect(c, 8, -136, 20, 7, 3.5); c.fill();
    c.fillStyle = '#4a3468'; c.beginPath(); c.moveTo(8, -136); c.quadraticCurveTo(18, -144, 28, -136); c.closePath(); c.fill();
  }
  function umbrellaPaint(c, a, b) {
    c.translate(34, 66); c.lineCap = 'round'; c.lineJoin = 'round';
    c.strokeStyle = '#5a4560'; c.lineWidth = 3; c.beginPath(); c.moveTo(1, -2); c.lineTo(-2, -58); c.stroke();
    c.fillStyle = a; c.strokeStyle = '#3a2140'; c.lineWidth = 2;
    const n = 6, top = -60, w = 30;
    for (let i = 0; i < n; i++) {
      const x0 = -w + (i * 2 * w) / n, x1 = -w + ((i + 1) * 2 * w) / n;
      c.beginPath(); c.moveTo(-2, top - 8); c.quadraticCurveTo(x0, top - 6, x0, top + 12);
      c.quadraticCurveTo((x0 + x1) / 2, top + 6, x1, top + 12); c.quadraticCurveTo(x1, top - 6, -2, top - 8);
      c.fillStyle = i % 2 ? b : a; c.fill(); c.stroke();
    }
    c.fillStyle = '#3a2140'; c.beginPath(); c.arc(-2, top - 9, 2.4, 0, TAU); c.fill();
    c.fillStyle = b; c.strokeStyle = '#3a2140'; c.lineWidth = 1.6; G.roundRect(c, 10, -3, 24, 6, 3); c.fill(); c.stroke();
  }
  function glowSprite() {
    return G.makeSprite(96, 96, (c) => {
      const g = c.createRadialGradient(48, 48, 0, 48, 48, 48);
      g.addColorStop(0, 'rgba(255,236,170,.95)'); g.addColorStop(0.25, 'rgba(255,214,120,.45)'); g.addColorStop(1, 'rgba(255,190,90,0)');
      c.fillStyle = g; c.fillRect(0, 0, 96, 96);
    }, 1);
  }
  function build() {
    if (SP.ready) return;
    SP.ready = true;
    SP.palm = [[-0.55, 0.2], [0.6, 0.8], [0.05, 0.5]].map(([lean, seed]) => [false, true].map((d) => G.makeSprite(150, 236, (c) => palmPaint(c, lean, seed, d), 2)));
    SP.lamp = G.makeSprite(48, 160, lampPaint, 3);
    SP.umb = [['#ff5c73', '#fff3e6'], ['#3fb8f5', '#fff3e6'], ['#ffc93c', '#ff7a45']].map(([a, b]) => G.makeSprite(76, 76, (c) => umbrellaPaint(c, a, b), 3));
    SP.glow = glowSprite();
  }

  // ---------- 沙滩、伞、栏杆、棕榈、路灯 ----------
  R.drawSand = function (ctx, cam) {
    const { W, t, pal } = cam, y0 = L.SEA_BOTTOM, y1 = L.SAND_BOTTOM;
    const g = ctx.createLinearGradient(0, y0, 0, y1);
    g.addColorStop(0, G.css(pal.sandWet)); g.addColorStop(0.35, G.css(pal.sand)); g.addColorStop(1, G.css(pal.sandDry));
    ctx.fillStyle = g; ctx.fillRect(0, y0 - 2, W, y1 - y0 + 2);
    // 浪沫：一条会来回“呼吸”的白色泡沫线
    ctx.lineWidth = 2.6; ctx.lineCap = 'round'; ctx.strokeStyle = G.css(pal.foam, 0.9);
    for (let k = 0; k < 2; k++) {
      ctx.beginPath();
      for (let x = -10; x <= W + 10; x += 14) {
        const y = y0 - 1 + k * 5 + Math.sin(x * 0.03 + t * (1.1 + k * 0.4) + k * 2) * 2 + Math.sin(t * 0.7 + k) * 2.4;
        x === -10 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      }
      ctx.globalAlpha = k ? 0.45 : 0.9; ctx.stroke();
    }
    ctx.globalAlpha = 1;
  };
  R.drawUmbrellas = function (ctx, cam) {
    build();
    each(cam, 0.42, 340, 80, (i, x) => {
      if (G.hash(i + 7) < 0.35) return;
      const s = SP.umb[(i % 3 + 3) % 3], k = 0.72 + G.hash(i) * 0.2;
      ctx.drawImage(s.canvas, x + (G.hash(i * 5) - 0.5) * 90 - 34 * k, L.SAND_BOTTOM - 4 - 66 * k, s.w * k, s.h * k);
    });
  };
  R.drawPromenade = function (ctx, cam) {
    const { W, pal } = cam, y0 = L.SAND_BOTTOM - 6, y1 = L.WALK;
    ctx.fillStyle = G.css(pal.wall); ctx.fillRect(0, y0, W, 8);
    ctx.fillStyle = G.css(pal.wallTop); ctx.fillRect(0, y0, W, 2.5);
    const g = ctx.createLinearGradient(0, y0 + 8, 0, y1);
    g.addColorStop(0, G.css(pal.walkFar)); g.addColorStop(1, G.css(pal.walkNear));
    ctx.fillStyle = g; ctx.fillRect(0, y0 + 8, W, y1 - y0 - 8);
    ctx.strokeStyle = 'rgba(58,33,64,.25)'; ctx.lineWidth = 1;
    ctx.beginPath();
    each(cam, 0.8, 70, 20, (i, x) => { ctx.moveTo(x, y0 + 8); ctx.lineTo(x - 18, y1); });
    ctx.stroke();
  };
  R.drawPalms = function (ctx, cam) {
    build();
    const dusk = G.clamp(cam.tod * 1.7, 0, 1);
    each(cam, 0.62, 470, 120, (i, x) => {
      const v = SP.palm[(i % 3 + 3) % 3], px = x + (G.hash(i * 11) - 0.5) * 120, sw = Math.sin(cam.t * 0.9 + i) * 0.012;
      ctx.save(); ctx.translate(px, L.WALK - 6); ctx.rotate(sw);
      ctx.drawImage(v[0].canvas, -70, -226, v[0].w, v[0].h);
      if (dusk > 0.01) { ctx.globalAlpha = dusk; ctx.drawImage(v[1].canvas, -70, -226, v[1].w, v[1].h); ctx.globalAlpha = 1; }
      ctx.restore();
    });
  };
  R.drawLamps = function (ctx, cam) {
    build();
    const on = G.smooth((cam.tod - 0.5) / 0.22);
    each(cam, 0.8, 380, 60, (i, x) => {
      ctx.drawImage(SP.lamp.canvas, x - 24, L.WALK - 4 - 150, SP.lamp.w, SP.lamp.h);
      if (on > 0.01) {
        const fl = 0.93 + Math.sin(cam.t * 3 + i * 2.3) * 0.05;
        ctx.globalAlpha = on * fl;
        ctx.drawImage(SP.glow.canvas, x + 18 - 66, L.WALK - 4 - 150 + 16 - 66, 132, 132);
        ctx.fillStyle = '#fff6d0'; ctx.beginPath(); ctx.ellipse(x + 18, L.WALK - 4 - 150 + 17, 7, 3.2, 0, 0, TAU); ctx.fill();
        // 地面光斑
        const g = ctx.createRadialGradient(x + 18, L.WALK + 2, 0, x + 18, L.WALK + 2, 70);
        g.addColorStop(0, 'rgba(255,214,120,.28)'); g.addColorStop(1, 'rgba(255,214,120,0)');
        ctx.fillStyle = g; ctx.fillRect(x - 60, L.WALK - 20, 160, 44);
        ctx.globalAlpha = 1;
      }
    });
  };
  R.drawRailing = function (ctx, cam) {
    const y = L.WALK - 30, { pal } = cam;
    ctx.fillStyle = G.css(pal.rail); ctx.fillRect(0, y, cam.W, 4);
    ctx.fillRect(0, y + 13, cam.W, 2.4);
    each(cam, 0.8, 38, 10, (i, x) => { ctx.fillRect(x - 2, y - 2, 4, L.WALK - y + 2); });
    ctx.fillStyle = 'rgba(255,200,160,.35)'; ctx.fillRect(0, y, cam.W, 1.2);
  };

  // ---------- 道路（视差 1.0，玩家所在的车道） ----------
  function bikeSymbol(c, x, y) {
    c.save(); c.translate(x, y); c.scale(1, 0.5);
    c.strokeStyle = 'rgba(255,255,255,.6)'; c.lineWidth = 3.4; c.lineCap = 'round'; c.lineJoin = 'round';
    c.beginPath(); c.arc(-18, 0, 11, 0, TAU); c.moveTo(29, 0); c.arc(18, 0, 11, 0, TAU);
    c.moveTo(-18, 0); c.lineTo(-6, -16); c.lineTo(12, -16); c.lineTo(18, 0); c.moveTo(-6, -16); c.lineTo(2, 0); c.lineTo(-18, 0);
    c.moveTo(2, 0); c.lineTo(12, -16); c.moveTo(-9, -20); c.lineTo(-2, -20); c.moveTo(12, -16); c.lineTo(10, -24); c.lineTo(17, -24);
    c.stroke(); c.restore();
  }
  R.drawRoad = function (ctx, cam) {
    const { W, pal, dist } = cam, H = cam.bottom, top = L.WALK;
    const kerb = 8;
    each(cam, 1, 48, 10, (i, x) => {
      ctx.fillStyle = i % 2 ? G.css(pal.kerbA) : G.css(pal.kerbB); ctx.fillRect(x, top, 48, kerb);
    });
    ctx.fillStyle = 'rgba(255,255,255,.28)'; ctx.fillRect(0, top, W, 1.6);
    const g = ctx.createLinearGradient(0, top + kerb, 0, cam.H);
    g.addColorStop(0, G.css(pal.roadFar)); g.addColorStop(1, G.css(pal.roadNear));
    ctx.fillStyle = g; ctx.fillRect(0, top + kerb, W, H - top - kerb);
    const wash = ctx.createLinearGradient(0, top + kerb, 0, top + 60);
    wash.addColorStop(0, G.css(pal.glow, 0.32)); wash.addColorStop(1, G.css(pal.glow, 0));
    ctx.fillStyle = wash; ctx.fillRect(0, top + kerb, W, 52);
    // 自行车道：偏青色的涂装 + 两侧边线
    const l0 = top + 18, l1 = top + 76;
    ctx.fillStyle = G.css(pal.lane, 0.55); ctx.fillRect(0, l0, W, l1 - l0);
    ctx.fillStyle = 'rgba(255,255,255,.62)'; ctx.fillRect(0, l0 - 1.2, W, 2.4);
    each(cam, 1, 64, 10, (i, x) => { ctx.fillRect(x, l1 - 1.2, 36, 2.4); });
    each(cam, 1, 780, 60, (i, x) => bikeSymbol(ctx, x + 300, (l0 + l1) / 2 + 2));
    // 沥青碎点
    ctx.fillStyle = 'rgba(255,255,255,.07)';
    each(cam, 1, 37, 6, (i, x) => {
      const yy = top + 20 + G.hash(i * 3.1) * (H - top - 24);
      ctx.fillRect(x + G.hash(i) * 20, yy, 2 + G.hash(i * 7) * 3, 1.4);
    });
    // 中线（黄）
    ctx.fillStyle = G.css(pal.centre);
    each(cam, 1, 96, 20, (i, x) => { ctx.fillRect(x, top + 88, 52, 3); });
    ctx.fillStyle = 'rgba(0,0,0,.15)'; ctx.fillRect(0, H - 6, W, 6);
  };
})();
