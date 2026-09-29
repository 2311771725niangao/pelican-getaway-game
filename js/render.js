// 世界渲染：背景 → 障碍/鱼 → 车主 → 鹈鹕 → 粒子 → 色调 → HUD
(function () {
  const G = window.G, S = G.Game, C = S.C, TAU = G.TAU, GROUND = G.L.GROUND;

  function shadow(ctx, x, y, rx, ry, a) {
    ctx.save(); ctx.globalAlpha = a; ctx.fillStyle = '#1a0f2e';
    ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, TAU); ctx.fill(); ctx.restore();
  }

  function glow(ctx, x, y, r, rgb, a) {
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    const g = ctx.createRadialGradient(x, y, 4, x, y, r);
    g.addColorStop(0, `rgba(${rgb},${a})`); g.addColorStop(1, `rgba(${rgb},0)`);
    ctx.fillStyle = g; ctx.fillRect(x - r, y - r, r * 2, r * 2);
    ctx.restore();
  }

  function drawObstacles(ctx) {
    for (const ob of S.obs) {
      ctx.save();
      if (ob.fly) {
        ctx.globalAlpha = Math.max(0, 1 - ob.fly.t);
        ctx.translate(ob.x, GROUND - ob.y - 20); ctx.rotate(ob.rot); ctx.translate(0, 20);
        G.drawObstacle(ctx, { type: ob.type, y: 0, seed: ob.seed, rot: ob.rot }, S.t);
      } else {
        ctx.translate(ob.x, GROUND);
        G.drawObstacle(ctx, ob, S.t);
      }
      ctx.restore();
    }
  }

  function drawFish(ctx) {
    for (const f of S.fish) {
      if (f.x < -40 || f.x > S.W + 40) continue;
      const y = GROUND - f.y;
      if (f.golden) glow(ctx, f.x, y, 46, '255,214,110', 0.5 + Math.sin(S.t * 6) * 0.12);
      ctx.save(); ctx.translate(f.x, y); G.drawFish(ctx, f, S.t); ctx.restore();
    }
  }

  function drawItems(ctx) {
    for (const it of S.items) if (it.x > -40 && it.x < S.W + 40) G.drawItem(ctx, it, S.t);
  }

  function drawOwner(ctx) {
    const O = S.owner, x = S.ownerX(), gy = GROUND + 5, mode = O.swapT > 0 ? 'foot' : O.mode;
    shadow(ctx, x + 6, gy + 2, mode === 'foot' ? 34 : 52, 6, 0.3);
    ctx.save(); ctx.translate(x, gy); ctx.scale(1.15, 1.15);
    G.drawOwner(ctx, { t: S.t, run: O.run, mode, shout: O.shout, lamp: O.lamp, sweat: S.danger() > 0.25 || O.swapT > 0 ? 1 : 0 });
    ctx.restore();
  }

  function drawPelican(ctx) {
    const p = S.p, x = S.px + p.xoff;
    shadow(ctx, x + 6, GROUND + 3, Math.max(28, 54 - p.y * 0.1), 7, 0.3 * (1 - Math.min(1, p.y / 260) * 0.55));
    if (p.turbo > 0) {
      let a = Math.min(1, p.turbo / 0.5);
      if (p.turbo < 1 && Math.sin(S.t * 30) > 0) a *= 0.4;
      glow(ctx, x + 10, GROUND - p.y - 80, 150, '255,200,90', 0.6 * a);
    }
    ctx.save();
    ctx.translate(x, GROUND - p.y);
    ctx.rotate(p.tilt);
    ctx.scale(C.SC * (1 + p.squash * 0.1), C.SC * (1 - p.squash * 0.12));
    if (p.invuln > 0 && p.turbo <= 0) ctx.globalAlpha = Math.sin(S.t * 46) > 0 ? 1 : 0.35;
    G.drawPelican(ctx, {
      t: S.t, wheel: p.wheel, pedal: p.pedal, tuck: p.tuck, glide: p.glide, flap: p.flap,
      fish: Math.round(p.fishVis), blink: p.blink, look: p.look, sweat: p.sweat, dizzy: p.dizzy,
      speed: G.clamp((S.speed - 150) / 470, 0, 1),
    });
    ctx.restore();
  }

  function speedLines(ctx) {
    const p = S.p, k = G.clamp((S.speed - 380) / 260, 0, 1) * 0.6 + (p.turbo > 0 ? 0.6 : 0);
    if (k < 0.05 || S.state === 'title') return;
    ctx.save(); ctx.lineCap = 'round';
    ctx.strokeStyle = p.turbo > 0 ? '#ffeeaa' : '#ffffff';
    for (let i = 0; i < 14; i++) {
      const sp = 1.4 + G.hash(i) * 1.2, len = 40 + G.hash(i * 3) * 90;
      const x = S.W + 100 - ((S.t * S.speed * sp * 0.9 + i * 211) % (S.W + 300));
      ctx.globalAlpha = k * (0.25 + 0.4 * G.hash(i * 5)); ctx.lineWidth = 1.2 + G.hash(i * 9) * 1.6;
      ctx.beginPath(); ctx.moveTo(x, 250 + G.hash(i * 7 + 1) * 270); ctx.lineTo(x + len, 250 + G.hash(i * 7 + 1) * 270); ctx.stroke();
    }
    ctx.restore();
  }

  S.draw = function (ctx) {
    const cam = S.cam, lay = S.lay, W = lay.W, Hv = lay.Hv;
    G.Scene.update(cam, W, S.H, S.dist, S.t, S.todVis);
    cam.top = -lay.oy; cam.bottom = Hv - lay.oy;
    ctx.save();
    if (S.shake > 0.001) {
      const k = Math.min(1, S.shake);
      ctx.translate(W / 2, Hv / 2); ctx.scale(1.03, 1.03);
      ctx.translate(-W / 2 + (Math.random() * 2 - 1) * 7 * k, -Hv / 2 + (Math.random() * 2 - 1) * 5 * k);
    }
    ctx.translate(0, lay.oy);
    G.Scene.drawBack(ctx, cam);
    G.Scene.drawRoad(ctx, cam);
    G.drawGate(ctx, S);
    drawObstacles(ctx);
    drawFish(ctx);
    drawItems(ctx);
    drawOwner(ctx);
    drawPelican(ctx);
    G.drawPelicanAura(ctx, S);
    G.drawBrawl(ctx, S);
    G.fx.draw(ctx);
    speedLines(ctx);
    ctx.restore();
    G.Scene.drawTint(ctx, cam);
    G.Hud.draw(ctx, S);
  };
})();
