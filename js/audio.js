// 寶島狂飆 — procedural WebAudio (no audio files)
(function () {
  const A = { ctx: null, vol: 0.8, ready: false };
  let noiseBuf = null;

  A.init = function () {
    if (A.ctx) { if (A.ctx.state === 'suspended') A.ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    const ctx = (A.ctx = new AC());
    A.master = ctx.createGain(); A.master.gain.value = A.vol; A.master.connect(ctx.destination);
    A.sfxBus = ctx.createGain(); A.sfxBus.gain.value = 0.9; A.sfxBus.connect(A.master);
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    // engine
    const eg = ctx.createGain(); eg.gain.value = 0;
    const ef = ctx.createBiquadFilter(); ef.type = 'lowpass'; ef.frequency.value = 600; ef.Q.value = 4;
    const o1 = ctx.createOscillator(); o1.type = 'sawtooth'; o1.frequency.value = 50;
    const o2 = ctx.createOscillator(); o2.type = 'square'; o2.frequency.value = 25;
    const g2 = ctx.createGain(); g2.gain.value = 0.5;
    o1.connect(ef); o2.connect(g2); g2.connect(ef); ef.connect(eg); eg.connect(A.master);
    o1.start(); o2.start();
    A.engine = { g: eg, f: ef, o1, o2 };
    // ambience: brown-ish noise
    const amb = ctx.createBufferSource(); amb.buffer = noiseBuf; amb.loop = true;
    const af = ctx.createBiquadFilter(); af.type = 'lowpass'; af.frequency.value = 320;
    const ag = ctx.createGain(); ag.gain.value = 0.05;
    amb.connect(af); af.connect(ag); ag.connect(A.master); amb.start();
    A.amb = ag;
    // rain
    const rn = ctx.createBufferSource(); rn.buffer = noiseBuf; rn.loop = true;
    const rf = ctx.createBiquadFilter(); rf.type = 'highpass'; rf.frequency.value = 1400;
    const rg = ctx.createGain(); rg.gain.value = 0;
    rn.connect(rf); rf.connect(rg); rg.connect(A.master); rn.start();
    A.rain = rg;
    // siren
    const so = ctx.createOscillator(); so.type = 'sine'; so.frequency.value = 900;
    const lfo = ctx.createOscillator(); lfo.frequency.value = 0.8;
    const lg = ctx.createGain(); lg.gain.value = 350;
    lfo.connect(lg); lg.connect(so.frequency);
    const sg = ctx.createGain(); sg.gain.value = 0;
    so.connect(sg); sg.connect(A.master); so.start(); lfo.start();
    A.siren = sg;
    A.ready = true;
  };
  A.note = function (f) { if (!A.ready) return; const t = A.ctx.currentTime; tone(t, 'triangle', f, f, 0.35, 0.22); tone(t, 'sine', f * 2, f * 2, 0.25, 0.06); };
  A.setVolume = function (v) { A.vol = v; if (A.master) A.master.gain.value = v; };

  A.setEngine = function (on, two, ratio, throttle) {
    if (!A.ready) return;
    const t = A.ctx.currentTime;
    const base = two ? 62 : 38, span = two ? 190 : 120;
    const f = base + ratio * span + throttle * (two ? 25 : 12);
    A.engine.o1.frequency.setTargetAtTime(f, t, 0.08);
    A.engine.o2.frequency.setTargetAtTime(f / 2, t, 0.08);
    A.engine.f.frequency.setTargetAtTime(two ? 900 + ratio * 1400 : 380 + ratio * 900 + throttle * 300, t, 0.1);
    A.engine.g.gain.setTargetAtTime(on ? (two ? 0.05 : 0.07) + throttle * 0.03 : 0, t, 0.1);
  };
  A.setRain = (v) => { if (A.ready) A.rain.gain.setTargetAtTime(v * 0.08, A.ctx.currentTime, 0.5); };
  A.setSiren = (v) => { if (A.ready) A.siren.gain.setTargetAtTime(v * 0.05, A.ctx.currentTime, 0.2); };
  A.setAmb = (v) => { if (A.ready) A.amb.gain.setTargetAtTime(v, A.ctx.currentTime, 0.5); };

  function env(g, t, a, peak, dcy) { g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(peak, t + a); g.gain.exponentialRampToValueAtTime(0.0001, t + a + dcy); }
  function noise(t, dur, type, freq, peak, q) {
    const s = A.ctx.createBufferSource(); s.buffer = noiseBuf;
    const f = A.ctx.createBiquadFilter(); f.type = type; f.frequency.value = freq; if (q) f.Q.value = q;
    const g = A.ctx.createGain(); env(g, t, 0.005, peak, dur);
    s.connect(f); f.connect(g); g.connect(A.sfxBus); s.start(t, Math.random()); s.stop(t + dur + 0.1);
  }
  function tone(t, type, f0, f1, dur, peak, delay = 0) {
    const o = A.ctx.createOscillator(); o.type = type; o.frequency.setValueAtTime(f0, t + delay);
    if (f1 !== f0) o.frequency.exponentialRampToValueAtTime(f1, t + delay + dur);
    const g = A.ctx.createGain(); env(g, t + delay, 0.01, peak, dur);
    o.connect(g); g.connect(A.sfxBus); o.start(t + delay); o.stop(t + delay + dur + 0.1);
  }

  A.sfx = function (name, vol = 1) {
    if (!A.ready) return;
    const t = A.ctx.currentTime;
    const v = vol;
    switch (name) {
      case 'punch': noise(t, 0.08, 'bandpass', 900, 0.5 * v, 1); tone(t, 'sine', 140, 50, 0.12, 0.5 * v); break;
      case 'whoosh': noise(t, 0.12, 'bandpass', 2400, 0.12 * v, 2); break;
      case 'gun': noise(t, 0.18, 'lowpass', 3500, 0.7 * v); tone(t, 'square', 180, 40, 0.1, 0.35 * v); break;
      case 'crash': noise(t, 0.35, 'lowpass', 1600, 0.6 * v); tone(t, 'square', 90, 45, 0.2, 0.2 * v); break;
      case 'bump': noise(t, 0.12, 'lowpass', 700, 0.3 * v); break;
      case 'explode': noise(t, 1.2, 'lowpass', 500, 1.0 * v); tone(t, 'sine', 90, 25, 0.9, 0.8 * v); break;
      case 'cash': [880, 1175, 1568].forEach((f, i) => tone(t, 'triangle', f, f, 0.12, 0.25 * v, i * 0.07)); break;
      case 'pickup': [660, 990].forEach((f, i) => tone(t, 'square', f, f, 0.08, 0.12 * v, i * 0.06)); break;
      case 'mission': [523, 659, 784, 1046, 784, 1046].forEach((f, i) => tone(t, 'square', f, f, 0.14, 0.13 * v, i * 0.11)); break;
      case 'start': [392, 523, 659].forEach((f, i) => tone(t, 'triangle', f, f, 0.18, 0.2 * v, i * 0.09)); break;
      case 'fail': [392, 330, 262, 196].forEach((f, i) => tone(t, 'sawtooth', f, f * 0.97, 0.2, 0.12 * v, i * 0.16)); break;
      case 'horn': tone(t, 'square', 415, 415, 0.35, 0.12 * v); tone(t, 'square', 520, 520, 0.35, 0.1 * v); break;
      case 'beep': tone(t, 'square', 1250, 1250, 0.18, 0.08 * v); tone(t, 'square', 1250, 1250, 0.12, 0.08 * v, 0.22); break;
      case 'chime': [659, 523, 784].forEach((f, i) => tone(t, 'sine', f, f, 0.5, 0.2 * v, i * 0.28)); break;
      case 'door': noise(t, 0.06, 'bandpass', 500, 0.25 * v, 3); tone(t, 'sine', 220, 180, 0.06, 0.15 * v); break;
      case 'click': tone(t, 'square', 1800, 1800, 0.02, 0.05 * v); break;
      case 'ui': tone(t, 'triangle', 880, 1320, 0.06, 0.08 * v); break;
      case 'hurt': tone(t, 'sawtooth', 220, 110, 0.18, 0.15 * v); break;
      case 'eat': [700, 500, 800].forEach((f, i) => tone(t, 'sine', f, f, 0.07, 0.15 * v, i * 0.09)); break;
      case 'star': tone(t, 'square', 988, 988, 0.1, 0.1 * v); tone(t, 'square', 740, 740, 0.2, 0.1 * v, 0.11); break;
      case 'phone': [1320, 1760, 1320, 1760].forEach((f, i) => tone(t, 'sine', f, f, 0.09, 0.12 * v, i * 0.1)); break;
    }
  };

  // Garbage-truck jingle (Beethoven's Für Elise, public domain) — loops while the truck is on its route
  const FE = [[659.25, 1], [622.25, 1], [659.25, 1], [622.25, 1], [659.25, 1], [493.88, 1], [587.33, 1], [523.25, 1], [440, 2], [0, 1], [261.63, 1], [329.63, 1], [440, 1], [493.88, 2], [0, 1], [329.63, 1], [415.3, 1], [493.88, 1], [523.25, 2], [0, 1], [329.63, 1],
    [659.25, 1], [622.25, 1], [659.25, 1], [622.25, 1], [659.25, 1], [493.88, 1], [587.33, 1], [523.25, 1], [440, 2], [0, 1], [261.63, 1], [329.63, 1], [440, 1], [493.88, 2], [0, 1], [329.63, 1], [523.25, 1], [493.88, 1], [440, 3], [0, 3]];
  let jingle = null;
  A.jingle = function (on) {
    if (!A.ready) return;
    if (!on) { if (jingle) { clearInterval(jingle.timer); jingle.gain.gain.setTargetAtTime(0, A.ctx.currentTime, 0.2); jingle = null; } return; }
    if (jingle) return;
    const gain = A.ctx.createGain(); gain.gain.value = 0; gain.connect(A.master);
    let i = 0, next = A.ctx.currentTime + 0.1;
    const step = 0.19;
    const sched = () => {
      while (next < A.ctx.currentTime + 0.4) {
        const [f, d] = FE[i % FE.length];
        if (f) for (const [mult, type, amp] of [[1, 'triangle', 0.5], [2, 'sine', 0.18]]) {
          const o = A.ctx.createOscillator(); o.type = type; o.frequency.value = f * mult;
          const g = A.ctx.createGain(); g.gain.setValueAtTime(0.0001, next); g.gain.exponentialRampToValueAtTime(amp, next + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, next + step * d * 0.95);
          o.connect(g); g.connect(gain); o.start(next); o.stop(next + step * d);
        }
        next += step * d; i++;
      }
    };
    jingle = { gain, timer: setInterval(sched, 120) };
    sched();
  };
  A.setJingle = (v) => { if (jingle) jingle.gain.gain.setTargetAtTime(v * 0.22, A.ctx.currentTime, 0.2); };

  // car radio: 0 off, 1 lo-fi, 2 night-market electro
  let radioTimer = null;
  A.radio = function (n) {
    if (!A.ready) return;
    clearInterval(radioTimer); radioTimer = null;
    if (!n) return;
    const lofi = n === 1;
    const chords = lofi ? [[220, 261.6, 329.6, 392], [174.6, 220, 261.6, 329.6], [196, 246.9, 293.7, 370], [164.8, 207.7, 246.9, 329.6]] : [[220, 277.2, 329.6], [196, 246.9, 293.7], [174.6, 220, 261.6], [196, 246.9, 329.6]];
    const beat = lofi ? 0.7 : 0.26;
    let step = 0;
    const play = () => {
      const t = A.ctx.currentTime + 0.05;
      const ch = chords[Math.floor(step / (lofi ? 4 : 8)) % 4];
      if (lofi) {
        if (step % 4 === 0) ch.forEach((f) => tone(t, 'triangle', f, f, beat * 3.6, 0.035));
        tone(t, 'sine', ch[0] / 2, ch[0] / 2, beat * 0.9, step % 2 ? 0.06 : 0.09);
        noise(t + beat / 2, 0.03, 'highpass', 7000, 0.05);
      } else {
        if (step % 2 === 0) tone(t, 'sine', 110, 45, 0.18, 0.28);
        noise(t + beat / 2, 0.03, 'highpass', 8000, 0.05);
        tone(t, 'sawtooth', ch[step % 3] * (step % 4 < 2 ? 1 : 2), ch[step % 3] * (step % 4 < 2 ? 1 : 2), beat * 0.8, 0.035);
        if (step % 8 === 4) noise(t, 0.12, 'bandpass', 1800, 0.12, 1);
      }
      step++;
    };
    play();
    radioTimer = setInterval(play, beat * 1000);
  };

  // Title-screen lo-fi loop: soft chords + hats
  let musicTimer = null;
  A.music = function (on) {
    if (!A.ready) return;
    if (!on) { clearInterval(musicTimer); musicTimer = null; return; }
    if (musicTimer) return;
    const chords = [[220, 261.6, 329.6, 392], [174.6, 220, 261.6, 329.6], [196, 246.9, 293.7, 370], [164.8, 207.7, 246.9, 329.6]];
    let step = 0;
    const beat = 0.75;
    const play = () => {
      const t = A.ctx.currentTime + 0.05;
      const ch = chords[Math.floor(step / 4) % 4];
      if (step % 4 === 0) ch.forEach((f) => tone(t, 'triangle', f, f, beat * 3.6, 0.028));
      tone(t, 'sine', ch[0] / 2, ch[0] / 2, beat * 0.9, step % 2 ? 0.05 : 0.08);
      noise(t + beat / 2, 0.03, 'highpass', 7000, 0.04);
      if (step % 8 === 6) tone(t, 'sine', ch[3] * 2, ch[3] * 2, 0.4, 0.03);
      step++;
    };
    play();
    musicTimer = setInterval(play, beat * 1000);
  };

  window.Sound = A;
})();
