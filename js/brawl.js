// 收尾演出：被追上后的漫画式扭打（烟尘团、拳头、掉毛）、跑脱时的彩带，以及终点门
(function () {
  const G = window.G, S = G.Game, C = S.C, fx = G.fx, GROUND = G.L.GROUND, INK = G.INK, TAU = G.TAU, Cp = G.Copy;
  S.beatT = 0; S.hopT = 0; S.sprinted = false; S.restM = 190; S.gateD = 0; S.confT = 0;

  S.updateBrawl = function (dt) {
    const p = S.p, x = S.px + p.xoff + 10, y = GROUND - 70;
    if (S.state === 'play') {
      if (p.down) S.run.tuck += dt;
      return;
    }
    if (S.state === 'over') {
      // 车主到位后才开始打：先抓稳，再一顿拳脚
      S.beatT += dt;
      const total = S.result ? S.result.feathers : 0;
      const target = G.clamp((S.beatT - 0.45) / 2.2, 0, 1) * total;
      while (S.featherOut < target) {
        S.featherOut++;
        fx.add({ x: x + G.rand(-40, 40), y: y + G.rand(-40, 10), vx: G.rand(-150, 150), vy: G.rand(-380, -120), g: 220, drag: 1.4, life: G.rand(1.6, 2.6), size: G.rand(4, 6.5), color: G.pick(['#ffffff', '#f4ecff', '#ffe6ee']), kind: 'feather', rot: G.rand(0, TAU), vr: G.rand(-6, 6) });
      }
      S.beatK = (S.beatK || 0) - dt;
      if (S.beatT > 0.45 && S.beatT < 2.9 && S.beatK <= 0) {
        S.beatK = G.rand(0.18, 0.3);
        G.Audio.play('beat'); S.shake = Math.max(S.shake, 0.22);
        fx.text(x + G.rand(-60, 60), y - G.rand(30, 90), Cp.pick(Cp.BEAT), { size: G.rand(24, 34), color: G.pick(['#fff3b0', '#ff9fb2', '#ffffff']), life: 0.7 });
        fx.burst(x + G.rand(-30, 30), y + G.rand(-30, 20), 5, { s0: 80, s1: 240, g: 300, l0: 0.25, l1: 0.5, z0: 3, z1: 6, kind: 'star', colors: ['#ffe14a', '#fff', '#ff9f43'] });
      }
    } else if (S.state === 'win') {
      S.confT -= dt;
      if (S.confT <= 0 && S.overT < 4.5) {
        S.confT = 0.05;
        for (let i = 0; i < 3; i++) fx.add({ x: G.rand(0, S.W), y: -10 + G.rand(-20, 0), vx: G.rand(-60, 60), vy: G.rand(80, 220), g: 60, drag: 0.4, life: G.rand(2, 3.4), size: G.rand(3, 5.5), color: G.pick(['#ffd23f', '#ff6f8f', '#8fd8ff', '#7be495', '#ffffff', '#c9a7ff']), kind: 'feather', rot: G.rand(0, TAU), vr: G.rand(-9, 9) });
      }
      // 鹈鹕落地后再来一次小跳，表示得意
      if (p.ground) { S.hopT -= dt; if (S.hopT <= 0 && S.overT < 3.4) { p.vy = 620; p.ground = false; p.flap = 1; S.hopT = 0.9; } }
    }
  };
  S.featherOut = 0;
  const baseReset = S.reset;
  S.reset = function () { baseReset(); S.featherOut = 0; S.beatT = 0; S.beatK = 0; S.confT = 0; S.gateD = S.dist + C.FINISH_M * C.PX_PER_M; };

  // 终点门：跨在路上的拱门，挂着渡轮时刻牌
  G.drawGate = function (ctx, S) {
    if (S.mode !== 'race' || S.state === 'title') return;
    const x = S.px + (S.gateD - S.dist);
    if (x > S.W + 200 || x < -260) return;
    ctx.save(); ctx.translate(x, GROUND + 6);
    ctx.lineJoin = 'round'; ctx.strokeStyle = INK; ctx.lineWidth = 4;
    ctx.fillStyle = '#e8d9c4'; ctx.fillRect(-110, -230, 18, 230); ctx.strokeRect(-110, -230, 18, 230);
    ctx.fillRect(92, -230, 18, 230); ctx.strokeRect(92, -230, 18, 230);
    // 黑白格横梁
    ctx.fillStyle = '#fff'; ctx.fillRect(-116, -240, 232, 34);
    ctx.fillStyle = '#2a1748';
    for (let i = 0; i < 12; i++) for (let j = 0; j < 2; j++) if ((i + j) % 2 === 0) ctx.fillRect(-116 + i * 19.33, -240 + j * 17, 19.33, 17);
    ctx.strokeRect(-116, -240, 232, 34);
    // 牌子
    ctx.fillStyle = '#fff3b0'; G.roundRect(ctx, -84, -200, 168, 54, 10); ctx.fill(); ctx.stroke();
    G.text(ctx, '海关码头', 0, -181, { size: 22, align: 'center', baseline: 'middle', color: INK });
    G.text(ctx, '渡轮 8:00 开船', 0, -158, { size: 13, align: 'center', baseline: 'middle', color: '#7a4a6a' });
    ctx.restore();
  };

  // 扭打烟尘团：盖在鹈鹕和车主之间，随时间旋转、冒星星
  G.drawBrawl = function (ctx, S) {
    if (S.state !== 'over' || S.beatT < 0.35 || S.beatT > 3.3) return;
    const p = S.p, x = S.px + p.xoff - 20, y = GROUND - 60;
    const a = G.clamp((S.beatT - 0.35) / 0.2, 0, 1) * G.clamp((3.3 - S.beatT) / 0.4, 0, 1);
    ctx.save(); ctx.translate(x, y); ctx.globalAlpha = a * 0.92;
    for (let i = 0; i < 9; i++) {
      const ang = i * 0.7 + S.t * 4.5, r = 34 + 12 * Math.sin(S.t * 9 + i * 2), cx = Math.cos(ang) * r, cy = Math.sin(ang) * r * 0.75;
      ctx.fillStyle = i % 3 === 0 ? '#ffffff' : i % 3 === 1 ? '#efe2ff' : '#ffd9e3';
      ctx.strokeStyle = INK; ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.arc(cx, cy, 22 + 6 * Math.sin(S.t * 7 + i), 0, TAU); ctx.fill(); ctx.stroke();
    }
    for (let i = 0; i < 4; i++) {
      const ang = S.t * 9 + i * 1.57, r = 62 + 10 * Math.sin(S.t * 14 + i);
      ctx.save(); ctx.translate(Math.cos(ang) * r, Math.sin(ang) * r * 0.75); ctx.rotate(ang);
      ctx.fillStyle = '#ffd6b0'; G.roundRect(ctx, -7, -6, 14, 12, 4); ctx.fill(); ctx.stroke(); ctx.restore();
    }
    G.star(ctx, Math.cos(S.t * 12) * 46, -52 + Math.sin(S.t * 15) * 6, 13, '#ffe14a');
    G.star(ctx, 50 + Math.sin(S.t * 10) * 8, -30, 9, '#ff9fb2');
    ctx.restore();
  };

  // 头顶的护盾泡泡 / 磁铁光环
  G.drawPelicanAura = function (ctx, S) {
    const p = S.p, x = S.px + p.xoff + 8, y = GROUND - p.y - 78;
    if (p.shield) {
      const k = 1 + Math.sin(S.t * 6) * 0.03;
      ctx.save(); ctx.translate(x, y); ctx.scale(k, k);
      const g = ctx.createRadialGradient(-20, -30, 10, 0, 0, 96);
      g.addColorStop(0, 'rgba(200,240,255,.05)'); g.addColorStop(1, 'rgba(140,215,255,.5)');
      ctx.fillStyle = g; ctx.strokeStyle = 'rgba(255,255,255,.85)'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.ellipse(0, 0, 92, 100, 0, 0, TAU); ctx.fill(); ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,.7)'; ctx.beginPath(); ctx.ellipse(-46, -56, 14, 8, -0.7, 0, TAU); ctx.fill();
      G.text(ctx, '已分期', 0, -108, { size: 15, align: 'center', color: '#fff', stroke: INK, strokeW: 3.5 });
      ctx.restore();
    }
    if (p.magnet > 0) {
      ctx.save(); ctx.translate(x, y); ctx.strokeStyle = 'rgba(255,111,143,.6)'; ctx.lineWidth = 3; ctx.setLineDash([8, 10]); ctx.lineDashOffset = -S.t * 40;
      ctx.beginPath(); ctx.arc(0, 0, 118 + Math.sin(S.t * 7) * 4, 0, TAU); ctx.stroke(); ctx.restore();
    }
  };
})();
