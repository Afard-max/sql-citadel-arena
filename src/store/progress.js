import { writable } from 'svelte/store';
import { getRankByXp, calculateMatchStars } from '../engine/balance.js';

export const STORAGE_KEY = 'sqlcitadel:v1:profile';
export const CURRENT_SCHEMA_VERSION = 1;
export const MAX_IMPORT_BYTES = 256 * 1024;
export const PLAYER_NAME_REGEX = /^[A-Za-z0-9 _-]{3,16}$/;

const MODULE_IDS = [
  'M01',
  'M02',
  'M03',
  'M04',
  'M05',
  'M06',
  'M07',
  'M08',
  'M09',
  'M10',
  'M11'
];
const GAME_TYPES = ['tf', 'mc', 'fb', 'mt', 'or'];
const VALID_RIVALS = new Set(['novato', 'veterano', 'archimago']);

export function createDefaultProfile(playerName = '') {
  const now = new Date().toISOString();
  const modules = {};
  MODULE_IDS.forEach((id, idx) => {
    modules[id] = {
      unlocked: idx === 0,
      stars: 0,
      bestScore: 0,
      plays: 0,
      lastPlayedAt: null
    };
  });

  const byType = {};
  for (const t of GAME_TYPES) {
    byType[t] = { answered: 0, correct: 0 };
  }

  return {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    createdAt: now,
    updatedAt: now,
    tutorialCompleted: false,
    player: {
      name: PLAYER_NAME_REGEX.test(playerName) ? playerName : ''
    },
    xp: 0,
    rank: 'Escudero',
    settings: {
      sound: true,
      reducedMotion: false,
      freeMode: false,
      rivalLevelDefault: 'novato'
    },
    modules,
    stats: {
      answered: 0,
      correct: 0,
      byType
    },
    mistakes: [],
    history: []
  };
}

/**
 * Valida y reconstruye un objeto de perfil solo con los campos permitidos (Sección 5.4 y 8.2 SDD).
 * Devuelve null si la estructura raíz es irrecuperable.
 */
