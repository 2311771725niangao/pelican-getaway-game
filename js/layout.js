// 布局：把窗口尺寸换算成逻辑坐标系（纯计算，不碰 DOM，方便测试）
// 横屏/桌面：世界高度固定 540，宽度 720~1280 随窗口比例变化（与旧版一致）
// 竖屏：逻辑宽度固定 720（玩法参数不变），画布铺满屏幕，世界带 540 高竖向偏移 oy，
//       上方延伸天空，下方延伸路面；触屏时最下面留出 deck 作为拇指操作区
(function () {
  const G = window.G, clamp = G.clamp;
  const WORLD_H = 540, MIN_W = 720, MAX_W = 1280;

  // o: { iw, ih, dpr, touch, inset:{t,r,b,l}（CSS 像素）, q（画质系数 0~1） }
  G.computeLayout = function (o) {
    const iw = Math.max(1, o.iw), ih = Math.max(1, o.ih), ins = o.inset || { t: 0, r: 0, b: 0, l: 0 };
    const aspect = iw / ih, wide = aspect >= MIN_W / WORLD_H;
    let W, Hv, k, cssW, cssH;
    if (wide) {
      W = clamp(Math.round(WORLD_H * aspect), MIN_W, MAX_W);
      k = Math.min(iw / W, ih / WORLD_H);
      Hv = WORLD_H; cssW = Math.round(W * k); cssH = Math.round(Hv * k);
    } else {
      W = MIN_W; k = iw / W; Hv = ih / k; cssW = iw; cssH = ih;
    }
    const left = Math.round((iw - cssW) / 2), top = Math.round((ih - cssH) / 2);

    // 世界带（540 高）在画布里的位置
    const spare = Hv - WORLD_H;
    let deck = 0, oy = 0;
    if (spare > 0) {
      const insB = Math.max(0, ins.b - (ih - top - cssH));
      if (o.touch && spare >= 200) {
        deck = Math.min(spare * 0.5, Math.max((128 + insB) / k, 150));
        oy = Math.round(spare - deck);
      } else oy = Math.round(spare / 2);
    }

    // UI 设计空间：小屏上按 1/k 放大，让 1 个设计单位 ≈ 1 个 CSS 像素
    const u = clamp(1 / k, 1, 2.4);
    const inT = Math.max(0, ins.t - top) / k, inR = Math.max(0, ins.r - left) / k;
    const inB = Math.max(0, ins.b - (ih - top - cssH)) / k, inL = Math.max(0, ins.l - left) / k;

    // 画布像素：受 DPR、触屏像素上限、自适应画质共同限制
    let scale = Math.min(o.dpr || 1, o.touch ? 3 : 2);
    if (o.touch) scale = Math.min(scale, Math.sqrt((Math.min(iw, ih) < 600 ? 1.6e6 : 2.6e6) / (cssW * cssH)));
    scale *= clamp(o.q === undefined ? 1 : o.q, 0.3, 1);
    const bw = Math.max(1, Math.round(cssW * scale)), bh = Math.max(1, Math.round(cssH * scale));

    return {
      W, Hv, oy, deck, k, u, wide, cssW, cssH, left, top, bw, bh, sx: bw / W, sy: bh / Hv, touch: !!o.touch,
      inT, inR, inB, inL,
      w: W / u, h: Hv / u, band: oy / u, it: inT / u, ir: inR / u, ib: inB / u, il: inL / u,
      stacked: oy / u >= 200,
    };
  };
})();
