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

  const KINDS = [
    { w: 4, min: 0, fn: single }, { w: 2, min: 0, fn: fishLine }, { w: 1.6, min: 10, fn: sky },
    { w: 2.2, min: 22, fn: gull }, { w: 2, min: 32, fn: double }, { w: 1.6, min: 55, fn: combo },
  ];
  let last = null;

  S.updateSpawn = function (dt) {
    S.nextSpawn -= S.speed * dt;
    S.goldT -= dt;
    if (S.nextSpawn > 0 || S.rt < 1.4) return;
    const base = spawnX() + S.nextSpawn;
    let len, fn;
    if (S.goldT <= 0 && S.rt > 18) { fn = golden; S.goldT = G.rand(32, 46); }
    else {
      const pool = KINDS.filter((k) => S.rt >= k.min && k.fn !== last);
      let r = Math.random() * pool.reduce((s, k) => s + k.w, 0);
      fn = pool[0].fn;
      for (const k of pool) { r -= k.w; if (r <= 0) { fn = k.fn; break; } }
    }
    len = fn(base);
    last = fn === fishLine || fn === sky ? fn : null;
    const space = G.lerp(1.1, 0.72, G.clamp(S.rt / 150, 0, 1)) * G.rand(0.9, 1.15);
    S.nextSpawn += len + S.speed * (fn === fishLine || fn === sky ? space * 0.45 : space);
  };
})();
