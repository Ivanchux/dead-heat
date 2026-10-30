/* ================= DIBUJADO DEL MUNDO Y DEL HUD ================= */
const Render = (() => {
  const px = x => Math.round(x * TS), py = y => Math.round(HUD_H + y * TS);
  let vignette = null;
  function getVignette() {
    if (vignette) return vignette;
    vignette = document.createElement('canvas'); vignette.width = VW; vignette.height = VH;
    const c = vignette.getContext('2d');
    const g = c.createRadialGradient(VW / 2, VH / 2 + 8, VH * 0.35, VW / 2, VH / 2 + 8, VW * 0.62);
    g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(2,6,14,0.62)');
    c.fillStyle = g; c.fillRect(0, 0, VW, VH); return vignette;
  }

  /* ---- Eventos de la simulación -> partículas, sonido y temblor ---- */
  function processEvents(G) {
    for (const e of G.events) {
      const cx = e.x * TS + TS / 2, cy = HUD_H + e.y * TS + TS / 2;
      switch (e.type) {
        case 'ember': Particles.burst(2, cx, cy, { c: [PAL.ember, PAL.emberHi], s0: 8, s1: 20, l0: 0.15, l1: 0.2 }); Audio_.play('ember', e.x); break;
        case 'heat': Particles.burst(12, cx, cy, { c: [PAL.flame2, PAL.flame3], s0: 20, s1: 40, l0: 0.3, l1: 0.3, g: -30 }); Particles.floater('+CALOR', cx, cy - 8, PAL.flame2); Audio_.play('heat'); break;
        case 'power': Particles.burst(30, cx, cy, { c: [PAL.flame3, PAL.flame2, '#ffffff'], s0: 30, s1: 60, l0: 0.4, l1: 0.5, drag: 2 }); Particles.shake = Math.max(Particles.shake, 0.35); Particles.flash = 0.5; Audio_.play('power'); break;
        case 'release': Particles.burst(40, cx, cy, { c: [PAL.flame1, PAL.flame2, PAL.flame3, '#fff'], s0: 25, s1: 70, l0: 0.3, l1: 0.4, drag: 2.5, size: 2 }); Particles.shake = Math.max(Particles.shake, 0.55); Particles.flash = 0.35; Audio_.play('release'); break;
        case 'melt': Particles.burst(14, cx, cy, { c: ['#dff6ff', '#bfe9ff', '#9ad8ff'], s0: 8, s1: 30, l0: 0.5, l1: 0.6, g: -25, size: 2, grow: 4, drag: 1.2 });
          Particles.burst(8, cx, cy, { c: [PAL.water, PAL.waterHi], s0: 20, s1: 40, l0: 0.5, l1: 0.3, g: 140 }); Audio_.play('melt'); break;
        case 'freeze': Particles.burst(8, cx, cy, { c: ['#ffffff', PAL.ice1, PAL.ice0], s0: 6, s1: 22, l0: 0.25, l1: 0.3 }); Audio_.play('freeze'); break;
        case 'chill': Particles.burst(10, cx, cy, { c: ['#ffffff', PAL.ice1], s0: 10, s1: 25, l0: 0.4, l1: 0.3 }); Particles.floater('HELADO', cx, cy - 10, PAL.ice1); Audio_.play('chill'); break;
        case 'crack': Particles.burst(10, cx, cy, { c: ['#ffd0e0', '#e2406e', '#fff'], s0: 10, s1: 35, l0: 0.2, l1: 0.3 }); Particles.shake = Math.max(Particles.shake, 0.18); Audio_.play('crack'); break;
        case 'evap': Particles.burst(40, cx, cy, { c: ['#ffffff', '#dff6ff', '#bfe9ff', PAL.flame2], s0: 20, s1: 60, l0: 0.5, l1: 0.6, g: -40, size: 2, grow: 6, drag: 1 }); Particles.floater('+' + SCORE.evap, cx, cy - 8, '#ffffff'); Particles.shake = Math.max(Particles.shake, 0.5); Audio_.play('evap'); break;
        case 'stun': Particles.burst(8, cx, cy - 6, { c: ['#fff6a0', '#ffffff'], s0: 10, s1: 20, l0: 0.5, l1: 0.3 }); Audio_.play('stun'); break;
        case 'eat': Particles.burst(24, cx, cy, { c: ['#ffffff', '#ffd35a', '#9cc0ff'], s0: 25, s1: 55, l0: 0.3, l1: 0.4, drag: 2 }); Particles.floater('+' + e.pts, cx, cy - 8, '#ffffff'); Particles.shake = Math.max(Particles.shake, 0.3); Audio_.play('eat', 0, 0, e); break;
        case 'die': Particles.burst(60, cx, cy, { c: [PAL.flame0, PAL.flame1, PAL.flame2, '#fff'], s0: 20, s1: 90, l0: 0.5, l1: 0.8, drag: 1.5, size: 2, g: 40 }); Particles.shake = 1; Particles.flash = 0.8; Audio_.play('die'); break;
        case 'levelclear': Particles.burst(80, VW / 2, VH / 2, { c: [PAL.flame2, PAL.ice0, PAL.water, '#fff'], s0: 40, s1: 120, l0: 0.7, l1: 0.8, g: 80, size: 2 }); Audio_.play('levelclear'); break;
        case 'respawn': Particles.burst(8, cx, cy, { c: ['#fff', PAL.flame2], s0: 10, s1: 25 }); Audio_.play('respawn'); break;
        case 'bomb': Particles.burst(6, cx, cy, { c: ['#ffffff', PAL.flame2], s0: 6, s1: 18, l0: 0.2, l1: 0.2 }); Audio_.play('crack'); break;
        case 'boom': Particles.burst(36, cx, cy, { c: [PAL.flame1, PAL.flame2, PAL.flame3, '#fff'], s0: 25, s1: 80, l0: 0.3, l1: 0.45, drag: 2.2, size: 2 }); Particles.shake = Math.max(Particles.shake, 0.5); Particles.flash = Math.max(Particles.flash, 0.25); Audio_.play('release'); break;
        case 'bkill': Particles.burst(30, cx, cy, { c: ['#ffffff', '#ffd35a', PAL.flame1], s0: 20, s1: 55, l0: 0.4, l1: 0.5, drag: 2 }); Particles.floater('+' + e.pts, cx, cy - 8, '#ffffff'); Audio_.play('evap'); break;
        case 'item': Particles.burst(14, cx, cy, { c: ['#ffffff', PAL.ice1], s0: 15, s1: 35, l0: 0.3, l1: 0.3 }); Particles.floater(e.kind === 'range' ? '+ALCANCE' : e.kind === 'bomb' ? '+BOMBA' : '+VELOCIDAD', cx, cy - 8, PAL.ice0); Audio_.play('heat'); break;
        case 'powerend': Audio_.play('powerend'); break;
        case 'nope': Audio_.play('nope'); break;
        case 'gameover': Audio_.play('gameover'); break;
      }
    }
  }

  /* ---- Mundo ---- */
  function world(c, G, time) {
    const frame = Math.floor(time * 7) % 2;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const X = px(x), Y = py(y), t = G.grid[y][x];
      if (t === T.WALL) { c.drawImage(rockTile(((x * 7 + y * 13) % 4)), X, Y); continue; }
      c.drawImage(floorTile(), X, Y);
      if (t === T.ICE) { c.drawImage(iceTile(Math.floor(hash2(x, y, G.level + G.seed) * 6)), X, Y); continue; }
      const w = G.water[y][x];
      if (w > 0.03) {
        c.globalAlpha = Math.min(0.78, 0.22 + w * 0.55); c.fillStyle = PAL.water; c.fillRect(X, Y, TS, TS);
        c.globalAlpha = Math.min(0.9, w); c.fillStyle = PAL.waterHi;
        const ph = time * 2 + x * 1.7 + y * 2.3;
        c.fillRect(X + 2 + Math.floor((Math.sin(ph) + 1) * 4), Y + 4, 4, 1); c.fillRect(X + 6 + Math.floor((Math.cos(ph * 1.3) + 1) * 3), Y + 10, 5, 1);
        c.globalAlpha = 1;
        if (G.thaw[y][x] > G.def.refreeze - 3) { // aviso de recongelado: escarcha parpadeante
          c.fillStyle = '#ffffff'; for (let i = 0; i < 4; i++) if (((time * 6 + i * 3 + x + y) | 0) % 3 === 0) c.fillRect(X + 2 + ((i * 5 + x * 3) % 12), Y + 2 + ((i * 7 + y * 5) % 12), 1, 1);
        }
      }
    }
    // brasas
    for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) {
      if (!G.embers[y][x]) continue;
      const fl = (Math.sin(time * 6 + x * 1.3 + y * 0.7) > 0.3) ? 1 : 0;
      const X = px(x) + 7, Y = py(y) + 7;
      c.fillStyle = PAL.ember; c.fillRect(X, Y, 2, 2);
      c.fillStyle = PAL.emberHi; c.fillRect(X + fl, Y, 1, 1);
    }
    // objetos (modo bombas)
    for (const it of G.items || []) {
      const X = px(it.x), Y = py(it.y), bob = Math.round(Math.sin(time * 5 + it.x) * 1);
      c.fillStyle = '#0a1c3a'; c.fillRect(X + 3, Y + 3 + bob, 10, 10);
      c.fillStyle = it.kind === 'range' ? PAL.flame2 : it.kind === 'bomb' ? '#ffffff' : PAL.ice1; c.fillRect(X + 4, Y + 4 + bob, 8, 8);
      c.fillStyle = '#0a1c3a'; drawText(c, it.kind === 'range' ? 'R' : it.kind === 'bomb' ? 'B' : 'V', X + 8, Y + 5 + bob, '#0a1c3a', 1, 'center', false);
    }
    // bombas de calor
    for (const b of G.bombs || []) {
      const X = px(b.x), Y = py(b.y), pulse = b.t < 0.7 ? (Math.floor(time * 16) % 2) : (Math.floor(time * 4) % 2);
      c.fillStyle = '#05070d'; c.fillRect(X + 4, Y + 5, 8, 8); c.fillRect(X + 3, Y + 6, 10, 6); c.fillRect(X + 5, Y + 4, 6, 10);
      c.fillStyle = pulse ? PAL.flame1 : '#3a4a66'; c.fillRect(X + 5, Y + 6, 2, 2);
      c.fillStyle = '#9a7a4a'; c.fillRect(X + 8, Y + 2, 1, 3);
      c.fillStyle = (Math.floor(time * 12) % 2) ? PAL.flame3 : PAL.flame2; c.fillRect(X + 8, Y + 1, 2, 2);
    }
    // llamas de explosión
    for (const f of G.flames || []) {
      const X = px(f.x), Y = py(f.y), k = Math.min(1, f.t / 0.55);
      c.globalAlpha = 0.35 + 0.65 * k; c.fillStyle = PAL.flame1; c.fillRect(X + 1, Y + 1, 14, 14);
      c.fillStyle = PAL.flame2; c.fillRect(X + 3, Y + 3, 10, 10); c.fillStyle = PAL.flame3; c.fillRect(X + 5, Y + 5, 6, 6); c.globalAlpha = 1;
    }
    // power-ups
    for (const p of G.powers) {
      const pulse = 5 + Math.round(Math.sin(time * 5) * 1);
      const cx = px(p.x) + TS / 2, cy = py(p.y) + TS / 2;
      c.fillStyle = PAL.flame1; c.fillRect(cx - pulse / 2 - 1, cy - pulse / 2, pulse + 2, pulse); c.fillRect(cx - pulse / 2, cy - pulse / 2 - 1, pulse, pulse + 2);
      c.fillStyle = PAL.flame2; c.fillRect(cx - 2, cy - 2, 4, 4); c.fillStyle = PAL.flame3; c.fillRect(cx - 1, cy - 1, 2, 2);
    }
    // grietas anunciadas
    for (const k of G.cracks || []) {
      const X = px(k.x), Y = py(k.y); const blink = ((time * (10 + (1.3 - k.t) * 10)) | 0) % 2;
      c.fillStyle = blink ? '#ffffff' : '#e2406e';
      c.fillRect(X + 3, Y + 2, 2, 2); c.fillRect(X + 5, Y + 4, 2, 2); c.fillRect(X + 7, Y + 6, 2, 2); c.fillRect(X + 9, Y + 8, 2, 2); c.fillRect(X + 11, Y + 10, 2, 2);
      c.globalAlpha = 0.25; c.fillStyle = '#e2406e'; c.fillRect(X, Y, TS, TS); c.globalAlpha = 1;
    }
    // enemigos
    for (const e of G.enemies) {
      if (e.state !== 'live') continue;
      const scared = G.powerTimer > 0;
      const flash = scared && G.powerTimer < 2 && (Math.floor(time * 8) % 2 === 0);
      const pal = scared ? (flash ? SCARED_FLASH : SCARED_PAL) : ENEMY_PAL[e.kind];
      const wob = (e.kind === 'chaser' || e.kind === 'wander') ? Math.round(Math.sin(time * 8 + e.id)) : 0;
      const X = Math.round(e.fx * TS) + 2, Y = Math.round(HUD_H + e.fy * TS) + 2 + wob;
      const sk = SPR_KIND[e.kind] || e.kind;
      c.drawImage(spriteCanvas(sk, Object.assign({ H: pal.h }, pal), 0), X, Y);
      drawEyes(c, X, Y, 3, sk === 'skater' ? 3 : 4, e.dir, scared);
      if (e.frozen > 0) { c.globalAlpha = 0.6; c.fillStyle = PAL.ice0; c.fillRect(X - 1, Y - 1, 14, 14); c.globalAlpha = 1; c.fillStyle = PAL.ice2; c.fillRect(X - 1, Y - 1, 14, 1); c.fillRect(X - 1, Y + 12, 14, 1); c.fillRect(X - 1, Y - 1, 1, 14); c.fillRect(X + 12, Y - 1, 1, 14); }
      if (e.stun > 0) { c.fillStyle = '#fff6a0'; const a = time * 6; c.fillRect(X + 5 + Math.round(Math.cos(a) * 5), Y - 3 + Math.round(Math.sin(a) * 1), 2, 2); c.fillRect(X + 5 + Math.round(Math.cos(a + 3.14) * 5), Y - 3 + Math.round(Math.sin(a + 3.14) * 1), 2, 2); }
    }
    // jugador
    const p = G.player;
    if (p.dead <= 0 || p.dead > 1.1) {
      const blink = p.inv > 0 && (Math.floor(time * 14) % 2 === 0);
      if (!blink) {
        const bob = p.moving ? Math.round(Math.sin(time * 18)) : 0;
        const X = Math.round(p.fx * TS) + 2, Y = Math.round(HUD_H + p.fy * TS) + 2 + bob;
        c.drawImage(spriteCanvas('player', PLAYER_PAL, frame ? 2 : 0), X, Y);
        drawEyes(c, X, Y + 1, 3, 5, p.dir, false);
      }
    }
  }
  function drawEyes(c, X, Y, ex, ey, dir, scared) {
    const d = DIRS[dir] || [0, 0];
    c.fillStyle = scared ? '#ffffff' : '#fff7e6';
    c.fillRect(X + ex, Y + ey, 2, 2); c.fillRect(X + ex + 4, Y + ey, 2, 2);
    c.fillStyle = scared ? '#0a1c5a' : '#1a0a05';
    c.fillRect(X + ex + (d[0] > 0 ? 1 : 0), Y + ey + (d[1] > 0 ? 1 : 0), 1, 1);
    c.fillRect(X + ex + 4 + (d[0] > 0 ? 1 : 0), Y + ey + (d[1] > 0 ? 1 : 0), 1, 1);
  }

  /* ---- Luz aditiva ---- */
  function lights(c, G, time) {
    c.globalCompositeOperation = 'lighter';
    const p = G.player;
    if (p.dead <= 0) c.drawImage(glowSprite(34, 'rgba(255,140,40,0.40)'), Math.round(p.fx * TS + TS / 2 - 34), Math.round(HUD_H + p.fy * TS + TS / 2 - 34));
    for (const pw of G.powers) c.drawImage(glowSprite(20, 'rgba(255,190,60,0.5)'), px(pw.x) + TS / 2 - 20, py(pw.y) + TS / 2 - 20);
    for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) if (G.embers[y][x]) c.drawImage(glowSprite(7, 'rgba(255,150,40,0.22)'), px(x) + 1, py(y) + 1);
    for (const b of G.bombs || []) c.drawImage(glowSprite(14, 'rgba(255,110,30,0.35)'), px(b.x) + TS / 2 - 14, py(b.y) + TS / 2 - 14);
    for (const f of G.flames || []) c.drawImage(glowSprite(18, 'rgba(255,160,40,0.55)'), px(f.x) + TS / 2 - 18, py(f.y) + TS / 2 - 18);
    for (const e of G.enemies) if (e.state === 'live') {
      const col = G.powerTimer > 0 ? 'rgba(80,120,255,0.28)' : (e.kind === 'chaser' ? 'rgba(160,90,255,0.26)' : e.kind === 'ambush' ? 'rgba(255,120,200,0.26)' : e.kind === 'shy' ? 'rgba(255,160,60,0.26)' : e.kind === 'wander' ? 'rgba(120,220,90,0.24)' : (e.kind === 'chaser' ? 'rgba(160,90,255,0.26)' : e.kind === 'skater' ? 'rgba(40,230,180,0.24)' : 'rgba(230,60,110,0.26)'));
      c.drawImage(glowSprite(18, col), Math.round(e.fx * TS + TS / 2 - 18), Math.round(HUD_H + e.fy * TS + TS / 2 - 18));
    }
    c.globalCompositeOperation = 'source-over';
  }

  /* ---- HUD ---- */
  function hud(c, G, hi, extra) {
    c.fillStyle = '#08101f'; c.fillRect(0, 0, VW, HUD_H);
    c.fillStyle = '#17304f'; c.fillRect(0, HUD_H - 1, VW, 1);
    drawText(c, 'PUNTOS', 6, 3, PAL.uiDim); drawText(c, String(G.score).padStart(6, '0'), 6, 9, PAL.ui, 2);
    drawText(c, 'NIVEL ' + (G.level + 1), VW / 2, 3, PAL.uiDim, 1, 'center');
    drawText(c, G.def.name, VW / 2, 10, PAL.ice1, 1, 'center');
    drawText(c, 'RÉCORD', VW - 6, 3, PAL.uiDim, 1, 'right'); drawText(c, String(Math.max(hi, G.score)).padStart(6, '0'), VW - 6, 10, PAL.uiHot, 1, 'right');
    // calor (solo deshielo); en bombas, bombas y alcance
    const p = G.player, max = G.mode === 'deshielo' ? G.def.heatMax : 0;
    if (G.mode === 'bombas') { drawText(c, 'BOMBAS ' + (p.maxBombs - G.bombs.length) + '/' + p.maxBombs + '  ALCANCE ' + p.range, 6, 22, PAL.uiDim, 1, 'left', false); }
    else if (G.mode === 'clasico') { drawText(c, 'BRASAS ' + G.emberLeft, 6, 22, PAL.uiDim, 1, 'left', false); }
    else drawText(c, 'CALOR', 6, 22, PAL.uiDim, 1, 'left', false);
    for (let i = 0; i < max; i++) {
      const x = 28 + i * 7; c.fillStyle = '#17304f'; c.fillRect(x, 22, 6, 5);
      if (i < p.heat) { c.fillStyle = PAL.flame1; c.fillRect(x, 22, 6, 5); c.fillStyle = PAL.flame3; c.fillRect(x, 22, 6, 1); }
      else if (i === Math.floor(p.heat)) { c.fillStyle = '#6a3a14'; c.fillRect(x, 22, Math.round(6 * ((p.acc || 0) / 5)), 5); }
    }
    // vidas
    const shown = Math.min(5, Math.max(0, G.lives));
    for (let i = 0; i < shown; i++) { c.drawImage(spriteCanvas('player', PLAYER_PAL, 0), VW - 14 - i * 11, 18, 8, 8); }
    if (G.lives > 5 && G.lives < 90) drawText(c, '+' + (G.lives - 5), VW - 14 - 5 * 11 + 6, 20, PAL.uiDim, 1, 'right', false);
    // temporizador de poder
    if (G.powerTimer > 0) { const w = Math.round(60 * G.powerTimer / 7); c.fillStyle = '#17304f'; c.fillRect(VW / 2 - 30, 23, 60, 3); c.fillStyle = '#6aa0ff'; c.fillRect(VW / 2 - 30, 23, w, 3); }
  }

  function post(c, G) {
    c.drawImage(getVignette(), 0, 0);
    if (!REDUCE && Particles.flash > 0) { c.globalAlpha = Math.min(0.5, Particles.flash * 0.45); c.fillStyle = '#ffe6b0'; c.fillRect(0, HUD_H, VW, VH - HUD_H); c.globalAlpha = 1; }
  }

  return { world, hud, lights, post, processEvents };
})();
