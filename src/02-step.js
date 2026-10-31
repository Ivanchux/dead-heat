/* ================= PASO DE SIMULACIÓN ================= */
const PLAYER_SPEED = 5.0;
const SCORE = { ember: 10, power: 50, eat: 200, evap: 400, clear: 500, life: 100, bomb: 300 };
const FUSE = 2.2, FLAME = 0.55;

function ev(G, type, x, y, extra) { G.events.push(Object.assign({ type, x, y }, extra || {})); }

function targetOf(e) { const d = DIRS[e.dir]; return [e.x + d[0], e.y + d[1]]; }
function updatePos(e) { const d = DIRS[e.dir]; e.fx = e.x + (e.moving ? d[0] * e.t : 0); e.fy = e.y + (e.moving ? d[1] * e.t : 0); }

function advance(G, e, speed, dt, onArrive) {
  if (!e.moving) return;
  e.t += speed * dt;
  while (e.t >= 1) {
    const d = DIRS[e.dir];
    e.x += d[0]; e.y += d[1]; e.t -= 1; e.moving = false;
    if (onArrive) onArrive(e);
    if (!e.moving && e.t > 0) { // sin nuevo movimiento: descartar el sobrante
      e.t = 0; break;
    }
  }
  updatePos(e);
}

function canFreeze(G, x, y) {
  if (G.grid[y][x] !== T.FLOOR) return false;
  if (G.embers[y][x]) return false;
  for (const p of G.powers) if (p.x === x && p.y === y) return false;
  const occupy = e => {
    if (e.x === x && e.y === y) return true;
    if (e.moving) { const t = targetOf(e); if (t[0] === x && t[1] === y) return true; }
    return false;
  };
  if (occupy(G.player)) return false;
  for (const e of G.enemies) if (e.state === 'live' && occupy(e)) return false;
  // conectividad: todo el suelo restante debe seguir siendo alcanzable desde el jugador
  G.grid[y][x] = T.ICE;
  const p = G.player;
  const seen = reachable(G, p.x, p.y);
  let ok = true;
  for (let yy = 1; yy < H - 1 && ok; yy++) for (let xx = 1; xx < W - 1; xx++) {
    if (G.grid[yy][xx] === T.FLOOR && !seen[yy * W + xx]) { ok = false; break; }
  }
  G.grid[y][x] = T.FLOOR;
  return ok;
}

function gridChanged(G) { G.ver = (G.ver || 0) + 1; G.pdistKey = null; }

/* ---- Calor: derretir hielo ---- */
function release(G) {
  const p = G.player;
  if (p.dead > 0 || G.ready > 0 || p.heat < 1) { if (p.heat < 1) ev(G, 'nope', p.x, p.y); return false; }
  const d = DIRS[p.dir];
  let tx = -1, ty = -1;
  for (let i = 1; i <= 2; i++) {
    const x = p.x + d[0] * i, y = p.y + d[1] * i;
    if (x < 0 || y < 0 || x >= W || y >= H) break;
    if (G.grid[y][x] === T.WALL) break;
    if (G.grid[y][x] === T.ICE) { tx = x; ty = y; break; }
  }
  const cx = tx >= 0 ? tx : p.x + d[0], cy = ty >= 0 ? ty : p.y + d[1];
  if (tx < 0 && (cx < 1 || cy < 1 || cx >= W - 1 || cy >= H - 1 || G.grid[cy][cx] === T.WALL)) { ev(G, 'nope', p.x, p.y); return false; }
  p.heat -= 1;
  let melted = 0;
  const cells = [[cx, cy], [cx + 1, cy], [cx - 1, cy], [cx, cy + 1], [cx, cy - 1]];
  for (const [x, y] of cells) {
    if (x < 1 || y < 1 || x >= W - 1 || y >= H - 1) continue;
    if (G.grid[y][x] === T.ICE) { G.grid[y][x] = T.FLOOR; G.water[y][x] = 1.5; G.thaw[y][x] = 0; melted++; ev(G, 'melt', x, y); }
  }
  gridChanged(G);
  ev(G, 'release', cx, cy, { melted });
  // Enemigos tocados por el calor: sobre agua se evaporan, en seco se aturden
  for (const e of G.enemies) {
    if (e.state !== 'live') continue;
    if (Math.abs(e.x - cx) <= 1 && Math.abs(e.y - cy) <= 1) {
      if (G.water[e.y][e.x] > 0.25 || e.frozen > 0) { e.state = 'dead'; e.respawn = 6; G.score += SCORE.evap; ev(G, 'evap', e.x, e.y); }
      else { e.stun = 2.5; ev(G, 'stun', e.x, e.y); }
    }
  }
  return true;
}

