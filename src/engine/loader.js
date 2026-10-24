import { createPRNG } from './prng.js';
import modulesMeta from '../content/modules.json';

const MODULE_IMPORTERS = {
  M01: () => import('../content/M01.json'),
  M02: () => import('../content/M02.json'),
  M03: () => import('../content/M03.json'),
  M04: () => import('../content/M04.json'),
  M05: () => import('../content/M05.json'),
  M06: () => import('../content/M06.json'),
  M07: () => import('../content/M07.json'),
  M08: () => import('../content/M08.json'),
  M09: () => import('../content/M09.json'),
  M10: () => import('../content/M10.json'),
  M11: () => import('../content/M11.json')
};

const REQUIRED_TYPES = ['tf', 'mc', 'fb', 'mt', 'or'];

export function getModulesMetadata() {
  return modulesMeta.modules;
}

export function getModuleMetaById(moduleId) {
  return modulesMeta.modules.find((m) => m.id === moduleId) || null;
}

export async function loadModuleContent(moduleId) {
  const importer = MODULE_IMPORTERS[moduleId];
  if (!importer) {
    throw new Error(`El módulo ${moduleId} no existe.`);
  }
  const mod = await importer();
  return mod.default || mod;
}

/**
 * Muestrea `count` preguntas de una lista usando PRNG con semilla.
 * Si count >= 5, garantiza al menos 1 pregunta de cada uno de los 5 tipos (Sección 4.4 SDD).
 */
export function sampleQuestions(questions, count = 10, seed = Date.now()) {
  if (!Array.isArray(questions) || questions.length === 0) {
    return [];
  }
  const prng = createPRNG(seed);
  const targetCount = Math.max(1, Math.min(count, 20, questions.length));
  const selected = [];
  const usedIds = new Set();

  if (targetCount >= 5) {
    for (const type of REQUIRED_TYPES) {
      const candidates = questions.filter((q) => q.type === type && !usedIds.has(q.qid));
      if (candidates.length > 0) {
        const shuffled = prng.shuffle(candidates);
        selected.push(shuffled[0]);
        usedIds.add(shuffled[0].qid);
      }
    }
  }

  const remainingPool = prng.shuffle(questions.filter((q) => !usedIds.has(q.qid)));
  for (const q of remainingPool) {
    if (selected.length >= targetCount) break;
    selected.push(q);
    usedIds.add(q.qid);
  }

  return prng.shuffle(selected);
}
