import { writable } from 'svelte/store';
import { BALANCE, calculateWaveDamage, calculateMatchStars } from './balance.js';
import { evaluate, hint, toPublicQuestion } from './validators.js';
import { createBot } from './bot.js';
import { createPRNG } from './prng.js';

function createInitialState() {
  return {
    status: 'idle', // 'idle' | 'playing' | 'wave_resolved' | 'finished'
    mode: 'match', // 'match' | 'training'
    moduleId: 'M01',
    rivalLevel: 'novato',
    rivalName: '',
    seed: 0,
    waveIndex: 0,
    totalWaves: BALANCE.wavesPerMatch,
    playerHp: BALANCE.towerMaxHp,
    rivalHp: BALANCE.towerMaxHp,
    maxHp: BALANCE.towerMaxHp,
    playerCombo: 0,
    playerBestCombo: 0,
    rivalCombo: 0,
    timeLeft: 0,
    timeLimit: 30,
    currentPublicQuestion: null,
    activeHint: null,
    usedHintThisWave: false,
    shieldActive: false,
    skills: {
      hint: { available: true, used: false },
      shield: { available: true, used: false },
      extraTime: { available: true, used: false }
    },
    lastWaveResolution: null,
    waveHistory: [],
    combatLog: [],
    summary: null
  };
}