/* ---- Bombas de calor (modo bombas) ---- */
function nearestCell(e) { return e.moving && e.t >= 0.5 ? [e.x + DIRS[e.dir][0], e.y + DIRS[e.dir][1]] : [e.x, e.y]; }
function placeBomb(G) {
  const p = G.player;
  if (p.dead > 0 || G.ready > 0) return false;
  const [x, y] = nearestCell(p);
  if (G.grid[y][x] !== T.FLOOR || G.bombs.some(b => b.x === x && b.y === y) || G.bombs.length >= p.maxBombs) { ev(G, 'nope', p.x, p.y); return false; }
  G.bombs.push({ x, y, t: FUSE, range: p.range, ghost: true });
  ev(G, 'bomb', x, y);
  return true;
}
function explodeBomb(G, b) {
  G.bombs.splice(G.bombs.indexOf(b), 1);
  ev(G, 'boom', b.x, b.y);
  G.flames.push({ x: b.x, y: b.y, t: FLAME });
  for (const d of DIR_LIST) {
    for (let i = 1; i <= b.range; i++) {
      const x = b.x + DIRS[d][0] * i, y = b.y + DIRS[d][1] * i;
      if (x < 0 || y < 0 || x >= W || y >= H || G.grid[y][x] === T.WALL) break;
      G.flames.push({ x, y, t: FLAME });
      const other = G.bombs.find(o => o.x === x && o.y === y); if (other) other.t = Math.min(other.t, 0.06);
      if (G.grid[y][x] === T.ICE) {
        G.grid[y][x] = T.FLOOR; gridChanged(G); ev(G, 'melt', x, y);
        if (G.rand() < 0.22) { const r = G.rand(); G.items.push({ x, y, kind: r < 0.4 ? 'range' : r < 0.8 ? 'bomb' : 'speed' }); }
        break;
      }
    }
  }
}
function stepBombs(G, dt) {
  const p = G.player;
  for (const b of G.bombs.slice()) {
    b.t -= dt;
    if (b.ghost) { const [x, y] = nearestCell(p); if (p.dead > 0 || x !== b.x || y !== b.y) b.ghost = false; }
    if (b.t <= 0 && G.bombs.includes(b)) explodeBomb(G, b);
  }
  for (let i = G.flames.length - 1; i >= 0; i--) { G.flames[i].t -= dt; if (G.flames[i].t <= 0) G.flames.splice(i, 1); }
  if (!G.flames.length) return;
  const hot = new Set(G.flames.map(f => f.x + ',' + f.y));
  for (const e of G.enemies) {
    if (e.state !== 'live') continue;
    const [x, y] = nearestCell(e);
    if (hot.has(x + ',' + y)) { e.state = 'dead'; e.respawn = 1e9; G.score += SCORE.bomb; ev(G, 'bkill', e.x, e.y, { pts: SCORE.bomb }); }
  }
  if (p.dead <= 0 && p.inv <= 0) { const [x, y] = nearestCell(p); if (hot.has(x + ',' + y)) killPlayer(G); }
}

