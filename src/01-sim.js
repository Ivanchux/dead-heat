/* ================= SIMULACIÓN (paso fijo, sin dibujo, con semilla) ================= */
const W = 21, H = 15, TILE = 32;
const T = { FLOOR: 0, ICE: 1, WALL: 2 }; // WALL = roca indestructible
const DIRS = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
const DIR_LIST = ['up', 'left', 'down', 'right'];
const OPP = { up: 'down', down: 'up', left: 'right', right: 'left' };

function rng(seed) {
  let s = seed >>> 0;
  const f = () => {
    s = (s + 0x6D2B79F5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  f.int = n => Math.floor(f() * n);
  return f;
}

/* ---- Datos de niveles y enemigos (datos, no código) ---- */
const LEVELS = [
  { name: 'Primer deshielo', iceDensity: 0.30, enemies: ['chaser'], speed: 3.6, heatMax: 3, power: 2, refreeze: 14 },
  { name: 'Patinaje', iceDensity: 0.34, enemies: ['chaser', 'skater'], speed: 3.9, heatMax: 3, power: 2, refreeze: 12 },
  { name: 'Grietas', iceDensity: 0.38, enemies: ['chaser', 'skater', 'cracker'], speed: 4.2, heatMax: 4, power: 3, refreeze: 11 },
  { name: 'Cuarto frío', iceDensity: 0.42, enemies: ['chaser', 'skater', 'cracker', 'chaser'], speed: 4.5, heatMax: 4, power: 3, refreeze: 10 },
  { name: 'Calor muerto', iceDensity: 0.46, enemies: ['chaser', 'skater', 'cracker', 'skater', 'chaser'], speed: 4.8, heatMax: 5, power: 4, refreeze: 9 },
];
function levelDef(n) {
  if (n < LEVELS.length) return LEVELS[n];
  const b = LEVELS[LEVELS.length - 1];
  return Object.assign({}, b, { name: 'Calor muerto ' + (n - LEVELS.length + 2), speed: Math.min(6.2, b.speed + 0.25 * (n - LEVELS.length + 1)), refreeze: Math.max(6, b.refreeze - (n - LEVELS.length + 1)) });
}

/* ---- Generación del laberinto: simétrico, siempre conexo ---- */
function genMaze(seed, def) {
  const r = rng(seed);
  const g = [];
  for (let y = 0; y < H; y++) { g.push(new Array(W).fill(T.ICE)); }
  for (let x = 0; x < W; x++) { g[0][x] = T.WALL; g[H - 1][x] = T.WALL; }
  for (let y = 0; y < H; y++) { g[y][0] = T.WALL; g[y][W - 1] = T.WALL; }
  // Esqueleto de pasillos garantizado (árbol perfecto en celdas impares) y luego bucles
  const cw = (W - 1) / 2, ch = (H - 1) / 2; // 10 x 7 celdas
  const seen = new Set();
  const stack = [[0, 0]]; seen.add('0,0'); g[1][1] = T.FLOOR;
  while (stack.length) {
    const [cx, cy] = stack[stack.length - 1];
    const nb = [];
    for (const d of DIR_LIST) {
      const nx = cx + DIRS[d][0], ny = cy + DIRS[d][1];
      if (nx >= 0 && ny >= 0 && nx < cw && ny < ch && !seen.has(nx + ',' + ny)) nb.push([nx, ny]);
    }
    if (!nb.length) { stack.pop(); continue; }
    const [nx, ny] = nb[r.int(nb.length)];
    g[cy * 2 + 1 + (ny - cy)][cx * 2 + 1 + (nx - cx)] = T.FLOOR;
    g[ny * 2 + 1][nx * 2 + 1] = T.FLOOR;
    seen.add(nx + ',' + ny); stack.push([nx, ny]);
  }
  // Bucles: abrir segmentos de hielo (más abiertos cuanto menor la densidad)
  const openChance = 0.62 - def.iceDensity * 0.75;
  for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) {
    if (g[y][x] === T.ICE && ((x % 2 === 1) !== (y % 2 === 1)) && r() < openChance) g[y][x] = T.FLOOR;
  }
  // Pilares: los cruces pares quedan como roca en unos pocos sitios (identidad visual)
  for (let y = 2; y < H - 1; y += 2) for (let x = 2; x < W - 1; x += 2) {
    g[y][x] = r() < 0.35 ? T.WALL : T.ICE;
  }
  // Simetría izquierda-derecha (laberinto de arcade)
  const mid = (W - 1) / 2;
  for (let y = 1; y < H - 1; y++) for (let x = 1; x < mid; x++) g[y][W - 1 - x] = g[y][x];
  return g;
}

/* ---- Estado de partida ---- */
function newGame(opts) {
  opts = opts || {};
  const G = {
    seed: opts.seed != null ? opts.seed : 1234,
    level: opts.level || 0,
    score: opts.score || 0,
    lives: opts.lives != null ? opts.lives : 3,
    tick: 0, time: 0,
    events: [], // para el dibujado y el audio
    over: false, won: false,
  };
  startLevel(G);
  return G;
}

function startLevel(G) {
  const def = levelDef(G.level);
  G.def = def;
  G.rand = rng(G.seed + G.level * 7919);
  G.grid = genMaze(G.seed + G.level * 104729, def);
  G.water = []; // nivel de agua por casilla (0..1)
  G.thaw = []; // temporizador de recongelado de huecos abiertos por calor (ms)
  for (let y = 0; y < H; y++) { G.water.push(new Float32Array(W)); G.thaw.push(new Float32Array(W)); }
  G.embers = []; // mapa de brasas
  for (let y = 0; y < H; y++) G.embers.push(new Uint8Array(W));
  G.emberTotal = 0; G.emberLeft = 0;
  for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) {
    if (G.grid[y][x] === T.FLOOR) { G.embers[y][x] = 1; G.emberTotal++; }
  }
  // Jugador al centro inferior; despejar una cruz de arranque
  const px = 1, py = H - 2;
  G.grid[py][px] = T.FLOOR; G.embers[py][px] = 0;
  G.player = { x: px, y: py, fx: px, fy: py, dir: 'right', want: 'right', t: 0, moving: false, heat: 0, dead: 0, inv: 0 };
  // Brasas grandes (power-ups) en rincones lejanos
  G.powers = [];
  const spots = [[W - 2, 1], [1, 1], [W - 2, H - 2], [(W >> 1) | 1, (H >> 1) | 1], [W - 2, (H >> 1) | 1], [1, (H >> 1) | 1]];
  for (let i = 0; i < def.power && i < spots.length; i++) {
    const [sx, sy] = spots[i];
    if (G.grid[sy][sx] !== T.FLOOR) { G.grid[sy][sx] = T.FLOOR; }
    if (!(sx === px && sy === py)) { G.powers.push({ x: sx, y: sy }); if (G.embers[sy][sx]) { G.embers[sy][sx] = 0; G.emberTotal--; } }
  }
  // Conectar cualquier suelo aislado al mayor componente (red de seguridad)
  ensureConnected(G);
  G.emberLeft = 0;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (G.embers[y][x]) G.emberLeft++;
  G.emberTotal = G.emberLeft;
  // Enemigos
  G.enemies = [];
  const corners = [[W - 2, 1], [W - 2, H - 2], [1, 1], [(W >> 1) | 1, 1], [(W >> 1) | 1, H - 2]];
  def.enemies.forEach((kind, i) => {
    const [ex, ey] = corners[i % corners.length];
    if (G.grid[ey][ex] !== T.FLOOR) G.grid[ey][ex] = T.FLOOR;
    G.enemies.push({ kind, x: ex, y: ey, fx: ex, fy: ey, dir: 'left', t: 0, moving: false, state: 'live', stun: 0, scared: 0, frozen: 0, stuck: 0, lastPos: ex + ',' + ey, home: [ex, ey], id: i, respawn: 0, crackCd: 5 + i * 2 });
  });
  G.powerTimer = 0;
  G.ready = 1.4; // cuenta atrás de "preparado"
  ensureConnected(G);
}

