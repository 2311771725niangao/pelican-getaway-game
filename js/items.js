// 道具：磁铁鱼竿、泡泡盾（已分期）、假车牌，以及一个反道具「分期账单」
(function () {
  const G = window.G, S = G.Game, C = S.C, fx = G.fx, GROUND = G.L.GROUND, INK = G.INK, TAU = G.TAU, Cp = G.Copy;

  S.items = []; S.itemT = 9;
  const DEF = {
    magnet: { name: '磁铁鱼竿', sub: '8 秒自动吸鱼', dur: 8, col: '#ff6f8f' },
    shield: { name: '泡泡盾', sub: '挡一次撞击', col: '#8fd8ff' },
    plate: { name: '假车牌', sub: '6 秒车主慢下来', dur: 6, col: '#ffe27d' },
    bill: { name: '分期账单', sub: '', col: '#ffb3b3' },
  };
  S.ITEM_DEF = DEF;

  function spawnItem() {
    const p = S.p, pool = [['magnet', 2], ['plate', 1.6]];
    if (!p.shield) pool.push(['shield', 2.6]);
    if (S.rt > 22) pool.push(['bill', 2.4]);
    let r = Math.random() * pool.reduce((s, e) => s + e[1], 0), type = pool[0][0];
    for (const e of pool) { r -= e[1]; if (r <= 0) { type = e[0]; break; } }
    S.items.push({ type, x: S.W + 150, y: type === 'bill' ? 44 : 108, seed: Math.random() * 10, got: false });
  }

  function apply(it) {
    const p = S.p, d = DEF[it.type], x = it.x, y = GROUND - it.y - 20;
    G.Audio.play(it.type === 'bill' ? 'hit' : 'golden');
    S.run.items++;
    if (it.type === 'magnet') { p.magnet = d.dur; S.say(Cp.pick(Cp.MAGNET)); }
    else if (it.type === 'shield') { p.shield = true; S.say(Cp.pick(Cp.SHIELD)); }
    else if (it.type === 'plate') { p.plate = d.dur; S.gapGain += 30; S.say(Cp.pick(Cp.PLATE)); }
    else {
      S.run.bills++; p.stumble = Math.max(p.stumble, 0.45); S.gap = Math.max(0, S.gap - 42); S.combo = 0;
      S.shake = Math.max(S.shake, 0.3); S.flash = 0.3; S.flashCol = '#ff5a6e';
      fx.text(x, y - 30, '第 ' + (2 + S.run.bills) + ' 期！', { size: 24, color: '#ff8fa3' });
      S.say(Cp.pick(Cp.BILL));
    }
    if (it.type !== 'bill') S.showBanner(d.name + '！', d.sub, 2);
    fx.burst(x, y, 16, { s0: 90, s1: 300, g: 0, l0: 0.4, l1: 0.8, z0: 3, z1: 7, kind: 'star', colors: ['#fff', d.col], drag: 2 });
    fx.burst(x, y, 1, { s0: 0, s1: 1, g: 0, l0: 0.6, l1: 0.6, z0: 12, z1: 12, kind: 'ring', color: d.col });
  }

  S.updateItems = function (dt) {
    const p = S.p, play = S.state === 'play';
    p.magnet = Math.max(0, p.magnet - dt); p.plate = Math.max(0, p.plate - dt);
    if (play && S.rt > 6 && S.meters < S.finishM() - 90) {
      S.itemT -= dt;
      if (S.itemT <= 0) { spawnItem(); S.itemT = G.rand(9, 14); }
    }
    const cx = S.px + p.xoff + 10, cy = p.y + 82 - p.tuck * 16, R = 62;
    for (let i = S.items.length - 1; i >= 0; i--) {
      const it = S.items[i];
      it.x -= S.speed * dt;
      if (it.x < -80 || it.got) { S.items.splice(i, 1); continue; }
      if (!play) continue;
      const dx = it.x - cx, dy = it.y - cy;
      if (dx * dx + dy * dy < R * R) { it.got = true; apply(it); }
    }
  };

  // 盾被击破 / 挡下伤害
  S.popShield = function () {
    const p = S.p, x = S.px + p.xoff + 20, y = GROUND - p.y - 80;
    p.shield = false; p.invuln = 1.0; S.shake = 0.3; S.run.shielded++;
    G.Audio.play('smash');
    fx.burst(x, y, 18, { s0: 100, s1: 320, g: 200, l0: 0.4, l1: 0.8, z0: 3, z1: 6, kind: 'star', colors: ['#bfeaff', '#fff'] });
    fx.text(x, y - 50, '盾碎了！', { size: 24, color: '#bfeaff' });
  };

  // ---------- 绘制 ----------
  function icon(ctx, type, t) {
    ctx.lineJoin = 'round'; ctx.lineCap = 'round'; ctx.strokeStyle = INK; ctx.lineWidth = 3;
    if (type === 'magnet') {
      ctx.lineWidth = 9; ctx.strokeStyle = INK; ctx.beginPath(); ctx.arc(0, 2, 12, Math.PI, 0); ctx.lineTo(12, 14); ctx.moveTo(-12, 2); ctx.lineTo(-12, 14); ctx.stroke();
      ctx.lineWidth = 5; ctx.strokeStyle = '#ff5a6e'; ctx.beginPath(); ctx.arc(0, 2, 12, Math.PI, 0); ctx.lineTo(12, 10); ctx.moveTo(-12, 2); ctx.lineTo(-12, 10); ctx.stroke();
      ctx.strokeStyle = '#fff'; ctx.beginPath(); ctx.moveTo(-12, 12); ctx.lineTo(-12, 15); ctx.moveTo(12, 12); ctx.lineTo(12, 15); ctx.stroke();
    } else if (type === 'shield') {
      ctx.fillStyle = 'rgba(160,225,255,.5)'; ctx.beginPath(); ctx.arc(0, 0, 21, 0, TAU); ctx.fill(); ctx.stroke();
      G.text(ctx, '分期', 0, 1, { size: 15, align: 'center', baseline: 'middle', color: INK });
    } else if (type === 'plate') {
      ctx.fillStyle = '#ffe27d'; G.roundRect(ctx, -21, -12, 42, 24, 5); ctx.fill(); ctx.stroke();
      G.text(ctx, '鹈A·88', 0, 1, { size: 11, align: 'center', baseline: 'middle', color: INK });
    } else {
      ctx.rotate(Math.sin(t * 5) * 0.12);
      ctx.fillStyle = '#fff5f0'; G.roundRect(ctx, -16, -20, 32, 40, 4); ctx.fill(); ctx.stroke();
      ctx.lineWidth = 2; ctx.strokeStyle = '#c94a4a'; ctx.beginPath(); ctx.moveTo(-9, -11); ctx.lineTo(9, -11); ctx.moveTo(-9, -4); ctx.lineTo(9, -4); ctx.stroke();
      G.text(ctx, '¥', 0, 9, { size: 17, align: 'center', baseline: 'middle', color: '#c94a4a' });
    }
  }
  G.drawItem = function (ctx, it, t) {
    const bob = Math.sin(t * 4 + it.seed) * 4, d = DEF[it.type];
    ctx.save(); ctx.translate(it.x, GROUND - it.y - 20 + bob);
    ctx.globalCompositeOperation = 'lighter';
    const g = ctx.createRadialGradient(0, 0, 4, 0, 0, 40);
    g.addColorStop(0, it.type === 'bill' ? 'rgba(255,90,90,.45)' : 'rgba(255,240,180,.5)'); g.addColorStop(1, 'rgba(255,240,180,0)');
    ctx.fillStyle = g; ctx.fillRect(-40, -40, 80, 80);
    ctx.globalCompositeOperation = 'source-over';
    icon(ctx, it.type, t);
    ctx.restore();
    return d;
  };
})();