/* ---- Agua: flujo, evaporación y recongelado ---- */
function stepWater(G) {
  const def = G.def;
  const nw = [];
  for (let y = 0; y < H; y++) nw.push(Float32Array.from(G.water[y]));
  for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) {
    const c = G.water[y][x];
    if (c <= 0.02 || G.grid[y][x] !== T.FLOOR) continue;
    for (const d of DIR_LIST) {
      const nx = x + DIRS[d][0], ny = y + DIRS[d][1];
      if (G.grid[ny][nx] !== T.FLOOR) continue;
      const diff = c - G.water[ny][nx];
      if (diff > 0.04) { const f = diff * 0.2; nw[y][x] -= f; nw[ny][nx] += f; }
    }
  }
  for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) {
    let v = nw[y][x];
    if (G.grid[y][x] !== T.FLOOR) { v = 0; }
    v -= 0.0025; if (v < 0.02) v = 0;
    G.water[y][x] = v;
    if (v > 0.1) {
      G.thaw[y][x] += 0.1;
      if (G.thaw[y][x] >= def.refreeze && canFreeze(G, x, y)) {
        // ¿atrapa a un enemigo encima? entonces lo congela
        G.grid[y][x] = T.ICE; G.water[y][x] = 0; G.thaw[y][x] = 0; gridChanged(G);
        ev(G, 'freeze', x, y);
      }
    } else G.thaw[y][x] = 0;
  }
}

/* ---- IA de enemigos ---- */
function neighborsOpen(G, e) {
  const out = [];
  for (const d of DIR_LIST) { const nx = e.x + DIRS[d][0], ny = e.y + DIRS[d][1]; if (passable(G, nx, ny)) out.push(d); }
  return out;
}
function pdist(G) {
  const p = G.player; const key = G.ver + ':' + p.x + ',' + p.y;
  if (G.pdistKey !== key) { G.pdistMap = bfsDist(G, p.x, p.y); G.pdistKey = key; }
  return G.pdistMap;
}
function pickMin(G, e, opts, score) {
  let best = null, bs = Infinity;
  for (const d of opts) { const s = score(d) + G.rand() * 0.01; if (s < bs) { bs = s; best = d; } }
  return best;
}
function enemyChoose(G, e) {
  const opts = neighborsOpen(G, e); if (!opts.length) return null;
  const noRev = opts.filter(d => d !== OPP[e.dir]);
  const pd = pdist(G);
  const dist = d => { const v = pd[(e.y + DIRS[d][1]) * W + e.x + DIRS[d][0]]; return v < 0 ? 999 : v; };
  const scared = G.powerTimer > 0;
  if (e.kind === 'chaser') {
    if (scared) return pickMin(G, e, opts, d => -dist(d));
    const scatter = (Math.floor(G.time / 9) % 3 === 2);
    if (scatter) { const nd = bfs(G, e.x, e.y, e.home[0], e.home[1]); return nd || noRev[0] || opts[0]; }
    return pickMin(G, e, opts, dist);
  }
  if (e.kind === 'skater') {
    if (scared) return pickMin(G, e, opts, d => -dist(d));
    const fwd = e.dir && opts.includes(e.dir) ? e.dir : null;
    if (e.sliding && fwd) return fwd; // sigue deslizando hasta chocar
    // choca: elegir el eje que acorta la distancia al jugador y salir disparado
    e.sliding = true;
    const cands = noRev.length ? noRev : opts;
    return pickMin(G, e, cands, d => dist(d));
  }
  if (e.kind === 'ambush' || e.kind === 'shy' || e.kind === 'wander') {
    const scatter = (e.kind !== 'wander') && G.mode === 'clasico' && (Math.floor(G.time / 9) % 3 === 2);
    if (scared) return pickMin(G, e, opts, d => -dist(d));
    const cands = noRev.length ? noRev : opts;
    if (e.kind === 'wander') return cands[G.rand.int(cands.length)];
    if (scatter) { const nd = bfs(G, e.x, e.y, e.home[0], e.home[1]); return nd || cands[0]; }
    if (e.kind === 'ambush') { // apunta a cuatro casillas por delante del jugador
      const p = G.player, dd = DIRS[p.dir]; let tx = p.x, ty = p.y;
      for (let i = 0; i < 4; i++) { if (passable(G, tx + dd[0], ty + dd[1])) { tx += dd[0]; ty += dd[1]; } else break; }
      const dm = bfsDist(G, tx, ty);
      return pickMin(G, e, cands, d => { const v = dm[(e.y + DIRS[d][1]) * W + e.x + DIRS[d][0]]; return v < 0 ? 999 : v; });
    }
    // tímido: persigue de lejos, huye a su rincón cuando está cerca
    if (pd[e.y * W + e.x] > 6) return pickMin(G, e, cands, dist);
    const nd = bfs(G, e.x, e.y, e.home[0], e.home[1]); return nd || cands[0];
  }
  // cracker: merodea a distancia media y prepara trampas
  if (scared) return pickMin(G, e, opts, d => -dist(d));
  const cands = noRev.length ? noRev : opts;
  const want = 5; // distancia preferida
  return pickMin(G, e, cands, d => Math.abs(dist(d) - want) + G.rand() * 1.5);
}
function enemySpeed(G, e) {
  let s = G.def.speed * (DIFF_DEF[G.diff] || DIFF_DEF.normal).speed;
  if (e.kind === 'skater') s *= e.sliding ? 1.2 : 0.9;
  if (e.kind === 'cracker') s *= 0.85;
  if (G.powerTimer > 0) s *= 0.65;
  if (G.water[e.y] && G.water[e.y][e.x] > 0.3) s *= (e.kind === 'skater' ? 1.5 : 0.6);
  return s;
}

