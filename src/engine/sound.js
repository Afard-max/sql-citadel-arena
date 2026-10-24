import { get } from 'svelte/store';
import { progressStore } from '../store/progress.js';

/**
 * Efectos de sonido sintetizados con Web Audio API (sin archivos de audio).
 * Respeta el ajuste "Efectos de Sonido" (settings.sound).
 */
let ctx = null;

function getCtx() {
  if (typeof window === 'undefined') return null;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  if (!ctx) ctx = new AC();
  if (ctx.state === 'suspended') ctx.resume().catch(() => {});
  return ctx;
}

function tone(c, { freq, start = 0, dur = 0.12, type = 'sine', vol = 0.15, slideTo = null }) {
  const t0 = c.currentTime + start;
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
  gain.gain.setValueAtTime(0.0001, t0);
  gain.gain.exponentialRampToValueAtTime(vol, t0 + 0.012);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(gain).connect(c.destination);
  osc.start(t0);
  osc.stop(t0 + dur + 0.03);
}

const SOUNDS = {
  click: (c) => tone(c, { freq: 660, dur: 0.05, type: 'triangle', vol: 0.08 }),
  correct: (c) => {
    tone(c, { freq: 659, dur: 0.12, type: 'triangle' });
    tone(c, { freq: 988, start: 0.1, dur: 0.2, type: 'triangle' });
  },
  wrong: (c) => {
    tone(c, { freq: 220, dur: 0.18, type: 'sawtooth', vol: 0.1 });
    tone(c, { freq: 165, start: 0.14, dur: 0.28, type: 'sawtooth', vol: 0.1 });
  },
  skill: (c) => tone(c, { freq: 440, slideTo: 1175, dur: 0.22, type: 'sine', vol: 0.14 }),
  tick: (c) => tone(c, { freq: 880, dur: 0.06, type: 'square', vol: 0.05 }),
  victory: (c) => {
    [523, 659, 784, 1047].forEach((f, i) =>
      tone(c, { freq: f, start: i * 0.13, dur: i === 3 ? 0.5 : 0.16, type: 'triangle', vol: 0.16 })
    );
  },
  defeat: (c) => {
    [392, 330, 262, 196].forEach((f, i) =>
      tone(c, { freq: f, start: i * 0.18, dur: i === 3 ? 0.6 : 0.2, type: 'sawtooth', vol: 0.1 })
    );
  }
};

export function playSound(name) {
  try {
    if (get(progressStore).settings?.sound === false) return;
    const c = getCtx();
    if (!c || !SOUNDS[name]) return;
    SOUNDS[name](c);
  } catch {
    /* el audio nunca debe romper el juego */
  }
}
