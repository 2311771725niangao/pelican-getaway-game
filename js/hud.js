// HUD：分数、追击条、警报晕影、闪屏、横幅、车主喊话气泡、暂停/静音按钮、触屏操作区
// 除晕影/闪屏外全部画在“设计空间”（ctx.scale(u,u)）里：1 个单位 ≈ 1 个 CSS 像素（小屏放大），并避开安全区
(function () {
  const G = window.G, C = G.Game.C, INK = G.INK, GROUND = G.L.GROUND, TAU = G.TAU;
  const Hud = (G.Hud = { buttons: [] });
  G.Input = { jump: false, down: false };

  function vignette(ctx, S, lay) {
    const d = S.state === 'play' ? S.danger() : 0;
    if (d < 0.05) return;
    const a = d * (0.3 + 0.24 * S.heart);
    let g;
    ctx.save();
    if (lay.wide) g = ctx.createRadialGradient(lay.W / 2, lay.Hv / 2, S.H * 0.35, lay.W / 2, lay.Hv / 2, lay.W * 0.62);
    else { ctx.translate(lay.W / 2, lay.Hv / 2); ctx.scale(lay.W / 2, lay.Hv / 2); g = ctx.createRadialGradient(0, 0, 0.55, 0, 0, 1.3); }
    g.addColorStop(0, 'rgba(255,40,80,0)'); g.addColorStop(1, `rgba(255,40,80,${a})`);
    ctx.fillStyle = g;
    if (lay.wide) ctx.fillRect(0, 0, lay.W, lay.Hv); else ctx.fillRect(-1, -1, 2, 2);
    ctx.restore();
  }

  function flash(ctx, S, lay) {
    if (S.flash <= 0.01) return;
    ctx.save(); ctx.globalAlpha = Math.min(0.55, S.flash * 0.9); ctx.fillStyle = S.flashCol; ctx.fillRect(0, 0, lay.W, lay.Hv); ctx.restore();
  }

  function stats(ctx, S, V) {
    ctx.save(); ctx.translate(V.il, V.it);
    ctx.save(); ctx.globalAlpha = 0.4; ctx.fillStyle = '#2a1748'; G.roundRect(ctx, 14, 12, 176, 76, 16); ctx.fill(); ctx.restore();
    G.text(ctx, String(S.score), 28, 52, { size: 34, stroke: INK, strokeW: 5 });
    ctx.save(); ctx.translate(38, 72); ctx.scale(0.6, 0.6); G.drawFish(ctx, { kind: 0, seed: 0 }, 0); ctx.restore();
    G.text(ctx, '× ' + S.fishCount, 58, 78, { size: 17, stroke: INK, strokeW: 3 });
    G.text(ctx, '最佳 ' + S.best, 178, 78, { size: 13, align: 'right', color: '#ffe9c8', stroke: INK, strokeW: 3, alpha: 0.9 });
    ctx.restore();
  }

  function marker(ctx, x, y, kind, S) {
    ctx.save(); ctx.translate(x, y); ctx.lineWidth = 2.4; ctx.strokeStyle = INK; ctx.lineJoin = 'round';
    if (kind === 'owner') {
      ctx.fillStyle = '#ffd2b0'; ctx.beginPath(); ctx.arc(0, 0, 13, 0, TAU); ctx.fill(); ctx.stroke();
      ctx.fillStyle = S.owner.mode === 'moped' ? '#ff6f61' : '#3b6fd6';
      ctx.beginPath(); ctx.arc(0, -1, 13, Math.PI * 1.02, Math.PI * 1.98); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.lineWidth = 2.2; ctx.beginPath(); ctx.moveTo(-7, 1); ctx.lineTo(-2, 3); ctx.moveTo(7, 1); ctx.lineTo(2, 3); ctx.stroke();
      ctx.beginPath(); ctx.arc(0, 8, 2.6, 0, TAU); ctx.fillStyle = INK; ctx.fill();
    } else {
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(0, 0, 13, 0, TAU); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#ffb347'; ctx.beginPath(); ctx.moveTo(8, -2); ctx.lineTo(23, 2); ctx.lineTo(8, 8); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle = INK; ctx.beginPath(); ctx.arc(3, -3, 2.2, 0, TAU); ctx.fill();
    }
    ctx.restore();
  }

  // 追击条：窄屏时单独占一行，放在分数面板下方
  function chaseBar(ctx, S, V) {
    const two = V.two, by = two ? V.it + 114 : V.it + 30;
    const bw = two ? Math.min(420, V.w - 28 - V.il - V.ir) : G.clamp(V.w * 0.34, 250, 420), cx = two ? (V.w + V.il - V.ir) / 2 : V.w / 2;
    const bx = cx - bw / 2, d = G.clamp((S.gapVis - C.GAP_CATCH) / (C.GAP_MAX - C.GAP_CATCH), 0, 1);
    const dg = S.danger(), col = dg > 0.66 ? '#ff4d6d' : dg > 0.33 ? '#ffc93c' : '#7be495';
    const px = bx + bw - 14, ox2 = px - 30 - d * (bw - 58);
    ctx.save();
    ctx.globalAlpha = 0.45; ctx.fillStyle = '#2a1748'; G.roundRect(ctx, bx, by - 10, bw, 20, 10); ctx.fill();
    ctx.globalAlpha = 1; ctx.strokeStyle = col; ctx.lineCap = 'round'; ctx.lineWidth = 5 + S.heart * 3;
    ctx.beginPath(); ctx.moveTo(ox2 + 14, by); ctx.lineTo(px - 14, by); ctx.stroke();
    ctx.restore();
    marker(ctx, ox2, by, 'owner', S); marker(ctx, px, by, 'pelican', S);
    const mode = { foot: '跑步', scooter: '共享滑板车', moped: '小电驴' }[S.owner.mode];
    const label = `车主（${mode}）· 距离 ${(S.gapVis / 50).toFixed(1)} 米`;
    G.text(ctx, label, cx, by + 32, { size: G.fit(ctx, label, 14, V.w - 24), align: 'center', color: dg > 0.5 ? '#ffd0d8' : '#fff', stroke: INK, strokeW: 3.5 });
    if (S.p.turbo > 0) {
      const u = S.p.turbo / C.TURBO_T, w = bw * 0.5;
      ctx.save(); ctx.globalAlpha = 0.5; ctx.fillStyle = '#2a1748'; G.roundRect(ctx, cx - w / 2, by + 44, w, 10, 5); ctx.fill();
      ctx.globalAlpha = 1; ctx.fillStyle = '#ffd23f'; G.roundRect(ctx, cx - w / 2, by + 44, Math.max(10, w * u), 10, 5); ctx.fill(); ctx.restore();
    }
  }

  // 逃亡进度：鹈鹕从左往右奔向海关码头；下面一排是身上带的道具
  function progress(ctx, S, V) {
    const two = V.two, by = two ? V.it + 114 + 66 : V.it + 30 + 62;
    const bw = two ? Math.min(420, V.w - 28 - V.il - V.ir) : G.clamp(V.w * 0.34, 250, 420), cx = two ? (V.w + V.il - V.ir) / 2 : V.w / 2, bx = cx - bw / 2;
    const race = S.mode === 'race', d = race ? G.clamp(S.meters / C.FINISH_M, 0, 1) : 0;
    ctx.save();
    ctx.globalAlpha = 0.45; ctx.fillStyle = '#2a1748'; G.roundRect(ctx, bx, by - 6, bw, 12, 6); ctx.fill(); ctx.globalAlpha = 1;
    if (race) {
      ctx.fillStyle = '#ffd23f'; G.roundRect(ctx, bx, by - 6, Math.max(12, bw * d), 12, 6); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,.55)'; C.STAGE_AT.slice(1).forEach((m) => ctx.fillRect(bx + bw * (m / C.FINISH_M) - 1, by - 8, 2, 16));
      ctx.fillStyle = '#fff'; ctx.fillRect(bx + bw - 3, by - 14, 3, 28); ctx.fillStyle = '#ff5a6e'; ctx.beginPath(); ctx.moveTo(bx + bw, by - 14); ctx.lineTo(bx + bw + 14, by - 9); ctx.lineTo(bx + bw, by - 4); ctx.fill();
      const mx = bx + 6 + (bw - 12) * d;
      ctx.fillStyle = '#fff'; ctx.strokeStyle = INK; ctx.lineWidth = 2.4; ctx.beginPath(); ctx.arc(mx, by, 10, 0, TAU); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#ffb347'; ctx.beginPath(); ctx.moveTo(mx + 6, by - 1); ctx.lineTo(mx + 16, by + 2); ctx.lineTo(mx + 6, by + 6); ctx.fill(); ctx.stroke();
      const lab = G.Copy.STAGES[S.stage].name.split(' · ')[1] + ' · 距码头 ' + Math.max(0, C.FINISH_M - Math.floor(S.meters)) + ' 米';
      G.text(ctx, lab, cx, by + 26, { size: G.fit(ctx, lab, 13, V.w - 24), align: 'center', color: '#fff3b0', stroke: INK, strokeW: 3.2 });
    } else G.text(ctx, '无尽模式 · ' + Math.floor(S.meters) + ' 米', cx, by + 4, { size: 13, align: 'center', color: '#fff3b0', stroke: INK, strokeW: 3.2 });
    // 道具
    const p = S.p, chips = [];
    if (S.mult > 1) chips.push(['倍率 ×' + S.mult.toFixed(1), '#ffd23f', S.multT / 7]);
    if (p.shield) chips.push(['泡泡盾', '#8fd8ff', 1]);
    if (p.magnet > 0) chips.push(['磁铁 ' + Math.ceil(p.magnet) + 's', '#ff8fa3', p.magnet / 8]);
    if (p.plate > 0) chips.push(['假车牌 ' + Math.ceil(p.plate) + 's', '#ffe27d', p.plate / 6]);
    if (chips.length) {
      const gap = 8, room = V.w - 28 - V.il - V.ir;
      const cw = Math.min(96, (room - (chips.length - 1) * gap) / chips.length), total = chips.length * cw + (chips.length - 1) * gap;
      chips.forEach((c, i) => {
        const x = cx - total / 2 + i * (cw + gap), y = by + (race ? 40 : 22);
        ctx.globalAlpha = 0.55; ctx.fillStyle = '#2a1748'; G.roundRect(ctx, x, y, cw, 24, 12); ctx.fill();
        ctx.globalAlpha = 1; ctx.fillStyle = c[1]; G.roundRect(ctx, x, y, Math.max(24, cw * G.clamp(c[2], 0, 1)), 24, 12); ctx.globalAlpha = 0.55; ctx.fill(); ctx.globalAlpha = 1;
        G.text(ctx, c[0], x + cw / 2, y + 12.5, { size: G.fit(ctx, c[0], 12.5, cw - 12), align: 'center', baseline: 'middle', color: '#fff', stroke: INK, strokeW: 3 });
      });
    }
    ctx.restore();
  }

  function banner(ctx, S, V) {
    const b = S.banner; if (!b) return;
    const inn = G.outBack(Math.min(1, b.t / 0.35)), out = G.clamp((b.life - b.t) / 0.4, 0, 1);
    const y = V.two ? V.it + 300 : Math.max(180, V.it + 210), maxW = V.w - 24 - V.il - V.ir;
    ctx.save(); ctx.globalAlpha = out; ctx.translate((V.w + V.il - V.ir) / 2, y); ctx.scale(inn, inn);
    G.text(ctx, b.text, 0, 0, { size: G.fit(ctx, b.text, 34, maxW), align: 'center', baseline: 'middle', color: '#fff3b0', stroke: INK, strokeW: 7, shadow: 'rgba(0,0,0,.3)', shadowBlur: 12, shadowY: 3 });
    if (b.sub) G.text(ctx, b.sub, 0, 36, { size: G.fit(ctx, b.sub, 18, maxW), align: 'center', baseline: 'middle', stroke: INK, strokeW: 4 });
    ctx.restore();
  }

  // 气泡：位置由世界坐标换算到设计空间，字号不随世界缩放，手机上保持可读
  function bubble(ctx, S, V) {
    const b = S.owner.bubble; if (!b) return;
    const a = Math.min(1, b.t / 0.12) * Math.min(1, (b.life - b.t) / 0.25), s = G.outBack(Math.min(1, b.t / 0.22));
    const size = G.fit(ctx, b.text, 20, V.w - 24 - 32 - V.il - V.ir);
    ctx.save(); ctx.font = `800 ${size}px ${G.FONT}`;
    const w = ctx.measureText(b.text).width + 32, h = 40;
    const ox = (S.ownerX() + 4) / V.u, tipY = (GROUND - 152 + Math.sin(S.t * 8) * 1.5 + S.lay.oy) / V.u;
    const x = G.clamp(ox - w / 2 + 26, 12 + V.il, V.w - w - 12 - V.ir), y = tipY - 16 - h, tx = G.clamp(ox, x + 18, x + w - 18);
    ctx.globalAlpha = a; ctx.translate(tx, tipY); ctx.scale(s, s); ctx.translate(-tx, -tipY);
    ctx.fillStyle = '#fff8ec'; ctx.strokeStyle = INK; ctx.lineWidth = 3; ctx.lineJoin = 'round';
    G.roundRect(ctx, x, y, w, h, 16); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(tx - 9, y + h - 1); ctx.lineTo(tx, tipY); ctx.lineTo(tx + 9, y + h - 1); ctx.fillStyle = '#fff8ec'; ctx.fill();
    ctx.beginPath(); ctx.moveTo(tx - 9, y + h + 1); ctx.lineTo(tx, tipY); ctx.lineTo(tx + 9, y + h + 1); ctx.stroke();
    ctx.fillRect(tx - 8, y + h - 2, 16, 3.5);
    G.text(ctx, b.text, x + w / 2, y + h / 2 + 1, { size, align: 'center', baseline: 'middle', color: INK });
    ctx.restore();
  }

  function round(ctx, b, hot) {
    ctx.save(); ctx.globalAlpha = hot ? 0.6 : 0.42; ctx.fillStyle = '#2a1748'; ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, TAU); ctx.fill();
    ctx.globalAlpha = 0.7; ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.6; ctx.stroke(); ctx.restore();
  }

  function buttons(ctx, S, V) {
    const play = S.state === 'play' || S.state === 'pause', y = V.it + 34, x0 = V.w - V.ir - 34;
    if (!S.ended()) {
      const m = { id: 'mute', x: x0 - (play ? 50 : 0), y, r: 22 };
      Hud.buttons.push(m); round(ctx, m);
      ctx.save(); ctx.translate(m.x, m.y); ctx.fillStyle = '#fff'; ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(-8, -4); ctx.lineTo(-4, -4); ctx.lineTo(1, -9); ctx.lineTo(1, 9); ctx.lineTo(-4, 4); ctx.lineTo(-8, 4); ctx.closePath(); ctx.fill();
      if (G.Audio.isMuted()) { ctx.beginPath(); ctx.moveTo(5, -4); ctx.lineTo(12, 4); ctx.moveTo(12, -4); ctx.lineTo(5, 4); ctx.stroke(); }
      else { ctx.beginPath(); ctx.arc(2, 0, 6, -0.9, 0.9); ctx.stroke(); ctx.beginPath(); ctx.arc(2, 0, 11, -0.9, 0.9); ctx.stroke(); }
      ctx.restore();
    }
    if (play) {
      const b = { id: 'pause', x: x0, y, r: 22 };
      Hud.buttons.push(b); round(ctx, b);
      ctx.save(); ctx.translate(b.x, b.y); ctx.fillStyle = '#fff';
      if (S.state === 'pause') { ctx.beginPath(); ctx.moveTo(-6, -9); ctx.lineTo(9, 0); ctx.lineTo(-6, 9); ctx.closePath(); ctx.fill(); }
      else { ctx.fillRect(-8, -9, 5.5, 18); ctx.fillRect(2.5, -9, 5.5, 18); }
      ctx.restore();
    }
  }

  // 触屏操作区：竖屏时画在屏幕最下方，两个大按钮（左 60% 跳跃、右 40% 蜷缩）
  function pads(ctx, S, V) {
    if (!V.deck || S.state !== 'play') return;
    const top = V.h - V.deck + 8, bot = V.h - V.ib - 10, split = V.w * 0.6, h = bot - top;
    if (h < 40) return;
    const defs = [
      { x0: V.il + 12, x1: split - 5, on: G.Input.jump, main: S.p.ground ? '跳跃' : S.p.airJump ? '再点二段跳' : '滑翔', sub: '长按滑翔', up: true },
      { x0: split + 5, x1: V.w - V.ir - 12, on: G.Input.down, main: '蜷缩', sub: '', up: false },
    ];
    defs.forEach((p) => {
      const w = p.x1 - p.x0, cx = p.x0 + w / 2, cy = top + h / 2;
      ctx.save();
      ctx.globalAlpha = p.on ? 0.55 : 0.34; ctx.fillStyle = p.on ? '#ffe27d' : '#2a1748'; G.roundRect(ctx, p.x0, top, w, h, 22); ctx.fill();
      ctx.globalAlpha = p.on ? 0.9 : 0.5; ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.stroke();
      ctx.globalAlpha = p.on ? 1 : 0.85; ctx.strokeStyle = p.on ? INK : '#fff'; ctx.lineWidth = 4; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      const ay = cy - (p.sub ? 14 : 8), dir = p.up ? -1 : 1;
      ctx.beginPath(); ctx.moveTo(cx - 13, ay - 5 * dir); ctx.lineTo(cx, ay + 6 * dir); ctx.lineTo(cx + 13, ay - 5 * dir); ctx.stroke();
      ctx.restore();
      G.text(ctx, p.main, cx, cy + (p.sub ? 12 : 18), { size: 22, align: 'center', baseline: 'middle', color: p.on ? INK : '#fff', alpha: p.on ? 1 : 0.9 });
      if (p.sub) G.text(ctx, p.sub, cx, cy + 36, { size: 13, align: 'center', baseline: 'middle', color: p.on ? INK : '#ffe9c8', alpha: 0.85 });
    });
  }

  // 横屏触屏没有操作区，开局前几秒提示一次
  function hints(ctx, S, V) {
    if (!V.touch || V.deck || S.state !== 'play' || S.rt > 4.5) return;
    const a = G.clamp((4.5 - S.rt) / 0.7, 0, 1), y = V.h - V.ib - 34, split = V.w * 0.6;
    ctx.save(); ctx.globalAlpha = a * 0.55; ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.setLineDash([6, 8]);
    ctx.beginPath(); ctx.moveTo(split, y - 34); ctx.lineTo(split, y + 34); ctx.stroke(); ctx.restore();
    [['左侧：再点二段跳 · 长按滑翔', V.il, split], ['右侧：蜷缩', split, V.w - V.ir]].forEach((h) => {
      const cx = (h[1] + h[2]) / 2, room = h[2] - h[1] - 16, size = G.fit(ctx, h[0], 15, room - 24);
      ctx.save(); ctx.font = `800 ${size}px ${G.FONT}`; const w = Math.min(room, ctx.measureText(h[0]).width + 24); ctx.restore();
      ctx.save(); ctx.globalAlpha = a * 0.55; ctx.fillStyle = '#2a1748'; G.roundRect(ctx, cx - w / 2, y - 15, w, 30, 15); ctx.fill(); ctx.restore();
      G.text(ctx, h[0], cx, y, { size, align: 'center', baseline: 'middle', color: '#fff', alpha: a });
    });
  }

  Hud.draw = function (ctx, S) {
    const lay = S.lay, u = lay.u;
    Hud.buttons.length = 0;
    vignette(ctx, S, lay); flash(ctx, S, lay);
    const V = {
      u, w: lay.w, h: lay.h, it: lay.it, ir: lay.ir, ib: lay.ib, il: lay.il, band: lay.band, stacked: lay.stacked,
      deck: lay.deck / u, touch: lay.touch, wide: lay.wide, two: lay.w < 660,
    };
    ctx.save(); ctx.scale(u, u);
    if (S.state === 'play' || S.state === 'pause') { stats(ctx, S, V); chaseBar(ctx, S, V); progress(ctx, S, V); }
    banner(ctx, S, V); bubble(ctx, S, V); buttons(ctx, S, V); pads(ctx, S, V); hints(ctx, S, V);
    if (G.Screens) G.Screens.draw(ctx, S, V);
    ctx.restore();
  };
})();
