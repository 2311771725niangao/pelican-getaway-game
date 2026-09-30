// 游戏核心：状态机、常量、每帧更新的总调度。具体逻辑分在 player / spawn / chase / render / hud
(function () {
  const G = window.G, L = G.L;
  const S = (G.Game = {});

  S.C = {
    DAY: 200,                          // 从黄金时刻到暮色用时（秒）
    V0: 330, V1: 290, VTAU: 70,        // 世界速度：330 → 620 px/s
    GAP0: 360, GAP_MAX: 560, GAP_CATCH: 64,
    P0: 4, P1: 18, PTAU: 90,          // 后程逼近放缓，给普通玩家留下吃鱼补救的时间
    TIER_AT: [0, 52, 105], TIER_MULT: [1, 1.15, 1.3],
    FINISH_M: 1400, SPRINT_M: 200,     // 全程 1400 米（约 150 秒）；最后 200 米车主发狂冲刺
    STAGE_AT: [0, 350, 700, 1050],     // 四个赛段的起点（米）
    WIN_BONUS: 1500, PAR_T: 130,
    HIT: 55, FISH_GAIN: 5, TURBO_T: 5, TURBO_GAIN: 36,
    JUMP_V: 800, AIR_JUMP_V: 640, GRAV: 2400, CUT_V: 330, MIN_HOLD: 0.12,
    GLIDE_G: 0.2, GLIDE_FALL: 120, GLIDE_MAX: 1.35, AIR_GLIDE_GAIN: 0.4, FAST_G: 2.4, FAST_V: 950,
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
  S.idle = () => S.state === 'title' || S.state === 'pick';
  S.finishM = () => (S.mode === 'race' ? C.FINISH_M : Infinity);
  S.run = null; S.result = null;
  S.obs = []; S.fish = [];
  S.gap = C.GAP0; S.gapVis = C.GAP0; S.gapGain = 0;
  S.meters = 0; S.fishCount = 0; S.smashes = 0; S.score = 0; S.newBest = false;
  S.combo = 0; S.comboT = 0;
  S.shake = 0; S.flash = 0; S.banner = null;
  S.nextSpawn = 520; S.goldT = 24;
  S.bonus = 0; S.mult = 1; S.multT = 0; S.ringN = 0; S.stage = 0; S.perks = []; S.pickSel = 0; S.pickT = 0;

  S.lay = G.computeLayout({ iw: 960, ih: 540, dpr: 1, touch: false });
  S.resize = (lay) => { S.lay = lay; S.W = lay.W; S.H = G.L.H; S.px = G.clamp(lay.W * 0.4, 300, 470); };
  S.danger = () => 1 - G.clamp((S.gap - C.GAP_CATCH) / 200, 0, 1);
  S.calcScore = () => Math.floor(S.meters) + S.fishCount * 10 + S.smashes * 25 + Math.floor(S.bonus);
  S.newRun = () => ({ hits: 0, shielded: 0, bills: 0, tuck: 0, combo: 0, items: 0, feathers: 0, win: false, near: 0, rings: 0, perfect: 0, falls: 0, glideFish: 0 });

  S.newPlayer = () => ({
    y: 0, vy: 0, ground: true, hold: false, down: false, jumpBuf: 0, coyote: 0, holdT: 0, cut: false, airJump: true,
    gliding: false, glideT: 0, glideMax: C.GLIDE_MAX, glide: 0, landed: null, tuck: 0, tuckHold: 0,
    wheel: 0, pedal: 0, squash: 0, xoff: 0, tilt: 0,
    stumble: 0, invuln: 0, turbo: 0, flap: 0, blink: 0, blinkT: 2, blinkA: 0,
    fishVis: 0, sweat: 0, look: 0.8, dizzy: 0,
    magnet: 0, shield: false, plate: 0, boost: 0,
  });
  S.p = S.newPlayer();

  S.reset = function () {
    S.rt = 0; S.meters = 0; S.fishCount = 0; S.smashes = 0; S.score = 0; S.newBest = false;
    S.combo = 0; S.comboT = 0;
    S.gap = C.GAP0; S.gapGain = 0;
    S.obs.length = 0; S.fish.length = 0; G.fx.clear();
    S.nextSpawn = 520; S.goldT = 24;
    S.bonus = 0; S.mult = 1; S.multT = 0; S.ringN = 0; S.stage = 0;
    S.shake = 0; S.flash = 0; S.banner = null;
    S.p = S.newPlayer();
    S.resetOwner();
    S.run = S.newRun(); S.result = null; S.items.length = 0; S.itemT = 9; S.beatT = 0; S.hopT = 0; S.sprinted = false; S.restM = 220;
  };

  // 开局三选一：点一下既选道具又开跑，比“再点一次开始”多不了一步操作
  const PERKS = [
    { id: 'shield', name: '泡泡盾', sub: '开局带一层「已分期」盾，挡一次撞击' },
    { id: 'magnet', name: '磁铁鱼竿', sub: '前 20 秒自动吸鱼' },
    { id: 'wing', name: '加长滑翔翼', sub: '整局滑翔时间 +50%' },
    { id: 'boost', name: '起步冲刺', sub: '开局 4 秒无敌冲刺，直接拉开距离' },
    { id: 'plate', name: '假车牌', sub: '前 12 秒车主慢下来' },
  ];
  S.PERKS = PERKS;

  S.start = function () {
    if (S.state === 'play' || S.state === 'pause' || S.state === 'pick') return;
    S.reset();
    const pool = PERKS.slice(), three = [];
    while (three.length < 3) three.push(pool.splice(Math.floor(Math.random() * pool.length), 1)[0]);
    S.perks = three; S.pickSel = 0; S.pickT = 0; S.state = 'pick';
    G.Audio.unlock(); G.Audio.play('click');
  };

  S.launch = function (i) {
    if (S.state !== 'pick' || S.pickT < 0.25) return;
    const perk = S.perks[G.clamp(i, 0, S.perks.length - 1)], p = S.p;
    S.state = 'play';
    S.gap = C.GAP0; S.gapVis = C.GAP0;
    if (perk.id === 'shield') p.shield = true;
    else if (perk.id === 'magnet') p.magnet = 20;
    else if (perk.id === 'wing') p.glideMax = C.GLIDE_MAX * 1.5;
    else if (perk.id === 'boost') { p.turbo = 4; p.invuln = 0.5; }
    else if (perk.id === 'plate') p.plate = 12;
    G.Audio.unlock(); G.Audio.play('start'); G.Audio.startMusic();
    S.say(G.Copy.pick(G.Copy.START));
    if (S.mode === 'race') S.showBanner(G.Copy.STAGES[0].name, G.Copy.STAGES[0].sub, 3);
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
    const checks = Cp.CHECKS.map((c) => Object.assign({}, c, { pass: !!c.test(r), detail: c.detail(r) }));
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
    if (S.idle()) v = 150;
    else {
      v = C.V0 + C.V1 * (1 - Math.exp(-S.rt / C.VTAU));
      v *= 0.45 + 0.55 * G.smooth(S.rt / 1.2);
      if (p.turbo > 0) v *= 1.35;
      if (p.boost > 0) v *= 1.2;
      if (p.stumble > 0) v *= 0.6;
    }
    S.speed += (v - S.speed) * (1 - Math.exp(-7 * dt));
  }

  S.update = function (dt) {
    S.t += dt;
    if (S.state === 'pause') return;
    const play = S.state === 'play';
    if (play) S.rt += dt; else if (S.ended()) S.overT += dt; else if (S.state === 'pick') S.pickT += dt;

    const target = S.idle() ? 0 : Math.min(1, S.rt / C.DAY);
    S.todVis += G.clamp(target - S.todVis, -0.7 * dt, 0.7 * dt);

    updateSpeed(dt);
    S.dist += S.speed * dt;
    if (play) S.meters += (S.speed * dt) / C.PX_PER_M;

    S.updatePlayer(dt);
    if (play) S.updateSpawn(dt);
    S.updateEntities(dt);
    S.updateTerrain(dt);
    S.updateItems(dt);
    S.updateBrawl(dt);
    if (play && S.meters >= S.finishM()) S.win();
    S.updateChase(dt);
    G.fx.update(dt, S.speed);

    if (play) S.score = S.calcScore();
    S.comboT -= dt; if (S.comboT <= 0) S.combo = 0;
    if (play) { S.multT -= dt; if (S.multT <= 0 && S.mult > 1) { S.mult = 1; S.ringN = 0; } }
    S.shake = Math.max(0, S.shake - dt * 1.8);
    S.flash = Math.max(0, S.flash - dt * 2.2);
    if (S.banner) { S.banner.t += dt; if (S.banner.t > S.banner.life) S.banner = null; }
    G.Audio.intensity = play && S.rt > 18 ? 1 : 0;
  };

  S.showBanner = (text, sub, life) => { S.banner = { text, sub: sub || '', t: 0, life: life || 2.6 }; };
})();
