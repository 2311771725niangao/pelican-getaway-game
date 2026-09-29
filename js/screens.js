// 标题 / 暂停 / 结算界面（设计空间坐标；V 由 hud.js 传入：w,h,u,it,ir,il,ib,band,deck,stacked,touch）
(function () {
  const G = window.G, INK = G.INK, Sc = (G.Screens = {});
  const RANKS = [[0, '手忙脚乱的新手贼'], [1000, '偷偷摸摸的小毛贼'], [3000, '车筐里全是鱼的老手'], [6000, '沿着海岸狂飙的亡命鹈鹕'], [10000, '传说中的自行车大盗']];
  Sc.rank = (score) => { let r = RANKS[0][1]; for (const [s, n] of RANKS) if (score >= s) r = n; return r; };

  function card(ctx, x, y, w, h, a) {
    ctx.save(); ctx.globalAlpha = a; ctx.fillStyle = 'rgba(38,20,68,.84)'; G.roundRect(ctx, x, y, w, h, 24); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,.28)'; ctx.lineWidth = 2; ctx.stroke(); ctx.restore();
  }
  function pillBox(ctx, cx, cy, w, h, a) {
    ctx.save(); ctx.globalAlpha = a; ctx.fillStyle = '#2a1748'; G.roundRect(ctx, cx - w / 2, cy - h / 2, w, h, h / 2); ctx.fill(); ctx.restore();
  }

  function startButton(ctx, cx, cy, w, h, t, label) {
    const p = 0.5 + 0.5 * Math.sin(t * 4.2), k = 1 + p * 0.025;
    ctx.save(); ctx.translate(cx, cy); ctx.scale(k, k);
    ctx.shadowColor = 'rgba(255,170,90,' + (0.35 + 0.35 * p) + ')'; ctx.shadowBlur = 18 + 14 * p;
    const g = ctx.createLinearGradient(0, -h / 2, 0, h / 2); g.addColorStop(0, '#ffe27d'); g.addColorStop(1, '#ff9a5c');
    ctx.fillStyle = g; G.roundRect(ctx, -w / 2, -h / 2, w, h, h / 2); ctx.fill();
    ctx.shadowColor = 'transparent'; ctx.lineWidth = 3.5; ctx.strokeStyle = INK; ctx.stroke();
    G.text(ctx, label, 0, 1, { size: G.fit(ctx, label, 24, w - 36), align: 'center', baseline: 'middle', color: INK });
    ctx.restore();
  }

  function title(ctx, S, V) {
    const cx = (V.w + V.il - V.ir) / 2, t = S.t, narrow = V.w < 560, ln = narrow ? 22 : 0;
    const chipIn = V.stacked || narrow, room = V.w - 28 - V.il - V.ir;
    const Hb = 262 + ln + (chipIn ? 38 : 0);
    const T = V.stacked ? V.it + 14 : Math.max(V.it + 14, 58);
    const bs = G.clamp((V.band + 330 / V.u - 10 - T) / Hb, 0.7, 1);
    ctx.save(); ctx.translate(cx, T); ctx.scale(bs, bs);

    ctx.save(); ctx.translate(0, 40); ctx.rotate(Math.sin(t * 1.6) * 0.018); const k = 1 + Math.sin(t * 3.2) * 0.012; ctx.scale(k, k);
    G.text(ctx, '鹈鹕，别跑！', 0, 0, { size: G.fit(ctx, '鹈鹕，别跑！', 76, room - 24), align: 'center', baseline: 'middle', color: '#fff3b0', stroke: INK, strokeW: 12, shadow: 'rgba(30,10,50,.45)', shadowBlur: 18, shadowY: 6 });
    ctx.restore();
    G.text(ctx, '海边日落大道 · 偷车逃亡记', 0, 120, { size: G.fit(ctx, '海边日落大道 · 偷车逃亡记', 24, room), align: 'center', stroke: INK, strokeW: 5, shadow: 'rgba(30,10,50,.4)', shadowBlur: 8 });
    const story = narrow ? ['你是一只偷了自行车的鹈鹕，', '车主正在身后狂追——别被他追上！'] : ['你是一只偷了自行车的鹈鹕，车主正在身后狂追——别被他追上！'];
    story.forEach((s, i) => G.text(ctx, s, 0, 152 + i * 22, { size: G.fit(ctx, s, 17, room), align: 'center', color: '#ffe9d6', stroke: INK, strokeW: 3.5 }));
    startButton(ctx, 0, 200 + ln, Math.min(340, room), 50, t, V.touch ? '点击屏幕　开始逃亡' : '点击 / 按空格　开始逃亡');
    const ctl = V.touch ? '点左侧：跳跃（长按滑翔）　点右侧：蜷缩' : '跳跃：空格 / ↑ / 点击（长按滑翔）　蜷缩：↓ / 右键 / 触屏点右侧';
    const w = Math.min(600, room);
    pillBox(ctx, 0, 248 + ln, w, 28, 0.45);
    G.text(ctx, ctl, 0, 248 + ln, { size: G.fit(ctx, ctl, 15, w - 20), align: 'center', baseline: 'middle', color: '#fff', alpha: 0.95 });
    if (S.best > 0 && chipIn) {
      pillBox(ctx, 0, 284 + ln, 140, 30, 0.42);
      G.text(ctx, '最佳成绩 ' + S.best, 0, 285 + ln, { size: 15, align: 'center', baseline: 'middle', color: '#ffe9a8' });
    }
    ctx.restore();
    if (S.best > 0 && !chipIn) {
      pillBox(ctx, V.il + 84, V.it + 34, 140, 30, 0.42);
      G.text(ctx, '最佳成绩 ' + S.best, V.il + 84, V.it + 35, { size: 15, align: 'center', baseline: 'middle', color: '#ffe9a8' });
    }
  }

  function pause(ctx, S, V) {
    ctx.save(); ctx.fillStyle = 'rgba(24,10,44,.55)'; ctx.fillRect(0, 0, V.w, V.h); ctx.restore();
    const cx = (V.w + V.il - V.ir) / 2, cy = V.stacked ? (V.it + V.band) / 2 + 20 : V.h / 2, room = V.w - 32 - V.il - V.ir;
    const hint = V.touch ? '点击屏幕 继续逃亡' : '按 P / 空格 / 点击 继续逃亡';
    G.text(ctx, '已暂停', cx, cy - 24, { size: G.fit(ctx, '已暂停', 62, room), align: 'center', baseline: 'middle', color: '#fff3b0', stroke: INK, strokeW: 10 });
    G.text(ctx, hint, cx, cy + 38, { size: G.fit(ctx, hint, 22, room), align: 'center', baseline: 'middle', stroke: INK, strokeW: 4 });
  }

  function over(ctx, S, V) {
    const a = G.smooth((S.overT - 0.55) / 0.45); if (a <= 0) return;
    const stacked = V.stacked, sl = Math.min(1, Math.max(0, (S.overT - 0.9) / 0.5));
    const w = stacked ? Math.min(400, V.w - 28 - V.il - V.ir) : Math.min(400, V.w * 0.46, V.w - (S.px + 110) / V.u - 24 - V.ir);
    const nar = w < 340, pad = nar ? 30 : 44, h = 328, cx = w / 2;
    const yTop = stacked ? V.it + 14 : Math.max(V.it + 8, V.h / 2 - 168);
    const limit = V.h - V.deck - 8, cs = G.clamp((limit - yTop) / 372, 0.6, 1);
    ctx.save();
    ctx.translate(stacked ? V.il + (V.w - V.il - V.ir) / 2 : V.w - V.ir - 24, yTop + (1 - a) * 24);
    ctx.scale(cs, cs); ctx.translate(stacked ? -w / 2 : -w, 0);
    ctx.globalAlpha = a;
    card(ctx, 0, 0, w, h, 1);
    G.text(ctx, '被抓住了！', cx, 48, { size: 42, align: 'center', baseline: 'middle', color: '#ff9fb2', stroke: INK, strokeW: 8 });
    const rk = '「' + Sc.rank(S.score) + '」';
    G.text(ctx, rk, cx, 86, { size: G.fit(ctx, rk, nar ? 17 : 19, w - 24), align: 'center', baseline: 'middle', color: '#ffe9a8' });
    G.text(ctx, String(Math.round(S.score * G.outCubic(sl + (S.overT > 1.4 ? 1 : 0)))), cx, 142, { size: 64, align: 'center', baseline: 'middle', stroke: INK, strokeW: 9 });
    if (S.newBest) {
      const k = 1 + Math.sin(S.t * 8) * 0.06;
      ctx.save(); ctx.translate(cx, 190); ctx.scale(k, k); G.text(ctx, '★ 新纪录！★', 0, 0, { size: 21, align: 'center', baseline: 'middle', color: '#ffd23f', stroke: INK, strokeW: 5 }); ctx.restore();
    } else G.text(ctx, '最佳成绩 ' + S.best, cx, 190, { size: 17, align: 'center', baseline: 'middle', color: '#d9c8ff' });
    const rows = [['奔逃距离', Math.floor(S.meters) + ' 米'], ['叼到的鱼', S.fishCount + ' 条'], ['撞碎的障碍', S.smashes + ' 个']];
    rows.forEach((r, i) => {
      const yy = 226 + i * 25;
      G.text(ctx, r[0], pad, yy, { size: 16, baseline: 'middle', color: '#d9c8ff' });
      G.text(ctx, r[1], w - pad, yy, { size: 17, align: 'right', baseline: 'middle' });
    });
    if (S.overT > 1.1) {
      const p = 0.5 + 0.5 * Math.sin(S.t * 4.2), msg = V.touch ? '点击屏幕　再逃一次' : '空格 / 点击　再逃一次';
      G.text(ctx, msg, cx, h + 34, { size: 21, align: 'center', baseline: 'middle', stroke: INK, strokeW: 4.5, alpha: 0.7 + 0.3 * p });
    }
    ctx.restore();
  }

  Sc.draw = function (ctx, S, V) {
    if (S.state === 'title') title(ctx, S, V);
    else if (S.state === 'pause') pause(ctx, S, V);
    else if (S.state === 'over') over(ctx, S, V);
  };
})();
