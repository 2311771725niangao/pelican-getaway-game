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
    const cx = (V.w + V.il - V.ir) / 2, t = S.t, narrow = V.w < 560, ln = 22, wins = S.wins > 0;
    const chipIn = V.stacked || narrow, room = V.w - 28 - V.il - V.ir;
    const Hb = 262 + ln + (chipIn ? 38 : 0) + (wins ? 40 : 0);
    const T = V.stacked ? V.it + 14 : Math.max(V.it + 14, 58);
    const bs = G.clamp((V.band + 330 / V.u - 10 - T) / Hb, 0.7, 1);
    ctx.save(); ctx.translate(cx, T); ctx.scale(bs, bs);

    ctx.save(); ctx.translate(0, 40); ctx.rotate(Math.sin(t * 1.6) * 0.018); const k = 1 + Math.sin(t * 3.2) * 0.012; ctx.scale(k, k);
    G.text(ctx, '鹈鹕，别跑！', 0, 0, { size: G.fit(ctx, '鹈鹕，别跑！', 76, room - 24), align: 'center', baseline: 'middle', color: '#fff3b0', stroke: INK, strokeW: 12, shadow: 'rgba(30,10,50,.45)', shadowBlur: 18, shadowY: 6 });
    ctx.restore();
    const sub = '鹈鹕降智测试 · 它能骑走这辆车吗？';
    G.text(ctx, sub, 0, 120, { size: G.fit(ctx, sub, 24, room), align: 'center', stroke: INK, strokeW: 5, shadow: 'rgba(30,10,50,.4)', shadowBlur: 8 });
    const story = ['偷了车的鹈鹕，被分期还没还完的车主狂追。', '逃到海关码头就赢；被追上，挨揍掉毛！'];
    story.forEach((s, i) => G.text(ctx, s, 0, 152 + i * 22, { size: G.fit(ctx, s, 17, room), align: 'center', color: '#ffe9d6', stroke: INK, strokeW: 3.5 }));
    startButton(ctx, 0, 200 + ln, Math.min(340, room), 50, t, V.touch ? '点击屏幕　开始逃亡' : '点击 / 按空格　开始逃亡');
    const ctl = V.touch ? '点左侧：跳跃（长按滑翔）　点右侧：蜷缩' : '跳跃：空格 / ↑ / 点击（长按滑翔）　蜷缩：↓ / 右键 / 触屏点右侧';
    const w = Math.min(600, room);
    pillBox(ctx, 0, 248 + ln, w, 28, 0.45);
    G.text(ctx, ctl, 0, 248 + ln, { size: G.fit(ctx, ctl, 15, w - 20), align: 'center', baseline: 'middle', color: '#fff', alpha: 0.95 });
    let yy = 284 + ln;
    const rec = '最佳 ' + S.best + (S.wins ? ' · 已跑脱 ' + S.wins + ' 次' : '');
    if (S.best > 0 && chipIn) {
      pillBox(ctx, 0, yy, Math.min(room, 220), 30, 0.42);
      G.text(ctx, rec, 0, yy + 1, { size: G.fit(ctx, rec, 15, Math.min(room, 220) - 16), align: 'center', baseline: 'middle', color: '#ffe9a8' });
      yy += 38;
    }
    if (wins) {
      const race = S.mode === 'race', lab = race ? '当前：逃亡赛（点这里切到无尽模式）' : '当前：无尽模式（点这里切回逃亡赛）', mw = Math.min(room, 330);
      pillBox(ctx, 0, yy, mw, 32, 0.6);
      ctx.save(); ctx.strokeStyle = '#ffd23f'; ctx.globalAlpha = 0.8; ctx.lineWidth = 2; G.roundRect(ctx, -mw / 2, yy - 16, mw, 32, 16); ctx.stroke(); ctx.restore();
      G.text(ctx, lab, 0, yy + 1, { size: G.fit(ctx, lab, 15, mw - 20), align: 'center', baseline: 'middle', color: '#fff3b0' });
      G.Hud.buttons.push({ id: 'mode', x: cx, y: T + yy * bs, r: 18 * bs, w: mw * bs / 2 });
    }
    ctx.restore();
    if (S.best > 0 && !chipIn) {
      pillBox(ctx, V.il + 110, V.it + 34, 200, 30, 0.42);
      G.text(ctx, rec, V.il + 110, V.it + 35, { size: G.fit(ctx, rec, 15, 184), align: 'center', baseline: 'middle', color: '#ffe9a8' });
    }
  }

  function pause(ctx, S, V) {
    ctx.save(); ctx.fillStyle = 'rgba(24,10,44,.55)'; ctx.fillRect(0, 0, V.w, V.h); ctx.restore();
    const cx = (V.w + V.il - V.ir) / 2, cy = V.stacked ? (V.it + V.band) / 2 + 20 : V.h / 2, room = V.w - 32 - V.il - V.ir;
    const hint = V.touch ? '点击屏幕 继续逃亡' : '按 P / 空格 / 点击 继续逃亡';
    G.text(ctx, '已暂停', cx, cy - 24, { size: G.fit(ctx, '已暂停', 62, room), align: 'center', baseline: 'middle', color: '#fff3b0', stroke: INK, strokeW: 10 });
    G.text(ctx, hint, cx, cy + 38, { size: G.fit(ctx, hint, 22, room), align: 'center', baseline: 'middle', stroke: INK, strokeW: 4 });
  }

  // 结果卡：为截图设计——一屏放下称号、分数、评审官判定、逃亡编号
  Sc.cardAt = (S) => (S.state === 'win' ? 1.8 : 1.4);
  function result(ctx, S, V) {
    const R = S.result; if (!R) return;
    const at = Sc.cardAt(S), a = G.smooth((S.overT - at) / 0.45); if (a <= 0) return;
    const stacked = V.stacked, win = R.win, h = 424;
    const w = stacked ? Math.min(400, V.w - 28 - V.il - V.ir) : Math.min(400, V.w * 0.46, V.w - (S.px + 110) / V.u - 24 - V.ir);
    const nar = w < 340, pad = nar ? 24 : 32, cx = w / 2, textW = w - 2 * pad;
    const yTop = stacked ? V.it + 12 : Math.max(V.it + 6, V.h / 2 - 232);
    const limit = V.h - V.deck - 40, cs = G.clamp((limit - yTop) / (h + 12), 0.5, 1);
    ctx.save();
    ctx.translate(stacked ? V.il + (V.w - V.il - V.ir) / 2 : V.w - V.ir - 20, yTop + (1 - a) * 24);
    ctx.scale(cs, cs); ctx.translate(stacked ? -w / 2 : -w, 0);
    ctx.globalAlpha = a;
    card(ctx, 0, 0, w, h, 1);
    G.text(ctx, win ? '成功跑脱！' : '被抓住了！', cx, 40, { size: 40, align: 'center', baseline: 'middle', color: win ? '#fff3b0' : '#ff9fb2', stroke: INK, strokeW: 8 });
    const rk = '「' + R.title + '」　' + R.n + '/5 项合格';
    G.text(ctx, rk, cx, 78, { size: G.fit(ctx, rk, 18, w - 24), align: 'center', baseline: 'middle', color: '#ffe9a8' });
    const shown = Math.round(R.score * G.outCubic((S.overT - at) / 0.9));
    G.text(ctx, String(shown), cx, 124, { size: 56, align: 'center', baseline: 'middle', stroke: INK, strokeW: 8 });
    let sub;
    if (win) sub = '用时 ' + R.time.toFixed(1) + ' 秒' + (R.fastest ? ' · ★ 个人最快' : '') + (S.newBest ? ' · ★ 新纪录' : '');
    else sub = '掉毛 ' + R.feathers + ' 根 · 被撞 ' + R.hits + ' 次' + (S.newBest ? ' · ★ 新纪录' : '');
    G.text(ctx, sub, cx, 162, { size: G.fit(ctx, sub, 16, w - 24), align: 'center', baseline: 'middle', color: win || S.newBest ? '#ffd23f' : '#d9c8ff' });
    // 评审官判定
    ctx.save(); ctx.globalAlpha *= 0.14; ctx.fillStyle = '#fff'; ctx.fillRect(pad, 178, textW, 1.5); ctx.restore();
    G.text(ctx, '评审官判定', pad, 194, { size: 13, baseline: 'middle', color: '#b9a3e8' });
    R.checks.forEach((c, i) => {
      const yy = 218 + i * 26, on = S.overT > at + 0.3 + i * 0.12;
      G.text(ctx, on ? (c.pass ? '✓' : '✗') : '·', pad + 2, yy, { size: 18, baseline: 'middle', color: c.pass ? '#7be495' : '#ff8fa3' });
      G.text(ctx, c.name, pad + 24, yy, { size: 15, baseline: 'middle', color: '#fff' });
      if (on) {
        const t = c.pass ? c.ok : c.no, mw = textW - 24 - 96;
        G.text(ctx, t, w - pad, yy, { size: G.fit(ctx, t, 13, mw, 600), align: 'right', baseline: 'middle', color: c.pass ? '#bff5cf' : '#ffc0cc', weight: 600 });
      }
    });
    ctx.save(); ctx.globalAlpha *= 0.14; ctx.fillStyle = '#fff'; ctx.fillRect(pad, 356, textW, 1.5); ctx.restore();
    G.text(ctx, R.cap, cx, 380, { size: G.fit(ctx, R.cap, 14, textW, 700), align: 'center', baseline: 'middle', color: '#ffe9d6', weight: 700 });
    G.text(ctx, '逃亡编号 #' + R.code, cx, 406, { size: 15, align: 'center', baseline: 'middle', color: '#ffd23f' });
    if (S.overT > at + 0.6) {
      const p = 0.5 + 0.5 * Math.sin(S.t * 4.2), msg = V.touch ? '点击屏幕　再逃一次' : '空格 / 点击　再逃一次';
      G.text(ctx, '截图发评论区，比比谁的编号更强', cx, h + 26, { size: G.fit(ctx, '截图发评论区，比比谁的编号更强', 16, w), align: 'center', baseline: 'middle', stroke: INK, strokeW: 4, color: '#fff3b0' });
      G.text(ctx, msg, cx, h + 54, { size: 20, align: 'center', baseline: 'middle', stroke: INK, strokeW: 4.5, alpha: 0.7 + 0.3 * p });
    }
    ctx.restore();
  }

  Sc.draw = function (ctx, S, V) {
    if (S.state === 'title') title(ctx, S, V);
    else if (S.state === 'pause') pause(ctx, S, V);
    else if (S.state === 'over' || S.state === 'win') result(ctx, S, V);
  };
})();
