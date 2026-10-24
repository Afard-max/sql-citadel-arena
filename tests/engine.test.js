import { describe, it, expect } from 'vitest';
import { createPRNG } from '../src/engine/prng.js';
import { calculateWaveDamage, calculateMatchStars, getRankByXp } from '../src/engine/balance.js';
import { createBot } from '../src/engine/bot.js';
import { sampleQuestions } from '../src/engine/loader.js';
import m01 from '../src/content/M01.json';

describe('PRNG, Balance, Bot y Muestreo (Sección 7 y 10 SDD)', () => {
  it('genera secuencias idénticas con la misma semilla en Mulberry32', () => {
    const a = createPRNG('semilla-fija-42');
    const b = createPRNG('semilla-fija-42');
    expect(a.nextFloat()).toBe(b.nextFloat());
    expect(a.nextInt(1, 100)).toBe(b.nextInt(1, 100));
  });

  it('calcula daño con combo, velocidad y penalización de pista', () => {
    const dmg = calculateWaveDamage({
      difficulty: 2, // 1.25
      score: 1,
      comboStreak: 2, // 1.2
      timeSpent: 10, // <= mitad de 30 -> 1.2
      timeLimit: 30,
      usedHint: false
    });
    // 100 * 1.25 * 1 * 1.2 * 1.2 = 180
    expect(dmg).toBe(180);

    const dmgHint = calculateWaveDamage({
      difficulty: 2,
      score: 1,
      comboStreak: 2,
      timeSpent: 10,
      timeLimit: 30,
      usedHint: true
    });
    expect(dmgHint).toBe(90);
  });

  it('asigna estrellas y rangos según umbrales del SDD', () => {
    expect(calculateMatchStars(false, 1.0)).toBe(0);
    expect(calculateMatchStars(true, 0.65)).toBe(1);
    expect(calculateMatchStars(true, 0.75)).toBe(2);
    expect(calculateMatchStars(true, 0.95)).toBe(3);

    expect(getRankByXp(0)).toBe('Escudero');
    expect(getRankByXp(800)).toBe('Paladín');
    expect(getRankByXp(4500)).toBe('Leyenda');
  });

  it('produce resultados reproducibles en el bot con semilla fija', () => {
    const bot1 = createBot('veterano', 12345);
    const bot2 = createBot('veterano', 12345);
    expect(bot1.simulateWave({ difficulty: 1, timeLimit: 30, currentCombo: 0 })).toEqual(
      bot2.simulateWave({ difficulty: 1, timeLimit: 30, currentCombo: 0 })
    );
  });

  it('muestrea 10 preguntas incluyendo al menos 1 de cada uno de los 5 tipos', () => {
    const sample = sampleQuestions(m01.questions, 10, 'seed-test');
    expect(sample.length).toBe(10);
    const types = new Set(sample.map((q) => q.type));
    expect(types.size).toBe(5);
  });
});
