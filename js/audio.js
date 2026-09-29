// 音频：全部用 WebAudio 合成，不依赖任何外部文件。首次用户操作后才会真正出声。
(function () {
  const G = window.G;
  const A = (G.Audio = {});

  let ctx = null, master, sfx, mus, amb, noiseBuf;
  let muted = !!G.load('muted', false);
  let timer = null, nextT = 0, step = 0;
  A.intensity = 0; // 0 = 只有和弦+琶音；越高越加鼓点

  const NOTE = (n) => 440 * Math.pow(2, (n - 69) / 12);
  const BPM = 100, E = 60 / BPM / 2; // 八分音符时长

  // IV - V - iii - vi（日系城市流行常用的“王道进行”），很适合日落海边
  const CH = [
    { bass: 41, notes: [57, 60, 64, 65] }, // Fmaj7
    { bass: 43, notes: [59, 62, 64, 67] }, // G6
    { bass: 40, notes: [55, 59, 62, 64] }, // Em7
    { bass: 45, notes: [57, 60, 64, 67] }, // Am7
  ];
  const ARP = [0, 2, 3, 2, 1, 2, 3, 2];

  function ensure() {
    if (ctx) return true;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return false;
    try { ctx = new AC(); } catch (e) { ctx = null; return false; }
    master = ctx.createGain();
    master.gain.value = muted ? 0 : 0.85;
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -16; comp.ratio.value = 5;
    master.connect(comp); comp.connect(ctx.destination);
    sfx = ctx.createGain(); sfx.gain.value = 0.9; sfx.connect(master);
    mus = ctx.createGain(); mus.gain.value = 0.55; mus.connect(master);
    amb = ctx.createGain(); amb.gain.value = 0.1; amb.connect(master);

    const len = ctx.sampleRate * 2;
    noiseBuf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;

    // 海浪声：低通噪声 + 慢速起伏
    const src = ctx.createBufferSource(); src.buffer = noiseBuf; src.loop = true;
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 520;
    const g = ctx.createGain(); g.gain.value = 0.5;
    const lfo = ctx.createOscillator(); lfo.frequency.value = 0.11;
    const lfoG = ctx.createGain(); lfoG.gain.value = 0.35;
    lfo.connect(lfoG); lfoG.connect(g.gain);
    src.connect(lp); lp.connect(g); g.connect(amb);
    src.start(); lfo.start();

    document.addEventListener('visibilitychange', () => {
      if (!ctx) return;
      if (document.hidden) ctx.suspend(); else ctx.resume();
    });
    return true;
  }

  function tone(o) {
    if (!ctx || muted) return;
    const t0 = ctx.currentTime + (o.at || 0);
    const osc = ctx.createOscillator();
    osc.type = o.type || 'square';
    osc.frequency.setValueAtTime(o.f, t0);
    if (o.to) osc.frequency.exponentialRampToValueAtTime(o.to, t0 + o.dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(o.vol || 0.2, t0 + (o.attack || 0.005));
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + o.dur);
    osc.connect(g); g.connect(o.bus || sfx);
    osc.start(t0); osc.stop(t0 + o.dur + 0.05);
  }

  function noise(o) {
    if (!ctx || muted) return;
    const t0 = ctx.currentTime + (o.at || 0);
    const src = ctx.createBufferSource(); src.buffer = noiseBuf;
    const f = ctx.createBiquadFilter();
    f.type = o.type || 'bandpass';
    f.frequency.setValueAtTime(o.freq || 1000, t0);
    if (o.to) f.frequency.exponentialRampToValueAtTime(o.to, t0 + o.dur);
    f.Q.value = o.q || 1;
    const g = ctx.createGain();
    g.gain.setValueAtTime(o.vol || 0.2, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + o.dur);
    src.connect(f); f.connect(g); g.connect(o.bus || sfx);
    src.start(t0, Math.random() * 1.5); src.stop(t0 + o.dur + 0.05);
  }

  const S = {
    jump() { tone({ f: 340, to: 680, dur: 0.14, type: 'square', vol: 0.09 }); },
    glide() { noise({ dur: 0.24, vol: 0.10, freq: 900, to: 2400, q: 0.8 }); },
    land() { tone({ f: 140, to: 55, dur: 0.12, type: 'sine', vol: 0.22 }); noise({ dur: 0.06, vol: 0.05, freq: 1800, type: 'highpass' }); },
    tuck() { noise({ dur: 0.10, vol: 0.05, freq: 1300, to: 500, q: 1 }); },
    fish(n) {
      const b = 880 * Math.pow(1.0595, Math.min(n || 0, 7));
      tone({ f: b, dur: 0.09, type: 'triangle', vol: 0.15 });
      tone({ f: b * 1.5, dur: 0.14, type: 'triangle', vol: 0.13, at: 0.06 });
    },
    golden() { [0, 4, 7, 12, 16].forEach((s, i) => tone({ f: NOTE(72 + s), dur: 0.16, type: 'triangle', vol: 0.14, at: i * 0.06 })); },
    hit() { noise({ dur: 0.25, vol: 0.28, freq: 900, to: 200, q: 0.7 }); tone({ f: 220, to: 70, dur: 0.25, type: 'sawtooth', vol: 0.15 }); },
    smash() { noise({ dur: 0.18, vol: 0.22, freq: 2500, to: 600 }); tone({ f: 520, to: 180, dur: 0.15, type: 'square', vol: 0.09 }); },
    bell() { tone({ f: 2093, dur: 0.35, type: 'sine', vol: 0.10 }); tone({ f: 2637, dur: 0.35, type: 'sine', vol: 0.08, at: 0.07 }); },
    shout() {
      const f = G.rand(170, 230);
      tone({ f, to: f * 0.7, dur: 0.22, type: 'sawtooth', vol: 0.05, attack: 0.03 });
      tone({ f: f * 1.5, to: f, dur: 0.2, type: 'square', vol: 0.025, attack: 0.03 });
    },
    tier() { [0, 1, 0, 1].forEach((k, i) => tone({ f: k ? 880 : 660, dur: 0.12, type: 'square', vol: 0.08, at: i * 0.13 })); },
    caught() { [62, 61, 60, 55].forEach((m, i) => tone({ f: NOTE(m), dur: i === 3 ? 0.7 : 0.28, type: 'sawtooth', vol: 0.10, at: i * 0.32 })); },
    start() { [60, 64, 67].forEach((m, i) => tone({ f: NOTE(m + 12), dur: 0.12, type: 'triangle', vol: 0.13, at: i * 0.08 })); },
    win() { [60, 64, 67, 72, 76, 79, 84].forEach((m, i) => tone({ f: NOTE(m + 12), dur: i === 6 ? 0.8 : 0.16, type: 'triangle', vol: 0.13, at: i * 0.09 })); },
    beat() { noise({ dur: 0.1, vol: 0.2, freq: 700, to: 200, q: 0.8 }); tone({ f: 200, to: 90, dur: 0.1, type: 'square', vol: 0.08 }); },
    click() { tone({ f: 660, dur: 0.05, type: 'square', vol: 0.05 }); },
    heart() { tone({ f: 70, to: 45, dur: 0.12, type: 'sine', vol: 0.25 }); tone({ f: 70, to: 45, dur: 0.12, type: 'sine', vol: 0.18, at: 0.16 }); },
  };

  A.play = (name, arg) => {
    if (!ctx || muted) return;
    try { S[name](arg); } catch (e) { /* 音效失败不影响游戏 */ }
  };

  function schedule() {
    if (!ctx || muted) { nextT = ctx ? ctx.currentTime + 0.1 : 0; return; }
    while (nextT < ctx.currentTime + 0.3) {
      const ch = CH[Math.floor(step / 8) % 4], s = step % 8, at = nextT - ctx.currentTime;
      if (s === 0) ch.notes.forEach((n) => tone({ f: NOTE(n), dur: E * 7.8, type: 'triangle', vol: 0.035, attack: 0.45, at, bus: mus }));
      if (s === 0 || s === 3 || s === 4 || s === 6) tone({ f: NOTE(ch.bass), dur: E * 1.7, type: 'sine', vol: s === 0 ? 0.2 : 0.12, at, bus: mus });
      tone({ f: NOTE(ch.notes[ARP[s]] + 12), dur: E * 1.4, type: 'triangle', vol: 0.055, at, bus: mus });
      if (A.intensity > 0.3) {
        if (s === 0 || s === 4) tone({ f: 120, to: 45, dur: 0.14, type: 'sine', vol: 0.2, at, bus: mus });
        if (s % 2 === 1) noise({ dur: 0.04, vol: 0.03, freq: 7000, type: 'highpass', at, bus: mus });
      }
      nextT += E; step++;
    }
  }

  function resume() {
    if (ctx.state === 'running') return;
    try { const r = ctx.resume(); if (r && r.catch) r.catch(() => {}); } catch (e) { /* 等下一次手势再试 */ }
  }
  A.unlock = () => { if (ensure()) resume(); };
  A.startMusic = () => {
    if (!ensure() || timer) return;
    resume();
    nextT = ctx.currentTime + 0.1; step = 0;
    timer = setInterval(schedule, 60);
  };
  A.stopMusic = () => { if (timer) { clearInterval(timer); timer = null; } };
  A.isMuted = () => muted;
  A.setMuted = (m) => {
    muted = !!m;
    G.save('muted', muted);
    if (master) master.gain.setTargetAtTime(muted ? 0 : 0.85, ctx.currentTime, 0.05);
  };
  A.toggleMute = () => { A.setMuted(!muted); return muted; };
})();
