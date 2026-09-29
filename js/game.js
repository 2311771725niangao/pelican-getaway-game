// 游戏核心：状态机、常量、每帧更新的总调度。具体逻辑分在 player / spawn / chase / render / hud
(function () {
  const G = window.G, L = G.L;
  const S = (G.Game = {});

  S.C = {
    DAY: 200,                          // 从黄金时刻到暮色用时（秒）
    V0: 330, V1: 290, VTAU: 70,        // 世界速度：330 → 620 px/s
    GAP0: 300, GAP_MAX: 480, GAP_CATCH: 64,
    P0: 4, P1: 13, PTAU: 90,           // 车主每秒逼近多少
    TIER_AT: [0, 42, 105], TIER_MULT: [1, 1.25, 1.5],
    HIT: 78, FISH_GAIN: 4, TURBO_T: 5, TURBO_GAIN: 36,
    JUMP_V: 800, GRAV: 2400, CUT_V: 330, MIN_HOLD: 0.12,
    GLIDE_G: 0.2, GLIDE_FALL: 150, GLIDE_MAX: 0.9, FAST_G: 2.4, FAST_V: 950,
    PX_PER_M: 50, SC: 1.15,
  };
  const C = S.C;

  S.W = 960; S.H = 540; S.px = 384;
  S.state = 'title';                   // title | play | pause | over
  S.t = 0; S.rt = 0; S.overT = 0;
  S.dist = 0; S.speed = 150;
  S.tod = 0; S.todVis = 0;
  S.cam = G.Scene.makeCam();
  S.best = G.load('best', 0);
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

  S.newPlayer = () => ({
    y: 0, vy: 0, ground: true, hold: false, down: false, jumpBuf: 0, coyote: 0, holdT: 0, cut: false,
    gliding: false, glideT: 0, glide: 0, tuck: 0, tuckHold: 0,
    wheel: 0, pedal: 0, squash: 0, xoff: 0, tilt: 0,
    stumble: 0, invuln: 0, turbo: 0, flap: 0, blink: 0, blinkT: 2, blinkA: 0,
    fishVis: 0, sweat: 0, look: 0.8, dizzy: 0,
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
  };

  S.start = function () {
    if (S.state === 'play' || S.state === 'pause') return;
    S.reset();
    S.state = 'play';
    G.Audio.unlock(); G.Audio.play('start'); G.Audio.startMusic();
    S.say('还我自行车！');
  };

  S.togglePause = function () {
    if (S.state === 'play') S.state = 'pause';
    else if (S.state === 'pause') S.state = 'play';
  };

  S.gameOver = function () {
    if (S.state !== 'play') return;
    S.state = 'over'; S.overT = 0; S.gap = C.GAP_CATCH;
    S.score = S.calcScore();
    S.newBest = S.score > S.best;
    if (S.newBest) { S.best = S.score; G.save('best', S.best); }
    S.p.hold = false; S.p.down = false; S.p.turbo = 0;
    S.shake = 0.6; S.flash = 0.5; S.flashCol = '#ff5a6e';
    G.Audio.stopMusic(); G.Audio.play('caught');
    S.say('抓到你了！', 2.6);
  };

  function updateSpeed(dt) {
    const p = S.p;
    if (S.state === 'over') { S.speed *= Math.exp(-3.5 * dt); return; }
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
    if (play) S.rt += dt; else if (S.state === 'over') S.overT += dt;

    const target = S.state === 'title' ? 0 : Math.min(1, S.rt / C.DAY);
    S.todVis += G.clamp(target - S.todVis, -0.7 * dt, 0.7 * dt);

    updateSpeed(dt);
    S.dist += S.speed * dt;
    if (play) S.meters += (S.speed * dt) / C.PX_PER_M;

    S.updatePlayer(dt);
    if (play) S.updateSpawn(dt);
    S.updateEntities(dt);
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