export function sanitizeAndValidateProfile(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return null;
  }

  const base = createDefaultProfile();
  const schemaVersion = Number(raw.schemaVersion) || 1;
  if (schemaVersion < 1 || schemaVersion > CURRENT_SCHEMA_VERSION) {
    return null;
  }

  if (typeof raw.player?.name === 'string') {
    const trimmed = raw.player.name.trim();
    if (trimmed === '' || PLAYER_NAME_REGEX.test(trimmed)) {
      base.player.name = trimmed;
    } else {
      return null;
    }
  } else {
    return null;
  }

  base.createdAt = typeof raw.createdAt === 'string' ? raw.createdAt : base.createdAt;
  base.updatedAt = new Date().toISOString();
  base.tutorialCompleted = Boolean(raw.tutorialCompleted);

  const xp = Math.max(0, Math.min(1_000_000, Math.floor(Number(raw.xp) || 0)));
  base.xp = xp;
  base.rank = getRankByXp(xp);

  if (raw.settings && typeof raw.settings === 'object') {
    base.settings.sound = Boolean(raw.settings.sound ?? true);
    base.settings.reducedMotion = Boolean(raw.settings.reducedMotion ?? false);
    base.settings.freeMode = Boolean(raw.settings.freeMode ?? false);
    base.settings.rivalLevelDefault = VALID_RIVALS.has(raw.settings.rivalLevelDefault)
      ? raw.settings.rivalLevelDefault
      : 'novato';
  }

  if (raw.modules && typeof raw.modules === 'object') {
    MODULE_IDS.forEach((id, idx) => {
      const m = raw.modules[id];
      if (m && typeof m === 'object') {
        base.modules[id] = {
          unlocked: idx === 0 ? true : Boolean(m.unlocked),
          stars: Math.max(0, Math.min(3, Math.floor(Number(m.stars) || 0))),
          bestScore: Math.max(0, Math.min(100, Math.round(Number(m.bestScore) || 0))),
          plays: Math.max(0, Math.floor(Number(m.plays) || 0)),
          lastPlayedAt: typeof m.lastPlayedAt === 'string' ? m.lastPlayedAt : null
        };
      }
    });

    // Asegurar desbloqueo lineal coherente si el módulo anterior tiene >= 1 estrella
    for (let i = 1; i < MODULE_IDS.length; i++) {
      const prevId = MODULE_IDS[i - 1];
      const currId = MODULE_IDS[i];
      if (base.modules[prevId].stars >= 1) {
        base.modules[currId].unlocked = true;
      }
    }
  }

  if (raw.stats && typeof raw.stats === 'object') {
    base.stats.answered = Math.max(0, Math.floor(Number(raw.stats.answered) || 0));
    base.stats.correct = Math.max(
      0,
      Math.min(base.stats.answered, Math.floor(Number(raw.stats.correct) || 0))
    );

    if (raw.stats.byType && typeof raw.stats.byType === 'object') {
      for (const t of GAME_TYPES) {
        const st = raw.stats.byType[t];
        if (st && typeof st === 'object') {
          const ans = Math.max(0, Math.floor(Number(st.answered) || 0));
          const cor = Math.max(0, Math.min(ans, Math.floor(Number(st.correct) || 0)));
          base.stats.byType[t] = { answered: ans, correct: cor };
        }
      }
    }
  }

  const qidRegex = /^M(0[1-9]|1[01])-(tf|mc|fb|mt|or)-[0-9]{3}$/;
  if (Array.isArray(raw.mistakes)) {
    const unique = [];
    const seen = new Set();
    for (const item of raw.mistakes) {
      if (typeof item === 'string' && qidRegex.test(item) && !seen.has(item)) {
        seen.add(item);
        unique.push(item);
        if (unique.length >= 100) break;
      }
    }
    base.mistakes = unique;
  }

  if (Array.isArray(raw.history)) {
    const cleanHistory = [];
    for (const h of raw.history.slice(0, 20)) {
      if (h && typeof h === 'object' && MODULE_IDS.includes(h.moduleId)) {
        cleanHistory.push({
          moduleId: h.moduleId,
          rival: VALID_RIVALS.has(h.rival) ? h.rival : 'novato',
          result: h.result === 'victory' ? 'victory' : 'defeat',
          xp: Math.max(0, Math.floor(Number(h.xp) || 0)),
          date: typeof h.date === 'string' ? h.date : new Date().toISOString()
        });
      }
    }
    base.history = cleanHistory;
  }

  return base;
}

function readFromStorage() {
  if (typeof window === 'undefined' || !window.localStorage) {
    return { profile: createDefaultProfile(), corrupted: false };
  }
  try {
    const rawText = window.localStorage.getItem(STORAGE_KEY);
    if (!rawText) {
      return { profile: createDefaultProfile(), corrupted: false };
    }
    const parsed = JSON.parse(rawText);
    const clean = sanitizeAndValidateProfile(parsed);
    if (!clean) {
      return { profile: createDefaultProfile(), corrupted: true };
    }
    return { profile: clean, corrupted: false };
  } catch {
    return { profile: createDefaultProfile(), corrupted: true };
  }
}

function writeToStorage(profile) {
  if (typeof window === 'undefined' || !window.localStorage) return false;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
    return true;
  } catch {
    return false;
  }
}