function stepEnemy(G, e, dt) {
  if (e.state === 'dead') {
    e.respawn -= dt;
    if (e.respawn <= 0) { e.state = 'live'; e.x = e.home[0]; e.y = e.home[1]; e.fx = e.x; e.fy = e.y; e.moving = false; e.t = 0; e.stun = 1; e.sliding = false; ev(G, 'respawn', e.x, e.y); }
    return;
  }
  if (e.frozen > 0) { e.frozen -= dt; updatePos(e); return; }
  if (e.stun > 0) { e.stun -= dt; updatePos(e); return; }
  if (e.kind === 'cracker') {
    e.crackCd -= dt;
    if (e.crackCd <= 0 && G.ready <= 0 && G.player.dead <= 0) {
      e.crackCd = 6 + G.rand() * 3;
      // elegir una casilla cerca del jugador (a 2-4 pasos) para agrietar
      const pd = pdist(G); const cand = [];
      for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) {
        const dd = pd[y * W + x];
        if (dd >= 2 && dd <= 4 && G.grid[y][x] === T.FLOOR && !G.embers[y][x]) cand.push([x, y]);
      }
      if (cand.length) { const [cx, cy] = cand[G.rand.int(cand.length)]; G.cracks.push({ x: cx, y: cy, t: 1.3 }); ev(G, 'crack', cx, cy); }
    }
  }
  if (!e.moving) {
    const d = enemyChoose(G, e);
    if (!d) return;
    if (d !== e.dir && e.kind === 'skater' && !neighborsOpen(G, e).includes(e.dir)) e.sliding = true;
    e.dir = d; e.moving = true; e.t = 0;
  }
  advance(G, e, enemySpeed(G, e), dt, en => {
    // al llegar: decidir en seguida para no perder fracción
    const d = enemyChoose(G, en);
    if (d) { en.dir = d; en.moving = true; }
  });
  // anti-bloqueo: seguimiento de quietud
  const key = e.x + ',' + e.y;
  if (key === e.lastPos && !e.moving) e.stuck += dt; else { e.stuck = 0; e.lastPos = key; }
}

