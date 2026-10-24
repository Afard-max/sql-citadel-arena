import { BALANCE, calculateWaveDamage } from './balance.js';
import { createPRNG } from './prng.js';

/**
 * Crea una instancia del bot rival simulado con semilla reproducible (Sección 4.2 y 7 SDD).
 * @param {'novato'|'veterano'|'archimago'} levelId
 * @param {string|number} seed
 */
export function createBot(levelId = 'novato', seed = Date.now()) {
  const profile = BALANCE.rivals[levelId] || BALANCE.rivals.novato;
  const prng = createPRNG(`${seed}-bot-${profile.id}`);

  /**
   * Simula el turno del bot para una oleada concreta.
   * Tiempo de respuesta uniforme entre 30% y 80% del límite (Sección 7 SDD).
   */
  function simulateWave({ difficulty = 1, timeLimit = 30, currentCombo = 0 }) {
    const roll = prng.nextFloat();
    const correct = roll < profile.accuracy;
    const score = correct ? 1 : 0;

    const ratio =
      profile.minTimeRatio + prng.nextFloat() * (profile.maxTimeRatio - profile.minTimeRatio);
    const responseTime = Number((timeLimit * ratio).toFixed(2));

    const nextCombo = correct ? currentCombo + 1 : 0;
    const damage = calculateWaveDamage({
      difficulty,
      score,
      comboStreak: currentCombo,
      timeSpent: responseTime,
      timeLimit,
      usedHint: false
    });

    return {
      correct,
      score,
      responseTime,
      nextCombo,
      damage
    };
  }

  return {
    id: profile.id,
    name: profile.name,
    accuracy: profile.accuracy,
    simulateWave
  };
}
