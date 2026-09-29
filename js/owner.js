// 绘制：追车的车主（局部坐标：地面 y=0，向上为负，面朝右 +x）
// 三种形态：mode = 'foot'（人肉追击）| 'scooter'（共享电动滑板车）| 'moped'（小电驴）
(function () {
  const G = window.G, TAU = G.TAU, INK = G.INK;
  const C = {
    skin: '#f6b990', hair: '#2b1d2e', shirt: '#22a6cf', shirtDark: '#177a9c', flowerA: '#ffe066', flowerB: '#ff8fa3',
    shorts: '#f3d38c', sole: '#ffd166', strap: '#ff5c73', mouth: '#6b1e2e', tongue: '#ff7f96',
    tire: '#2a1c33', rim: '#efe7f2', metal: '#cfc6d6', deck: '#3a2a48', yellow: '#ffd23f', blue: '#4dabf7', blueDark: '#2f83c9',
  };

  // dir=1：膝盖朝前（腿）；dir=-1：手肘朝下/后（手臂）
  function ik(hx, hy, fx, fy, l1, l2, dir) {
    const d = G.clamp(Math.hypot(fx - hx, fy - hy), Math.abs(l1 - l2) + 0.5, l1 + l2 - 0.5);
    const a = Math.atan2(fy - hy, fx - hx);
    const ang = Math.acos(G.clamp((l1 * l1 + d * d - l2 * l2) / (2 * l1 * d), -1, 1));
    return [hx + Math.cos(a - dir * ang) * l1, hy + Math.sin(a - dir * ang) * l1];
  }
  const tw = (hip, lean, x, y) => {
    const c = Math.cos(lean), s = Math.sin(lean);
    return [hip[0] + x * c - y * s, hip[1] + x * s + y * c];
  };

  function limb(ctx, pts, w, color) {
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    for (const [c, lw] of [[INK, w + 3.4], [color, w]]) {
      ctx.strokeStyle = c; ctx.lineWidth = lw;
      ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]);
      for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
      ctx.stroke();
    }
  }

  function leg(ctx, hip, ankle) {
    const k = ik(hip[0], hip[1], ankle[0], ankle[1], 24, 25, 1);
    const m = [hip[0] + (k[0] - hip[0]) * 0.6, hip[1] + (k[1] - hip[1]) * 0.6];
    limb(ctx, [k, ankle], 8, C.skin);
    limb(ctx, [hip, k], 10.5, C.skin);
    limb(ctx, [hip, m], 14, C.shorts);
    ctx.save(); ctx.translate(ankle[0], ankle[1]);
    ctx.fillStyle = C.sole; ctx.strokeStyle = INK; ctx.lineWidth = 1.6; ctx.lineJoin = 'round';
    G.roundRect(ctx, -5, 1, 17, 5, 2.5); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = C.strap; ctx.lineWidth = 2.2; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(1, 1.5); ctx.lineTo(5, -3); ctx.lineTo(8, 1.5); ctx.stroke();
    ctx.restore();
  }

  function arm(ctx, sh, hand) {
    const e = ik(sh[0], sh[1], hand[0], hand[1], 19, 19, -1);
    limb(ctx, [e, hand], 7, C.skin);
    limb(ctx, [sh, e], 10.5, C.shirt);
    ctx.fillStyle = C.skin; ctx.strokeStyle = INK; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(hand[0], hand[1], 5.8, 0, TAU); ctx.fill(); ctx.stroke();
  }

  function bloom(ctx, x, y, r, col) {
    ctx.fillStyle = col;
    for (let i = 0; i < 5; i++) {
      const a = (i * TAU) / 5;
      ctx.beginPath(); ctx.arc(x + Math.cos(a) * r, y + Math.sin(a) * r, r * 0.8, 0, TAU); ctx.fill();
    }
    ctx.fillStyle = '#ff9d2f'; ctx.beginPath(); ctx.arc(x, y, r * 0.55, 0, TAU); ctx.fill();
  }

  function torso(ctx, hip, lean) {
    ctx.save(); ctx.translate(hip[0], hip[1]); ctx.rotate(lean);
    ctx.lineJoin = 'round'; ctx.strokeStyle = INK; ctx.lineWidth = 2.4;
    ctx.fillStyle = C.shorts; G.roundRect(ctx, -15, -8, 31, 17, 6); ctx.fill(); ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-14, -2); ctx.bezierCurveTo(-19, -22, -15, -38, -7, -42);
    ctx.lineTo(9, -42); ctx.bezierCurveTo(20, -34, 22, -12, 15, -2); ctx.closePath();
    ctx.fillStyle = C.shirt; ctx.fill(); ctx.stroke();
    ctx.save(); ctx.clip();
    bloom(ctx, -7, -31, 3, C.flowerA); bloom(ctx, 8, -23, 3.4, C.flowerB); bloom(ctx, -9, -13, 3.2, C.flowerB);
    bloom(ctx, 6, -8, 2.8, C.flowerA); bloom(ctx, 1, -38, 2.4, C.flowerB);
    ctx.fillStyle = C.shirtDark; ctx.fillRect(-20, -4, 44, 3);
    ctx.restore();
    ctx.fillStyle = C.skin; ctx.beginPath(); ctx.moveTo(-4, -42); ctx.lineTo(7, -42); ctx.lineTo(1.5, -32); ctx.closePath(); ctx.fill();
    ctx.fillStyle = C.shirtDark; ctx.lineWidth = 1.4;
    ctx.beginPath(); ctx.moveTo(-6, -43); ctx.lineTo(1.5, -32); ctx.lineTo(-4, -34); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(9, -43); ctx.lineTo(1.5, -32); ctx.lineTo(7, -34); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.restore();
  }

  function angerMark(ctx, x, y, s) {
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    ctx.strokeStyle = '#ff3b4f'; ctx.lineWidth = 2.6; ctx.lineCap = 'round';
    for (let i = 0; i < 4; i++) {
      ctx.save(); ctx.rotate((i * Math.PI) / 2);
      ctx.beginPath(); ctx.moveTo(1.6, -8); ctx.quadraticCurveTo(1.6, -1.6, 8, -1.6); ctx.stroke();
      ctx.restore();
    }
    ctx.restore();
  }

  function head(ctx, cx, cy, o) {
    const sh = o.shout || 0, t = o.t || 0;
    ctx.save(); ctx.translate(cx, cy); ctx.rotate(-0.06 - sh * 0.1);
    ctx.lineJoin = 'round'; ctx.lineCap = 'round'; ctx.lineWidth = 2.4; ctx.strokeStyle = INK;
    ctx.fillStyle = C.skin;
    ctx.beginPath(); ctx.arc(-14, 3, 4.6, 0, TAU); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.ellipse(0, 0, 17.5, 16.5, 0, 0, TAU); ctx.fill(); ctx.stroke();
    ctx.fillStyle = `rgba(255,90,90,${0.25 + 0.35 * sh})`;
    ctx.beginPath(); ctx.ellipse(5, 8, 6, 3.6, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = C.skin;
    ctx.beginPath(); ctx.arc(17.5, 3, 4.4, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.arc(17.5, 3, 4.4, -1.8, 1.8); ctx.stroke();
    // 眼睛：白眼球 + 盯着鹈鹕的瞳孔
    ctx.lineWidth = 1.8; ctx.fillStyle = '#fff';
    for (const [ex, rx] of [[1.5, 3.8], [12, 3.3]]) {
      ctx.beginPath(); ctx.ellipse(ex, -2, rx, 4.4, 0, 0, TAU); ctx.fill(); ctx.stroke();
      ctx.fillStyle = INK; ctx.beginPath(); ctx.arc(ex + 1.5, -1.5, 1.9, 0, TAU); ctx.fill(); ctx.fillStyle = '#fff';
    }
    ctx.lineWidth = 3.4;
    ctx.beginPath(); ctx.moveTo(-4, -11); ctx.lineTo(6.5, -6); ctx.moveTo(9, -6.5); ctx.lineTo(17.5, -11); ctx.stroke();
    // 嘴
    if (sh > 0.06) {
      const ry = 1.8 + 5.4 * sh, my = 10.5 + ry * 0.4;
      ctx.save(); ctx.beginPath(); ctx.ellipse(10.5, my, 6.4, ry, 0, 0, TAU); ctx.clip();
      ctx.fillStyle = C.mouth; ctx.fillRect(0, 0, 30, 30);
      ctx.fillStyle = C.tongue; ctx.beginPath(); ctx.ellipse(10.5, my + ry * 0.75, 4.2, ry * 0.5, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.fillRect(4, my - ry - 1, 13, 2.8);
      ctx.restore();
      ctx.lineWidth = 1.9; ctx.beginPath(); ctx.ellipse(10.5, my, 6.4, ry, 0, 0, TAU); ctx.stroke();
    } else {
      ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(5, 13); ctx.quadraticCurveTo(10.5, 8.5, 16, 12.5); ctx.stroke();
    }
    ctx.lineWidth = 2.4; ctx.fillStyle = C.hair;
    if (o.helmet) {
      ctx.fillStyle = C.yellow;
      ctx.beginPath(); ctx.moveTo(-19, -8); ctx.bezierCurveTo(-25, -31, 16, -34, 19.5, -13);
      ctx.lineTo(27, -12); ctx.lineTo(26, -8.5); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.strokeStyle = 'rgba(255,255,255,.7)'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(-1, -12, 15, -2.6, -1.5); ctx.stroke();
    } else {
      ctx.beginPath(); ctx.moveTo(-6, -22); ctx.quadraticCurveTo(-8, -31, -1, -33 - sh * 2); ctx.quadraticCurveTo(-1, -27, 3, -23); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-17, -1); ctx.bezierCurveTo(-21, -19, -3, -27, 12, -20);
      ctx.bezierCurveTo(16, -17, 17, -12, 16.5, -8); ctx.quadraticCurveTo(9, -14, 0, -12);
      ctx.quadraticCurveTo(-10, -12, -17, -1); ctx.closePath(); ctx.fill(); ctx.stroke();
    }
    angerMark(ctx, 14, o.helmet ? -30 : -25, 0.9 + 0.18 * Math.sin(t * 14));
    ctx.restore();
  }

  function sweatDrops(ctx, x, y, t) {
    for (let i = 0; i < 3; i++) {
      const u = (t * 1.5 + i / 3) % 1;
      const dx = x - 16 - u * 32, dy = y - 8 + u * 22 - Math.sin(u * Math.PI) * 14;
      ctx.fillStyle = `rgba(170,225,255,${1 - u})`; ctx.strokeStyle = `rgba(58,33,64,${0.7 * (1 - u)})`; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(dx, dy - 5); ctx.quadraticCurveTo(dx + 4, dy + 1, dx, dy + 3.5);
      ctx.quadraticCurveTo(dx - 4, dy + 1, dx, dy - 5); ctx.fill(); ctx.stroke();
    }
  }

  function wheel(ctx, cx, cy, r, ang) {
    ctx.save(); ctx.translate(cx, cy);
    ctx.strokeStyle = INK; ctx.lineWidth = r * 0.34 + 3; ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.stroke();
    ctx.strokeStyle = C.tire; ctx.lineWidth = r * 0.34; ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.stroke();
    ctx.fillStyle = C.rim; ctx.beginPath(); ctx.arc(0, 0, r * 0.8, 0, TAU); ctx.fill();
    ctx.strokeStyle = '#a99bb8'; ctx.lineWidth = 1.3; ctx.beginPath();
    for (let i = 0; i < 5; i++) { const a = ang + (i * TAU) / 5; ctx.moveTo(0, 0); ctx.lineTo(Math.cos(a) * r * 0.78, Math.sin(a) * r * 0.78); }
    ctx.stroke();
    ctx.fillStyle = '#8b7a9c'; ctx.beginPath(); ctx.arc(0, 0, r * 0.22, 0, TAU); ctx.fill();
    ctx.restore();
  }

  function glow(ctx, x, y, r, col, a) {
    if (a <= 0.02) return;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, `rgba(${col},${a})`); g.addColorStop(1, `rgba(${col},0)`);
    ctx.fillStyle = g; ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }

  function scooterParts(ctx, ang, lamp) {
    wheel(ctx, -32, -8.5, 8.5, ang);
    ctx.fillStyle = C.deck; ctx.strokeStyle = INK; ctx.lineWidth = 2.2; ctx.lineJoin = 'round';
    G.roundRect(ctx, -40, -15.5, 68, 7, 3.5); ctx.fill(); ctx.stroke();
    ctx.fillStyle = C.yellow; G.roundRect(ctx, -40, -15.5, 12, 7, 3.5); ctx.fill(); ctx.stroke();
    limb(ctx, [[32, -9], [28, -82]], 3.6, C.yellow);
    wheel(ctx, 34, -8.5, 8.5, ang);
    ctx.fillStyle = '#fff'; ctx.strokeStyle = INK; ctx.lineWidth = 1.2;
    ctx.fillRect(28.4, -52, 7, 7); ctx.strokeRect(28.4, -52, 7, 7);
    ctx.fillStyle = INK; ctx.fillRect(29.6, -50.8, 2, 2); ctx.fillRect(32.6, -47.8, 2, 2); ctx.fillRect(32.6, -50.8, 1.4, 1.4);
    limb(ctx, [[23, -82], [33, -82]], 4, C.deck);
    ctx.fillStyle = '#fff3b0'; ctx.beginPath(); ctx.arc(34.5, -78, 2.6, 0, TAU); ctx.fill();
    glow(ctx, 34.5, -78, 34, '255,240,170', 0.5 * lamp);
  }

  function mopedBack(ctx, ang, lamp) {
    glow(ctx, 40, -50, 70, '255,240,170', 0.55 * lamp);
    wheel(ctx, -34, -13, 13, ang);
    ctx.fillStyle = C.blue; ctx.strokeStyle = INK; ctx.lineWidth = 2.4; ctx.lineJoin = 'round';
    G.roundRect(ctx, -62, -46, 52, 30, 12); ctx.fill(); ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,.4)'; G.roundRect(ctx, -55, -42, 30, 5, 2.5); ctx.fill();
    ctx.fillStyle = C.deck; ctx.strokeStyle = INK; G.roundRect(ctx, -14, -23, 40, 7, 3); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#4a2f45'; G.roundRect(ctx, -47, -52, 38, 9, 4.5); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#ff4d5e'; ctx.beginPath(); ctx.arc(-61, -34, 2.8, 0, TAU); ctx.fill();
    glow(ctx, -61, -34, 18, '255,77,94', 0.7 * lamp);
    limb(ctx, [[24, -60], [15, -68]], 3.6, C.metal);
    ctx.fillStyle = C.deck; ctx.strokeStyle = INK; ctx.lineWidth = 1.6; G.roundRect(ctx, 9, -72, 11, 6, 3); ctx.fill(); ctx.stroke();
  }

  function mopedFront(ctx, ang, lamp) {
    limb(ctx, [[27, -50], [31, -13]], 3.4, C.metal);
    wheel(ctx, 31, -13, 13, ang);
    ctx.strokeStyle = INK; ctx.lineWidth = 6.4; ctx.beginPath(); ctx.arc(31, -13, 17.5, Math.PI * 1.12, Math.PI * 1.7); ctx.stroke();
    ctx.strokeStyle = C.blueDark; ctx.lineWidth = 3.2; ctx.beginPath(); ctx.arc(31, -13, 17.5, Math.PI * 1.12, Math.PI * 1.7); ctx.stroke();
    ctx.fillStyle = C.blue; ctx.strokeStyle = INK; ctx.lineWidth = 2.4; ctx.lineJoin = 'round';
    ctx.beginPath(); ctx.moveTo(13, -20); ctx.lineTo(13, -34); ctx.bezierCurveTo(14, -50, 19, -58, 29, -61);
    ctx.lineTo(38, -56); ctx.bezierCurveTo(39, -44, 41, -30, 41, -20); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#fff3b0'; ctx.beginPath(); ctx.arc(37.5, -50, 4.6, 0, TAU); ctx.fill(); ctx.stroke();
  }

  G.drawOwner = function (ctx, o) {
    const t = o.t || 0, ph = o.run || 0, mode = o.mode || 'foot', lamp = G.clamp(o.lamp || 0, 0, 1);
    const wheelAng = ph * 1.3;
    let hip, lean, footN, footF, handF, pre = null, post = null;

    if (mode === 'scooter') {
      hip = [-3, -62 + Math.sin(t * 15) * 0.8]; lean = 0.1;
      footN = [9, -20.5]; footF = [-11, -20.5];
      handF = [28, -81];
      pre = () => scooterParts(ctx, wheelAng, lamp);
    } else if (mode === 'moped') {
      hip = [-24, -54 + Math.sin(t * 18) * 0.7]; lean = 0.32;
      footN = [8, -28]; footF = [3, -28];
      handF = [14, -70];
      pre = () => mopedBack(ctx, wheelAng, lamp);
      post = () => mopedFront(ctx, wheelAng, lamp);
    } else {
      hip = [0, -46 - Math.abs(Math.sin(ph)) * 3.2];
      lean = o.lean === undefined ? 0.22 : o.lean;
      const fp = (a) => [hip[0] + 3 + Math.cos(a) * 24, -5 - 20 * Math.pow(Math.max(0, -Math.sin(a)), 0.7)];
      footN = fp(ph); footF = fp(ph + Math.PI);
    }

    const shoulder = tw(hip, lean, 2, -38);
    if (!handF) handF = [shoulder[0] + Math.sin(ph) * 15 + 3, shoulder[1] + 25 - Math.abs(Math.cos(ph)) * 6];
    const fist = [shoulder[0] + 34 + Math.sin(t * 23) * 1.6, shoulder[1] - 5 + Math.cos(t * 27) * 1.6];
    const headPos = tw(hip, lean, 4, -60);

    ctx.save();
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    if (pre) pre();
    arm(ctx, shoulder, handF);
    leg(ctx, [hip[0] - 2, hip[1] + 2], footF);
    torso(ctx, hip, lean);
    leg(ctx, [hip[0] + 4, hip[1] + 2], footN);
    if (mode === 'foot' || o.sweat) sweatDrops(ctx, headPos[0], headPos[1], t);
    head(ctx, headPos[0], headPos[1], { t, shout: o.shout, helmet: mode === 'moped' });
    arm(ctx, shoulder, fist);
    if (post) post();
    ctx.restore();
  };
})();