function stepCracks(G, dt) {
  for (let i = G.cracks.length - 1; i >= 0; i--) {
    const c = G.cracks[i]; c.t -= dt;
    if (c.t <= 0) {
      G.cracks.splice(i, 1);
      if (canFreeze(G, c.x, c.y)) { G.grid[c.y][c.x] = T.ICE; G.water[c.y][c.x] = 0; gridChanged(G); ev(G, 'freeze', c.x, c.y); }
    }
  }
}

/* ---- Jugador ---- */
function stepPlayer(G, input, dt) {
  const p = G.player;
  if (p.dead > 0) return;
  if (input && input.dir) p.want = input.dir;
  if (p.moving && p.want === OPP[p.dir]) { // dar la vuelta a media casilla
    const tx = p.x + DIRS[p.dir][0], ty = p.y + DIRS[p.dir][1];
    p.x = tx; p.y = ty; p.dir = p.want; p.t = 1 - p.t;
  }
  const tryStart = () => {
    const w = p.want;
    if (passable(G, p.x + DIRS[w][0], p.y + DIRS[w][1])) { p.dir = w; p.moving = true; p.t = 0; return true; }
    if (passable(G, p.x + DIRS[p.dir][0], p.y + DIRS[p.dir][1])) { p.moving = true; p.t = 0; return true; }
    p.moving = false; return false;
  };
  if (!p.moving) tryStart();
  const water = G.water[p.y] ? G.water[p.y][p.x] : 0;
  const sp = PLAYER_SPEED * (1 + 0.12 * (p.speedUp || 0)) * (water > 0.3 ? 0.65 : 1);
  advance(G, p, sp, dt, pl => {
    // recoger
    if (G.embers[pl.y][pl.x]) {
      G.embers[pl.y][pl.x] = 0; G.emberLeft--; G.score += SCORE.ember; pl.acc = (pl.acc || 0) + 1;
      ev(G, 'ember', pl.x, pl.y);
      if (pl.acc >= 5) { pl.acc = 0; if (pl.heat < G.def.heatMax) { pl.heat++; ev(G, 'heat', pl.x, pl.y); } }
    }
    for (let i = G.powers.length - 1; i >= 0; i--) {
      const pw = G.powers[i];
      if (pw.x === pl.x && pw.y === pl.y) {
        G.powers.splice(i, 1); G.score += SCORE.power; G.powerTimer = 7; G.eatChain = 0;
        pl.heat = Math.min(G.def.heatMax, pl.heat + 1);
        ev(G, 'power', pl.x, pl.y);
      }
    }
    for (let i = G.items.length - 1; i >= 0; i--) {
      const it = G.items[i];
      if (it.x !== pl.x || it.y !== pl.y) continue;
      G.items.splice(i, 1); G.score += 50;
      if (it.kind === 'range') pl.range = Math.min(6, pl.range + 1);
      else if (it.kind === 'bomb') pl.maxBombs = Math.min(5, pl.maxBombs + 1);
      else pl.speedUp = Math.min(4, (pl.speedUp || 0) + 1);
      ev(G, 'item', pl.x, pl.y, { kind: it.kind });
    }
    tryStart();
  });
  updatePos(p);
}

/* ---- Bucle principal ---- */
function killPlayer(G) {
  const p = G.player;
  p.dead = 1.6; ev(G, 'die', p.fx, p.fy);
  G.lives--;
}
function respawnAll(G) {
  const p = G.player;
  p.x = 1; p.y = H - 2; p.fx = p.x; p.fy = p.y; p.moving = false; p.t = 0; p.dir = 'right'; p.want = 'right'; p.inv = 2;
  // si el hueco de salida se ha helado, abrirlo
  G.grid[p.y][p.x] = T.FLOOR;
  if (G.mode === 'bombas') { G.bombs.length = 0; G.flames.length = 0; for (const e of G.enemies) if (e.state === 'live') e.stun = Math.max(e.stun, 1); }
  else for (const e of G.enemies) { if (e.state === 'live') { e.x = e.home[0]; e.y = e.home[1]; e.fx = e.x; e.fy = e.y; e.moving = false; e.t = 0; e.stun = 1.2; e.sliding = false; } }
  G.cracks.length = 0; gridChanged(G); ensureConnected(G);
  G.ready = 1.2;
}

