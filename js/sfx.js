/* 8-bit 音效（WebAudio 合成，不需要音檔） */
window.SFX = (() => {
  let ctx = null;
  let on = true;
  try { on = localStorage.getItem('danceIsland.sound') !== 'off'; } catch (e) {}

  const init = () => {
    if (!ctx) { try { ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) {} }
    if (ctx && ctx.state === 'suspended') ctx.resume();
  };

  const tone = (freq, dur = 0.08, { type = 'square', vol = 0.05, slide = 0, delay = 0 } = {}) => {
    if (!on || !ctx) return;
    const t = ctx.currentTime + delay;
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (slide) o.frequency.linearRampToValueAtTime(freq + slide, t + dur);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(ctx.destination);
    o.start(t); o.stop(t + dur + 0.02);
  };

  const noise = (dur = 0.05, vol = 0.08, delay = 0) => {
    if (!on || !ctx) return;
    const t = ctx.currentTime + delay;
    const buf = ctx.createBuffer(1, ctx.sampleRate * dur, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
    const s = ctx.createBufferSource(), g = ctx.createGain();
    s.buffer = buf; g.gain.value = vol;
    s.connect(g).connect(ctx.destination); s.start(t);
  };

  const sounds = {
    hover:   () => tone(880, 0.03, { vol: 0.02 }),
    select:  () => { tone(660, 0.05); tone(990, 0.07, { delay: 0.05 }); },
    confirm: () => { tone(523, 0.06); tone(659, 0.06, { delay: 0.06 }); tone(784, 0.1, { delay: 0.12 }); },
    cancel:  () => tone(440, 0.12, { slide: -220 }),
    blip:    () => tone(1200 + Math.random() * 200, 0.02, { vol: 0.02 }),
    open:    () => tone(300, 0.12, { slide: 500, vol: 0.04 }),
    warp:    () => tone(200, 0.35, { slide: 900, type: 'triangle', vol: 0.06 }),
    coin:    () => { tone(988, 0.07); tone(1319, 0.25, { delay: 0.07 }); },
    fanfare: () => [523, 659, 784, 1047].forEach((f, i) => tone(f, i === 3 ? 0.3 : 0.09, { delay: i * 0.09 })),
    error:   () => { tone(180, 0.1, { type: 'sawtooth' }); tone(150, 0.15, { type: 'sawtooth', delay: 0.1 }); },
    kick:    () => tone(150, 0.12, { type: 'sine', slide: -110, vol: 0.25 }),
    hat:     () => noise(0.03, 0.05),
    snare:   () => { noise(0.1, 0.12); tone(220, 0.06, { type: 'triangle', vol: 0.05 }); },
    card:    () => { tone(400, 0.05, { type: 'triangle' }); tone(800, 0.08, { type: 'triangle', delay: 0.05 }); }
  };

  return {
    init,
    play: name => { try { sounds[name] && sounds[name](); } catch (e) {} },
    get on() { return on; },
    toggle() { on = !on; try { localStorage.setItem('danceIsland.sound', on ? 'on' : 'off'); } catch (e) {} if (on) init(); return on; }
  };
})();
