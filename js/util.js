// 公共工具：数学、颜色、精灵缓存、文字
(function () {
  const G = (window.G = window.G || {});

  G.TAU = Math.PI * 2;
  G.FONT = '"PingFang SC","Hiragino Sans GB","Microsoft YaHei","Noto Sans CJK SC","Source Han Sans SC",system-ui,-apple-system,sans-serif';
  G.INK = '#3a2140'; // 统一的描边色（深梅紫），比纯黑更贴合日落色调

  G.clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  G.lerp = (a, b, t) => a + (b - a) * t;
  G.rand = (a, b) => a + Math.random() * (b - a);
  G.randInt = (a, b) => Math.floor(G.rand(a, b + 1));
  G.pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
  G.smooth = (t) => { t = G.clamp(t, 0, 1); return t * t * (3 - 2 * t); };
  G.outBack = (t) => { const c = 1.70158; t -= 1; return 1 + (c + 1) * t * t * t + c * t * t; };
  G.outCubic = (t) => 1 - Math.pow(1 - G.clamp(t, 0, 1), 3);

  // 确定性伪随机：同一个序号永远得到同一个值，用于背景物件的位置/款式
  G.hash = (n) => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };

  // 颜色：'#rrggbb' -> [r,g,b]，可插值
  const rgbCache = {};
  G.rgb = (c) => {
    if (Array.isArray(c)) return c;
    if (rgbCache[c]) return rgbCache[c];
    let h = c.replace('#', '');
    if (h.length === 3) h = h.split('').map((x) => x + x).join('');
    const n = parseInt(h, 16);
    return (rgbCache[c] = [(n >> 16) & 255, (n >> 8) & 255, n & 255]);
  };
  G.mix = (a, b, t) => {
    a = G.rgb(a); b = G.rgb(b);
    return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
  };
  G.css = (c, alpha) => {
    c = G.rgb(c);
    const r = Math.round(c[0]), g = Math.round(c[1]), b = Math.round(c[2]);
    return alpha === undefined || alpha >= 1 ? `rgb(${r},${g},${b})` : `rgba(${r},${g},${b},${alpha < 0 ? 0 : alpha})`;
  };

  // 预渲染精灵：静态图形只画一次，之后 drawImage，画面更清晰也更省性能
  G.makeSprite = (w, h, draw, scale) => {
    scale = scale || 3;
    const cv = document.createElement('canvas');
    cv.width = Math.ceil(w * scale);
    cv.height = Math.ceil(h * scale);
    const c = cv.getContext('2d');
    c.scale(scale, scale);
    draw(c, w, h);
    return { canvas: cv, w, h };
  };
  G.blit = (ctx, spr, x, y, sx, sy) => {
    ctx.drawImage(spr.canvas, x, y, spr.w * (sx || 1), spr.h * (sy === undefined ? sx || 1 : sy));
  };

  G.roundRect = (ctx, x, y, w, h, r) => {
    r = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  };

  // 带描边的文字
  G.text = (ctx, str, x, y, o) => {
    o = o || {};
    ctx.save();
    ctx.font = `${o.weight || 800} ${o.size || 20}px ${G.FONT}`;
    ctx.textAlign = o.align || 'left';
    ctx.textBaseline = o.baseline || 'alphabetic';
    if (o.alpha !== undefined) ctx.globalAlpha *= o.alpha;
    if (o.shadow) {
      ctx.shadowColor = o.shadow;
      ctx.shadowBlur = o.shadowBlur === undefined ? 8 : o.shadowBlur;
      ctx.shadowOffsetY = o.shadowY === undefined ? 2 : o.shadowY;
    }
    if (o.stroke) {
      ctx.lineJoin = 'round';
      ctx.lineWidth = o.strokeW || 4;
      ctx.strokeStyle = o.stroke;
      ctx.strokeText(str, x, y);
      ctx.shadowColor = 'transparent';
    }
    ctx.fillStyle = o.color || '#fff';
    ctx.fillText(str, x, y);
    ctx.restore();
  };

  // 文字宽度超出 maxW 时等比缩小字号
  G.fit = (ctx, str, size, maxW, weight) => {
    ctx.save(); ctx.font = `${weight || 800} ${size}px ${G.FONT}`;
    const w = ctx.measureText(str).width; ctx.restore();
    return w > maxW ? Math.max(8, Math.floor((size * maxW / w) * 2) / 2) : size;
  };

  // 存档：localStorage 不可用（隐私模式、容器限制）时退回内存，本次游玩内仍然有效
  const mem = {};
  G.load = (key, def) => {
    try { const v = localStorage.getItem('pelican-getaway:' + key); return v === null ? (key in mem ? mem[key] : def) : JSON.parse(v); }
    catch (e) { return key in mem ? mem[key] : def; }
  };
  G.save = (key, val) => {
    mem[key] = val;
    try { localStorage.setItem('pelican-getaway:' + key, JSON.stringify(val)); } catch (e) { /* 退回内存存档 */ }
  };
})();
