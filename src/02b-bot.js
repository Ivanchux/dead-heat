/* ================= PILOTO AUTOMÁTICO (modo demo y pruebas) ================= */
function autoPilotMaze(G, impatient) {
  const p = G.player, out = { dir: null, act: false }, SP = PLAYER_SPEED;
  let sx = p.x, sy = p.y; if (p.moving) { sx = p.x + DIRS[p.dir][0]; sy = p.y + DIRS[p.dir][1]; } // planifica desde la casilla a la que llega
  const scared = G.powerTimer > 0;
  const et = new Float32Array(W * H).fill(1e9);
  for (const e of G.enemies) {
    if (e.state !== 'live' || e.frozen > 0 || e.stun > 0) continue;
    const dm = bfsDist(G, e.x, e.y), sp = G.def.speed * (e.kind === 'skater' ? 1.2 : 1);
    for (let i = 0; i < W * H; i++) if (dm[i] >= 0) { const t = dm[i] / sp; if (t < et[i]) et[i] = t; }
  }
  const isTarget = (x, y) => G.embers[y][x] || G.powers.some(pw => pw.x === x && pw.y === y);
  if (p.moving) { const tx = p.x + DIRS[p.dir][0], ty = p.y + DIRS[p.dir][1]; if (isTarget(tx, ty) && !(et[ty * W + tx] < (1 - p.t) / SP + 0.3)) { out.dir = p.dir; return out; } }
  const b = G._bot || (G._bot = { left: -1, t: 0 }); if (G.emberLeft !== b.left) { b.left = G.emberLeft; b.t = G.time; }
  const margin = (G.time - b.t > 12) ? -0.1 : 0.35;
  const dist = new Int16Array(W * H).fill(-1), first = new Array(W * H).fill(null), q = [[sx, sy]]; dist[sy * W + sx] = 0;
  let goal = null;
  while (q.length) {
    const [x, y] = q.shift();
    if (!(x === sx && y === sy) && isTarget(x, y)) { goal = [x, y]; break; }
    for (const d of DIR_LIST) {
      const nx = x + DIRS[d][0], ny = y + DIRS[d][1]; if (!passable(G, nx, ny)) continue;
      const n = ny * W + nx; if (dist[n] !== -1) continue;
      if (!scared && (dist[y * W + x] + 1) / SP + margin >= et[n]) continue;
      dist[n] = dist[y * W + x] + 1; first[n] = (x === sx && y === sy) ? d : first[y * W + x]; q.push([nx, ny]);
    }
  }
  if (goal) { out.dir = first[goal[1] * W + goal[0]]; return out; }
  let best = null, bs = -1e9;
  for (const d of DIR_LIST) { const nx = sx + DIRS[d][0], ny = sy + DIRS[d][1]; if (!passable(G, nx, ny)) continue; const s = et[ny * W + nx]; if (s > bs) { bs = s; best = d; } }
  out.dir = best;
  if (p.heat >= 1) for (const e of G.enemies) if (e.state === 'live' && Math.abs(e.x - p.x) + Math.abs(e.y - p.y) <= 2) out.act = true;
  return out;
}


