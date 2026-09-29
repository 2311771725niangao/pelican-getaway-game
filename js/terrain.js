// 地形与滑翔玩法：断桥（必须滑翔飞过）、上升气流、风筝隧道、金环倍率、完美着陆、近失奖励，以及赛段横幅
(function () {
  const G = window.G, S = G.Game, C = S.C, fx = G.fx, GROUND = G.L.GROUND, INK = G.INK, TAU = G.TAU, Cp = G.Copy;
  const WALK = G.L.WALK;

  S.zones = [];
  S.seenHint = {};

  // ---------- 生成接口（spawn.js 调用） ----------
  S.addGap = (x, w) => { S.zones.push({ type: 'gap', x, w, seed: Math.random() * 10, warned: false }); };
  S.addPad = (x, w) => { S.zones.push({ type: 'pad', x, w }); };
  S.addUpdraft = (x, w, h) => { S.zones.push({ type: 'updraft', x, w, h: h || 300, seed: Math.random() * 10 }); };
  S.addKite = (x, w, y) => { S.zones.push({ type: 'kite', x, w, y, seed: Math.random() * 10, hit: false }); };
  S.addRing = (x, y) => { S.zones.push({ type: 'ring', x, w: 0, y, r: 38, got: false, missed: false }); };

  // ---------- 逻辑 ----------
  function rescue(p, z) {
    const x = S.px + p.xoff + 10, y = WALK + 8;
    fx.burst(x, y, 18, { a0: Math.PI * 1.15, a1: Math.PI * 1.85, s0: 160, s1: 420, g: 900, l0: 0.5, l1: 0.9, z0: 3, z1: 6, kind: 'dot', color: '#bfe6ff' });
    G.Audio.play('land');
    p.vy = 880; p.ground = false; p.y = Math.max(p.y, 4); p.coyote = 0; p.holdT = 0; p.cut = true; p.gliding = false; p.glideT = 0;
    if (p.invuln <= 0) {
      S.run.falls++;
      fx.text(x, GROUND - 120, '掉海里了！', { size: 26, color: '#9fd8ff' });
      S.hitPelican(null);
      S.say(G.pick(Cp.FALL));
    }
  }

  function perfect(p) {
    const x = S.px + p.xoff + 10;
    p.boost = 1.6; S.run.perfect++; S.bonus += 120; S.gapGain += 26;
    G.Audio.play('golden');
    fx.text(x, GROUND - 130, '完美着陆！', { size: 28, color: '#fff3b0' });
    fx.burst(x, GROUND - 4, 16, { a0: Math.PI * 1.05, a1: Math.PI * 1.95, s0: 120, s1: 380, g: 500, l0: 0.4, l1: 0.8, z0: 3, z1: 6, kind: 'star', colors: ['#fff3b0', '#ffd23f', '#fff'] });
    if (!S.seenHint.perfect) { S.seenHint.perfect = 1; S.showBanner('完美着陆！', '踩中黄标，加速冲一段', 2); }
  }

  function ringHit(p, z) {
    z.got = true; S.ringN++; S.run.rings++;
    S.mult = Math.min(4, 1 + S.ringN * 0.5); S.multT = 7;
    S.bonus += 40 * S.mult; S.gapGain += 8;
    p.glideT = Math.max(0, p.glideT - 0.12);
    G.Audio.play('fish', 6 + S.ringN * 2);
    fx.text(z.x, GROUND - z.y - 50, '×' + S.mult.toFixed(1), { size: 26, color: '#ffe680' });
    fx.burst(z.x, GROUND - z.y, 14, { s0: 80, s1: 260, g: 0, l0: 0.35, l1: 0.7, z0: 3, z1: 6, kind: 'star', colors: ['#fff3b0', '#ffd23f'], drag: 2 });
    fx.burst(z.x, GROUND - z.y, 1, { s0: 0, s1: 1, g: 0, l0: 0.5, l1: 0.5, z0: 14, z1: 14, kind: 'ring', color: '#ffe08a' });
  }

  function nearMiss(ob, gap) {
    const x = S.px + S.p.xoff, y = GROUND - S.p.y - 90;
    S.run.near++; S.bonus += 50; S.gapGain += 6;
    G.Audio.play('fish', 10);
    fx.text(x + 40, y - 30, G.pick(Cp.NEAR) + ' +50', { size: 24, color: '#ffb0c0' });
    fx.burst(x + 30, y, 6, { s0: 60, s1: 180, g: 0, l0: 0.2, l1: 0.4, z0: 2, z1: 4, kind: 'star', color: '#ffe680' });
  }

  S.updateTerrain = function (dt) {
    const v = S.speed, p = S.p, play = S.state === 'play';
    p.boost = Math.max(0, p.boost - dt);

    // 赛段横幅
    if (play && S.mode === 'race') {
      let st = 0;
      for (let i = 0; i < C.STAGE_AT.length; i++) if (S.meters >= C.STAGE_AT[i]) st = i;
      if (st !== S.stage) {
        S.stage = st;
        const d = Cp.STAGES[st];
        S.showBanner(d.name, d.sub, 3);
        G.Audio.play('tier');
      }
    }

    const cx = S.px + p.xoff + 10, cy = p.y + 82 - p.tuck * 16, b = S.pelicanBox();
    const landed = p.justLanded; p.justLanded = false;

    for (let i = S.zones.length - 1; i >= 0; i--) {
      const z = S.zones[i];
      z.x -= v * dt;
      if (z.x + z.w < -140 || z.got && z.type === 'ring') { S.zones.splice(i, 1); continue; }
      if (!play) continue;

      if (z.type === 'gap') {
        if (!z.warned && z.x < S.W + 60) {
          z.warned = true;
          if (!S.seenHint.gap) { S.seenHint.gap = 1; S.showBanner('前方断桥！', '起跳后按住不放，滑翔飞过去', 2.6); }
          else S.showBanner('前方断桥！', '', 1.4);
        }
        if (p.y < 6 && p.vy <= 0 && cx > z.x + 18 && cx < z.x + z.w - 18) rescue(p, z);
      } else if (z.type === 'updraft') {
        if (!p.ground && cx > z.x && cx < z.x + z.w && p.y < z.h) {
          p.vy = Math.min(p.vy + (p.gliding ? 3600 : 1800) * dt, p.gliding ? 300 : 220);
          p.glideT = Math.max(0, p.glideT - 2.4 * dt);
          if (Math.random() < 0.5) fx.add({ x: z.x + G.rand(6, z.w - 6), y: GROUND - p.y + 30, vx: 0, vy: -G.rand(160, 260), life: 0.5, size: G.rand(2, 3.6), color: '#e8f8ff', kind: 'dot' });
        }
      } else if (z.type === 'kite') {
        if (!z.hit && p.invuln <= 0 && p.turbo <= 0 && z.x < b.x1 && z.x + z.w > b.x0 && z.y + 60 > b.y0 && z.y + 2 < b.y1) {
          z.hit = true; S.hitPelican(null);
          fx.text(cx, GROUND - z.y - 20, '撞风筝了！', { size: 24, color: '#ff9fb2' });
        }
      } else if (z.type === 'ring') {
        const dx = z.x - cx, dy = GROUND - z.y - (GROUND - cy);
        if (dx * dx + dy * dy < (z.r + 36) * (z.r + 36)) {
          if (p.gliding || p.turbo > 0) ringHit(p, z);
          else if (!z.missed) { z.missed = true; if (!S.seenHint.ring) { S.seenHint.ring = 1; fx.text(z.x, GROUND - z.y - 50, '滑翔穿环才算', { size: 20, color: '#fff' }); } }
        }
      } else if (z.type === 'pad') {
        if (landed && cx > z.x && cx < z.x + z.w) { perfect(p); z.w = 0; }
      }
    }

    // 近失：障碍从身边擦过、没撞上，且间隔很小
    if (play) {
      for (const ob of S.obs) {
        if (ob.fly || ob.near) continue;
        const hb = S.HB[ob.type];
        if (ob.x + hb[0] > b.x0 && ob.x - hb[0] < b.x1) {
          const above = b.y0 - (ob.y + hb[1]), below = ob.y - b.y1;
          const c = above >= 0 ? above : below >= 0 ? below : -1;
          if (c >= 0) ob.minC = Math.min(ob.minC === undefined ? 99 : ob.minC, c);
          else ob.minC = -1;
        } else if (ob.x + hb[0] <= b.x0 && ob.minC !== undefined) {
          ob.near = true;
          if (ob.minC >= 0 && ob.minC <= 20) nearMiss(ob);
        }
      }
    }
  };

  const baseReset = S.reset;
  S.reset = function () { baseReset(); S.zones.length = 0; S.seenHint = {}; };

  // ---------- 绘制 ----------
  function drawGap(ctx, z) {
    const x = z.x, w = z.w, top = WALK - 6;
    ctx.save();
    const g = ctx.createLinearGradient(0, top, 0, top + 200);
    g.addColorStop(0, '#5a6fb0'); g.addColorStop(0.25, '#2f3f88'); g.addColorStop(1, '#171d4a');
    ctx.fillStyle = g; ctx.fillRect(x, top, w, 700);
    ctx.strokeStyle = 'rgba(255,214,170,.55)'; ctx.lineWidth = 2.5; ctx.lineCap = 'round';
    for (let i = 0; i < 6; i++) {
      const yy = top + 16 + i * 17, off = ((S.t * 40 * (1 + i * 0.2) + i * 47 + z.seed * 30) % 90);
      for (let xx = x + 20 - off; xx < x + w - 20; xx += 90) {
        const a = Math.max(x + 8, xx), bnd = Math.min(x + w - 8, xx + 34);
        if (bnd > a) { ctx.beginPath(); ctx.moveTo(a, yy); ctx.lineTo(bnd, yy); ctx.stroke(); }
      }
    }
    // 断口：碎木板与栏杆
    ctx.strokeStyle = INK; ctx.lineWidth = 3.5; ctx.lineJoin = 'round';
    [[x, -1], [x + w, 1]].forEach((e, k) => {
      const ex = e[0], dir = e[1];
      ctx.fillStyle = '#b07a54';
      ctx.beginPath(); ctx.moveTo(ex, top); ctx.lineTo(ex + dir * 18, top + 10); ctx.lineTo(ex + dir * 6, top + 22); ctx.lineTo(ex + dir * 22, top + 36); ctx.lineTo(ex, top + 44); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#8a5a3c'; ctx.save(); ctx.translate(ex + dir * 16, top + 62 + k * 6); ctx.rotate(dir * 0.7); ctx.fillRect(-16, -4, 32, 8); ctx.strokeRect(-16, -4, 32, 8); ctx.restore();
    });
    // 起跳边的警示栏
    ctx.save(); ctx.translate(x - 26, top - 4);
    ctx.fillStyle = '#fff'; ctx.fillRect(-4, -46, 8, 46); ctx.strokeRect(-4, -46, 8, 46);
    ctx.fillStyle = '#ffd23f'; ctx.fillRect(-30, -58, 60, 18); ctx.strokeRect(-30, -58, 60, 18);
    ctx.fillStyle = INK; for (let i = 0; i < 4; i++) ctx.fillRect(-26 + i * 15, -58, 7, 18);
    ctx.restore();
    ctx.restore();
  }

  function drawPad(ctx, z) {
    if (z.w <= 0) return;
    const y = WALK + 32, p = 0.5 + 0.5 * Math.sin(S.t * 8);
    ctx.save(); ctx.globalAlpha = 0.75 + 0.2 * p;
    ctx.fillStyle = '#ffd23f'; ctx.strokeStyle = INK; ctx.lineWidth = 3;
    G.roundRect(ctx, z.x, y - 8, z.w, 16, 8); ctx.fill(); ctx.stroke();
    ctx.fillStyle = INK;
    for (let i = 0; i < 4; i++) { const xx = z.x + 14 + i * (z.w - 28) / 3; ctx.beginPath(); ctx.moveTo(xx - 6, y + 4); ctx.lineTo(xx, y - 4); ctx.lineTo(xx + 6, y + 4); ctx.lineTo(xx + 3, y + 4); ctx.lineTo(xx, y - 1); ctx.lineTo(xx - 3, y + 4); ctx.closePath(); ctx.fill(); }
    ctx.restore();
  }

  function drawUpdraft(ctx, z) {
    const top = GROUND - z.h, base = WALK + 20;
    ctx.save();
    const g = ctx.createLinearGradient(0, base, 0, top);
    g.addColorStop(0, 'rgba(230,248,255,.34)'); g.addColorStop(1, 'rgba(230,248,255,0)');
    ctx.fillStyle = g; ctx.fillRect(z.x, top, z.w, base - top);
    ctx.strokeStyle = 'rgba(255,255,255,.75)'; ctx.lineWidth = 3; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    for (let i = 0; i < 5; i++) {
      const ph = ((S.t * 0.9 + i / 5 + z.seed) % 1), y = base - ph * (base - top), a = Math.sin(ph * Math.PI);
      ctx.globalAlpha = a * 0.9;
      const cx = z.x + z.w / 2 + Math.sin(ph * 6 + i) * z.w * 0.12;
      ctx.beginPath(); ctx.moveTo(cx - 16, y + 9); ctx.lineTo(cx, y - 7); ctx.lineTo(cx + 16, y + 9); ctx.stroke();
    }
    ctx.globalAlpha = 0.5; ctx.strokeStyle = 'rgba(255,255,255,.6)'; ctx.lineWidth = 2; ctx.setLineDash([6, 10]); ctx.lineDashOffset = -S.t * 50;
    ctx.beginPath(); ctx.moveTo(z.x, base); ctx.lineTo(z.x, top + 30); ctx.moveTo(z.x + z.w, base); ctx.lineTo(z.x + z.w, top + 30); ctx.stroke();
    ctx.restore();
  }

  function drawKite(ctx, z) {
    const cols = ['#ff6f8f', '#ffd23f', '#7be0ff', '#b48cff', '#7be495'];
    const yb = GROUND - z.y, n = Math.max(2, Math.round(z.w / 78));
    ctx.save(); ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    // 两根杆子拉一根绳
    ctx.strokeStyle = INK; ctx.lineWidth = 4;
    [z.x, z.x + z.w].forEach((px) => { ctx.beginPath(); ctx.moveTo(px, GROUND + 6); ctx.lineTo(px, yb - 60); ctx.stroke(); });
    ctx.lineWidth = 2.4; ctx.strokeStyle = '#fff';
    ctx.beginPath(); ctx.moveTo(z.x, yb - 58); ctx.quadraticCurveTo(z.x + z.w / 2, yb - 42, z.x + z.w, yb - 58); ctx.stroke();
    for (let i = 0; i < n; i++) {
      const kx = z.x + (i + 0.5) * z.w / n, sw = Math.sin(S.t * 3 + i * 1.7 + z.seed) * 5, ky = yb - 30 + Math.sin(S.t * 2.4 + i) * 3;
      ctx.save(); ctx.translate(kx + sw, ky); ctx.rotate(Math.sin(S.t * 2.2 + i) * 0.14);
      ctx.fillStyle = cols[i % cols.length]; ctx.strokeStyle = INK; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(0, -28); ctx.lineTo(19, -2); ctx.lineTo(0, 30); ctx.lineTo(-19, -2); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.lineWidth = 1.8; ctx.beginPath(); ctx.moveTo(0, -28); ctx.lineTo(0, 30); ctx.moveTo(-19, -2); ctx.lineTo(19, -2); ctx.stroke();
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 2.4; ctx.beginPath(); ctx.moveTo(0, 30); ctx.quadraticCurveTo(-8, 40, 4, 48); ctx.quadraticCurveTo(14, 54, 2, 62); ctx.stroke();
      ctx.restore();
    }
    ctx.restore();
  }

  function drawRing(ctx, z) {
    const y = GROUND - z.y, r = z.r * (1 + Math.sin(S.t * 5 + z.x * 0.01) * 0.04);
    ctx.save(); ctx.translate(z.x, y);
    ctx.globalCompositeOperation = 'lighter';
    const g = ctx.createRadialGradient(0, 0, r * 0.6, 0, 0, r * 1.7);
    g.addColorStop(0, 'rgba(255,214,110,.35)'); g.addColorStop(1, 'rgba(255,214,110,0)');
    ctx.fillStyle = g; ctx.fillRect(-r * 1.7, -r * 1.7, r * 3.4, r * 3.4);
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = z.missed ? 0.4 : 1;
    ctx.strokeStyle = INK; ctx.lineWidth = 13; ctx.beginPath(); ctx.ellipse(0, 0, r * 0.55, r, 0, 0, TAU); ctx.stroke();
    ctx.strokeStyle = z.missed ? '#d8c8a0' : '#ffd23f'; ctx.lineWidth = 8; ctx.beginPath(); ctx.ellipse(0, 0, r * 0.55, r, 0, 0, TAU); ctx.stroke();
    ctx.strokeStyle = '#fff8d0'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.ellipse(0, 0, r * 0.55, r, 0, -2.2, -1.2); ctx.stroke();
    ctx.restore();
  }

  G.drawTerrain = function (ctx, S2, layer) {
    for (const z of S.zones) {
      if (z.x > S.W + 200 || z.x + z.w < -200) continue;
      if (layer === 'floor') {
        if (z.type === 'gap') drawGap(ctx, z);
        else if (z.type === 'pad') drawPad(ctx, z);
      } else if (layer === 'air') {
        if (z.type === 'updraft') drawUpdraft(ctx, z);
        else if (z.type === 'kite') drawKite(ctx, z);
        else if (z.type === 'ring') drawRing(ctx, z);
      }
    }
  };

  // 鹈鹕身边的滑翔计量环：腾空时才出现，剩得少了变红
  G.drawGlideMeter = function (ctx, S2) {
    const p = S.p;
    if (S.state !== 'play' || (p.ground && p.y < 2)) return;
    const left = G.clamp(1 - p.glideT / p.glideMax, 0, 1), x = S.px + p.xoff + 8, y = GROUND - p.y - 78;
    ctx.save(); ctx.translate(x, y); ctx.lineCap = 'round';
    ctx.globalAlpha = 0.45; ctx.strokeStyle = '#2a1748'; ctx.lineWidth = 9; ctx.beginPath(); ctx.arc(0, 0, 74, 0, TAU); ctx.stroke();
    ctx.globalAlpha = 0.95; ctx.strokeStyle = left < 0.28 ? '#ff6f8f' : p.gliding ? '#ffe680' : '#ffffff'; ctx.lineWidth = 6;
    if (left > 0.01) { ctx.beginPath(); ctx.arc(0, 0, 74, -Math.PI / 2, -Math.PI / 2 + TAU * left); ctx.stroke(); }
    ctx.restore();
  };
})();
