// 障碍与鱼：移动、碰撞、拾取、被撞飞
(function () {
  const G = window.G, S = G.Game, C = S.C, fx = G.fx, GROUND = G.L.GROUND;

  S.knock = function (ob) {
    ob.fly = { vx: G.rand(220, 340), vy: G.rand(420, 600), vr: G.rand(6, 11) * (Math.random() < 0.5 ? -1 : 1), t: 0 };
  };

  function smash(ob) {
    S.knock(ob); S.smashes++;
    G.Audio.play('smash');
    const y = GROUND - ob.y - 24;
    fx.text(ob.x, y - 40, '+25', { color: '#ffe680', size: 22 });
    fx.burst(ob.x, y, 12, { s0: 100, s1: 340, g: 700, l0: 0.35, l1: 0.7, z0: 2.5, z1: 5, kind: 'star', colors: ['#fff3b0', '#ffd23f', '#ff9f43'] });
    S.shake = Math.max(S.shake, 0.2);
  }

  function collect(f) {
    const p = S.p, x = f.x, y = GROUND - f.y;
    f.got = true;
    if (f.golden) {
      p.turbo = C.TURBO_T; p.invuln = Math.max(p.invuln, 0.4);
      S.fishCount += 5; S.gapGain += 40;
      G.Audio.play('golden');
      S.showBanner('黄金鱼！极速冲刺！', '无敌 · 撞飞一切', 2.4);
      S.flash = 0.35; S.flashCol = '#ffe08a';
      fx.burst(x, y, 26, { s0: 120, s1: 380, g: 0, l0: 0.5, l1: 1, z0: 4, z1: 9, kind: 'star', colors: ['#fff3b0', '#ffd23f', '#ffffff'], drag: 2 });
      fx.burst(x, y, 1, { s0: 0, s1: 1, g: 0, l0: 0.7, l1: 0.7, z0: 14, z1: 14, kind: 'ring', color: '#ffe08a' });
      S.say(G.pick(['那是金鱼？！', '它开挂了！']));
      return;
    }
    S.fishCount++; S.combo++; S.comboT = 1.1;
    S.gapGain += C.FISH_GAIN;
    p.fishVis = Math.min(10, p.fishVis + 0.6);
    G.Audio.play('fish', S.combo);
    fx.burst(x, y, 4, { s0: 50, s1: 150, g: 0, l0: 0.25, l1: 0.45, z0: 2.5, z1: 4.5, kind: 'star', color: '#fff6c0' });
    if (S.combo % 8 === 0) fx.text(x, y - 32, S.combo + ' 连！', { size: 22, color: '#ffe680' });
  }

  S.updateEntities = function (dt) {
    const v = S.speed, p = S.p, play = S.state === 'play';
    const b = S.pelicanBox();

    for (let i = S.obs.length - 1; i >= 0; i--) {
      const ob = S.obs[i], fl = ob.fly;
      if (fl) {
        ob.x += fl.vx * dt; ob.y += fl.vy * dt; fl.vy -= 1500 * dt; ob.rot += fl.vr * dt; fl.t += dt;
        if (fl.t > 1 || ob.x > S.W + 120) S.obs.splice(i, 1);
        continue;
      }
      ob.x += (-v + ob.vx) * dt;
      if (ob.type === 'ball') { ob.ph += dt * 5; ob.y = 26 * Math.abs(Math.sin(ob.ph)); ob.rot -= dt * 7; }
      else if (ob.type === 'gull') ob.y = 128 + Math.sin(S.t * 3 + ob.seed) * 3;
      if (ob.x < -160) { S.obs.splice(i, 1); continue; }
      if (!play) continue;
      const hb = S.HB[ob.type];
      if (ob.x + hb[0] > b.x0 && ob.x - hb[0] < b.x1 && ob.y + hb[1] > b.y0 && ob.y + 2 < b.y1) {
        if (p.turbo > 0) smash(ob);
        else if (p.invuln <= 0) S.hitPelican(ob);
      }
    }

    const cx = S.px + p.xoff + 10, cy = p.y + 82 - p.tuck * 16, R = p.turbo > 0 ? 100 : 72;
    for (let i = S.fish.length - 1; i >= 0; i--) {
      const f = S.fish[i];
      f.x -= v * dt;
      if (f.x < -80 || f.got) { S.fish.splice(i, 1); continue; }
      if (play) {
        const dx = f.x - cx, dy = f.y - cy;
        if (dx * dx + dy * dy < R * R) collect(f);
      }
    }
  };
})();
