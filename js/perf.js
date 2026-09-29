// 自适应画质：按实测帧间隔降低画布分辨率系数 q；降了没明显改善就撤销并停止（说明瓶颈不在填充率）
(function () {
  const G = window.G;
  const P = (G.Perf = {});

  P.create = function (o) {
    o = o || {};
    const WIN = o.win || 40, SLOW = o.slow || 24, QMIN = o.qmin || 0.55, STEP = 0.8, GAIN = 0.85, MAXDT = 250;
    let q = 1, n = 0, sum = 0, skip = o.warm === undefined ? 60 : o.warm, trial = null, locked = false;
    return {
      get q() { return q; },
      // 每帧喂入帧间隔（毫秒）；返回新的 q（有变化时）或 null
      feed(dt) {
        if (locked || !(dt > 0) || dt >= MAXDT) return null;
        if (skip > 0) { skip--; return null; }
        sum += dt; n++;
        if (n < WIN) return null;
        const mean = sum / n; n = 0; sum = 0;
        if (trial) {
          const t = trial; trial = null;
          if (mean > t.mean * GAIN) { q = t.q; locked = true; skip = 8; return q; }
        }
        if (mean <= SLOW || q <= QMIN + 1e-6) return null;
        trial = { mean }; trial.q = q; q = Math.max(QMIN, q * STEP); skip = 8;
        return q;
      },
    };
  };
})();