export function createMatchEngine() {
  const { subscribe, set, update } = writable(createInitialState());

  let internalQuestions = [];
  let botInstance = null;
  let prngInstance = null;
  let timerId = null;
  let waveStartTimestamp = 0;
  let pendingBotOutcome = null;
  let botHasActedThisWave = false;

  function clearTimer() {
    if (timerId !== null) {
      clearInterval(timerId);
      timerId = null;
    }
  }

  function appendLog(state, text, type = 'info') {
    const entry = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      wave: state.waveIndex + 1,
      text,
      type
    };
    state.combatLog = [entry, ...state.combatLog].slice(0, 30);
  }

  function setupWave(state, index) {
    const rawQ = internalQuestions[index];
    const defaultLimit = BALANCE.defaultTimeLimits[rawQ.type] || 30;
    const limit = rawQ.timeLimit || defaultLimit;

    state.status = 'playing';
    state.waveIndex = index;
    state.timeLimit = limit;
    state.timeLeft = limit;
    state.currentPublicQuestion = toPublicQuestion(rawQ, prngInstance);
    state.activeHint = null;
    state.usedHintThisWave = false;
    state.lastWaveResolution = null;

    waveStartTimestamp = Date.now();
    botHasActedThisWave = false;

    if (state.mode === 'match' && botInstance) {
      pendingBotOutcome = botInstance.simulateWave({
        difficulty: rawQ.difficulty || 1,
        timeLimit: limit,
        currentCombo: state.rivalCombo
      });
    } else {
      pendingBotOutcome = null;
    }
  }

  function applyBotTurnIfNeeded(state) {
    if (state.mode !== 'match' || !pendingBotOutcome || botHasActedThisWave) {
      return { rivalDamageDealt: 0, blockedByShield: false, botCorrect: false };
    }

    botHasActedThisWave = true;
    const outcome = pendingBotOutcome;
    state.rivalCombo = outcome.nextCombo;

    let rivalDamageDealt = outcome.damage;
    let blockedByShield = false;

    if (outcome.correct) {
      if (state.shieldActive) {
        blockedByShield = true;
        rivalDamageDealt = 0;
        state.shieldActive = false;
        appendLog(state, '¡Escudo activado! Daño del rival anulado (0).', 'shield');
      } else {
        state.playerHp = Math.max(0, state.playerHp - rivalDamageDealt);
        appendLog(state, `Rival acertó: −${rivalDamageDealt} a tu torre.`, 'damage-taken');
      }
    } else {
      appendLog(state, 'El rival falló su conjuro en esta oleada.', 'info');
    }

    return {
      rivalDamageDealt,
      blockedByShield,
      botCorrect: outcome.correct
    };
  }

  function startLoop() {
    clearTimer();
    timerId = setInterval(() => {
      let timedOut = false;
      update((state) => {
        if (state.status !== 'playing' || state.mode === 'training') {
          return state;
        }

        const elapsed = (Date.now() - waveStartTimestamp) / 1000;
        const remaining = Math.max(0, Number((state.timeLimit - elapsed).toFixed(1)));
        state.timeLeft = remaining;

        if (
          pendingBotOutcome &&
          !botHasActedThisWave &&
          elapsed >= pendingBotOutcome.responseTime
        ) {
          applyBotTurnIfNeeded(state);
        }

        if (remaining <= 0 || state.playerHp <= 0) {
          timedOut = true;
        }
        return state;
      });

      if (timedOut) {
        submitAnswer({ __timeout: true });
      }
    }, 100);
  }

  function startMatch({
    moduleId = 'M01',
    questions = [],
    rivalLevel = 'novato',
    mode = 'match',
    seed = Date.now()
  }) {
    clearTimer();
    if (!Array.isArray(questions) || questions.length === 0) {
      throw new Error('Se requiere al menos una pregunta para iniciar la partida.');
    }

    internalQuestions = questions;
    prngInstance = createPRNG(seed);
    botInstance = mode === 'match' ? createBot(rivalLevel, seed) : null;

    const initial = createInitialState();
    initial.mode = mode;
    initial.moduleId = moduleId;
    initial.rivalLevel = rivalLevel;
    initial.rivalName = botInstance ? botInstance.name : 'Modo Entrenamiento';
    initial.seed = prngInstance.getSeed();
    initial.totalWaves = questions.length;

    setupWave(initial, 0);
    set(initial);

    if (mode === 'match') {
      startLoop();
    }
  }

  function submitAnswer(userResponse) {
    clearTimer();

    update((state) => {
      if (state.status !== 'playing') return state;

      const rawQ = internalQuestions[state.waveIndex];
      const elapsed =
        state.mode === 'training'
          ? 0
          : Math.min(state.timeLimit, (Date.now() - waveStartTimestamp) / 1000);

      const isTimeout = Boolean(userResponse && userResponse.__timeout);
      const evalResult = isTimeout
        ? {
            score: 0,
            correct: false,
            solution: structuredClone(rawQ.answer),
            explanation: rawQ.explanation
          }
        : evaluate(rawQ, userResponse);

      const prevCombo = state.playerCombo;
      const playerDamage =
        state.mode === 'training'
          ? 0
          : calculateWaveDamage({
              difficulty: rawQ.difficulty || 1,
              score: evalResult.score,
              comboStreak: prevCombo,
              timeSpent: elapsed,
              timeLimit: state.timeLimit,
              usedHint: state.usedHintThisWave
            });

      if (evalResult.correct) {
        state.playerCombo += 1;
        state.playerBestCombo = Math.max(state.playerBestCombo, state.playerCombo);
      } else {
        state.playerCombo = 0;
      }

      if (state.mode === 'match' && playerDamage > 0) {
        state.rivalHp = Math.max(0, state.rivalHp - playerDamage);
        appendLog(
          state,
          `¡Conjuro exitoso! −${playerDamage} a la torre rival (Combo x${state.playerCombo}).`,
          'damage-dealt'
        );
      } else if (!evalResult.correct) {
        appendLog(
          state,
          isTimeout ? 'Tiempo agotado: conjuro fallido.' : 'Error de sintaxis: combo reiniciado.',
          'miss'
        );
      }

      const botTurn = applyBotTurnIfNeeded(state);

      const waveRecord = {
        wave: state.waveIndex + 1,
        qid: rawQ.qid,
        type: rawQ.type,
        difficulty: rawQ.difficulty || 1,
        prompt: rawQ.prompt,
        score: evalResult.score,
        correct: evalResult.correct,
        solution: evalResult.solution,
        explanation: evalResult.explanation,
        timeSpent: Number(elapsed.toFixed(2)),
        playerDamage,
        rivalDamage: botTurn.rivalDamageDealt,
        blockedByShield: botTurn.blockedByShield
      };

      state.waveHistory = [...state.waveHistory, waveRecord];
      state.lastWaveResolution = waveRecord;
      state.status = 'wave_resolved';

      return state;
    });
  }

  function nextWave() {
    let shouldRestartTimer = false;

    update((state) => {
      if (state.status !== 'wave_resolved') return state;

      const isTowerDown = state.mode === 'match' && (state.playerHp <= 0 || state.rivalHp <= 0);
      const isLastWave = state.waveIndex + 1 >= state.totalWaves;

      if (isTowerDown || isLastWave) {
        state.status = 'finished';
        state.summary = buildSummary(state);
        return state;
      }

      setupWave(state, state.waveIndex + 1);
      shouldRestartTimer = state.mode === 'match';
      return state;
    });

    if (shouldRestartTimer) {
      startLoop();
    }
  }

  function buildSummary(state) {
    const total = state.waveHistory.length || 1;
    const correctWaves = state.waveHistory.filter((w) => w.correct).length;
    const accuracy = Number((correctWaves / total).toFixed(4));

    let victory = true;
    if (state.mode === 'match') {
      if (state.rivalHp <= 0 && state.playerHp > 0) {
        victory = true;
      } else if (state.playerHp <= 0 && state.rivalHp > 0) {
        victory = false;
      } else {
        // Empate: gana el jugador según Sección 7 del SDD
        victory = state.playerHp >= state.rivalHp;
      }
    }

    let xpEarned = 0;
    if (state.mode === 'match') {
      for (const w of state.waveHistory) {
        if (w.correct) {
          const weight = BALANCE.difficultyWeights[w.difficulty] || 1.0;
          xpEarned += Math.round(BALANCE.xpPerCorrectWaveBase * weight);
        }
      }
      if (victory) {
        xpEarned += BALANCE.xpVictoryBonus;
      }
    }

    const stars = state.mode === 'match' ? calculateMatchStars(victory, accuracy) : 0;
    const mistakes = state.waveHistory.filter((w) => !w.correct);

    return {
      mode: state.mode,
      moduleId: state.moduleId,
      rivalLevel: state.rivalLevel,
      victory,
      stars,
      xpEarned,
      accuracy,
      bestCombo: state.playerBestCombo,
      playerHp: state.playerHp,
      rivalHp: state.rivalHp,
      mistakes
    };
  }

  function useSkill(skillName) {
    update((state) => {
      if (state.status !== 'playing') return state;

      const rawQ = internalQuestions[state.waveIndex];

      if (skillName === 'hint') {
        if (state.mode === 'match' && state.skills.hint.used) return state;
        state.activeHint = hint(rawQ);
        if (state.mode === 'match') {
          state.usedHintThisWave = true;
          state.skills.hint.used = true;
          state.skills.hint.available = false;
          appendLog(state, 'Habilidad Pista usada (daño de esta oleada al 50%).', 'skill');
        }
      } else if (skillName === 'shield') {
        if (state.mode !== 'match' || state.skills.shield.used) return state;
        state.shieldActive = true;
        state.skills.shield.used = true;
        state.skills.shield.available = false;
        appendLog(state, 'Habilidad Escudo activada para el próximo ataque rival.', 'skill');
      } else if (skillName === 'extraTime') {
        if (state.mode !== 'match' || state.skills.extraTime.used) return state;
        state.timeLimit += BALANCE.extraTimeSeconds;
        state.timeLeft = Math.min(state.timeLimit, state.timeLeft + BALANCE.extraTimeSeconds);
        state.skills.extraTime.used = true;
        state.skills.extraTime.available = false;
        appendLog(state, `Habilidad Tiempo Extra usada (+${BALANCE.extraTimeSeconds} s).`, 'skill');
      }

      return state;
    });
  }

  function stopMatch() {
    clearTimer();
    set(createInitialState());
  }

  return {
    subscribe,
    startMatch,
    submitAnswer,
    nextWave,
    useSkill,
    stopMatch
  };
}

export const matchEngine = createMatchEngine();
