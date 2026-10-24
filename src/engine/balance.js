export const BALANCE = Object.freeze({
  wavesPerMatch: 10,
  towerMaxHp: 1000,
  baseDamage: 100,
  difficultyWeights: Object.freeze({
    1: 1.0,
    2: 1.25,
    3: 1.5
  }),
  comboStep: 0.1,
  maxComboStreak: 5,
  speedBonusThreshold: 0.5,
  speedBonusMultiplier: 1.2,
  hintDamagePenaltyMultiplier: 0.5,
  extraTimeSeconds: 10,
  defaultTimeLimits: Object.freeze({
    tf: 15,
    mc: 30,
    fb: 40,
    mt: 45,
    or: 60
  }),
  rivals: Object.freeze({
    novato: {
      id: 'novato',
      name: 'Escudero Autómata (Novato)',
      accuracy: 0.55,
      minTimeRatio: 0.3,
      maxTimeRatio: 0.8
    },
    veterano: {
      id: 'veterano',
      name: 'Inquisidor de Acero (Veterano)',
      accuracy: 0.75,
      minTimeRatio: 0.3,
      maxTimeRatio: 0.8
    },
    archimago: {
      id: 'archimago',
      name: 'Archimago del Núcleo (Archimago)',
      accuracy: 0.9,
      minTimeRatio: 0.3,
      maxTimeRatio: 0.8
    }
  }),
  xpPerCorrectWaveBase: 10,
  xpVictoryBonus: 50,
  ranks: Object.freeze([
    { name: 'Escudero', minXp: 0 },
    { name: 'Caballero', minXp: 300 },
    { name: 'Paladín', minXp: 800 },
    { name: 'Comandante', minXp: 1600 },
    { name: 'Archimago', minXp: 2800 },
    { name: 'Leyenda', minXp: 4500 }
  ])
});

export function getRankByXp(xp) {
  const safeXp = Math.max(0, Number(xp) || 0);
  let current = BALANCE.ranks[0].name;
  for (const tier of BALANCE.ranks) {
    if (safeXp >= tier.minXp) {
      current = tier.name;
    }
  }
  return current;
}

export function getNextRankInfo(xp) {
  const safeXp = Math.max(0, Number(xp) || 0);
  for (const tier of BALANCE.ranks) {
    if (safeXp < tier.minXp) {
      return { nextRank: tier.name, requiredXp: tier.minXp, remainingXp: tier.minXp - safeXp };
    }
  }
  return { nextRank: null, requiredXp: safeXp, remainingXp: 0 };
}

/**
 * Calcula daño según sección 7 del SDD:
 * 100 * peso_dificultad * score * multiplicador_combo * bonificación_velocidad * penalización_pista
 */
export function calculateWaveDamage({
  difficulty = 1,
  score = 0,
  comboStreak = 0,
  timeSpent = 999,
  timeLimit = 30,
  usedHint = false
}) {
  const clampedScore = Math.max(0, Math.min(1, Number(score) || 0));
  if (clampedScore === 0) return 0;

  const weight = BALANCE.difficultyWeights[difficulty] ?? 1.0;
  const effectiveStreak = Math.min(Math.max(0, comboStreak), BALANCE.maxComboStreak);
  const comboMultiplier = 1 + BALANCE.comboStep * effectiveStreak;

  const isFast = timeLimit > 0 && timeSpent <= timeLimit * BALANCE.speedBonusThreshold;
  const speedMultiplier = isFast ? BALANCE.speedBonusMultiplier : 1.0;
  const hintMultiplier = usedHint ? BALANCE.hintDamagePenaltyMultiplier : 1.0;

  const raw =
    BALANCE.baseDamage *
    weight *
    clampedScore *
    comboMultiplier *
    speedMultiplier *
    hintMultiplier;

  return Math.round(raw);
}

export function calculateMatchStars(victory, accuracy) {
  if (!victory) return 0;
  if (accuracy >= 0.9) return 3;
  if (accuracy >= 0.7) return 2;
  return 1;
}
