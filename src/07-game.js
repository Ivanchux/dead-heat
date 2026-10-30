/* ================= PILOTO AUTOMÁTICO (modo demo y pruebas) ================= */
function autoPilot(G, impatient) {
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

/* ================= JUEGO: escenas, bucle, guardado ================= */
const Game = (() => {
  const cv = document.getElementById('c'), ctx = cv.getContext('2d');
  cv.width = VW; cv.height = VH; ctx.imageSmoothingEnabled = false;
  let scene = 'title', G = null, attract = null, hi = 0, newRecord = false, time = 0, acc = 0, last = 0, botMode = false, paused = false, menuIdx = 0;
  const FIXED = 1 / 60;
  const store = {
    get(k, d) { try { const v = localStorage.getItem('deadheat.' + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem('deadheat.' + k, JSON.stringify(v)); } catch (e) { } },
  };
  hi = store.get('hi', 0);
  if (store.get('muted', false)) Audio_.toggleMute();

  function newAttract() { attract = newGame({ seed: (Math.random() * 1e6) | 0, level: (Math.random() * 3) | 0, lives: 99 }); attract.ready = 0.2; }
  function startGame(opts) {
    Audio_.init(); Audio_.startMusic(); Audio_.play('start');
    G = newGame(Object.assign({ seed: (Math.random() * 1e6) | 0 }, opts || {}));
    scene = 'play'; newRecord = false; Particles.list.length = 0; Particles.floaters.length = 0;
  }
  function finish() {
    if (G.score > hi) { hi = G.score; newRecord = true; store.set('hi', hi); }
    scene = 'over';
  }
  function dangerLevel(S) {
    let m = 99; const p = S.player;
    for (const e of S.enemies) if (e.state === 'live') m = Math.min(m, Math.hypot(e.fx - p.fx, e.fy - p.fy));
    return (S.powerTimer > 0 ? 0.3 : 0) + Math.max(0, 1 - m / 7) * 0.7 + Math.min(0.2, S.level * 0.04);
  }

  function update(inp) {
    if (inp.mute) { const m = Audio_.toggleMute(); store.set('muted', m); }
    if (scene === 'title') {
      if (inp.confirm) { startGame(); return; }
      if (!attract || attract.over) newAttract();
      const lv = attract.level; step(attract, autoPilot(attract), FIXED); attract.events.length = 0;
      if (attract.level !== lv && attract.level > 4) newAttract();
      return;
    }
    if (scene === 'over') { if (inp.confirm) { scene = 'title'; newAttract(); } return; }
    if (scene === 'pause') { if (inp.pause || inp.confirm) { scene = 'play'; Audio_.startMusic(); } return; }
    if (scene === 'play') {
      if (inp.pause) { scene = 'pause'; return; }
      const input = botMode ? autoPilot(G, true) : { dir: inp.dir, act: inp.act };
      const lvBefore = G.level;
      step(G, input, FIXED);
      Render.processEvents(G);
      if (G.level !== lvBefore) { if (G.score > hi) { hi = G.score; store.set('hi', hi); } }
      Audio_.setIntensity(dangerLevel(G));
      if (G.over) finish();
    }
  }

  function panel(c, lines, y0) {
    c.fillStyle = 'rgba(4,9,18,0.72)'; c.fillRect(0, y0 - 8, VW, lines.length * 12 + 14);
    lines.forEach((l, i) => drawText(c, l[0], VW / 2, y0 + i * 12, l[1] || PAL.ui, l[2] || 1, 'center'));
  }

  function draw() {
    const c = ctx;
    c.fillStyle = PAL.bg; c.fillRect(0, 0, VW, VH);
    const S = scene === 'title' ? (attract || newAttract() || attract) : G;
    const sh = Particles.shake;
    c.save();
    if (sh > 0) c.translate(Math.round((Math.random() - 0.5) * sh * 6), Math.round((Math.random() - 0.5) * sh * 6));
    Render.world(c, S, time); Render.lights(c, S, time); Particles.draw(c); Particles.drawFloaters(c);
    c.restore();
    Render.hud(c, S, hi);
    Render.post(c, S);
    if (scene === 'title') {
      c.fillStyle = 'rgba(4,9,18,0.6)'; c.fillRect(0, HUD_H, VW, VH - HUD_H);
      const wob = Math.sin(time * 2) * 2;
      drawText(c, 'DEAD', VW / 2, 56 + wob, PAL.flame2, 7, 'center'); drawText(c, 'HEAT', VW / 2, 98 - wob, PAL.ice1, 7, 'center');
      drawText(c, 'EL LABERINTO SE DERRITE', VW / 2, 142, PAL.ui, 1, 'center');
      if (Math.floor(time * 2) % 2 === 0) drawText(c, Input.device === 'táctil' ? 'TOCA PARA JUGAR' : 'PULSA ESPACIO O ENTER', VW / 2, 168, PAL.uiHot, 1, 'center');
      drawText(c, 'MOVER: FLECHAS / WASD / STICK / DESLIZAR', VW / 2, 196, PAL.uiDim, 1, 'center');
      drawText(c, 'CALOR: ESPACIO / A / TOQUE', VW / 2, 206, PAL.uiDim, 1, 'center');
      drawText(c, 'RÉCORD ' + String(hi).padStart(6, '0'), VW / 2, 224, PAL.ice1, 1, 'center');
    } else if (scene === 'play') {
      if (G.ready > 0) panel(c, [['NIVEL ' + (G.level + 1), PAL.ice1, 2], [G.def.name, PAL.ui], ['PREPARADO', PAL.uiHot]], HUD_H + 92);
    } else if (scene === 'pause') {
      panel(c, [['PAUSA', PAL.ice1, 3], ['P / ESC PARA SEGUIR · M: SONIDO ' + (Audio_.muted ? 'OFF' : 'ON'), PAL.uiDim]], HUD_H + 92);
    } else if (scene === 'over') {
      panel(c, [['FIN DEL JUEGO', PAL.danger, 2], ['PUNTOS ' + G.score, PAL.ui, 1], [newRecord ? 'NUEVO RÉCORD' : 'RÉCORD ' + hi, PAL.uiHot], ['PULSA ESPACIO', PAL.uiDim]], HUD_H + 78);
    }
  }

  function frame(ts) {
    const dt = Math.min(0.1, (ts - last) / 1000 || 0); last = ts; time += dt; acc += dt;
    const inp = Input.poll();
    let n = 0;
    while (acc >= FIXED && n < 6) {
      update(n === 0 ? inp : { dir: inp.dir, act: false, confirm: false, pause: false, mute: false });
      acc -= FIXED; n++;
    }
    if (n === 6) acc = 0;
    Particles.update(dt);
    draw();
    requestAnimationFrame(frame);
  }

  function fit() {
    const sw = innerWidth, sh = innerHeight; let k = Math.min(sw / VW, sh / VH);
    k = k >= 2 ? Math.floor(k) : k;
    cv.style.width = Math.floor(VW * k) + 'px'; cv.style.height = Math.floor(VH * k) + 'px';
  }
  addEventListener('resize', fit); fit();
  Input.bindTouch(cv); cv.addEventListener('contextmenu', e => e.preventDefault());
  addEventListener('keydown', () => Audio_.init(), { once: false });
  addEventListener('touchstart', () => Audio_.init(), { passive: true });
  addEventListener('pointerdown', () => Audio_.init());
  document.addEventListener('visibilitychange', () => { if (document.hidden && scene === 'play') scene = 'pause'; });
  const qs = new URLSearchParams(location.search);
  if (qs.get('bot')) botMode = true;

  /* Interfaz para pruebas automáticas (no afecta al juego) */
  window.DH = {
    get scene() { return scene; }, get G() { return G || attract; }, get hi() { return hi; },
    start(o) { startGame(o); }, setBot(v) { botMode = !!v; },
    // avanza N pasos fijos sin depender de requestAnimationFrame y dibuja el último
    advance(n, opts) { opts = opts || {}; for (let i = 0; i < n; i++) { update(i === 0 && opts.inp ? opts.inp : { dir: null, act: false, confirm: false, pause: false, mute: false }); Particles.update(FIXED); time += FIXED; } draw(); },
    draw, scenes() { return scene; }, finish, autoPilot,
  };
  newAttract();
  requestAnimationFrame(frame);
  return { startGame };
})();
