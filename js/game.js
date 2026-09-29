// 游戏核心：状态机、常量、每帧更新的总调度。具体逻辑分在 player / spawn / chase / render / hud
(function () {
  const G = window.G, L = G.L;
  const S = (G.Game = {});

  S.C = {
    DAY: 200,                          // 从黄金时刻到暮色用时（秒）
    V0: 330, V1: 290, VTAU: 70,        // 世界速度：330 → 620 px/s
    GAP0: 300, GAP_MAX: 480, GAP_CATCH: 64,
    P0: 4, P1: 13, PTAU: 90,           // 车主每秒逼近多少
    TIER_AT: [0, 30, 62], TIER_MULT: [1, 1.2, 1.45],
    FINISH_M: 800, SPRINT_M: 120,      // 全程 800 米；最后 120 米车主发狂冲刺
    WIN_BONUS: 1500, PAR_T: 120,
    HIT: 78, FISH_GAIN: 4, TURBO_T: 5, TURBO_GAIN: 36,
    JUMP_V: 800, GRAV: 2400, CUT_V: 330, MIN_HOLD: 0.12,
    GLIDE_G: 0.2, GLIDE_FALL: 150, GLIDE_MAX: 0.9, FAST_G: 2.4, FAST_V: 950,
    PX_PER_M: 50, SC: 1.15,
  };
  const C = S.C;

  S.W = 960; S.H = 540; S.px = 384;
  S.state = 'title';                   // title | play | pause | over（被抓） | win（跑脱）
  S.mode = 'race';                     // race：逃到码头即通关；endless：无尽模式（通关后解锁）
  S.t = 0; S.rt = 0; S.overT = 0;
  S.dist = 0; S.speed = 150;
  S.tod = 0; S.todVis = 0;
  S.cam = G.Scene.makeCam();
  S.best = G.load('best', 0);
  S.wins = G.load('wins', 0); S.bestTime = G.load('bestTime', 0);
  S.ended = () => S.state === 'over' || S.state === 'win';
  S.finishM = () => (S.mode === 'race' ? C.FINISH_M : Infinity);
  S.run = null; S.result = null;
  S.obs = []; S.fish = [];
  S.gap = C.GAP0; S.gapVis = C.GAP0; S.gapGain = 0;
  S.meters = 0; S.fishCount = 0; S.smashes = 0; S.score = 0; S.newBest = false;
  S.combo = 0; S.comboT = 0;
  S.shake = 0; S.flash = 0; S.banner = null;
  S.nextSpawn = 520; S.goldT = 24;

  S.lay = G.computeLayout({ iw: 960, ih: 540, dpr: 1, touch: false });
  S.resize = (lay) => { S.lay = lay; S.W = lay.W; S.H = G.L.H; S.px = G.clamp(lay.W * 0.4, 300, 470); };
  S.danger = () => 1 - G.clamp((S.gap - C.GAP_CATCH) / 200, 0, 1);
  S.calcScore = () => Math.floor(S.meters) + S.fishCount * 10 + S.smashes * 25;
  S.newRun = () => ({ hits: 0, shielded: 0, bills: 0, tuck: 0, combo: 0, items: 0, feathers: 0, win: false });

  S.newPlayer = () => ({
    y: 0, vy: 0, ground: true, hold: false, down: false, jumpBuf: 0, coyote: 0, holdT: 0, cut: false,
    gliding: false, glideT: 0, glide: 0, tuck: 0, tuckHold: 0,
    wheel: 0, pedal: 0, squash: 0, xoff: 0, tilt: 0,
    stumble: 0, invuln: 0, turbo: 0, flap: 0, blink: 0, blinkT: 2, blinkA: 0,
    fishVis: 0, sweat: 0, look: 0.8, dizzy: 0,
    magnet: 0, shield: false, plate: 0,
  });
  S.p = S.newPlayer();

  S.reset = function () {
    S.rt = 0; S.meters = 0; S.fishCount = 0; S.smashes = 0; S.score = 0; S.newBest = false;
    S.combo = 0; S.comboT = 0;
    S.gap = C.GAP0; S.gapGain = 0;
    S.obs.length = 0; S.fish.length = 0; G.fx.clear();
    S.nextSpawn = 520; S.goldT = 24;
    S.shake = 0; S.flash = 0; S.banner = null;
    S.p = S.newPlayer();
    S.resetOwner();
    S.run = S.newRun(); S.result = null; S.items.length = 0; S.itemT = 9; S.beatT = 0; S.hopT = 0; S.sprinted = false; S.restM = 190;
  };

  S.start = function () {
    if (S.state === 'play' || S.state === 'pause') return;
    S.reset();
    S.state = 'play';
    G.Audio.unlock(); G.Audio.play('start'); G.Audio.startMusic();
    S.say(G.Copy.pick(G.Copy.START));
    if (S.mode === 'race') S.showBanner('逃到海关码头！', '全程 ' + C.FINISH_M + ' 米 · 渡轮 8 点开', 3);
  };

  S.togglePause = function () {
    if (S.state === 'play') S.state = 'pause';
    else if (S.state === 'pause') S.state = 'play';
  };

  // 结算：统计、评审官判定、逃亡编号
  function settle(win) {
    const r = S.run, Cp = G.Copy;
    r.win = win; r.time = S.rt; r.fish = S.fishCount; r.meters = Math.floor(S.meters);
    r.feathers = win ? 0 : Math.min(36, 3 + r.hits * 2 + S.owner.tier * 3 + Math.floor(S.rt / 25));
    let sc = S.calcScore();
    if (win) sc += C.WIN_BONUS + Math.max(0, Math.round((C.PAR_T - S.rt) * 20));
    S.score = sc;
    S.newBest = sc > S.best;
    if (S.newBest) { S.best = sc; G.save('best', sc); }
    const checks = Cp.CHECKS.map((c) => Object.assign({ pass: !!c.test(r) }, c));
    const n = checks.filter((c) => c.pass).length;
    let h = 2166136261;
    [sc, r.hits, Math.round(S.rt * 10), r.fish, win ? 1 : 0, r.feathers].forEach((v) => { h = Math.imul(h ^ (v | 0), 16777619) >>> 0; });
    S.result = {
      win, score: sc, n, checks, title: Cp.title(n), time: S.rt, feathers: r.feathers, fish: r.fish, hits: r.hits,
      code: 'PLC-' + (h % 1679616 + 1679616).toString(36).toUpperCase().slice(-4),
      cap: win ? G.pick(Cp.WIN_CAP) : G.pick(Cp.LOSE_CAP).replace('{n}', r.feathers),
      fastest: false,
    };
    if (win && S.mode === 'race') {
      S.wins++; G.save('wins', S.wins);
      if (!S.bestTime || S.rt < S.bestTime) { S.bestTime = S.rt; G.save('bestTime', S.rt); S.result.fastest = true; }
    }
    S.p.hold = false; S.p.down = false; S.p.turbo = 0;
  }

  S.gameOver = function () {
    if (S.state !== 'play') return;
    S.state = 'over'; S.overT = 0; S.gap = C.GAP_CATCH; S.beatT = 0;
    settle(false);
    S.shake = 0.6; S.flash = 0.5; S.flashCol = '#ff5a6e';
    G.Audio.stopMusic(); G.Audio.play('caught');
    S.say(G.pick(G.Copy.CAUGHT[S.owner.mode]), 2.6);
  };

  S.win = function () {
    if (S.state !== 'play') return;
    S.state = 'win'; S.overT = 0; S.hopT = 0.5;
    settle(true);
    S.flash = 0.5; S.flashCol = '#fff3b0'; S.shake = 0.25;
    G.Audio.stopMusic(); G.Audio.play('win');
    S.showBanner('成功跑脱！', G.pick(G.Copy.ESCAPE_PELICAN), 3.2);
    S.say(G.pick(G.Copy.ESCAPE_OWNER), 3);
    const p = S.p; p.vy = 780; p.ground = false; p.flap = 1; p.gliding = false;
  };

  function updateSpeed(dt) {
    const p = S.p;
    if (S.ended()) { S.speed *= Math.exp(-(S.state === 'win' ? 2.2 : 3.5) * dt); return; }
    let v;
    if (S.state === 'title') v = 150;
    else {
      v = C.V0 + C.V1 * (1 - Math.exp(-S.rt / C.VTAU));
      v *= 0.45 + 0.55 * G.smooth(S.rt / 1.2);
      if (p.turbo > 0) v *= 1.35;
      if (p.stumble > 0) v *= 0.6;
    }
    S.speed += (v - S.speed) * (1 - Math.exp(-7 * dt));
  }

  S.update = function (dt) {
    S.t += dt;
    if (S.state === 'pause') return;
    const play = S.state === 'play';
    if (play) S.rt += dt; else if (S.ended()) S.overT += dt;

    const target = S.state === 'title' ? 0 : Math.min(1, S.rt / C.DAY);
    S.todVis += G.clamp(target - S.todVis, -0.7 * dt, 0.7 * dt);

    updateSpeed(dt);
    S.dist += S.speed * dt;
    if (play) S.meters += (S.speed * dt) / C.PX_PER_M;

    S.updatePlayer(dt);
    if (play) S.updateSpawn(dt);
    S.updateEntities(dt);
    S.updateItems(dt);
    S.updateBrawl(dt);
    if (play && S.meters >= S.finishM()) S.win();
    S.updateChase(dt);
    G.fx.update(dt, S.speed);

    if (play) S.score = S.calcScore();
    S.comboT -= dt; if (S.comboT <= 0) S.combo = 0;
    S.shake = Math.max(0, S.shake - dt * 1.8);
    S.flash = Math.max(0, S.flash - dt * 2.2);
    if (S.banner) { S.banner.t += dt; if (S.banner.t > S.banner.life) S.banner = null; }
    G.Audio.intensity = play && S.rt > 18 ? 1 : 0;
  };

  S.showBanner = (text, sub, life) => { S.banner = { text, sub: sub || '', t: 0, life: life || 2.6 }; };
})();
