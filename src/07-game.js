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
  const hiKey = m => (m === 'deshielo' ? 'hi' : 'hi.' + m);
  let modeSel = store.get('mode', 'deshielo'); if (MODES.indexOf(modeSel) < 0) modeSel = 'deshielo';
  hi = store.get(hiKey(modeSel), 0);
  function setMode(m) { modeSel = m; store.set('mode', m); hi = store.get(hiKey(m), 0); newAttract(); }
  if (store.get('muted', false)) Audio_.toggleMute();

  function newAttract() { attract = newGame({ seed: (Math.random() * 1e6) | 0, level: (Math.random() * 3) | 0, lives: 99, mode: modeSel }); attract.ready = 0.2; }
  function startGame(opts) {
    Audio_.init(); Audio_.startMusic(); Audio_.play('start');
    G = newGame(Object.assign({ seed: (Math.random() * 1e6) | 0, mode: modeSel }, opts || {}));
    if (G.mode !== modeSel) { modeSel = G.mode; hi = store.get(hiKey(modeSel), 0); }
    scene = 'play'; newRecord = false; Particles.list.length = 0; Particles.floaters.length = 0;
  }
  function finish() {
    if (G.score > hi) { hi = G.score; newRecord = true; store.set(hiKey(G.mode), hi); }
    scene = 'over';
  }
  function dangerLevel(S) {
    let m = 99; const p = S.player;
    for (const e of S.enemies) if (e.state === 'live') m = Math.min(m, Math.hypot(e.fx - p.fx, e.fy - p.fy));
    return (S.powerTimer > 0 ? 0.3 : 0) + Math.max(0, 1 - m / 7) * 0.7 + Math.min(0.2, S.level * 0.04);
  }

  function update(inp) {
    if (inp.mute) { const m = Audio_.toggleMute(); store.set('muted', m); syncTools(); }
    if (scene === 'title') {
      const md = inp.menuDir, ix = MODES.indexOf(modeSel);
      if (md === 'left' || md === 'up') { setMode(MODES[(ix + MODES.length - 1) % MODES.length]); Audio_.play('nope'); return; }
      if (md === 'right' || md === 'down') { setMode(MODES[(ix + 1) % MODES.length]); Audio_.play('nope'); return; }
      if (inp.confirm) { startGame(); return; }
      if (!attract || attract.over) newAttract();
      const lv = attract.level; step(attract, autoPilot(attract), FIXED); attract.events.length = 0;
      if (attract.level !== lv && attract.level > 4) newAttract();
      if (attract.mode === 'bombas' && attract.lives < 90) attract.lives = 99;
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
      if (G.level !== lvBefore) { if (G.score > hi) { hi = G.score; store.set(hiKey(G.mode), hi); } }
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
    const sh = REDUCE ? 0 : Particles.shake;
    c.save();
    if (sh > 0) c.translate(Math.round((Math.random() - 0.5) * sh * 6), Math.round((Math.random() - 0.5) * sh * 6));
    Render.world(c, S, time); Render.lights(c, S, time); Particles.draw(c); Particles.drawFloaters(c);
    c.restore();
    Render.hud(c, S, hi);
    Render.post(c, S);
    if (scene === 'title') {
      c.fillStyle = 'rgba(4,9,18,0.6)'; c.fillRect(0, HUD_H, VW, VH - HUD_H);
      const wob = Math.sin(time * 2) * 2;
      drawText(c, 'DEAD', VW / 2, 42 + wob, PAL.flame2, 7, 'center'); drawText(c, 'HEAT', VW / 2, 82 - wob, PAL.ice1, 7, 'center');
      const MD = { deshielo: ['EL LABERINTO SE DERRITE', 'BRASAS QUE DERRITEN EL HIELO'], clasico: ['COME BRASAS, ESQUIVA FANTASMAS', 'SIN HIELO Y SIN CALOR'], bombas: ['ROMPE EL HIELO CON BOMBAS DE CALOR', 'ELIMINA A TODOS LOS ENEMIGOS'] };
      drawText(c, '<  ' + MODE_NAMES[modeSel] + '  >', VW / 2, 128, PAL.flame2, 2, 'center');
      drawText(c, MD[modeSel][0], VW / 2, 146, PAL.ui, 1, 'center');
      drawText(c, MD[modeSel][1], VW / 2, 154, PAL.uiDim, 1, 'center');
      if (Math.floor(time * 2) % 2 === 0) drawText(c, Input.device === 'táctil' ? 'TOCA PARA JUGAR' : 'PULSA ESPACIO O ENTER', VW / 2, 176, PAL.uiHot, 1, 'center');
      drawText(c, 'MOVER: FLECHAS / WASD / STICK / DESLIZAR', VW / 2, 198, PAL.uiDim, 1, 'center');
      drawText(c, modeSel === 'bombas' ? 'BOMBA: ESPACIO / A / TOQUE' : modeSel === 'clasico' ? 'CAMBIAR MODO: IZQ / DER' : 'CALOR: ESPACIO / A / TOQUE', VW / 2, 206, PAL.uiDim, 1, 'center');
      if (modeSel !== 'clasico') drawText(c, 'CAMBIAR MODO: IZQ / DER', VW / 2, 215, PAL.uiDim, 1, 'center');
      drawText(c, 'RÉCORD ' + String(hi).padStart(6, '0'), VW / 2, 228, PAL.ice1, 1, 'center');
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
  /* sonido y pantalla completa (botones y tecla F; también dentro de un iframe, como en itch.io) */
  const root = document.documentElement, fsEl = () => document.fullscreenElement || document.webkitFullscreenElement || null;
  const fsCan = () => { try { return !!((document.fullscreenEnabled || document.webkitFullscreenEnabled) && (root.requestFullscreen || root.webkitRequestFullscreen)); } catch (e) { return false; } };
  function toggleFs() {
    if (!fsCan()) return;
    try { if (fsEl()) (document.exitFullscreen || document.webkitExitFullscreen).call(document); else { const r = (root.requestFullscreen || root.webkitRequestFullscreen).call(root); if (r && r.catch) r.catch(() => {}); } } catch (e) { }
  }
  function toggleMuteNow() { const m = Audio_.toggleMute(); store.set('muted', m); syncTools(); }
  function syncTools() { const b = document.getElementById('btn-mute'), f = document.getElementById('btn-fs'); if (b) { b.style.opacity = Audio_.muted ? 0.45 : 1; b.setAttribute('aria-pressed', String(!!Audio_.muted)); } if (f) f.hidden = !fsCan(); }
  document.getElementById('btn-mute').addEventListener('click', e => { toggleMuteNow(); e.currentTarget.blur(); });
  document.getElementById('btn-fs').addEventListener('click', e => { toggleFs(); e.currentTarget.blur(); });
  ['fullscreenchange', 'webkitfullscreenchange'].forEach(ev => document.addEventListener(ev, () => { syncTools(); fit(); }));
  addEventListener('keydown', e => { if (e.code === 'KeyF' && !e.ctrlKey && !e.metaKey && !e.altKey) { toggleFs(); e.preventDefault(); } });
  syncTools();
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
