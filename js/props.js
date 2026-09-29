// 绘制：障碍物、鱼、粒子、飘字（局部坐标：障碍物原点 = 地面上的中心点，向上为负）
(function () {
  const G = window.G, TAU = G.TAU, INK = G.INK;

  // 碰撞尺寸（逻辑像素）：w 为宽，h 为高；离地高度由 ob.y 决定
  G.OB = {
    cone: { w: 22, h: 38 },
    bin: { w: 28, h: 46 },
    crab: { w: 32, h: 22 },
    bench: { w: 80, h: 36 },
    ball: { w: 28, h: 28 },
    gull: { w: 38, h: 20 },
  };

  function outline(c, lw) { c.lineJoin = 'round'; c.lineCap = 'round'; c.lineWidth = lw || 2.2; c.strokeStyle = INK; }

  // ---------- 静态障碍：只画一次，后面 drawImage ----------
  function paintCone(c) {
    outline(c);
    c.fillStyle = '#ff6f2c'; G.roundRect(c, -15, -6, 30, 6, 2); c.fill(); c.stroke();
    const body = () => { c.beginPath(); c.moveTo(-11, -6); c.lineTo(-3.6, -40); c.lineTo(3.6, -40); c.lineTo(11, -6); c.closePath(); };
    body(); c.fillStyle = '#ff8a3d'; c.fill();
    c.save(); c.clip(); c.fillStyle = '#fff6ea'; c.fillRect(-14, -28, 28, 6); c.fillRect(-14, -16, 28, 5); c.restore();
    body(); c.stroke();
    c.fillStyle = '#ff6f2c'; G.roundRect(c, -5.5, -43, 11, 4.5, 2); c.fill(); c.stroke();
  }
  function paintBin(c) {
    outline(c);
    c.fillStyle = '#3fb58a'; c.beginPath(); c.moveTo(-13, -3); c.lineTo(-15.5, -40); c.lineTo(15.5, -40); c.lineTo(13, -3); c.closePath(); c.fill(); c.stroke();
    c.strokeStyle = 'rgba(255,255,255,.35)'; c.lineWidth = 1.6; c.beginPath();
    for (let i = -2; i <= 2; i++) { c.moveTo(i * 5.5, -8); c.lineTo(i * 5.8, -36); }
    c.stroke();
    outline(c);
    c.fillStyle = '#2d8f6b'; G.roundRect(c, -18, -47, 36, 8, 4); c.fill(); c.stroke();
    c.fillStyle = '#fff6ea'; c.beginPath(); c.arc(0, -22, 6.5, 0, TAU); c.fill(); c.lineWidth = 1.6; c.stroke();
    c.lineWidth = 1.5; c.beginPath(); c.moveTo(-3.6, -22); c.lineTo(3.4, -22); c.moveTo(-3, -24.2); c.lineTo(-3, -19.8); c.moveTo(0, -24.6); c.lineTo(0, -19.4); c.moveTo(3, -24.2); c.lineTo(3, -19.8); c.stroke();
  }
  function paintBench(c) {
    outline(c);
    c.fillStyle = '#5a4560';
    for (const x of [-32, 28]) { G.roundRect(c, x, -22, 5, 22, 2); c.fill(); c.stroke(); }
    const wood = ['#d9954f', '#c98a4b'];
    for (let i = 0; i < 2; i++) { c.fillStyle = wood[i]; G.roundRect(c, -40, -41 + i * 7, 80, 6, 2.5); c.fill(); c.stroke(); }
    for (const x of [-37, 31]) { c.fillStyle = '#5a4560'; G.roundRect(c, x, -42, 5, 20, 2); c.fill(); c.stroke(); }
    c.fillStyle = '#d9954f'; G.roundRect(c, -42, -25, 84, 6.5, 3); c.fill(); c.stroke();
    c.strokeStyle = 'rgba(255,255,255,.35)'; c.lineWidth = 1.2; c.beginPath();
    c.moveTo(-36, -40); c.lineTo(-10, -40); c.moveTo(-30, -23.5); c.lineTo(-2, -23.5); c.stroke();
  }
  function paintFish(c, body, belly, fin) {
    outline(c, 1.9);
    c.fillStyle = fin; c.beginPath(); c.moveTo(6, 0); c.lineTo(15, -7); c.quadraticCurveTo(11.5, 0, 15, 7); c.closePath(); c.fill(); c.stroke();
    c.fillStyle = fin; c.beginPath(); c.moveTo(-3, -6.2); c.lineTo(2, -11.5); c.lineTo(5, -5.4); c.closePath(); c.fill(); c.stroke();
    const shape = () => {
      c.beginPath(); c.moveTo(-14, 0.5); c.quadraticCurveTo(-7, -10, 5, -6.4); c.quadraticCurveTo(11, -3, 11, 0);
      c.quadraticCurveTo(11, 3, 5, 6.4); c.quadraticCurveTo(-7, 9.5, -14, 0.5); c.closePath();
    };
    shape(); c.fillStyle = body; c.fill();
    c.save(); c.clip(); c.fillStyle = belly; c.fillRect(-16, 1.6, 30, 9); c.restore();
    shape(); c.stroke();
    c.strokeStyle = 'rgba(58,33,64,.45)'; c.lineWidth = 1.2; c.beginPath(); c.arc(-3, 0, 5.5, -0.9, 0.9); c.stroke();
    c.fillStyle = '#fff'; c.strokeStyle = INK; c.lineWidth = 1.2; c.beginPath(); c.arc(-8, -1.6, 2.7, 0, TAU); c.fill(); c.stroke();
    c.fillStyle = INK; c.beginPath(); c.arc(-8.7, -1.6, 1.3, 0, TAU); c.fill();
  }

  const S = {};
  function stat(name, w, h, ox, oy, fn) { S[name] = Object.assign(G.makeSprite(w, h, (c) => { c.translate(ox, oy); fn(c); }, 3), { ox, oy }); }
  function build() {
    if (S.cone) return;
    stat('cone', 36, 52, 18, 50, paintCone);
    stat('bin', 44, 56, 22, 54, paintBin);
    stat('bench', 96, 52, 48, 50, paintBench);
    const fishCols = [['#5ec8ff', '#d8f3ff', '#3a9fe0'], ['#ff9f6b', '#ffe3cf', '#ff6b4a'], ['#8be28b', '#e5fbe0', '#4cc46a']];
    S.fish = fishCols.map((f, i) => {
      const spr = G.makeSprite(40, 32, (c) => { c.translate(20, 16); paintFish(c, f[0], f[1], f[2]); }, 3);
      spr.ox = 20; spr.oy = 16; return spr;
    });
    S.gold = G.makeSprite(64, 64, (c) => {
      c.translate(32, 32);
      const g = c.createRadialGradient(0, 0, 4, 0, 0, 30);
      g.addColorStop(0, 'rgba(255,224,102,.85)'); g.addColorStop(1, 'rgba(255,224,102,0)');
      c.fillStyle = g; c.fillRect(-32, -32, 64, 64);
      c.scale(1.35, 1.35); paintFish(c, '#ffd23f', '#fff3b0', '#ff9d2f');
    }, 3);
    S.gold.ox = 32; S.gold.oy = 32;
    S.shadow = G.makeSprite(64, 16, (c) => {
      const g = c.createRadialGradient(32, 8, 2, 32, 8, 32);
      g.addColorStop(0, 'rgba(40,16,50,.42)'); g.addColorStop(1, 'rgba(40,16,50,0)');
      c.save(); c.translate(32, 8); c.scale(1, 0.25); c.translate(-32, -8 * 4); c.fillStyle = g; c.fillRect(0, 0, 64, 64); c.restore();
    }, 2);
  }

  function put(ctx, spr, k) { ctx.drawImage(spr.canvas, -spr.ox, -spr.oy, spr.w, spr.h); }

  // ---------- 动态障碍 ----------
  function paintCrab(c, t) {
    outline(c, 2);
    const sc = Math.sin(t * 16);
    for (const s of [-1, 1]) {
      c.strokeStyle = INK; c.lineWidth = 4.6;
      for (let i = 0; i < 3; i++) {
        const w = Math.sin(t * 16 + i * 2.1 + (s > 0 ? 1 : 0)) * 1.6;
        c.beginPath(); c.moveTo(s * 7, -8); c.lineTo(s * (13 + i * 3), -7 + i * 0.5); c.lineTo(s * (16 + i * 3.5), -0.5 + w * 0.4); c.stroke();
      }
      c.strokeStyle = '#ff6b5a'; c.lineWidth = 2;
      for (let i = 0; i < 3; i++) {
        const w = Math.sin(t * 16 + i * 2.1 + (s > 0 ? 1 : 0)) * 1.6;
        c.beginPath(); c.moveTo(s * 7, -8); c.lineTo(s * (13 + i * 3), -7 + i * 0.5); c.lineTo(s * (16 + i * 3.5), -0.5 + w * 0.4); c.stroke();
      }
    }
    for (const s of [-1, 1]) {
      const up = -22 - Math.sin(t * 9 + s) * 3.5;
      outline(c, 2);
      c.strokeStyle = INK; c.lineWidth = 5; c.beginPath(); c.moveTo(s * 11, -12); c.lineTo(s * 17, up + 5); c.stroke();
      c.strokeStyle = '#ff6b5a'; c.lineWidth = 2.6; c.beginPath(); c.moveTo(s * 11, -12); c.lineTo(s * 17, up + 5); c.stroke();
      outline(c, 2);
      c.fillStyle = '#ff4f45'; c.beginPath(); c.arc(s * 17, up, 6, s > 0 ? 0.5 : Math.PI - 5.8, s > 0 ? TAU - 0.5 + 0.0 : Math.PI + 5.8 - 0.0); c.closePath(); c.fill(); c.stroke();
    }
    c.fillStyle = '#ff5a4f'; c.beginPath(); c.ellipse(0, -11, 13.5, 9.5, 0, 0, TAU); c.fill(); c.stroke();
    c.fillStyle = 'rgba(255,255,255,.3)'; c.beginPath(); c.ellipse(-3, -15, 6, 2.6, -0.3, 0, TAU); c.fill();
    for (const s of [-1, 1]) {
      c.strokeStyle = INK; c.lineWidth = 1.8; c.beginPath(); c.moveTo(s * 4.5, -18); c.lineTo(s * 4.5, -23 + sc * 0.4); c.stroke();
      c.fillStyle = '#fff'; c.lineWidth = 1.6; c.beginPath(); c.arc(s * 4.5, -25, 3.6, 0, TAU); c.fill(); c.stroke();
      c.fillStyle = INK; c.beginPath(); c.arc(s * 4.5 - 0.8, -25, 1.6, 0, TAU); c.fill();
    }
    c.lineWidth = 1.8; c.beginPath(); c.moveTo(-6, -8); c.quadraticCurveTo(0, -5, 6, -8); c.stroke();
  }
  function paintBall(c, rot) {
    c.save(); c.translate(0, -14); c.rotate(rot); outline(c, 2);
    const cols = ['#ff5c73', '#fff6ea', '#3fa9f5', '#ffd23f', '#fff6ea', '#3fbf8f'];
    for (let i = 0; i < 6; i++) { c.beginPath(); c.moveTo(0, 0); c.arc(0, 0, 14, (i * TAU) / 6, ((i + 1) * TAU) / 6); c.closePath(); c.fillStyle = cols[i]; c.fill(); }
    c.beginPath(); c.arc(0, 0, 14, 0, TAU); c.stroke();
    c.fillStyle = '#fff6ea'; c.beginPath(); c.arc(0, 0, 3, 0, TAU); c.fill(); c.lineWidth = 1.3; c.stroke();
    c.restore();
    c.fillStyle = 'rgba(255,255,255,.55)'; c.beginPath(); c.ellipse(-5, -20, 3.6, 2, -0.6, 0, TAU); c.fill();
  }
  function paintGull(c, t) {
    const fl = Math.sin(t * 13);
    const wing = (dark) => {
      const tipY = -4 - fl * 24;
      c.beginPath(); c.moveTo(-1, -4); c.quadraticCurveTo(-6, -4 - fl * 17, 4, tipY); c.quadraticCurveTo(15, tipY + 6 * fl + 3, 11, -1); c.closePath();
      c.fillStyle = dark ? '#c9bfd6' : '#f1ecf6'; c.fill(); c.stroke();
      c.fillStyle = '#3d3250'; c.beginPath(); c.moveTo(4, tipY); c.quadraticCurveTo(10, tipY + 3, 11.5, tipY + 8 * (fl >= 0 ? 1 : -1) * 0.4 + 1.4); c.lineTo(2.5, tipY + 4 * (fl >= 0 ? 1 : -1) * 0.6); c.closePath(); c.fill();
    };
    outline(c, 2);
    wing(true);
    c.fillStyle = '#f1ecf6'; c.beginPath(); c.moveTo(15, -3); c.lineTo(25, -1); c.lineTo(24, 4); c.lineTo(14, 3); c.closePath(); c.fill(); c.stroke();
    c.beginPath(); c.ellipse(2, 0, 15.5, 8, 0.05, 0, TAU); c.fillStyle = '#f7f3fa'; c.fill(); c.stroke();
    c.fillStyle = '#ff9d2f'; c.beginPath(); c.moveTo(-19, -4.5); c.lineTo(-29, -0.5); c.lineTo(-19, 1.5); c.closePath(); c.fill(); c.stroke();
    c.fillStyle = '#f7f3fa'; c.beginPath(); c.arc(-14, -4, 7, 0, TAU); c.fill(); c.stroke();
    c.fillStyle = INK; c.beginPath(); c.arc(-16, -5.6, 1.7, 0, TAU); c.fill();
    c.lineWidth = 2; c.beginPath(); c.moveTo(-20, -10); c.lineTo(-12.5, -7.6); c.stroke();
    wing(false);
  }

  G.drawObstacle = function (ctx, ob, t) {
    build();
    const y = ob.y || 0, lift = G.clamp(y / 120, 0, 1);
    ctx.save();
    if (ob.type !== 'gull') {
      const k = 1 - lift * 0.5, w = ob.type === 'bench' ? 96 : ob.type === 'crab' ? 46 : 44;
      ctx.globalAlpha = 0.9 * (1 - lift * 0.4);
      ctx.drawImage(S.shadow.canvas, -w / 2 * k, -4, w * k, 8);
      ctx.globalAlpha = 1;
    }
    ctx.translate(0, -y);
    switch (ob.type) {
      case 'cone': put(ctx, S.cone); break;
      case 'bin': put(ctx, S.bin); break;
      case 'bench': put(ctx, S.bench); break;
      case 'crab': paintCrab(ctx, t + (ob.seed || 0)); break;
      case 'ball': paintBall(ctx, (ob.rot || 0)); break;
      case 'gull': ctx.translate(0, -(G.OB.gull.h / 2)); paintGull(ctx, t + (ob.seed || 0)); break;
    }
    ctx.restore();
  };

  // 鱼：f = { golden, kind(0-2), seed }，原点在鱼的中心
  G.drawFish = function (ctx, f, t) {
    build();
    const wig = Math.sin(t * 9 + (f.seed || 0) * 3) * 0.18;
    ctx.save();
    if (f.golden) {
      const pulse = 1 + Math.sin(t * 6 + (f.seed || 0)) * 0.06;
      ctx.rotate(wig * 0.6); ctx.scale(pulse, pulse); put(ctx, S.gold);
      for (let i = 0; i < 3; i++) {
        const a = t * 2.4 + i * 2.1, r = 20 + Math.sin(t * 5 + i) * 3, s = 2.2 + Math.sin(t * 8 + i * 1.7) * 1.2;
        G.star(ctx, Math.cos(a) * r, Math.sin(a) * r * 0.7, s, '#fff8d0');
      }
    } else {
      ctx.rotate(wig); ctx.scale(1 + wig * 0.35, 1);
      put(ctx, S.fish[(f.kind || 0) % 3]);
    }
    ctx.restore();
  };

  G.star = function (ctx, x, y, s, color) {
    ctx.fillStyle = color; ctx.beginPath();
    for (let i = 0; i < 8; i++) { const r = i % 2 ? s * 0.32 : s, a = (i * TAU) / 8 - Math.PI / 2; ctx.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r); }
    ctx.closePath(); ctx.fill();
  };

  // ---------- 粒子与飘字 ----------
  const fx = (G.fx = { list: [], texts: [] });
  fx.clear = () => { fx.list.length = 0; fx.texts.length = 0; };
  fx.add = (o) => {
    if (fx.list.length > 420) return;
    fx.list.push(Object.assign({ x: 0, y: 0, vx: 0, vy: 0, g: 0, size: 4, color: '#fff', kind: 'dot', rot: 0, vr: 0, drag: 0, w: 0 }, o, { max: o.life, life: o.life }));
  };
  fx.burst = (x, y, n, o) => {
    o = o || {};
    for (let i = 0; i < n; i++) {
      const a = G.rand(o.a0 === undefined ? 0 : o.a0, o.a1 === undefined ? TAU : o.a1), s = G.rand(o.s0 || 40, o.s1 || 160);
      fx.add({
        x: x + G.rand(-(o.jx || 0), o.jx || 0), y: y + G.rand(-(o.jy || 0), o.jy || 0), vx: Math.cos(a) * s, vy: Math.sin(a) * s,
        g: o.g === undefined ? 300 : o.g, life: G.rand(o.l0 || 0.4, o.l1 || 0.8), size: G.rand(o.z0 || 2, o.z1 || 5),
        color: o.colors ? G.pick(o.colors) : o.color || '#fff', kind: o.kind || 'dot', rot: G.rand(0, TAU), vr: G.rand(-8, 8), drag: o.drag || 0, w: o.w ? 1 : 0,
      });
    }
  };
  fx.text = (x, y, str, o) => {
    o = o || {};
    fx.texts.push({ x, y, str, age: 0, life: o.life || 0.9, color: o.color || '#fff', stroke: o.stroke || INK, size: o.size || 22, vy: o.vy === undefined ? -46 : o.vy });
  };
  fx.update = (dt, worldV) => {
    const L = fx.list;
    for (let i = L.length - 1; i >= 0; i--) {
      const p = L[i];
      p.life -= dt;
      if (p.life <= 0) { L[i] = L[L.length - 1]; L.pop(); continue; }
      p.vy += p.g * dt;
      if (p.drag) { const k = Math.exp(-p.drag * dt); p.vx *= k; p.vy *= k; }
      p.x += (p.vx - (p.w ? worldV || 0 : 0)) * dt; p.y += p.vy * dt; p.rot += p.vr * dt;
    }
    for (let i = fx.texts.length - 1; i >= 0; i--) {
      const q = fx.texts[i];
      q.age += dt; q.y += q.vy * dt; q.vy *= Math.exp(-2 * dt);
      if (q.age >= q.life) fx.texts.splice(i, 1);
    }
  };
  fx.draw = (ctx) => {
    for (const p of fx.list) {
      const u = 1 - p.life / p.max;
      ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot);
      if (p.kind === 'smoke') {
        ctx.globalAlpha = 0.5 * (1 - u); ctx.fillStyle = p.color; ctx.beginPath(); ctx.arc(0, 0, p.size * (1 + u * 1.8), 0, TAU); ctx.fill();
      } else if (p.kind === 'star') {
        ctx.globalAlpha = 1 - u * u; G.star(ctx, 0, 0, p.size * (1 - u * 0.4), p.color);
      } else if (p.kind === 'feather') {
        ctx.globalAlpha = 1 - u * u; ctx.fillStyle = p.color; ctx.strokeStyle = INK; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.ellipse(0, 0, p.size * 1.6, p.size * 0.6, 0, 0, TAU); ctx.fill(); ctx.stroke();
      } else if (p.kind === 'ring') {
        ctx.globalAlpha = 1 - u; ctx.strokeStyle = p.color; ctx.lineWidth = 3 * (1 - u) + 0.5; ctx.beginPath(); ctx.arc(0, 0, p.size * (1 + u * 4), 0, TAU); ctx.stroke();
      } else {
        ctx.globalAlpha = 1 - u * u; ctx.fillStyle = p.color; ctx.beginPath(); ctx.arc(0, 0, Math.max(0.3, p.size * (1 - u * 0.5)), 0, TAU); ctx.fill();
      }
      ctx.restore();
    }
    for (const q of fx.texts) {
      const u = q.age / q.life, s = G.outBack(Math.min(1, u * 4));
      G.text(ctx, q.str, q.x, q.y, { size: q.size * (0.6 + 0.4 * s), align: 'center', color: q.color, stroke: q.stroke, strokeW: 5, alpha: u > 0.6 ? 1 - (u - 0.6) / 0.4 : 1 });
    }
  };
})();
