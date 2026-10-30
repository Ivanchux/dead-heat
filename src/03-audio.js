/* ================= AUDIO (Web Audio, todo sintetizado) ================= */
const Audio_ = (() => {
  let ac = null, master = null, sfxBus = null, musBus = null, noiseBuf = null;
  let muted = false, started = false;
  const vol = { sfx: 0.7, music: 0.5 };
  let intensity = 0; // 0..1, capas de la música según el peligro
  let musicOn = false, nextStep = 0, stepIdx = 0, bpm = 112;
  let lookTimer = null;

  function init() {
    if (ac) { if (ac.state === 'suspended') ac.resume(); return; }
    const Ctx = window.AudioContext || window.webkitAudioContext; if (!Ctx) return;
    ac = new Ctx();
    master = ac.createGain(); master.gain.value = muted ? 0 : 0.8; master.connect(ac.destination);
    const comp = ac.createDynamicsCompressor(); comp.threshold.value = -14; comp.ratio.value = 6; comp.connect(master);
    sfxBus = ac.createGain(); sfxBus.gain.value = vol.sfx; sfxBus.connect(comp);
    musBus = ac.createGain(); musBus.gain.value = vol.music * 0.5; musBus.connect(comp);
    // buffer de ruido
    noiseBuf = ac.createBuffer(1, ac.sampleRate, ac.sampleRate);
    const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    started = true;
  }

  function osc(type, freq, t0, dur, gain, dest, slideTo, detune) {
    const o = ac.createOscillator(), g = ac.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, t0);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), t0 + dur);
    if (detune) o.detune.value = detune;
    g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(gain, t0 + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g); g.connect(dest || sfxBus); o.start(t0); o.stop(t0 + dur + 0.02);
  }
  function noise(t0, dur, gain, freq, q, type, dest, sweepTo) {
    const s = ac.createBufferSource(); s.buffer = noiseBuf; s.loop = true;
    const f = ac.createBiquadFilter(); f.type = type || 'bandpass'; f.frequency.setValueAtTime(freq, t0); f.Q.value = q || 1;
    if (sweepTo) f.frequency.exponentialRampToValueAtTime(sweepTo, t0 + dur);
    const g = ac.createGain(); g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(gain, t0 + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    s.connect(f); f.connect(g); g.connect(dest || sfxBus); s.start(t0); s.stop(t0 + dur + 0.02);
  }

  const SFX = {
    ember(x) { const t = ac.currentTime, f = 660 + ((x || 0) % 2) * 110; osc('square', f, t, 0.06, 0.07); osc('square', f * 1.5, t + 0.04, 0.06, 0.05); },
    heat() { const t = ac.currentTime; [523, 659, 784, 1047].forEach((f, i) => osc('triangle', f, t + i * 0.05, 0.12, 0.12)); },
    power() { const t = ac.currentTime; osc('sawtooth', 220, t, 0.5, 0.1, null, 880); noise(t, 0.5, 0.12, 800, 0.8, 'bandpass', null, 3000); [392, 523, 659, 784].forEach((f, i) => osc('square', f, t + 0.1 + i * 0.06, 0.1, 0.06)); },
    release() { const t = ac.currentTime; noise(t, 0.35, 0.3, 400, 0.7, 'lowpass', null, 3500); osc('sawtooth', 110, t, 0.3, 0.2, null, 40); },
    melt() { const t = ac.currentTime; noise(t, 0.25, 0.12, 2500 + Math.random() * 1500, 4, 'bandpass'); },
    nope() { const t = ac.currentTime; osc('square', 130, t, 0.12, 0.08); osc('square', 110, t + 0.07, 0.12, 0.08); },
    evap() { const t = ac.currentTime; noise(t, 0.7, 0.3, 3000, 0.5, 'highpass', null, 800); osc('sine', 880, t, 0.4, 0.1, null, 220); },
    stun() { const t = ac.currentTime; osc('triangle', 300, t, 0.2, 0.1, null, 200); },
    eat(x, y, e) { const t = ac.currentTime, k = Math.log2((e && e.pts || 200) / 200); osc('square', 300 * Math.pow(1.26, k), t, 0.18, 0.1, null, 900 * Math.pow(1.26, k)); osc('triangle', 150, t, 0.2, 0.15, null, 60); },
    freeze() { const t = ac.currentTime; osc('sine', 1800, t, 0.12, 0.05, null, 2600); noise(t, 0.12, 0.05, 6000, 2, 'highpass'); },
    chill() { const t = ac.currentTime; osc('sine', 1400, t, 0.3, 0.06, null, 700); },
    crack() { const t = ac.currentTime; noise(t, 0.08, 0.2, 1200, 6); noise(t + 0.09, 0.06, 0.15, 900, 6); osc('square', 90, t, 0.18, 0.1, null, 45); },
    die() { const t = ac.currentTime; osc('sawtooth', 440, t, 0.9, 0.18, null, 40); osc('square', 330, t + 0.1, 0.8, 0.1, null, 30); noise(t, 0.6, 0.15, 1500, 0.6, 'lowpass', null, 120); },
    levelclear() { const t = ac.currentTime; [523, 659, 784, 1047, 784, 1047, 1319].forEach((f, i) => { osc('square', f, t + i * 0.09, 0.14, 0.09); osc('triangle', f / 2, t + i * 0.09, 0.14, 0.12); }); },
    gameover() { const t = ac.currentTime; [392, 349, 330, 262].forEach((f, i) => { osc('square', f, t + i * 0.25, 0.3, 0.1); osc('triangle', f / 2, t + i * 0.25, 0.3, 0.14); }); },
    respawn() { const t = ac.currentTime; osc('sine', 500, t, 0.2, 0.05, null, 250); },
    start() { const t = ac.currentTime; [262, 330, 392, 523].forEach((f, i) => osc('square', f, t + i * 0.1, 0.16, 0.08)); },
    menu() { const t = ac.currentTime; osc('square', 880, t, 0.04, 0.05); },
    powerend() { const t = ac.currentTime; osc('square', 300, t, 0.1, 0.06, null, 150); },
  };
  function play(name, x, y, e) { if (!started || muted) return; try { SFX[name] && SFX[name](x, y, e); } catch (err) { if (window.__audioDebug) throw err; } }

  /* ---- Música procedural por capas: bajo + arpegio + percusión + melodía de peligro ---- */
  const NOTE = n => 440 * Math.pow(2, (n - 69) / 12);
  const PROG = [[45, 48, 52], [41, 45, 48], [48, 52, 55], [43, 47, 50]]; // Am F C G
  function scheduleStep(t, i) {
    const bar = (i >> 4) & 3, st = i & 15, ch = PROG[bar];
    const spb = 60 / bpm / 4;
    // bajo
    if (st % 4 === 0 || (st % 8 === 6)) osc('square', NOTE(ch[0] - 12), t, spb * 2.2, 0.16, musBus);
    // percusión
    if (st % 4 === 0) { osc('sine', 120, t, 0.12, 0.45, musBus, 45); }
    if (st % 8 === 4) noise(t, 0.1, 0.22, 1800, 0.8, 'bandpass', musBus);
    if (intensity > 0.2 && st % 2 === 1) noise(t, 0.03, 0.08, 7000, 1, 'highpass', musBus);
    // arpegio (capa 1)
    if (intensity > 0.12) { const n = ch[(st >> 1) % 3] + (st % 4 >= 2 ? 12 : 0); osc('triangle', NOTE(n + 12), t, spb * 1.6, 0.1, musBus); }
    // melodía de peligro (capa 2)
    if (intensity > 0.55 && st % 2 === 0) { const sc = [0, 3, 5, 7, 10, 12]; const n = 69 + sc[(i * 7 + (i >> 3)) % sc.length]; osc('square', NOTE(n), t, spb * 1.5, 0.05, musBus, null, (st & 2) ? 6 : -6); }
    // pad
    if (st === 0) ch.forEach((n, k) => osc('sawtooth', NOTE(n + 12), t, spb * 15, 0.03, musBus, null, k * 4 - 4));
  }
  function pump() {
    if (!ac || !musicOn) return;
    const spb = 60 / bpm / 4;
    while (nextStep < ac.currentTime + 0.25) { scheduleStep(nextStep, stepIdx); nextStep += spb; stepIdx++; }
  }
  return {
    init, play,
    get ready() { return started; },
    startMusic() { if (!started || musicOn) return; musicOn = true; nextStep = ac.currentTime + 0.05; stepIdx = 0; lookTimer = setInterval(pump, 60); },
    stopMusic() { musicOn = false; clearInterval(lookTimer); },
    setIntensity(v) { intensity += (v - intensity) * 0.08; if (musBus) musBus.gain.value = vol.music * 0.5; bpm = 108 + Math.round(intensity * 22); },
    toggleMute() { muted = !muted; if (master) master.gain.value = muted ? 0 : 0.8; return muted; },
    get muted() { return muted; },
    setVolumes(s, m) { vol.sfx = s; vol.music = m; if (sfxBus) sfxBus.gain.value = s; if (musBus) musBus.gain.value = m * 0.5; },
    get vol() { return vol; },
  };
})();
