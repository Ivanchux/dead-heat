/* ================= ENTRADA: teclado, mando y táctil (deslizar) ================= */
const Input = (() => {
  const KEYS = {
    ArrowUp: 'up', KeyW: 'up', KeyK: 'up', ArrowDown: 'down', KeyS: 'down', KeyJ: 'down',
    ArrowLeft: 'left', KeyA: 'left', KeyH: 'left', ArrowRight: 'right', KeyD: 'right', KeyL: 'right',
  };
  const held = []; // pila de direcciones pulsadas; manda la última
  let actEdge = false, confirmEdge = false, pauseEdge = false, muteEdge = false, menuDir = null;
  let padDir = null, touchDir = null, padPrev = {}, lastDevice = 'teclado';
  let virtual = null; // dirección inyectada (bots de prueba)
  let tapPos = null;  // último toque o clic, en coordenadas del juego (para los menús)

  function push(d) { const i = held.indexOf(d); if (i >= 0) held.splice(i, 1); held.push(d); }
  function pull(d) { const i = held.indexOf(d); if (i >= 0) held.splice(i, 1); }

  addEventListener('keydown', e => {
    if (e.repeat) { if (KEYS[e.code]) e.preventDefault(); return; }
    lastDevice = 'teclado';
    if (KEYS[e.code]) { push(KEYS[e.code]); menuDir = KEYS[e.code]; e.preventDefault(); }
    else if (e.code === 'Space' || e.code === 'KeyZ' || e.code === 'KeyX' || e.code === 'ShiftLeft') { actEdge = true; confirmEdge = true; e.preventDefault(); }
    else if (e.code === 'Enter') { confirmEdge = true; e.preventDefault(); }
    else if (e.code === 'KeyP' || e.code === 'Escape') { pauseEdge = true; e.preventDefault(); }
    else if (e.code === 'KeyM') { muteEdge = true; }
  });
  addEventListener('keyup', e => { if (KEYS[e.code]) pull(KEYS[e.code]); });
  addEventListener('blur', () => { held.length = 0; });

  /* ---- Táctil: deslizar = dirección, toque = calor ---- */
  let tx = 0, ty = 0, tStart = 0, tMoved = false, tId = null;
  function logic(el, cx, cy) { const r = el.getBoundingClientRect(); return [(cx - r.left) / r.width * VW, (cy - r.top) / r.height * VH]; }
  function bindTouch(el) {
    el.addEventListener('touchstart', e => {
      const t = e.changedTouches[0]; tId = t.identifier; tx = t.clientX; ty = t.clientY; tStart = performance.now(); tMoved = false; lastDevice = 'táctil';
      e.preventDefault();
    }, { passive: false });
    el.addEventListener('touchmove', e => {
      for (const t of e.changedTouches) {
        if (t.identifier !== tId) continue;
        const dx = t.clientX - tx, dy = t.clientY - ty;
        if (Math.hypot(dx, dy) > 22) {
          tMoved = true;
          touchDir = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up');
          menuDir = touchDir; tx = t.clientX; ty = t.clientY;
        }
      }
      e.preventDefault();
    }, { passive: false });
    const end = e => {
      for (const t of e.changedTouches) {
        if (t.identifier !== tId) continue;
        if (!tMoved && performance.now() - tStart < 350) { actEdge = true; confirmEdge = true; tapPos = logic(el, t.clientX, t.clientY); }
        tId = null; touchDir = null;
      }
      e.preventDefault();
    };
    el.addEventListener('touchend', end, { passive: false });
    el.addEventListener('touchcancel', end, { passive: false });
    el.addEventListener('mousedown', e => { confirmEdge = true; tapPos = logic(el, e.clientX, e.clientY); });
  }

  /* ---- Mando ---- */
  function pollPad() {
    const pads = navigator.getGamepads ? navigator.getGamepads() : [];
    let dir = null;
    for (const p of pads) {
      if (!p || !p.connected) continue;
      const b = i => p.buttons[i] && p.buttons[i].pressed;
      const ax = p.axes[0] || 0, ay = p.axes[1] || 0;
      if (b(12)) dir = 'up'; else if (b(13)) dir = 'down'; else if (b(14)) dir = 'left'; else if (b(15)) dir = 'right';
      else if (Math.hypot(ax, ay) > 0.55) dir = Math.abs(ax) > Math.abs(ay) ? (ax > 0 ? 'right' : 'left') : (ay > 0 ? 'down' : 'up');
      const edge = (k, i) => { const now = b(i); const was = padPrev[k]; padPrev[k] = now; return now && !was; };
      if (edge('a', 0) || edge('x', 2) || edge('rb', 5) || edge('rt', 7)) { actEdge = true; confirmEdge = true; lastDevice = 'mando'; }
      if (edge('b', 1)) { /* atrás */ }
      if (edge('start', 9)) { pauseEdge = true; lastDevice = 'mando'; }
      if (dir) lastDevice = 'mando';
      if (dir && dir !== padDir) menuDir = dir;
      break;
    }
    padDir = dir;
  }

  return {
    bindTouch,
    poll() {
      pollPad();
      let dir = virtual || padDir || touchDir || (held.length ? held[held.length - 1] : null);
      const out = { dir, act: actEdge, confirm: confirmEdge, pause: pauseEdge, mute: muteEdge, menuDir, tap: tapPos };
      actEdge = confirmEdge = pauseEdge = muteEdge = false; menuDir = null; tapPos = null;
      return out;
    },
    get device() { return lastDevice; },
    // para pruebas automáticas
    _virtual(d) { virtual = d; },
    _press(what) { if (what === 'act') { actEdge = true; confirmEdge = true; } if (what === 'confirm') confirmEdge = true; if (what === 'pause') pauseEdge = true; },
  };
})();
