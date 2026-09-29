// 鹈鹕：输入、跳跃/滑翔/蜷缩物理、外观参数
(function () {
  const G = window.G, S = G.Game, C = S.C, fx = G.fx, GROUND = G.L.GROUND;

  S.pressJump = function () {
    if (S.state !== 'play') return;
    const p = S.p; p.hold = true; p.jumpBuf = 0.12;
  };
  S.releaseJump = function () { S.p.hold = false; };
  S.setDown = function (on) { if (S.state === 'play' || !on) S.p.down = on; };

  // 碰撞盒（逻辑像素）：站立时头颈也算，蜷缩后压低到能从海鸥下面钻过去
  S.pelicanBox = function () {
    const p = S.p, x = S.px + p.xoff;
    return { x0: x - 28, x1: x + 52, y0: p.y + 6, y1: p.y + G.lerp(138, 112, p.tuck) };
  };

  function dust(n, big) {
    const x = S.px + S.p.xoff - 40 * C.SC;
    fx.burst(x, GROUND - 2, n, { a0: Math.PI * 0.9, a1: Math.PI * 1.35, s0: 30, s1: big ? 140 : 90, g: -30, l0: 0.3, l1: 0.6, z0: 3, z1: big ? 7 : 5, color: 'rgba(255,236,214,.8)', kind: 'smoke', w: 1 });
  }

  function jump(p) {
    p.vy = C.JUMP_V; p.ground = false; p.coyote = 0; p.jumpBuf = 0;
    p.holdT = 0; p.cut = false; p.glideT = 0; p.gliding = false; p.squash = -0.5;
    G.Audio.play('jump'); dust(6, false);
  }

  function land(p) {
    const impact = -p.vy;
    p.y = 0; p.vy = 0; p.ground = true; p.gliding = false; p.justLanded = true;
    p.squash = Math.min(1, impact / 900);
    if (impact > 240) { G.Audio.play('land'); dust(impact > 700 ? 12 : 7, impact > 700); }
  }

  S.updatePlayer = function (dt) {
    const p = S.p, play = S.state === 'play', down = play && p.down;
    p.jumpBuf = Math.max(0, p.jumpBuf - dt);
    p.coyote = p.ground ? 0.09 : Math.max(0, p.coyote - dt);
    p.invuln = Math.max(0, p.invuln - dt);
    p.stumble = Math.max(0, p.stumble - dt);
    p.turbo = Math.max(0, p.turbo - dt);
    p.flap = Math.max(0, p.flap - 3.5 * dt);
    p.squash += (0 - p.squash) * (1 - Math.exp(-14 * dt));

    if (play && p.jumpBuf > 0 && (p.ground || p.coyote > 0)) jump(p);

    if (!p.ground) {
      p.holdT += dt;
      if (!p.cut && !p.hold && p.vy > C.CUT_V && p.holdT >= C.MIN_HOLD) { p.vy = C.CUT_V; p.cut = true; }
      if (!p.gliding && play && p.hold && p.vy < 0 && p.glideT < p.glideMax && !down && p.jumpBuf <= 0) {
        p.gliding = true; p.flap = 1; G.Audio.play('glide');
      }
      if (p.gliding && (!p.hold || down || p.glideT >= p.glideMax || !play)) p.gliding = false;
      let g = C.GRAV;
      if (p.gliding && p.vy < 0) { g *= C.GLIDE_G; p.glideT += dt; }
      else if (down) g *= C.FAST_G;
      p.vy -= g * dt;
      p.vy = Math.max(p.vy, p.gliding ? -C.GLIDE_FALL : down ? -C.FAST_V : -1300);
      p.y += p.vy * dt;
      if (p.y <= 0) land(p);
    }

    p.glide += ((p.gliding ? 1 : 0) - p.glide) * (1 - Math.exp(-12 * dt));
    p.tuck += ((down ? 1 : 0) - p.tuck) * (1 - Math.exp(-16 * dt));
    p.tuckHold = p.ground && p.tuck > 0.6 ? p.tuckHold + dt : 0;
    if (down && p.ground && p.tuck < 0.15 && S.state === 'play') G.Audio.play('tuck');

    // 骑行动画
    const over = S.state === 'over';
    p.wheel += (S.speed / (C.SC * 25)) * dt * 0.85;
    p.pedal += (over ? 0 : (p.ground ? 4.2 + S.speed / 110 : 2.2) * (p.tuck > 0.5 ? 0.4 : 1)) * dt;
    p.tilt += ((p.ground ? 0 : G.clamp(-p.vy / 2600, -0.16, 0.2)) - p.tilt) * (1 - Math.exp(-9 * dt));
    p.xoff += ((p.turbo > 0 ? 34 : 0) - p.xoff) * (1 - Math.exp(-5 * dt));

    // 表情
    p.blinkT -= dt;
    if (p.blinkT < 0) { p.blinkT = G.rand(2, 4.5); p.blinkA = 0.16; }
    p.blinkA = Math.max(0, p.blinkA - dt);
    p.blink = p.blinkA > 0 ? Math.sin(Math.PI * (1 - p.blinkA / 0.16)) : 0;
    const close = S.idle() ? 0.1 : S.danger();
    p.look += ((1 - 2.6 * Math.min(1, close * 1.6)) - p.look) * (1 - Math.exp(-6 * dt));
    p.sweat = G.clamp((close - 0.35) * 1.8, 0, 1);
    p.dizzy = p.stumble > 0 || over ? 1 : 0;
    p.fishVis = Math.max(0, p.fishVis - 0.18 * dt);

    // 冲刺时的火花尾迹
    if (p.turbo > 0 && Math.random() < 0.7) {
      fx.add({ x: S.px + p.xoff - 60, y: GROUND - 40 - G.rand(0, 50) + 0 - p.y, vx: -G.rand(60, 160), vy: G.rand(-30, 30), life: G.rand(0.25, 0.5), size: G.rand(2, 4.5), color: G.pick(['#fff3b0', '#ffd23f', '#ff9f43']), kind: 'star' });
    }
  };

  S.hitPelican = function (ob) {
    const p = S.p;
    if (p.shield) { S.popShield(); if (ob) S.knock(ob); return; }
    S.run.hits++;
    p.stumble = 0.55; p.invuln = 1.5; p.fishVis = Math.max(0, p.fishVis - 3);
    S.gap = Math.max(0, S.gap - C.HIT); S.gapGain = Math.min(S.gapGain, 0);
    S.shake = 0.45; S.flash = 0.4; S.flashCol = '#ff5a6e'; S.combo = 0;
    G.Audio.play('hit');
    const x = S.px + p.xoff + 20, y = GROUND - p.y - 90;
    fx.burst(x, y, 10, { s0: 80, s1: 260, g: 500, l0: 0.5, l1: 0.9, z0: 3, z1: 5, kind: 'feather', colors: ['#ffffff', '#f0e6ff', '#ffd6e0'] });
    fx.burst(x, y, 8, { s0: 60, s1: 200, g: 300, l0: 0.3, l1: 0.6, z0: 2, z1: 4, kind: 'star', colors: ['#ffe14a', '#fff'] });
    fx.text(x, y - 40, '哎哟！', { size: 26, color: '#ff8fa3' });
    if (ob) S.knock(ob);
    S.say(G.pick(G.Copy.HIT));
  };
})();
