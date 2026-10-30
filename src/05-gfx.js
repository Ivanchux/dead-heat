/* ================= GRÁFICOS: fuente, sprites, baldosas, partículas ================= */
const REDUCE = (() => { try { return matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { return false; } })();
const TS = 16;                 // píxeles internos por casilla
const HUD_H = 30;
const VW = W * TS, VH = H * TS + HUD_H;   // 336 x 270, se escala con CSS sin suavizado

const PAL = {
  bg: '#070d18', floor: '#0b1424', floorDot: '#10203a',
  ice0: '#e9fcff', ice1: '#a6e0f4', ice2: '#6bb4e0', ice3: '#3b7db5', ice4: '#25507f', crack: '#f4feff',
  rock0: '#4a566e', rock1: '#323c52', rock2: '#1d2434', rock3: '#10141f',
  ember: '#ff9b2f', emberHi: '#ffe49a', water: '#46c4ff', waterHi: '#bff0ff',
  flame0: '#7a1d00', flame1: '#ff6a12', flame2: '#ffb02e', flame3: '#fff0a0',
  ui: '#cfe9ff', uiDim: '#5f7d9e', uiHot: '#ffb02e', danger: '#ff4d6d',
};
const ENEMY_PAL = {
  chaser:  { o: '#2a0f4a', b: '#9b5cff', h: '#d9b8ff' },
  skater:  { o: '#06403a', b: '#26d9b0', h: '#b9fff0' },
  cracker: { o: '#4a0a24', b: '#e2406e', h: '#ff9fb8' },
  ambush:  { o: '#4a0a3a', b: '#ff7ac8', h: '#ffd0ee' },
  shy:     { o: '#4a2a06', b: '#ff9f43', h: '#ffd9a8' },
  wander:  { o: '#17400f', b: '#7dd957', h: '#d4ffbf' },
};
const SPR_KIND = { chaser: 'chaser', wander: 'chaser', ambush: 'skater', skater: 'skater', shy: 'cracker', cracker: 'cracker' };

/* ---- Fuente 3x5 ---- */
const FONT = {};
(function () {
  const g = {
    '0': '111101101101111', '1': '010110010010111', '2': '111001111100111', '3': '111001111001111', '4': '101101111001001',
    '5': '111100111001111', '6': '111100111101111', '7': '111001001001001', '8': '111101111101111', '9': '111101111001111',
    A: '010101111101101', B: '110101110101110', C: '011100100100011', D: '110101101101110', E: '111100110100111', F: '111100110100100',
    G: '011100101101011', H: '101101111101101', I: '111010010010111', J: '001001001101010', K: '101101110101101', L: '100100100100111',
    M: '101111111101101', N: '110101101101101', O: '010101101101010', P: '110101110100100', Q: '010101101111011', R: '110101110101101',
    S: '011100010001110', T: '111010010010010', U: '101101101101111', V: '101101101101010', W: '101101111111101', X: '101101010101101',
    Y: '101101010010010', Z: '111001010100111', '-': '000000111000000', ':': '000010000010000', '.': '000000000000010', '!': '010010010000010',
    '/': '001001010100100', '+': '000010111010000', '?': '111001010000010', ',': '000000000010100', '%': '101001010100101', '×': '000101010101000', '·': '000000010000000',
    '<': '001010100010001', '>': '100010001010100', '(': '010100100100010', ')': '010001001001010', "'": '010010000000000',
  };
  for (const k in g) FONT[k] = g[k];
})();
const ACCENT = { 'Á': 'A', 'É': 'E', 'Í': 'I', 'Ó': 'O', 'Ú': 'U', 'Ñ': 'N' };
function textWidth(s, sc) { return (s.length * 4 - 1) * (sc || 1); }
function drawText(c, s, x, y, col, sc, align, shadow) {
  sc = sc || 1; s = s.toUpperCase();
  if (align === 'center') x -= Math.floor(textWidth(s, sc) / 2); else if (align === 'right') x -= textWidth(s, sc);
  const pass = (ox, oy, color) => {
    c.fillStyle = color; let cx = x + ox;
    for (const ch of s) {
      let base = ch, acc = false;
      if (ACCENT[ch]) { base = ACCENT[ch]; acc = true; }
      const gl = FONT[base];
      if (gl) for (let i = 0; i < 15; i++) if (gl[i] === '1') c.fillRect(cx + (i % 3) * sc, y + oy + ((i / 3) | 0) * sc, sc, sc);
      if (acc) c.fillRect(cx + sc, y + oy - 2 * sc, sc, sc);
      cx += 4 * sc;
    }
  };
  if (shadow !== false) pass(Math.min(sc, 2), Math.min(sc, 2), 'rgba(0,0,0,0.55)');
  pass(0, 0, col || PAL.ui);
}

/* ---- Sprites de 12x12 ---- */
const SPR = {
  player: [
    '......oo....', '.....ohho...', '....ohhbo...', '...ohhbbbo..', '..ohhbbbbbo.', '..ohbbbbbbo.',
    '..ohbbbbbbo.', '..ohbbbbbbo.', '..obbbbbbbo.', '...obbbbbo..', '....oooooo..', '............'],
  chaser: [
    '....oooo....', '...obhhbo...', '..obhhbbbo..', '.obhbbbbbbo.', '.obbbbbbbbo.', '.obbbbbbbbo.',
    '.obbbbbbbbo.', '.obbbbbbbbo.', '.obbbbbbbbo.', '.obbobbobbo.', '..o.oo.oo.o.', '............'],
  skater: [
    '............', '....oooo....', '..ooHhhhoo..', '.ohhhbbbbbo.', '.ohbbbbbbbo.', '.obbbbbbbbo.',
    '..obbbbbbo..', '...oooooo...', '.oooooooooo.', '.o........o.', '............', '............'],
  cracker: [
    '...oooooo...', '..obbbbbbo..', '.obbbhbbbbo.', '.obbhbbbbbo.', '.obbbhhbbbo.', '.obbbbhbbbo.',
    '.obbbhbbbbo.', '.obbhbbbbbo.', '.obbbbbbbbo.', '..obbbbbbo..', '...oooooo...', '............'],
};
const spriteCache = {};
function spriteCanvas(name, pal, flip) {
  const key = name + JSON.stringify(pal) + (flip || 0);
  if (spriteCache[key]) return spriteCache[key];
  const cv = document.createElement('canvas'); cv.width = 12; cv.height = 12;
  const c = cv.getContext('2d'); const rows = SPR[name];
  for (let y = 0; y < 12; y++) for (let x = 0; x < 12; x++) {
    let sx = x;
    if (flip === 2 && y < 3) sx = x - 1; // fotograma B de la llama: la punta se desplaza
    const ch = (sx >= 0 && sx < 12 ? rows[y][sx] : '.') || '.';
    if (ch === '.') continue;
    c.fillStyle = pal[ch] || pal[ch.toLowerCase()] || '#fff';
    c.fillRect(x, y, 1, 1);
  }
  return spriteCache[key] = cv;
}
const PLAYER_PAL = { o: PAL.flame0, b: PAL.flame1, h: PAL.flame2 };
const SCARED_PAL = { o: '#0a1c5a', b: '#2a55d8', h: '#9cc0ff', H: '#9cc0ff' };
const SCARED_FLASH = { o: '#5a6a8a', b: '#f4fbff', h: '#ffffff', H: '#ffffff' };

/* ---- Baldosas prerrenderizadas ---- */
function hash2(x, y, s) { let h = (x * 374761393 + y * 668265263 + (s || 0) * 2147483647) | 0; h = (h ^ (h >>> 13)) * 1274126177 | 0; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; }
const tileCache = {};
function iceTile(v) {
  const k = 'ice' + v; if (tileCache[k]) return tileCache[k];
  const cv = document.createElement('canvas'); cv.width = TS; cv.height = TS; const c = cv.getContext('2d'); const r = rng(v * 97 + 5);
  c.fillStyle = PAL.ice4; c.fillRect(0, 0, TS, TS);
  c.fillStyle = PAL.ice3; c.fillRect(1, 1, TS - 2, TS - 2);
  c.fillStyle = PAL.ice2; c.fillRect(1, 1, TS - 3, TS - 3);
  c.fillStyle = PAL.ice1; c.fillRect(2, 2, TS - 6, TS - 6);
  c.fillStyle = PAL.ice0; c.fillRect(1, 1, TS - 3, 1); c.fillRect(1, 1, 1, TS - 3);
  // motas y grietas
  for (let i = 0; i < 5; i++) { c.fillStyle = r() < 0.5 ? PAL.ice0 : PAL.ice2; c.fillRect(2 + r.int(TS - 5), 2 + r.int(TS - 5), 1 + r.int(2), 1); }
  let cx = 3 + r.int(8), cy = 3 + r.int(8); c.fillStyle = PAL.crack;
  for (let i = 0; i < 5 + r.int(4); i++) { c.fillRect(cx, cy, 1, 1); cx += r.int(3) - 1; cy += r.int(2); cx = Math.max(2, Math.min(TS - 3, cx)); cy = Math.max(2, Math.min(TS - 3, cy)); }
  return tileCache[k] = cv;
}
function rockTile(v) {
  const k = 'rock' + v; if (tileCache[k]) return tileCache[k];
  const cv = document.createElement('canvas'); cv.width = TS; cv.height = TS; const c = cv.getContext('2d'); const r = rng(v * 131 + 9);
  c.fillStyle = PAL.rock3; c.fillRect(0, 0, TS, TS);
  c.fillStyle = PAL.rock1; c.fillRect(0, 0, TS - 1, TS - 1);
  c.fillStyle = PAL.rock0; c.fillRect(0, 0, TS - 2, 1); c.fillRect(0, 0, 1, TS - 2);
  c.fillStyle = PAL.rock2; c.fillRect(1, TS - 3, TS - 2, 2); c.fillRect(TS - 3, 1, 2, TS - 2);
  for (let i = 0; i < 7; i++) { c.fillStyle = r() < 0.5 ? PAL.rock2 : PAL.rock0; c.fillRect(2 + r.int(TS - 5), 2 + r.int(TS - 5), 2, 1); }
  return tileCache[k] = cv;
}
function floorTile() {
  if (tileCache.floor) return tileCache.floor;
  const cv = document.createElement('canvas'); cv.width = TS; cv.height = TS; const c = cv.getContext('2d');
  c.fillStyle = PAL.floor; c.fillRect(0, 0, TS, TS);
  c.fillStyle = PAL.floorDot; c.fillRect(0, 0, TS, 1); c.fillRect(0, 0, 1, TS); c.fillRect(TS >> 1, TS >> 1, 1, 1);
  return tileCache.floor = cv;
}
function glowSprite(r, color) {
  const k = 'glow' + r + color; if (tileCache[k]) return tileCache[k];
  const cv = document.createElement('canvas'); cv.width = cv.height = r * 2; const c = cv.getContext('2d');
  const g = c.createRadialGradient(r, r, 0, r, r, r); g.addColorStop(0, color); g.addColorStop(1, 'rgba(0,0,0,0)');
  c.fillStyle = g; c.fillRect(0, 0, r * 2, r * 2); return tileCache[k] = cv;
}

/* ---- Partículas ---- */
const Particles = {
  list: [], shake: 0, flash: 0, floaters: [],
  add(p) { if (this.list.length < 900) this.list.push(p); },
  burst(n, x, y, o) {
    for (let i = 0; i < n; i++) {
      const a = (o.a0 != null ? o.a0 : 0) + Math.random() * (o.spread != null ? o.spread : Math.PI * 2);
      const s = (o.s0 || 10) + Math.random() * (o.s1 || 30);
      this.add({ x: x + (Math.random() - 0.5) * (o.jit || 0), y: y + (Math.random() - 0.5) * (o.jit || 0), vx: Math.cos(a) * s, vy: Math.sin(a) * s, g: o.g || 0, life: 0, max: (o.l0 || 0.4) + Math.random() * (o.l1 || 0.4), c: o.c[(Math.random() * o.c.length) | 0], s: o.size || 1, grow: o.grow || 0, drag: o.drag || 0 });
    }
  },
  floater(text, x, y, col) { this.floaters.push({ text, x, y, t: 0, col: col || PAL.uiHot }); },
  update(dt) {
    for (let i = this.list.length - 1; i >= 0; i--) {
      const p = this.list[i]; p.life += dt; if (p.life >= p.max) { this.list.splice(i, 1); continue; }
      p.vy += p.g * dt; if (p.drag) { p.vx *= 1 - p.drag * dt; p.vy *= 1 - p.drag * dt; }
      p.x += p.vx * dt; p.y += p.vy * dt; p.s += p.grow * dt;
    }
    for (let i = this.floaters.length - 1; i >= 0; i--) { const f = this.floaters[i]; f.t += dt; f.y -= 14 * dt; if (f.t > 1) this.floaters.splice(i, 1); }
    this.shake = Math.max(0, this.shake - dt * 2.4); this.flash = Math.max(0, this.flash - dt * 3);
  },
  draw(c) {
    for (const p of this.list) {
      const a = 1 - p.life / p.max; c.globalAlpha = Math.max(0, Math.min(1, a * 1.4));
      c.fillStyle = p.c; const s = Math.max(1, Math.round(p.s)); c.fillRect(Math.round(p.x - s / 2), Math.round(p.y - s / 2), s, s);
    }
    c.globalAlpha = 1;
  },
  drawFloaters(c) { for (const f of this.floaters) { c.globalAlpha = Math.max(0, 1 - f.t * 0.9); drawText(c, f.text, Math.round(f.x), Math.round(f.y), f.col, 1, 'center'); } c.globalAlpha = 1; },
};
