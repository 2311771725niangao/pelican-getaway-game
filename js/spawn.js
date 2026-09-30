// 生成器：把障碍和鱼组合成一段段“关卡片段”，随时间解锁更难的组合
(function () {
  const G = window.G, S = G.Game, C = S.C;

  // 碰撞盒：[半宽, 高]（比画面略小，判定偏宽容）
  S.HB = { cone: [9, 36], bin: [11, 42], crab: [13, 18], bench: [32, 30], ball: [11, 22], gull: [17, 16] };

  const spawnX = () => S.W + 90;

  function addOb(type, x) {
    const ob = { type, x, y: 0, seed: Math.random() * 10, rot: 0, vx: 0, ph: Math.random() * 6 };
    if (type === 'gull') ob.y = 128;
    if (type === 'crab') ob.vx = -65;
    S.obs.push(ob);
    return ob;
  }
  function addFish(x, y, golden) {
    S.fish.push({ x, y, golden: !!golden, kind: Math.floor(Math.random() * 3), seed: Math.random() * 10, got: false });
  }
  function line(x, y, n, step) { for (let i = 0; i < n; i++) addFish(x + i * step, y); }
  function arc(xc, half, peak, n, goldIdx) {
    for (let i = 0; i < n; i++) {
      const u = n === 1 ? 0 : (i / (n - 1)) * 2 - 1;
      addFish(xc + u * half, 36 + (peak - 36) * (1 - u * u), i === goldIdx);
    }
  }
  function skyLine(x, n, step) {
    for (let i = 0; i < n; i++) addFish(x + i * step, 176 + Math.sin((i / Math.max(1, n - 1)) * Math.PI) * 24);
  }

  function pickType(small) {
    const t = S.rt, pool = [['cone', 3], ['bin', 3]];
    if (t > 10) pool.push(['crab', 2]);
    if (!small && t > 16) pool.push(['bench', 2]);
    if (!small && t > 38) pool.push(['ball', 2]);
    let r = Math.random() * pool.reduce((s, e) => s + e[1], 0);
    for (const e of pool) { r -= e[1]; if (r <= 0) return e[0]; }
    return pool[0][0];
  }

  function single(b) {
    const x = b + 140;
    addOb(pickType(false), x);
    if (Math.random() < 0.65) arc(x, 130, 190, 7);
    return 290;
  }
  function fishLine(b) {
    const n = G.randInt(5, 8);
    line(b + 20, Math.random() < 0.6 ? 28 : 92, n, 44);
    return n * 44 + 40;
  }
  function sky(b) { skyLine(b + 30, 8, 46); return 8 * 46 + 70; }
  function gull(b) {
    addOb('gull', b + 110);
    line(b + 40, 28, 5, 40);
    return 260;
  }
  function double(b) {
    const s = Math.max(240, S.speed * 0.62), x1 = b + 130, x2 = x1 + s;
    addOb(pickType(true), x1); addOb(pickType(true), x2);
    if (Math.random() < 0.5) { arc(x1, 100, 185, 5); arc(x2, 100, 185, 5); }
    else skyLine(x1 - 50, Math.round((s + 100) / 44), 44);
    return s + 300;
  }
  function combo(b) {
    const s = Math.max(310, S.speed * 0.8), x2 = b + 100 + s;
    addOb('gull', b + 100); addOb(pickType(true), x2);
    line(b + 40, 28, 3, 40);
    arc(x2, 110, 185, 5);
    return s + 300;
  }
  function golden(b) {
    const x = b + 170;
    addOb(Math.random() < 0.5 ? 'bench' : 'bin', x);
    arc(x, 150, 198, 7, 3);
    return 350;
  }


  // ---------- 滑翔地形片段 ----------
  // 断桥宽度按当前速度换算成“空中时间”；长按滑翔越过，二段跳可补救失误
  function gapFish(x, w, n, hi) {
    for (let i = 0; i < n; i++) {
      const u = i / (n - 1);
      addFish(x + w * (0.08 + 0.84 * u), hi - 105 * u * u + 14 * Math.sin(u * 3), false);
    }
  }
  function tutorialGap(b) {
    const w = Math.max(230, S.speed * 0.78), x = b + 300;
    S.addGap(x, w); S.addPad(x + w + 14, 78);
    gapFish(x, w, 6, 210);
    return 300 + w + 340;
  }
  function bridgeGap(b) {
    const w = Math.max(260, S.speed * G.rand(0.85, 1.08)), x = b + 300;
    S.addGap(x, w); S.addPad(x + w + 14, 78);
    gapFish(x, w, 8, 215);
    if (S.stage >= 1 && Math.random() < 0.6) S.addRing(x + w * 0.5, 165);
    return 300 + w + 340;
  }
  function kiteLine(b) {
    const w = Math.max(200, S.speed * G.rand(0.5, 0.66)), x = b + 240;
    S.addKite(x, w, 16);
    line(x + 10, 150, Math.max(3, Math.round(w / 50)), 46);
    return 240 + w + 300;
  }
  function windGap(b) {
    const w = Math.max(440, S.speed * G.rand(1.35, 1.55)), x = b + 300;
    S.addGap(x, w); S.addPad(x + w + 14, 78);
    S.addUpdraft(x + w * 0.3, 130, 330);
    gapFish(x, w * 0.3, 3, 190);
    S.addRing(x + w * 0.3 + 65, 225); S.addRing(x + w * 0.62, 185);
    line(x + w * 0.5, 170, 4, 40);
    return 300 + w + 360;
  }
  function ringChain(b) {
    const x = b + 240, st = Math.max(120, S.speed * 0.3);
    S.addUpdraft(x, 120, 300);
    for (let i = 0; i < 4; i++) S.addRing(x + 160 + i * st, 225 - i * 26);
    arc(x + 160 + st * 1.5, st * 1.6, 235, 9);
    return 240 + 160 + 4 * st + 300;
  }

  // 喘息带：一长串鱼、没有障碍，玩家可以稳住节奏、拉开距离
  function breather(b) {
    line(b + 20, 28, 9, 44); line(b + 20 + 9 * 44 + 30, 92, 5, 44);
    return 9 * 44 + 30 + 5 * 44 + 80;
  }

  // st：只在该赛段及以后出现；w 是基础权重，wS 是按赛段的权重覆盖
  const KINDS = [
    { w: 4, min: 0, fn: single }, { w: 2, min: 0, fn: fishLine }, { w: 1.6, min: 10, fn: sky },
    { w: 2.2, min: 24, fn: gull }, { w: 2, min: 48, fn: double }, { w: 1.6, min: 80, fn: combo },
    { wS: [0, 2.6, 2, 2.2], st: 1, fn: bridgeGap }, { wS: [0, 1.6, 1.4, 1.4], st: 1, fn: kiteLine },
    { wS: [0, 0, 3, 2.6], st: 2, fn: windGap }, { wS: [0, 0, 2.2, 1.6], st: 2, fn: ringChain },
  ];
  const wOf = (k) => (k.wS ? k.wS[Math.min(S.stage, 3)] : k.w);
  let last = null;
  S.tutDone = false;
  const baseReset = S.reset;
  S.reset = function () { baseReset(); S.tutDone = false; last = null; };

  S.updateSpawn = function (dt) {
    S.nextSpawn -= S.speed * dt;
    S.goldT -= dt;
    if (S.nextSpawn > 0 || S.rt < 1.4 || S.meters > S.finishM() - 30) return;
    const base = spawnX() + S.nextSpawn;
    let len, fn;
    if (!S.tutDone && S.mode === 'race' && S.meters > 110) { fn = tutorialGap; S.tutDone = true; }
    else if (S.meters >= S.restM && S.mode === 'race') { fn = breather; S.restM += 220; }
    else if (S.goldT <= 0 && S.rt > 18) { fn = golden; S.goldT = G.rand(26, 36); }
    else {
      const pool = KINDS.filter((k) => S.rt >= (k.min || 0) && wOf(k) > 0 && k.fn !== last);
      let r = Math.random() * pool.reduce((s, k) => s + wOf(k), 0);
      fn = pool[0].fn;
      for (const k of pool) { r -= wOf(k); if (r <= 0) { fn = k.fn; break; } }
    }
    len = fn(base);
    last = fn === fishLine || fn === sky || fn === bridgeGap || fn === windGap ? fn : null;
    const space = G.lerp(1.05, 0.82, G.clamp(S.rt / 130, 0, 1)) * G.rand(0.9, 1.15);
    const terrain = fn === tutorialGap || fn === bridgeGap || fn === windGap || fn === kiteLine || fn === ringChain;
    S.nextSpawn += len + S.speed * (fn === fishLine || fn === sky ? space * 0.45 : terrain ? space * 0.85 : space);
  };
})();