/* Marca el suelo alcanzable desde el jugador; lo que quede aislado se abre con un muro derretido mínimo */
function reachable(G, sx, sy) {
  const seen = new Uint8Array(W * H); const q = [[sx, sy]]; seen[sy * W + sx] = 1;
  while (q.length) {
    const [x, y] = q.shift();
    for (const d of DIR_LIST) {
      const nx = x + DIRS[d][0], ny = y + DIRS[d][1];
      if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
      if (G.grid[ny][nx] !== T.FLOOR || seen[ny * W + nx]) continue;
      seen[ny * W + nx] = 1; q.push([nx, ny]);
    }
  }
  return seen;
}
function ensureConnected(G) {
  // Une todas las zonas de suelo con la del jugador abriendo el camino de hielo más corto
  for (let guard = 0; guard < 80; guard++) {
    const seen = reachable(G, 1, H - 2);
    let anyLost = false;
    for (let y = 1; y < H - 1 && !anyLost; y++) for (let x = 1; x < W - 1; x++) if (G.grid[y][x] === T.FLOOR && !seen[y * W + x]) { anyLost = true; break; }
    if (!anyLost) return;
    // BFS multi-origen desde el suelo alcanzable, atravesando hielo, hasta tocar suelo aislado
    const prev = new Int16Array(W * H).fill(-2); const q = [];
    for (let i = 0; i < W * H; i++) if (seen[i]) { prev[i] = -1; q.push(i); }
    let hit = -1;
    while (q.length && hit < 0) {
      const c = q.shift(); const x = c % W, y = (c / W) | 0;
      for (const d of DIR_LIST) {
        const nx = x + DIRS[d][0], ny = y + DIRS[d][1];
        if (nx < 1 || ny < 1 || nx >= W - 1 || ny >= H - 1) continue;
        const n = ny * W + nx; if (prev[n] !== -2) continue;
        const t = G.grid[ny][nx]; if (t === T.WALL) continue;
        prev[n] = c;
        if (t === T.FLOOR) { hit = n; break; }
        q.push(n);
      }
    }
    if (hit < 0) return; // no debería ocurrir
    let c = prev[hit];
    while (c >= 0 && prev[c] !== -1) { const x = c % W, y = (c / W) | 0; if (G.grid[y][x] === T.ICE) G.grid[y][x] = T.FLOOR; c = prev[c]; }
  }
}