function createProgressStore() {
  const initial = readFromStorage();
  const { subscribe, set, update } = writable(initial.profile);
  const storageCorrupted = writable(initial.corrupted);

  function persist(nextProfile) {
    nextProfile.updatedAt = new Date().toISOString();
    nextProfile.rank = getRankByXp(nextProfile.xp);
    writeToStorage(nextProfile);
    return nextProfile;
  }

  return {
    subscribe,
    storageCorrupted,

    setSummonerName(name, tutorialCompleted = true) {
      const trimmed = String(name ?? '').trim();
      if (!PLAYER_NAME_REGEX.test(trimmed)) {
        throw new Error(
          'El nombre debe tener entre 3 y 16 caracteres (letras, números, espacio, - o _).'
        );
      }
      update((p) => {
        p.player.name = trimmed;
        p.tutorialCompleted = Boolean(tutorialCompleted);
        return persist(p);
      });
    },

    updateSettings(partialSettings) {
      update((p) => {
        p.settings = {
          ...p.settings,
          ...partialSettings
        };
        return persist(p);
      });
    },

    recordMatchResult({
      moduleId,
      rival,
      victory,
      accuracy,
      xpEarned,
      waveHistory = [],
      isTraining = false
    }) {
      update((p) => {
        for (const w of waveHistory) {
          const qType = w.type;
          p.stats.answered += 1;
          if (p.stats.byType[qType]) {
            p.stats.byType[qType].answered += 1;
          }
          if (w.correct) {
            p.stats.correct += 1;
            if (p.stats.byType[qType]) {
              p.stats.byType[qType].correct += 1;
            }
            p.mistakes = p.mistakes.filter((id) => id !== w.qid);
          } else if (w.qid && !p.mistakes.includes(w.qid)) {
            p.mistakes = [w.qid, ...p.mistakes].slice(0, 100);
          }
        }

        if (!isTraining && p.modules[moduleId]) {
          const mod = p.modules[moduleId];
          const stars = calculateMatchStars(victory, accuracy);
          const pct = Math.round(accuracy * 100);

          mod.plays += 1;
          mod.lastPlayedAt = new Date().toISOString();
          mod.stars = Math.max(mod.stars, stars);
          mod.bestScore = Math.max(mod.bestScore, pct);

          if (mod.stars >= 1) {
            const idx = MODULE_IDS.indexOf(moduleId);
            if (idx >= 0 && idx + 1 < MODULE_IDS.length) {
              p.modules[MODULE_IDS[idx + 1]].unlocked = true;
            }
          }

          p.xp += Math.max(0, Math.floor(xpEarned));
          p.history = [
            {
              moduleId,
              rival,
              result: victory ? 'victory' : 'defeat',
              xp: Math.max(0, Math.floor(xpEarned)),
              date: new Date().toISOString()
            },
            ...p.history
          ].slice(0, 20);
        }

        return persist(p);
      });
    },

    pruneMissingMistakes(validQidSet) {
      update((p) => {
        p.mistakes = p.mistakes.filter((qid) => validQidSet.has(qid));
        return persist(p);
      });
    },

    exportProfileJson() {
      let current;
      subscribe((val) => {
        current = val;
      })();
      return JSON.stringify(
        {
          exportHeader: 'sqlcitadel-profile-export',
          exportedAt: new Date().toISOString(),
          profile: current
        },
        null,
        2
      );
    },

    importProfileJson(jsonString) {
      if (typeof jsonString !== 'string') {
        throw new Error('Archivo inválido.');
      }
      const byteLength = new TextEncoder().encode(jsonString).length;
      if (byteLength > MAX_IMPORT_BYTES) {
        throw new Error('El archivo supera el límite máximo permitido de 256 KB.');
      }

      let parsed;
      try {
        parsed = JSON.parse(jsonString);
      } catch {
        throw new Error('El archivo no contiene JSON válido.');
      }

      const candidate = parsed.profile ? parsed.profile : parsed;
      const sanitized = sanitizeAndValidateProfile(candidate);
      if (!sanitized || !sanitized.player.name) {
        throw new Error('El esquema del perfil importado no es válido.');
      }

      persist(sanitized);
      set(sanitized);
      storageCorrupted.set(false);
      return sanitized;
    },

    resetProfile() {
      const fresh = createDefaultProfile();
      writeToStorage(fresh);
      set(fresh);
      storageCorrupted.set(false);
    }
  };
}

export const progressStore = createProgressStore();