/* Piloto de bombas: abre hielo y caza enemigos colocando bombas solo si hay escapatoria */
function blastCells(G, x, y, range) {
  const out = new Set([x + ',' + y]);
  for (const d of DIR_LIST) for (let i = 1; i <= range; i++) {
    const nx = x + DIRS[d][0] * i, ny = y + DIRS[d][1] * i;
    if (nx < 0 || ny < 0 || nx >= W || ny >= H || G.grid[ny][nx] === T.WALL) break;
    out.add(nx + ',' + ny);
    if (G.grid[ny][nx] === T.ICE) break;
  }
  return out;
}
function hardSet(G) { // casillas que no se pueden cruzar ya: llamas y zonas de bombas a punto de estallar
  const hard = new Set();
  for (const f of G.flames) hard.add(f.x + ',' + f.y);
  // tiempo efectivo de cada bomba, contando las explosiones en cadena
  const tt = new Map(G.bombs.map(b => [b, b.t]));
  for (let k = 0; k < G.bombs.length; k++) for (const b of G.bombs) {
    const blast = blastCells(G, b.x, b.y, b.range);
    for (const o of G.bombs) if (o !== b && blast.has(o.x + ',' + o.y) && tt.get(b) < tt.get(o)) tt.set(o, tt.get(b));
  }
  for (const b of G.bombs) if (tt.get(b) < 1.1) for (const c of blastCells(G, b.x, b.y, b.range)) hard.add(c);
  return hard;
}
function dangerSet(G) {
  const danger = new Set();
  for (const f of G.flames) danger.add(f.x + ',' + f.y);
  for (const b of G.bombs) for (const c of blastCells(G, b.x, b.y, b.range)) danger.add(c);
  return danger;
}
function escapeDir(G, sx, sy, danger, hard, maxSteps) {
  // BFS desde (sx,sy) hasta una casilla fuera de peligro; devuelve la primera dirección o null
  const seen = new Set([sx + ',' + sy]), q = [[sx, sy, null, 0]];
  while (q.length) {
    const [x, y, first, n] = q.shift();
    if (n > 0 && !danger.has(x + ',' + y)) return first || 'stay';
    if (n >= maxSteps) continue;
    for (const d of DIR_LIST) {
      const nx = x + DIRS[d][0], ny = y + DIRS[d][1], k = nx + ',' + ny;
      if (seen.has(k) || !passable(G, nx, ny) || (hard && hard.has(k))) continue;
      if (G.enemies.some(e => e.state === 'live' && e.x === nx && e.y === ny)) continue;
      seen.add(k); q.push([nx, ny, first || d, n + 1]);
    }
  }
  return null;
}
function mine0(G, p, x, y) { return G.bombs.length < p.maxBombs && !G.bombs.some(b => b.x === x && b.y === y); }
function autoPilotBombs(G) {
  const p = G.player, out = { dir: null, act: false };
  const [sx, sy] = nearestCell(p);
  const danger = dangerSet(G), hard = hardSet(G);
  // 1) si estoy en peligro, huir
  if (danger.has(sx + ',' + sy)) { const d = escapeDir(G, sx, sy, danger, hard, 8); if (d && d !== 'stay') out.dir = d; return out; }
  // 1b) enemigo cerca: soltar una bomba defensiva si hay escapatoria; si no, alejarse
  const eMaps = G.enemies.filter(e => e.state === 'live').map(e => bfsDist(G, e.x, e.y));
  const eDist = (x, y) => { let m = 99; for (const dm of eMaps) { const v = dm[y * W + x]; if (v >= 0 && v < m) m = v; } return m; };
  if (eDist(sx, sy) <= 3) {
    if (mine0(G, p, sx, sy) && !hard.has(sx + ',' + sy)) {
      const d2 = new Set([...danger, ...blastCells(G, sx, sy, p.range)]);
      const esc = escapeDir(G, sx, sy, d2, hard, 7);
      if (esc && esc !== 'stay') { out.act = true; out.dir = esc; return out; }
    }
    let best = null, bs = eDist(sx, sy);
    for (const d of DIR_LIST) {
      const nx = sx + DIRS[d][0], ny = sy + DIRS[d][1];
      if (!passable(G, nx, ny) || danger.has(nx + ',' + ny)) continue;
      const v = eDist(nx, ny); if (v > bs) { bs = v; best = d; }
    }
    if (best) { out.dir = best; return out; }
  }
  // 2) ¿merece la pena soltar una bomba aquí?
  const mine = G.bombs.length;
  if (mine < p.maxBombs && !G.bombs.some(b => b.x === sx && b.y === sy) && !hard.has(sx + ',' + sy)) {
    const blast = blastCells(G, sx, sy, p.range);
    let useful = false;
    for (const c of blast) { const [x, y] = c.split(',').map(Number); if (G.grid[y][x] === T.ICE) useful = true; }
    for (const e of G.enemies) if (e.state === 'live' && blast.has(e.x + ',' + e.y)) useful = true;
    if (useful) {
      const d2 = new Set([...danger, ...blast]);
      const esc = escapeDir(G, sx, sy, d2, hard, 7);
      if (esc && esc !== 'stay') { out.act = true; out.dir = esc; return out; }
    }
  }
  // 3) ir hacia la casilla libre más cercana desde la que una bomba sirva (junto a hielo o a un enemigo)
  const seen = new Set([sx + ',' + sy]), q = [[sx, sy, null]];
  const items = new Set(G.items.map(i => i.x + ',' + i.y));
  while (q.length) {
    const [x, y, first] = q.shift();
    if (first) {
      const k = x + ',' + y;
      if (items.has(k)) { out.dir = first; return out; }
      const blast = blastCells(G, x, y, p.range);
      let useful = false;
      for (const c of blast) { const [bx, by] = c.split(',').map(Number); if (G.grid[by][bx] === T.ICE) useful = true; }
      for (const e of G.enemies) if (e.state === 'live' && blast.has(e.x + ',' + e.y)) useful = true;
      if (useful && !danger.has(k)) { out.dir = first; return out; }
    }
    for (const d of DIR_LIST) {
      const nx = x + DIRS[d][0], ny = y + DIRS[d][1], k = nx + ',' + ny;
      if (seen.has(k) || !passable(G, nx, ny) || danger.has(k) || hard.has(k)) continue;
      if (G.enemies.some(e => e.state === 'live' && Math.abs(e.x - nx) + Math.abs(e.y - ny) <= 1)) continue;
      seen.add(k); q.push([nx, ny, first || d]);
    }
  }
  // sin objetivo: el simulador mantiene la última dirección, así que hay que elegir una casilla segura a propósito
  let best = null, bs = -1;
  for (const d of DIR_LIST) {
    const nx = sx + DIRS[d][0], ny = sy + DIRS[d][1];
    if (!passable(G, nx, ny) || danger.has(nx + ',' + ny)) continue;
    const sc = (d === OPP[p.dir] ? 2 : 1) + G.rand() * 0.1;
    if (sc > bs) { bs = sc; best = d; }
  }
  if (best) out.dir = best;
  else { // todo es peligroso: la salida menos mala (la que no sea llama)
    for (const d of DIR_LIST) { const nx = sx + DIRS[d][0], ny = sy + DIRS[d][1]; if (passable(G, nx, ny) && !hard.has(nx + ',' + ny)) { out.dir = d; break; } }
  }
  return out;
}
function autoPilot(G, impatient) { return G.mode === 'bombas' ? autoPilotBombs(G) : autoPilotMaze(G, impatient); }