function step(G, input, dt) {
  G.events.length = 0;
  if (G.over) return;
  if (!G.cracks) G.cracks = [];
  if (G.ver == null) G.ver = 0;
  G.tick++;
  if (G.ready > 0) { G.ready -= dt; if (input && input.dir) G.player.want = input.dir; return; }
  G.time += dt;
  const p = G.player;
  if (p.dead > 0) {
    p.dead -= dt;
    if (p.dead <= 0) { if (G.lives < 0) { G.over = true; ev(G, 'gameover', p.x, p.y); } else respawnAll(G); }
    return;
  }
  if (p.inv > 0) p.inv -= dt;
  if (G.powerTimer > 0) { G.powerTimer -= dt; if (G.powerTimer <= 0) { G.powerTimer = 0; ev(G, 'powerend', 0, 0); } }
  if (input && input.act) { if (G.mode === 'bombas') placeBomb(G); else if (G.mode !== 'clasico') release(G); }
  stepPlayer(G, input, dt);
  if (G.mode === 'bombas') stepBombs(G, dt);
  G.waterAcc = (G.waterAcc || 0) + dt;
  while (G.waterAcc >= 0.1) { G.waterAcc -= 0.1; stepWater(G); }
  stepCracks(G, dt);
  for (const e of G.enemies) stepEnemy(G, e, dt);
  // congelar enemigos cuya casilla se ha helado bajo ellos es imposible (se evita en canFreeze);
  // pero el agua que se recongela a su lado los frena: quedan "fríos" si pisan agua que se hiela pronto
  for (const e of G.enemies) {
    if (e.state === 'live' && G.thaw[e.y] && G.thaw[e.y][e.x] > G.def.refreeze - 1.2 && G.water[e.y][e.x] > 0.1 && e.frozen <= 0) { e.frozen = 4; ev(G, 'chill', e.x, e.y); }
  }
  // colisiones
  for (const e of G.enemies) {
    if (e.state !== 'live') continue;
    const dx = e.fx - p.fx, dy = e.fy - p.fy;
    if (dx * dx + dy * dy < 0.38) {
      if (G.powerTimer > 0) {
        G.eatChain = (G.eatChain || 0) + 1;
        const pts = SCORE.eat * Math.pow(2, Math.min(3, G.eatChain - 1));
        G.score += pts; e.state = 'dead'; e.respawn = 5; ev(G, 'eat', e.x, e.y, { pts });
      } else if (e.frozen > 0) { /* inofensivo mientras está helado */ }
      else if (p.inv <= 0) { killPlayer(G); break; }
    }
  }
  // fin de nivel
  const done = G.mode === 'bombas' ? G.enemies.every(e => e.state === 'dead') && !G.flames.length : G.emberLeft <= 0;
  if (done && p.dead <= 0) {
    G.score += SCORE.clear + Math.max(0, G.lives) * SCORE.life;
    ev(G, 'levelclear', p.x, p.y);
    G.level++; G.won = G.level >= 999;
    const keep = { score: G.score, lives: G.lives, level: G.level, seed: G.seed, mode: G.mode, diff: G.diff, pstats: { maxBombs: p.maxBombs, range: p.range, speed: p.speedUp || 0 } };
    const evs = G.events.slice();
    startLevel(Object.assign(G, keep));
    G.events = evs; G.pdistKey = null; G.ver = 0; G.cracks = [];
  }
}
