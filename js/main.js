// 入口：画布适配（横屏 / 竖屏 / 安全区）、键盘 / 鼠标 / 触屏输入、自适应画质、主循环
(function () {
  const G = window.G, S = G.Game, cv = document.getElementById('stage'), ctx = cv.getContext('2d');
  const safeEl = document.getElementById('safe');
  const perf = G.Perf.create();

  // ---------- 布局 ----------
  let touch = false;
  try { touch = !!(window.matchMedia && window.matchMedia('(pointer: coarse)').matches); } catch (e) { /* 忽略 */ }
  if (!touch && 'ontouchstart' in window && !window.matchMedia) touch = true;

  function insets() {
    const cs = safeEl ? getComputedStyle(safeEl) : null;
    const n = (v) => Math.max(0, parseFloat(v) || 0);
    return cs ? { t: n(cs.paddingTop), r: n(cs.paddingRight), b: n(cs.paddingBottom), l: n(cs.paddingLeft) } : { t: 0, r: 0, b: 0, l: 0 };
  }

  let key = '', lay = S.lay;
  function layout(force) {
    const iw = window.innerWidth, ih = window.innerHeight, ins = insets(), q = perf.q;
    const k = [iw, ih, touch, q, ins.t, ins.r, ins.b, ins.l, window.devicePixelRatio].join('|');
    if (!force && k === key) return;
    key = k;
    lay = G.computeLayout({ iw, ih, dpr: window.devicePixelRatio || 1, touch, inset: ins, q });
    cv.style.width = lay.cssW + 'px'; cv.style.height = lay.cssH + 'px';
    cv.style.left = lay.left + 'px'; cv.style.top = lay.top + 'px';
    if (cv.width !== lay.bw) cv.width = lay.bw;
    if (cv.height !== lay.bh) cv.height = lay.bh;
    ctx.setTransform(lay.sx, 0, 0, lay.sy, 0, 0);
    S.resize(lay);
  }
  window.addEventListener('resize', () => { layout(); setTimeout(layout, 300); });
  window.addEventListener('orientationchange', () => { layout(); setTimeout(layout, 300); setTimeout(layout, 800); });
  layout(true);

  // ---------- 输入状态 ----------
  // 每种操作可能同时被多个按键 / 手指按住，全部松开才算松开
  const held = { jump: new Set(), down: new Set() };
  const ptr = new Map();
  function press(kind, id) {
    held[kind].add(id); G.Input[kind] = true;
    if (kind === 'jump') S.pressJump(); else S.setDown(true);
  }
  function release(kind, id) {
    held[kind].delete(id);
    if (held[kind].size) return;
    G.Input[kind] = false;
    if (kind === 'jump') S.releaseJump(); else S.setDown(false);
  }
  function releaseAll() {
    held.jump.clear(); held.down.clear(); ptr.clear();
    G.Input.jump = G.Input.down = false;
    S.releaseJump(); S.setDown(false);
  }

  function begin() {
    if (S.state === 'over' && S.overT < 0.8) return;
    releaseAll(); S.start();
  }
  function pauseToggle() {
    if (S.state !== 'play' && S.state !== 'pause') return;
    releaseAll(); S.togglePause();
  }
  function wake() { G.Audio.unlock(); }

  // ---------- 键盘 ----------
  const JUMP = new Set(['Space', 'ArrowUp', 'KeyW']), DOWN = new Set(['ArrowDown', 'KeyS']);
  window.addEventListener('keydown', (e) => {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    const c = e.code;
    if (JUMP.has(c) || DOWN.has(c) || c === 'Enter' || c === 'KeyP' || c === 'Escape' || c === 'KeyM') e.preventDefault();
    if (e.repeat) return;
    wake();
    if (JUMP.has(c)) {
      if (S.state === 'title' || S.state === 'over') begin();
      else if (S.state === 'pause') pauseToggle();
      else press('jump', c);
    } else if (DOWN.has(c)) press('down', c);
    else if (c === 'Enter') { if (S.state === 'pause') pauseToggle(); else if (S.state !== 'play') begin(); }
    else if (c === 'KeyP' || c === 'Escape') pauseToggle();
    else if (c === 'KeyM') G.Audio.toggleMute();
  });
  window.addEventListener('keyup', (e) => {
    if (JUMP.has(e.code)) release('jump', e.code);
    else if (DOWN.has(e.code)) release('down', e.code);
  });

  // ---------- 鼠标 / 触屏 ----------
  function local(e) {
    const r = cv.getBoundingClientRect();
    return { x: ((e.clientX - r.left) / r.width) * lay.W, y: ((e.clientY - r.top) / r.height) * lay.Hv };
  }
  window.addEventListener('contextmenu', (e) => e.preventDefault());
  cv.addEventListener('pointerdown', (e) => {
    e.preventDefault(); wake();
    const isTouch = e.pointerType === 'touch' || e.pointerType === 'pen';
    if (isTouch !== touch && (e.pointerType === 'touch' || e.pointerType === 'mouse')) { touch = isTouch; layout(); }
    const p = local(e), dx = p.x / lay.u, dy = p.y / lay.u;
    const b = G.Hud.buttons.find((q) => Math.hypot(dx - q.x, dy - q.y) <= q.r + 14);
    if (b) { if (b.id === 'mute') G.Audio.toggleMute(); else pauseToggle(); return; }
    if (S.state === 'title' || S.state === 'over') { begin(); return; }
    if (S.state === 'pause') { pauseToggle(); return; }
    // 鼠标：左键跳、右键蜷缩；触屏：左侧 60% 跳、右侧 40% 蜷缩
    const kind = (e.pointerType === 'mouse' ? e.button === 2 : p.x > lay.W * 0.6) ? 'down' : 'jump';
    ptr.set(e.pointerId, kind);
    try { cv.setPointerCapture(e.pointerId); } catch (err) { /* 部分环境不支持 */ }
    press(kind, 'p' + e.pointerId);
  });
  function pointerEnd(e) {
    wake();
    const kind = ptr.get(e.pointerId);
    if (!kind) return;
    ptr.delete(e.pointerId); release(kind, 'p' + e.pointerId);
  }
  cv.addEventListener('pointerup', pointerEnd);
  cv.addEventListener('pointercancel', pointerEnd);
  cv.addEventListener('lostpointercapture', pointerEnd);

  // 阻止容器 / 浏览器的滚动、缩放、长按菜单，以及部分 WebView 只发 touch 事件的情况
  const stop = (e) => { if (e.cancelable) e.preventDefault(); };
  document.addEventListener('touchmove', stop, { passive: false });
  document.addEventListener('gesturestart', stop);
  document.addEventListener('gesturechange', stop);
  document.addEventListener('dblclick', stop);
  cv.addEventListener('touchend', wake);
  cv.addEventListener('click', wake);

  // 切走页面自动暂停（触屏环境下 blur 会被输入法等误触发，只在桌面用）
  function autoPause() { if (S.state === 'play') pauseToggle(); else releaseAll(); }
  document.addEventListener('visibilitychange', () => { if (document.hidden) autoPause(); });
  window.addEventListener('pagehide', autoPause);
  window.addEventListener('blur', () => { if (!touch) autoPause(); });

  // ---------- 主循环 ----------
  let last = performance.now();
  function frame(now) {
    requestAnimationFrame(frame);
    const ms = Math.max(0, now - last);
    last = now;
    layout();
    const dt = Math.min(0.05, ms / 1000);
    const steps = Math.max(1, Math.ceil(dt / 0.02));
    for (let i = 0; i < steps; i++) S.update(dt / steps);
    S.draw(ctx);
    if (perf.feed(ms) !== null) layout(true);
  }
  requestAnimationFrame(frame);
  cv.focus();
})();
