// 绘制：骑自行车的鹈鹕（局部坐标：地面 y=0，向上为负，车头朝右 +x）
(function () {
  const G = window.G, TAU = G.TAU, INK = G.INK;

  const C = {
    frame: '#14b8a6', frameDark: '#0c8a7c', tire: '#2a1c33', rim: '#efe7f2',
    seat: '#4a2f45', metal: '#cfc6d6', chain: '#4d3d57',
    feather: '#fffaf3', shade: '#eadbe0', wingTip: '#3d3250', wingMid: '#a99bb8',
    bill: '#ff9d2f', billLight: '#ffd27a', pouch: '#ffc766', nail: '#d8701c',
    leg: '#ff8a3d', legFar: '#d9692a', mask: '#2a1f3a', scarf: '#ff5c73', scarfDark: '#d93a58',
    basket: '#d9a25e', basketDark: '#a86f34',
  };

  function ik(hx, hy, fx, fy, l1, l2) {
    let dx = fx - hx, dy = fy - hy;
    let d = Math.hypot(dx, dy);
    d = G.clamp(d, Math.abs(l1 - l2) + 0.5, l1 + l2 - 0.5);
    const a = Math.atan2(dy, dx);
    const ang = Math.acos(G.clamp((l1 * l1 + d * d - l2 * l2) / (2 * l1 * d), -1, 1));
    return [hx + Math.cos(a - ang) * l1, hy + Math.sin(a - ang) * l1]; // 膝盖朝前
  }

  function poly(ctx, pts) {
    ctx.beginPath();
    ctx.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
  }

  // 两遍描边：先粗的深色，再细的本色，接缝处不会出现描边线
  function tube(ctx, paths, lw, color) {
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.strokeStyle = INK; ctx.lineWidth = lw + 3.2;
    paths.forEach((p) => { poly(ctx, p); ctx.stroke(); });
    ctx.strokeStyle = color; ctx.lineWidth = lw;
    paths.forEach((p) => { poly(ctx, p); ctx.stroke(); });
  }

  function wheel(ctx, cx, cy, ang) {
    ctx.save(); ctx.translate(cx, cy);
    ctx.lineWidth = 5; ctx.strokeStyle = C.tire;
    ctx.beginPath(); ctx.arc(0, 0, 22.4, 0, TAU); ctx.stroke();
    ctx.lineWidth = 1.6; ctx.strokeStyle = C.rim;
    ctx.beginPath(); ctx.arc(0, 0, 19, 0, TAU); ctx.stroke();
    ctx.lineWidth = 0.9; ctx.strokeStyle = 'rgba(239,231,242,.8)';
    ctx.beginPath();
    for (let i = 0; i < 14; i++) {
      const a = ang + (i * TAU) / 14;
      ctx.moveTo(Math.cos(a) * 3, Math.sin(a) * 3); ctx.lineTo(Math.cos(a) * 19, Math.sin(a) * 19);
    }
    ctx.stroke();
    ctx.fillStyle = '#ffb347';
    ctx.beginPath(); ctx.arc(Math.cos(ang) * 20.6, Math.sin(ang) * 20.6, 1.9, 0, TAU); ctx.fill();
    ctx.fillStyle = C.rim; ctx.strokeStyle = INK; ctx.lineWidth = 1.4;
    ctx.beginPath(); ctx.arc(0, 0, 3.4, 0, TAU); ctx.fill(); ctx.stroke();
    ctx.restore();
  }

  function webbedFoot(ctx, x, y, color) {
    ctx.save(); ctx.translate(x, y);
    ctx.beginPath();
    ctx.moveTo(-3, -3); ctx.quadraticCurveTo(6, -5, 13, 1); ctx.quadraticCurveTo(13, 5, 8, 5); ctx.lineTo(-3, 4); ctx.closePath();
    ctx.fillStyle = color; ctx.strokeStyle = INK; ctx.lineWidth = 1.6; ctx.lineJoin = 'round';
    ctx.fill(); ctx.stroke();
    ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(2, 1); ctx.lineTo(11, 2); ctx.stroke();
    ctx.restore();
  }

  function leg(ctx, hip, foot, color) {
    const knee = ik(hip[0], hip[1], foot[0], foot[1], 29, 33);
    tube(ctx, [[hip, knee, [foot[0] - 1, foot[1] - 2]]], 4.6, color);
    webbedFoot(ctx, foot[0] - 2, foot[1] - 1, color);
  }

  // 翅膀：沿局部 +x 方向从肩膀伸出。bend<0 表示向上鼓（手肘外翻）
  function wing(ctx, sx, sy, ang, len, wid, bend, shade) {
    ctx.save(); ctx.translate(sx, sy); ctx.rotate(ang);
    const path = () => {
      ctx.beginPath();
      ctx.moveTo(0, -wid * 0.28);
      ctx.bezierCurveTo(len * 0.3, -wid * 0.62 + bend, len * 0.75, -wid * 0.42 + bend, len, bend * 0.4);
      ctx.bezierCurveTo(len * 0.82, wid * 0.42 + bend * 0.3, len * 0.4, wid * 0.55, 0, wid * 0.3);
      ctx.closePath();
    };
    path();
    ctx.fillStyle = shade ? C.shade : C.feather; ctx.fill();
    ctx.save(); ctx.clip();
    ctx.fillStyle = C.wingMid;
    ctx.beginPath(); ctx.moveTo(len * 0.5, -wid); ctx.lineTo(len * 0.5, wid); ctx.lineTo(len * 0.56, wid); ctx.lineTo(len * 0.56, -wid); ctx.fill();
    ctx.fillStyle = C.wingTip;
    ctx.beginPath();
    ctx.moveTo(len * 0.62, -wid);
    for (let i = 0; i < 4; i++) { ctx.lineTo(len * (0.66 + i * 0.07), wid * (i % 2 ? 0.12 : -0.05)); ctx.lineTo(len * (0.68 + i * 0.07), wid); }
    ctx.lineTo(len * 1.1, wid); ctx.lineTo(len * 1.1, -wid); ctx.closePath(); ctx.fill();
    ctx.restore();
    path(); ctx.lineWidth = 2.2; ctx.strokeStyle = INK; ctx.lineJoin = 'round'; ctx.stroke();
    ctx.restore();
  }

  function fishTail(ctx, x, y, ang, col) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(ang);
    ctx.fillStyle = col; ctx.strokeStyle = INK; ctx.lineWidth = 1.3; ctx.lineJoin = 'round';
    ctx.beginPath(); ctx.moveTo(0, 2); ctx.lineTo(-3, -6); ctx.lineTo(0, -4.5); ctx.lineTo(3, -6); ctx.closePath();
    ctx.fill(); ctx.stroke();
    ctx.fillRect(-1.6, 0, 3.2, 5);
    ctx.restore();
  }

  function basket(ctx, t, fish) {
    const x = 42, y = -71, w = 27, h = 19;
    const cols = ['#8fd3ff', '#ffb066', '#b9e6ff', '#ff8f8f', '#a9f0c4'];
    for (let i = 0; i < Math.min(fish, 5); i++) fishTail(ctx, x + 5 + i * 4.8, y + 3, -0.3 + i * 0.16 + Math.sin(t * 6 + i) * 0.08, cols[i]);
    ctx.fillStyle = C.basket; ctx.strokeStyle = INK; ctx.lineWidth = 1.8; ctx.lineJoin = 'round';
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + w, y); ctx.lineTo(x + w - 3, y + h); ctx.lineTo(x + 3, y + h); ctx.closePath();
    ctx.fill(); ctx.stroke();
    ctx.strokeStyle = C.basketDark; ctx.lineWidth = 1;
    ctx.beginPath();
    for (let i = 1; i < 5; i++) { ctx.moveTo(x + i * 5.4, y + 2); ctx.lineTo(x + 3 + i * 4.6, y + h - 1); }
    ctx.moveTo(x + 1, y + 7); ctx.lineTo(x + w - 1, y + 7); ctx.moveTo(x + 2, y + 13); ctx.lineTo(x + w - 2, y + 13);
    ctx.stroke();
    ctx.strokeStyle = INK; ctx.lineWidth = 2.2; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(x - 1, y); ctx.lineTo(x + w + 1, y); ctx.stroke();
  }

  G.drawPelican = function (ctx, p) {
    const t = p.t || 0;
    const k = G.smooth(p.tuck || 0), gl = G.smooth(p.glide || 0);
    const RA = [-41, -25], FA = [41, -25], BB = [-4, -20];
    const SC = [-14, -56], HT = [28, -58], HB = [31, -49], ST = [26, -67], GR = [43, -67];
    const pa = p.pedal || 0;
    const nearP = [BB[0] + Math.cos(pa) * 12, BB[1] + Math.sin(pa) * 12];
    const farP = [BB[0] - Math.cos(pa) * 12, BB[1] - Math.sin(pa) * 12];
    const hipN = [-12, -69 + k * 2], hipF = [-15, -70 + k * 2];

    const bc = [G.lerp(-12, -6, k), G.lerp(-85, -78, k) - 2 * gl];
    const rot = G.lerp(-0.42, -0.03, k) - 0.12 * gl;
    const cs = Math.cos(rot), sn = Math.sin(rot);
    const bw = (lx, ly) => [bc[0] + lx * cs - ly * sn, bc[1] + lx * sn + ly * cs];
    const hc = [G.lerp(31, 41, k), G.lerp(-124, -96, k) - 4 * gl];
    const n0 = bw(19, -8), n1 = [hc[0] - 4, hc[1] + 6];
    const nc1 = [n0[0] + G.lerp(13, 12, k), n0[1] - G.lerp(3, 1, k)];
    const nc2 = [hc[0] - G.lerp(15, 15, k), hc[1] + G.lerp(13, 8, k)];
    const neck = () => { ctx.beginPath(); ctx.moveTo(n0[0], n0[1]); ctx.bezierCurveTo(nc1[0], nc1[1], nc2[0], nc2[1], n1[0], n1[1]); };
    const nb = (u) => {
      const v = 1 - u;
      return [v * v * v * n0[0] + 3 * v * v * u * nc1[0] + 3 * v * u * u * nc2[0] + u * u * u * n1[0],
        v * v * v * n0[1] + 3 * v * v * u * nc1[1] + 3 * v * u * u * nc2[1] + u * u * u * n1[1]];
    };
    const sh = bw(14, -12);

    ctx.save();
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';

    // 1. 远侧翅膀（滑翔时才露出来）
    if (gl > 0.02) {
      const fa = -1.7 + gl * 0 + Math.sin(t * 15 + 1.3) * 0.32 + (p.flap || 0) * 0.5;
      wing(ctx, sh[0] - 5, sh[1] + 1, fa, 66 * gl, 27, 3, true);
    }
    // 2. 远侧腿
    leg(ctx, hipF, farP, C.legFar);
    ctx.strokeStyle = INK; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(BB[0], BB[1]); ctx.lineTo(farP[0], farP[1]); ctx.stroke();

    // 3. 车轮与车架
    wheel(ctx, RA[0], RA[1], p.wheel || 0);
    wheel(ctx, FA[0], FA[1], p.wheel || 0);
    tube(ctx, [[BB, RA], [SC, RA], [SC, HT], [BB, HB], [BB, SC], [HT, HB]], 4, C.frame);
    tube(ctx, [[HB, FA]], 3.4, C.frameDark);
    ctx.strokeStyle = 'rgba(255,255,255,.45)'; ctx.lineWidth = 1;
    poly(ctx, [[SC[0] + 3, SC[1] - 1.2], [HT[0] - 3, HT[1] - 1.2]]); ctx.stroke();
    // 座椅、把手
    tube(ctx, [[SC, [SC[0] - 1.5, SC[1] - 6]]], 3, C.metal);
    ctx.fillStyle = C.seat; ctx.strokeStyle = INK; ctx.lineWidth = 1.8;
    ctx.beginPath(); ctx.moveTo(-30, -64); ctx.quadraticCurveTo(-29, -70, -21, -69); ctx.lineTo(-9, -66.5); ctx.quadraticCurveTo(-5, -64.5, -9, -62.5); ctx.lineTo(-27, -61.5); ctx.quadraticCurveTo(-31, -61.5, -30, -64); ctx.closePath();
    ctx.fill(); ctx.stroke();
    tube(ctx, [[HT, ST]], 3.4, C.metal);
    ctx.lineWidth = 6.2; ctx.strokeStyle = INK;
    ctx.beginPath(); ctx.moveTo(ST[0] - 2, ST[1]); ctx.quadraticCurveTo(35, ST[1] - 7, GR[0] + 2, GR[1] + 1); ctx.stroke();
    ctx.lineWidth = 3; ctx.strokeStyle = C.metal; ctx.stroke();
    // 前车筐（里面的鱼 = 你吃到的鱼）
    basket(ctx, t, p.fish || 0);
    // 链条与曲柄（骑行者的右侧 = 离镜头近的一侧）
    ctx.lineWidth = 1.6; ctx.strokeStyle = C.chain; ctx.setLineDash([2.2, 1.8]); ctx.lineDashOffset = -pa * 7;
    ctx.beginPath(); ctx.moveTo(BB[0], BB[1] - 8); ctx.lineTo(RA[0], RA[1] - 4.6); ctx.moveTo(BB[0], BB[1] + 8); ctx.lineTo(RA[0], RA[1] + 4.6); ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = C.metal; ctx.strokeStyle = INK; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(BB[0], BB[1], 8, 0, TAU); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.arc(RA[0], RA[1], 4.6, 0, TAU); ctx.fill(); ctx.stroke();
    ctx.fillStyle = INK;
    for (let i = 0; i < 4; i++) { const a = pa + (i * TAU) / 4; ctx.beginPath(); ctx.arc(BB[0] + Math.cos(a) * 4.6, BB[1] + Math.sin(a) * 4.6, 1.1, 0, TAU); ctx.fill(); }

    // 4. 鹈鹕的白色身体：先统一描边、再统一填充，轮廓是一整块
    const scarfBase = nb(0.28);
    const bodyPath = () => { ctx.beginPath(); ctx.ellipse(bc[0], bc[1], 27, 18, rot, 0, TAU); };
    const tailPath = () => {
      const a = bw(-18, -7), b = bw(-56, 1), c = bw(-20, 10);
      ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.quadraticCurveTo((a[0] + b[0]) / 2, b[1] - 8, b[0], b[1]); ctx.quadraticCurveTo((c[0] + b[0]) / 2, b[1] + 8, c[0], c[1]); ctx.closePath();
    };
    const headPath = () => { ctx.beginPath(); ctx.arc(hc[0], hc[1], 10.5, 0, TAU); };
    ctx.strokeStyle = INK; ctx.lineWidth = 5.4;
    tailPath(); ctx.stroke(); bodyPath(); ctx.stroke(); headPath(); ctx.stroke();
    neck(); ctx.lineWidth = 12 + 5.4; ctx.stroke();
    ctx.fillStyle = C.feather;
    tailPath(); ctx.fill(); bodyPath(); ctx.fill(); headPath(); ctx.fill();
    neck(); ctx.lineWidth = 12; ctx.strokeStyle = C.feather; ctx.stroke();
    // 尾羽尖、肚子阴影、背部羽纹
    ctx.save(); tailPath(); ctx.clip();
    const tt = bw(-40, 0); ctx.fillStyle = C.wingMid; ctx.beginPath(); ctx.arc(tt[0] - 6, tt[1] + 1, 15, 0, TAU); ctx.fill(); ctx.restore();
    ctx.save(); bodyPath(); ctx.clip();
    ctx.fillStyle = C.shade; ctx.beginPath(); ctx.ellipse(bw(2, 15)[0], bw(2, 15)[1], 28, 9, rot, 0, TAU); ctx.fill();
    ctx.strokeStyle = 'rgba(120,100,130,.45)'; ctx.lineWidth = 1.2;
    for (let i = 0; i < 3; i++) { const a = bw(-16 + i * 7, -13 + i * 1.5), b = bw(-9 + i * 7, -3 + i); ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.quadraticCurveTo(b[0] + 3, a[1] + 2, b[0], b[1]); ctx.stroke(); }
    ctx.restore();

    // 围巾（赃物？不，是逃亡装备）
    {
      const sp = p.speed === undefined ? 0.5 : p.speed, amp = 2.2 + 3.2 * sp, L = 12 + 12 * sp;
      const s0 = scarfBase, pts = [s0];
      for (let i = 1; i <= 4; i++) pts.push([s0[0] - i * L / 4 - 1, s0[1] + 2 + i * 1.5 + Math.sin(t * 16 - i * 1.1) * amp * (i / 4)]);
      ctx.lineCap = 'round';
      [[15, INK], [12, C.scarf]].forEach(([w, col], j) => {
        ctx.strokeStyle = col;
        for (let i = 0; i < 4; i++) {
          ctx.lineWidth = (j === 0 ? 3 : 0) + (i === 0 ? 8 : 6.5 - i * 1.1);
          ctx.beginPath(); ctx.moveTo(pts[i][0], pts[i][1]); ctx.lineTo(pts[i + 1][0], pts[i + 1][1]); ctx.stroke();
        }
      });
      ctx.strokeStyle = C.scarfDark; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(s0[0] - 2, s0[1] - 3); ctx.lineTo(s0[0] + 1, s0[1] + 3); ctx.stroke();
    }

    // 5. 近侧腿盖在车架和身体前面
    leg(ctx, hipN, nearP, C.leg);
    ctx.strokeStyle = INK; ctx.lineWidth = 4.2; ctx.beginPath(); ctx.moveTo(BB[0], BB[1]); ctx.lineTo(nearP[0], nearP[1]); ctx.stroke();
    ctx.strokeStyle = C.metal; ctx.lineWidth = 2; ctx.stroke();
    ctx.fillStyle = C.seat; ctx.fillRect(nearP[0] - 5, nearP[1] + 1.5, 10, 2.6);
    leg(ctx, hipN, nearP, C.leg);

    // 6. 近侧翅膀：平时握着车把，滑翔时张开
    {
      const grip = Math.atan2(GR[1] - sh[1], GR[0] - sh[0]), gd = Math.hypot(GR[0] - sh[0], GR[1] - sh[1]);
      const fa = G.lerp(grip, -1.95 + Math.sin(t * 15) * 0.3 + (p.flap || 0) * 0.55, gl);
      wing(ctx, sh[0], sh[1], fa, G.lerp(gd + 3, 74, gl), G.lerp(17, 30, gl), G.lerp(-7, 4, gl), false);
      if (gl < 0.5) { ctx.fillStyle = C.seat; ctx.strokeStyle = INK; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(GR[0] + 1, GR[1] + 1, 2.6, 0, TAU); ctx.fill(); ctx.stroke(); }
    }

    // 7. 头：嘴袋、上喙、眼罩
    ctx.save(); ctx.translate(hc[0], hc[1]); ctx.rotate(G.lerp(0.1, 0.2, k) - 0.16 * gl);
    const pd = 11 + Math.min(p.fish || 0, 10) * 0.9;
    ctx.lineJoin = 'round';
    ctx.beginPath(); ctx.moveTo(8, 3); ctx.bezierCurveTo(17, 3 + pd * 1.2, 40, 3 + pd * 1.1, 53, 3.5); ctx.lineTo(8, 3); ctx.closePath();
    ctx.fillStyle = C.pouch; ctx.fill(); ctx.lineWidth = 2.2; ctx.strokeStyle = INK; ctx.stroke();
    ctx.strokeStyle = 'rgba(200,110,40,.55)'; ctx.lineWidth = 1;
    for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.moveTo(20 + i * 8, 4.5); ctx.quadraticCurveTo(22 + i * 8, pd * 0.7 + 4, 25 + i * 8, pd * 0.85 + 3); ctx.stroke(); }
    ctx.beginPath(); ctx.moveTo(7, -6.5); ctx.bezierCurveTo(20, -8, 40, -7, 53, -2.5); ctx.quadraticCurveTo(58, 0, 56, 4.5); ctx.quadraticCurveTo(53, 6, 51, 3.4); ctx.lineTo(8, 3.6); ctx.closePath();
    ctx.fillStyle = C.bill; ctx.fill(); ctx.lineWidth = 2.2; ctx.strokeStyle = INK; ctx.stroke();
    ctx.strokeStyle = C.billLight; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(13, -4.2); ctx.bezierCurveTo(25, -5.4, 38, -4.6, 49, -1.6); ctx.stroke();
    ctx.fillStyle = C.nail; ctx.beginPath(); ctx.moveTo(51, -2.6); ctx.quadraticCurveTo(57, -0.5, 56, 4.5); ctx.quadraticCurveTo(53, 6, 51, 3.4); ctx.closePath(); ctx.fill();
    ctx.fillStyle = INK; ctx.beginPath(); ctx.arc(27, -3.6, 0.9, 0, TAU); ctx.fill();
    ctx.restore();

    // 眼罩 + 眼睛（偷车贼标配）
    ctx.save(); headPath(); ctx.clip();
    ctx.translate(hc[0], hc[1] - 1.6); ctx.rotate(-0.16);
    ctx.fillStyle = C.mask; ctx.fillRect(-14, -4.6, 28, 9);
    ctx.restore();
    {
      const ex = hc[0] + 4.4, ey = hc[1] - 2.6, bl = p.blink || 0;
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.ellipse(ex, ey, 3.7, 3.7 * (1 - bl * 0.9), 0, 0, TAU); ctx.fill();
      ctx.fillStyle = INK; ctx.beginPath(); ctx.ellipse(ex + 1 + (p.look || 0), ey + 0.2, 1.9, 1.9 * (1 - bl * 0.9), 0, 0, TAU); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(ex + 1.7 + (p.look || 0), ey - 0.8, 0.7, 0, TAU); ctx.fill();
    }
    ctx.strokeStyle = C.shade; ctx.lineWidth = 2.2; ctx.beginPath();
    ctx.moveTo(hc[0] - 8, hc[1] - 6); ctx.quadraticCurveTo(hc[0] - 15, hc[1] - 9 + Math.sin(t * 12) * 1.2, hc[0] - 17, hc[1] - 3); ctx.stroke();

    // 汗滴 / 晕星
    if (p.sweat > 0.05) {
      ctx.fillStyle = '#8fd8ff'; ctx.strokeStyle = INK; ctx.lineWidth = 1;
      for (let i = 0; i < 2; i++) {
        const u = (t * 2.4 + i * 0.5) % 1, x = hc[0] - 10 - u * 16 - i * 4, y = hc[1] - 12 + u * 14 - i * 3;
        ctx.globalAlpha = (1 - u) * G.clamp(p.sweat * 1.4, 0, 1);
        ctx.beginPath(); ctx.moveTo(x, y - 4); ctx.quadraticCurveTo(x + 3.2, y + 1, x, y + 3); ctx.quadraticCurveTo(x - 3.2, y + 1, x, y - 4); ctx.fill(); ctx.stroke();
      }
      ctx.globalAlpha = 1;
    }
    if (p.dizzy > 0) {
      for (let i = 0; i < 3; i++) {
        const a = t * 7 + (i * TAU) / 3, x = hc[0] + Math.cos(a) * 15, y = hc[1] - 19 + Math.sin(a) * 4;
        ctx.save(); ctx.translate(x, y); ctx.rotate(a); ctx.fillStyle = '#ffe14a'; ctx.strokeStyle = INK; ctx.lineWidth = 1;
        ctx.beginPath();
        for (let j = 0; j < 10; j++) { const r = j % 2 ? 2.4 : 5; ctx.lineTo(Math.cos((j * TAU) / 10) * r, Math.sin((j * TAU) / 10) * r); }
        ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.restore();
      }
    }
    ctx.restore();
  };
})();
