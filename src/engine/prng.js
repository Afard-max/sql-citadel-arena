/**
 * Convierte cualquier cadena o número en una semilla entera de 32 bits sin signo.
 * @param {string|number} seedInput
 * @returns {number}
 */
export function normalizeSeed(seedInput) {
  if (typeof seedInput === 'number' && Number.isFinite(seedInput)) {
    return seedInput >>> 0;
  }
  const str = String(seedInput ?? 'sql-citadel-default');
  let h = 2166136261 >>> 0;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/**
 * Generador pseudoaleatorio determinista Mulberry32.
 * @param {string|number} seedInput
 */
export function createPRNG(seedInput) {
  let state = normalizeSeed(seedInput);

  function nextFloat() {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  function nextInt(min, max) {
    const low = Math.ceil(min);
    const high = Math.floor(max);
    return Math.floor(nextFloat() * (high - low + 1)) + low;
  }

  function shuffle(array) {
    const copy = [...array];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(nextFloat() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  }

  return {
    nextFloat,
    nextInt,
    shuffle,
    getSeed: () => normalizeSeed(seedInput)
  };
}