/* ---- Utilidades de movimiento ---- */
function passable(G, x, y, forEnemy) {
  if (x < 0 || y < 0 || x >= W || y >= H) return false;
  return G.grid[y][x] === T.FLOOR;
}
function waterAt(G, x, y) { return G.water[y] ? G.water[y][x] : 0; }
function bfs(G, sx, sy, tx, ty) {
  // Devuelve la primera dirección del camino más corto, o null
  if (sx === tx && sy === ty) return null;
  const prev = new Int16Array(W * H).fill(-1); const q = [sy * W + sx]; prev[sy * W + sx] = sy * W + sx;
  while (q.length) {
    const c = q.shift(); const x = c % W, y = (c / W) | 0;
    if (x === tx && y === ty) break;
    for (const d of DIR_LIST) {
      const nx = x + DIRS[d][0], ny = y + DIRS[d][1];
      if (!passable(G, nx, ny)) continue;
      const n = ny * W + nx; if (prev[n] !== -1) continue;
      prev[n] = c; q.push(n);
    }
  }
  const goal = ty * W + tx; if (prev[goal] === -1) return null;
  let c = goal;
  while (prev[c] !== sy * W + sx) c = prev[c];
  const cx = c % W, cy = (c / W) | 0;
  for (const d of DIR_LIST) if (sx + DIRS[d][0] === cx && sy + DIRS[d][1] === cy) return d;
  return null;
}
function bfsDist(G, sx, sy) {
  const dist = new Int16Array(W * H).fill(-1); const q = [sy * W + sx]; dist[sy * W + sx] = 0;
  while (q.length) {
    const c = q.shift(); const x = c % W, y = (c / W) | 0;
    for (const d of DIR_LIST) {
      const nx = x + DIRS[d][0], ny = y + DIRS[d][1];
      if (!passable(G, nx, ny)) continue;
      const n = ny * W + nx; if (dist[n] !== -1) continue;
      dist[n] = dist[c] + 1; q.push(n);
    }
  }
  return dist;
}
