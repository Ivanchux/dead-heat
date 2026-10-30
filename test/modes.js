// Pruebas de los modos Clásico y Bombas en Node (sin navegador): laberintos, invariantes y determinismo
const fs = require('fs'), vm = require('vm');
const code = ['01-sim', '02-step', '02b-bot'].map(f => fs.readFileSync('src/' + f + '.js', 'utf8')).join('\n') +
  '\nthis.api={newGame,step,autoPilot,reachable,nearestCell,levelDef,genMaze,W,H,T,DIR_LIST,DIRS};';
const ctx = { console, Math }; vm.createContext(ctx); vm.runInContext(code, ctx);
const A = ctx.api, { W, H, T } = A;
let fails = 0; const fail = m => { fails++; console.log('FALLO:', m); };

// 1) Laberintos
let mazes = 0;
for (let seed = 1; seed <= 300; seed++) for (let lv = 0; lv < 7; lv++) {
  for (const mode of ['clasico', 'bombas']) {
    const G = A.newGame({ seed, level: lv, mode });
    mazes++;
    const seen = A.reachable(G, 1, H - 2);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const t = G.grid[y][x];
      if (mode === 'clasico') {
        if (t === T.ICE) fail('clásico con hielo ' + seed + '/' + lv);
        if (t === T.FLOOR && !seen[y * W + x]) fail('clásico: suelo aislado ' + seed + '/' + lv + ' en ' + x + ',' + y);
      } else {
        const border = x === 0 || y === 0 || x === W - 1 || y === H - 1;
        if (border && t !== T.WALL) fail('bombas: borde abierto');
        if (!border && x % 2 === 0 && y % 2 === 0 && t !== T.WALL) fail('bombas: pilar ausente en ' + x + ',' + y);
      }
    }
    if (mode === 'bombas') {
      for (const [x, y] of [[1, H - 2], [2, H - 2], [1, H - 3]]) if (G.grid[y][x] !== T.FLOOR) fail('bombas: salida cerrada ' + seed);
      for (const e of G.enemies) if (G.grid[e.y][e.x] !== T.FLOOR) fail('bombas: enemigo en casilla cerrada');
      // todo el hielo se puede romper hasta llegar a cualquier suelo: con el hielo como pasable, todo conecta
      const pass = []; for (let y = 0; y < H; y++) pass.push(G.grid[y].map(t => t !== T.WALL));
      const q = [[1, H - 2]], s2 = new Set(['1,' + (H - 2)]);
      while (q.length) { const [x, y] = q.shift(); for (const d of A.DIR_LIST) { const nx = x + A.DIRS[d][0], ny = y + A.DIRS[d][1]; if (nx < 0 || ny < 0 || nx >= W || ny >= H || !pass[ny][nx] || s2.has(nx + ',' + ny)) continue; s2.add(nx + ',' + ny); q.push([nx, ny]); } }
      for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) if (G.grid[y][x] !== T.WALL && !s2.has(x + ',' + y)) fail('bombas: celda inalcanzable ' + seed);
    }
  }
}
console.log('laberintos comprobados:', mazes);

// 2) Partidas con el piloto: invariantes en cada paso
const hash = G => { let h = 7; const mix = v => { h = (Math.imul(h, 31) + (v | 0)) | 0; }; mix(G.score); mix(G.lives); mix(G.level); mix(G.player.x * 100 + G.player.y); for (const e of G.enemies) mix(e.x * 100 + e.y + (e.state === 'dead' ? 1e4 : 0)); for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) mix(G.grid[y][x]); return h; };
const stats = { clasico: { pasos: 0, niveles: 0, comidas: 0 }, bombas: { pasos: 0, niveles: 0, bombas: 0, rotos: 0, kills: 0 } };
for (const mode of ['clasico', 'bombas']) for (let seed = 1; seed <= 12; seed++) {
  const G = A.newGame({ seed, mode, lives: 3 }); G.ready = 0; let prevIce = 0;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (G.grid[y][x] === T.ICE) prevIce++;
  for (let t = 0; t < 60 * 240 && !G.over; t++) {
    const inp = A.autoPilot(G);
    A.step(G, inp, 1 / 60);
    stats[mode].pasos++;
    const p = G.player;
    if (!Number.isFinite(p.fx) || !Number.isFinite(p.fy)) fail('posición no finita');
    if (G.grid[p.y][p.x] === T.WALL) fail(mode + ' jugador dentro de un muro ' + seed);
    for (const e of G.enemies) { if (!Number.isFinite(e.fx) || !Number.isFinite(e.fy)) fail('enemigo no finito'); if (e.state === 'live' && G.grid[e.y][e.x] === T.WALL) fail(mode + ' enemigo en muro ' + seed); }
    if (mode === 'clasico') { for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (G.grid[y][x] === T.ICE) { fail('clásico: apareció hielo'); y = H; break; } }
    if (mode === 'bombas') {
      if (G.bombs.length > G.player.maxBombs) fail('más bombas que las permitidas');
      for (let y = 2; y < H - 1; y += 2) for (let x = 2; x < W - 1; x += 2) if (G.grid[y][x] !== T.WALL) fail('pilar destruido');
      for (const ev of G.events) { if (ev.type === 'bomb') stats.bombas.bombas++; if (ev.type === 'melt') stats.bombas.rotos++; if (ev.type === 'bkill') stats.bombas.kills++; }
    }
    for (const ev of G.events) if (ev.type === 'levelclear') stats[mode].niveles++;
    if (mode === 'clasico') for (const ev of G.events) if (ev.type === 'ember') stats.clasico.comidas++;
  }
}
console.log('estadísticas del piloto:', JSON.stringify(stats));
if (stats.bombas.bombas < 50 || stats.bombas.rotos < 50 || stats.bombas.kills < 5) fail('el modo bombas no parece funcionar (bombas, bloques rotos o kills)');
if (stats.clasico.niveles < 1) fail('el piloto no ha completado ningún nivel clásico');

// 3) Determinismo
for (const mode of ['clasico', 'bombas', 'deshielo']) {
  const run = () => { const G = A.newGame({ seed: 77, mode, lives: 3 }); G.ready = 0; for (let t = 0; t < 60 * 60; t++) A.step(G, A.autoPilot(G), 1 / 60); return hash(G); };
  if (run() !== run()) fail(mode + ' no es determinista');
}
console.log(fails ? 'HAY FALLOS: ' + fails : 'modos: todo correcto');
process.exit(fails ? 1 : 0);
