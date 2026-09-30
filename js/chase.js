// 车主：追赶距离 gap 的变化、换乘、喊话、抓住鹈鹕
(function () {
  const G = window.G, S = G.Game, C = S.C;

  const SHOUTS = G.Copy.SHOUTS;
  const SWAP = [null,
    { text: G.Copy.SWAP_TEXT[0], done: '车主换乘：共享电动滑板车！', mode: 'scooter', line: '这下追得上了！' },
    { text: G.Copy.SWAP_TEXT[1], done: '车主换乘：小电驴！', mode: 'moped', line: '油门拧到底！' }];

  S.heart = 0; S.heartT = 0; S.flashCol = '#ff5a6e';

  S.resetOwner = function () {
    S.owner = { tier: 0, mode: 'foot', run: 0, shout: 0, shoutT: 2.6, bubble: null, swapT: 0, swapTo: 0, lamp: 0 };
  };
  S.resetOwner();

  S.say = function (text, life) {
    const O = S.owner;
    O.bubble = { text, t: 0, life: life || 1.8 };
    O.shout = 1;
    G.Audio.play('shout');
  };

  // 车主的屏幕 x：gap 越大越靠左，但永远不会跑出屏幕
  S.ownerX = function () {
    const pxc = S.px + S.p.xoff, room = pxc - 150;
    const k = 1 - Math.exp(-(Math.max(S.gapVis, C.GAP_CATCH) - C.GAP_CATCH) / 240);
    return pxc - (100 + room * k);
  };

  function finishSwap(O) {
    const s = SWAP[O.swapTo];
    O.tier = O.swapTo; O.mode = s.mode; O.swapT = 0;
    G.Audio.play('tier');
    S.showBanner(s.done, '追得更快了！', 2.8);
    S.say(s.line);
  }

  S.updateChase = function (dt) {
    const O = S.owner, p = S.p, play = S.state === 'play';
    const arrive = G.clamp((S.gapVis - C.GAP_CATCH) / 40, 0, 1);
    const footish = O.mode === 'foot' || O.swapT > 0;

    if (S.state === 'win') {
      O.run += dt * 3;
    } else if (S.state === 'over' && footish && arrive < 0.05) {
      const target = Math.round(O.run / Math.PI) * Math.PI;
      O.run += (target - O.run) * (1 - Math.exp(-8 * dt));
    } else {
      O.run += dt * (O.swapT > 0 ? 3 : footish ? 11 + S.speed / 90 : S.speed / 26) * (S.state === 'over' && footish ? Math.max(arrive, 0.05) : 1);
    }
    O.shout = Math.max(0, O.shout - dt * 1.4);
    if (O.bubble) { O.bubble.t += dt; if (O.bubble.t > O.bubble.life) O.bubble = null; }
    O.lamp = G.clamp((S.todVis - 0.35) / 0.3, 0, 1);

    if (S.idle()) {
      S.gap = 270;
      O.shoutT -= dt;
      if (O.shoutT <= 0) { S.say(G.pick(SHOUTS)); O.shoutT = G.rand(3.2, 5); }
    } else if (play) {
      if (O.swapT <= 0 && O.tier < 2 && S.rt >= C.TIER_AT[O.tier + 1]) {
        O.swapTo = O.tier + 1; O.swapT = 2;
        O.bubble = { text: SWAP[O.swapTo].text, t: 0, life: 1.9 };
      }
      if (O.swapT > 0) { O.swapT -= dt; if (O.swapT <= 0) finishSwap(O); }

      let pr = (C.P0 + C.P1 * (1 - Math.exp(-S.rt / C.PTAU))) * C.TIER_MULT[O.tier];
      const sprint = S.mode === 'race' && S.meters > C.FINISH_M - C.SPRINT_M;
      if (S.mode === 'race' && S.stage === 0) pr *= 0.8;
      if (sprint) {
        pr *= 1.12;
        if (!S.sprinted) { S.sprinted = true; S.showBanner('最后 ' + C.SPRINT_M + ' 米！', '码头就在前面，冲啊！', 2.6); S.say('今天必须抓到你！', 2.2); }
      }
      if (p.plate > 0) pr *= 0.3;
      if (O.swapT > 0) pr = -55;
      if (p.tuckHold > 0.5) pr += 12;
      if (p.turbo > 0) pr = -C.TURBO_GAIN;
      const add = S.gapGain * (1 - Math.exp(-9 * dt));
      S.gapGain -= add;
      S.gap = Math.min(C.GAP_MAX, S.gap + add - pr * dt);

      O.shoutT -= dt;
      if (O.shoutT <= 0 && !O.bubble && O.swapT <= 0) { S.say(G.pick(SHOUTS)); O.shoutT = G.rand(3.6, 6.2) * (1.3 - 0.6 * S.danger()); }

      const dg = S.danger();
      if (dg > 0.5) {
        S.heartT -= dt;
        if (S.heartT <= 0) { S.heartT = G.lerp(0.9, 0.5, dg); S.heart = 1; G.Audio.play('heart'); }
      }
      if (S.gap <= C.GAP_CATCH) S.gameOver();
    } else if (S.state === 'win') {
      S.gap = Math.min(C.GAP_MAX + 200, S.gap + 140 * dt);
    }
    S.heart = Math.max(0, S.heart - dt * 3);
    S.gapVis += (S.gap - S.gapVis) * (1 - Math.exp(-7 * dt));
  };
})();
