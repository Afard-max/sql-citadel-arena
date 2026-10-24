<script>
  import { onMount, onDestroy } from 'svelte';
  import { loadModuleContent, sampleQuestions, getModulesMetadata } from '../engine/loader.js';
  import { matchEngine } from '../engine/match.js';
  import { progressStore } from '../store/progress.js';
  import { router } from '../router.js';

  import TrueFalse from '../games/TrueFalse.svelte';
  import MultiChoice from '../games/MultiChoice.svelte';
  import FillBlank from '../games/FillBlank.svelte';
  import MatchPairs from '../games/MatchPairs.svelte';
  import OrderBlocks from '../games/OrderBlocks.svelte';

  export let params = {};

  let loading = true;
  let loadError = '';

  $: moduleId = params.module || 'M01';
  $: rivalLevel = params.rival || $progressStore.settings?.rivalLevelDefault || 'novato';
  $: mode = params.mode === 'training' ? 'training' : 'match';
  $: isMistakesReview = params.review === 'mistakes';

  $: state = $matchEngine;
  $: playerHpPct = Math.max(0, Math.round((state.playerHp / state.maxHp) * 100));
  $: rivalHpPct = Math.max(0, Math.round((state.rivalHp / state.maxHp) * 100));

  $: if (state.status === 'finished' && state.summary) {
    progressStore.recordMatchResult({
      moduleId: state.moduleId,
      rival: state.rivalLevel,
      victory: state.summary.victory,
      accuracy: state.summary.accuracy,
      xpEarned: state.summary.xpEarned,
      waveHistory: state.waveHistory,
      isTraining: state.mode === 'training'
    });
    router.navigate('results');
  }

  async function initMatch() {
    loading = true;
    loadError = '';
    try {
      let questionsToPlay = [];

      if (isMistakesReview && $progressStore.mistakes.length > 0) {
        const mistakeSet = new Set($progressStore.mistakes);
        const allMeta = getModulesMetadata();
        const collected = [];
        for (const m of allMeta) {
          const content = await loadModuleContent(m.id);
          for (const q of content.questions || []) {
            if (mistakeSet.has(q.qid)) {
              collected.push(q);
            }
          }
        }
        questionsToPlay = sampleQuestions(collected, Math.min(10, collected.length), Date.now());
      }

      if (questionsToPlay.length === 0) {
        const content = await loadModuleContent(moduleId);
        questionsToPlay = sampleQuestions(content.questions, 10, Date.now());
      }

      matchEngine.startMatch({
        moduleId,
        questions: questionsToPlay,
        rivalLevel,
        mode: isMistakesReview ? 'training' : mode,
        seed: Date.now()
      });
      loading = false;
    } catch (err) {
      loadError = err?.message || 'Error al cargar el banco de preguntas del módulo.';
      loading = false;
    }
  }

  function handleAnswerSubmit(responsePayload) {
    matchEngine.submitAnswer(responsePayload);
  }

  function handleGlobalSkillHotkeys(e) {
    if (state.status !== 'playing') return;
    const tag = document.activeElement?.tagName?.toLowerCase();
    if (tag === 'input' || tag === 'textarea') return;

    if (e.key === '1') {
      e.preventDefault();
      matchEngine.useSkill('hint');
    } else if (e.key === '2') {
      e.preventDefault();
      matchEngine.useSkill('shield');
    } else if (e.key === '3') {
      e.preventDefault();
      matchEngine.useSkill('extraTime');
    }
  }

  function formatSolution(solution, q) {
    if (!solution || !q) return '';
    if (q.type === 'tf') {
      return solution.value ? 'Verdadero' : 'Falso';
    }
    if (q.type === 'mc') {
      if (!solution.correct || solution.correct.length === 0) {
        return 'Ninguna es correcta';
      }
      return solution.correct
        .map((id) => q.options?.find((o) => o.id === id)?.text || id)
        .join(' | ');
    }
    if (q.type === 'fb') {
      return (solution.accepted || []).map((variants) => variants[0]).join(', ');
    }
    if (q.type === 'mt') {
      return Object.entries(solution.pairs || {})
        .map(([lId, rId]) => {
          const lTxt = q.left?.find((l) => l.id === lId)?.text || lId;
          const rTxt = q.right?.find((r) => r.id === rId)?.text || rId;
          return `${lTxt} → ${rTxt}`;
        })
        .join(' ; ');
    }
    if (q.type === 'or') {
      return (solution.order || [])
        .map((id) => q.blocks?.find((b) => b.id === id)?.text || id)
        .join(' ');
    }
    return '';
  }

  onMount(() => {
    initMatch();
    window.addEventListener('keydown', handleGlobalSkillHotkeys);
  });

  onDestroy(() => {
    window.removeEventListener('keydown', handleGlobalSkillHotkeys);
  });
</script>

{#if loading}
  <div class="moba-panel status-box" role="status">
    <h2>Invocando pergaminos del reino {moduleId}...</h2>
  </div>
{:else if loadError}
  <div class="moba-panel status-box" role="alert">
    <h2>Fallo al descargar el módulo</h2>
    <p>{loadError}</p>
    <div class="retry-actions">
      <button type="button" on:click={() => router.navigate('map')}>Volver al Mapa</button>
      <button type="button" class="btn-primary" on:click={initMatch}>Reintentar</button>
    </div>
  </div>
{:else if state.currentPublicQuestion}
  <section class="match-hud">
    <!-- Barra superior de Torres y Temporizador (SDD 6.3) -->
    <div class="hud-top moba-panel">
      <div class="tower-status player-side">
        <div class="tower-label">
          <strong>🏰 {$progressStore.player.name || 'Tu Torre'}</strong>
          <span>{state.playerHp} / {state.maxHp} HP</span>
        </div>
        <div class="hp-track">
          <div class="hp-fill player-hp" style={`width: ${playerHpPct}%`}></div>
        </div>
        {#if state.shieldActive}
          <span class="shield-pill">🛡️ Escudo Activo</span>
        {/if}
      </div>

      <div class="wave-center">
        <span class="wave-counter">Oleada {state.waveIndex + 1} / {state.totalWaves}</span>
        {#if state.mode === 'match'}
          <div class="timer-ring" class:urgent={state.timeLeft <= 5}>
            <span>{state.timeLeft}s</span>
          </div>
        {:else}
          <span class="training-pill">Entrenamiento ∞</span>
        {/if}
      </div>

      <div class="tower-status rival-side">
        <div class="tower-label">
          <strong>🗼 {state.rivalName}</strong>
          <span>{state.rivalHp} / {state.maxHp} HP</span>
        </div>
        <div class="hp-track">
          <div class="hp-fill rival-hp" style={`width: ${rivalHpPct}%`}></div>
        </div>
      </div>
    </div>

    <div class="hud-body">
      <!-- Zona central de pregunta y minijuego -->
      <div
        class="question-arena moba-panel"
        class:flash-hit={state.status === 'wave_resolved' && state.lastWaveResolution?.correct}
        class:flash-miss={state.status === 'wave_resolved' && !state.lastWaveResolution?.correct}
      >
        <div class="question-meta">
          <span class="q-tag">{state.currentPublicQuestion.qid}</span>
          <span class="q-diff">Dificultad {'★'.repeat(state.currentPublicQuestion.difficulty)}</span
          >
        </div>

        <h2 class="question-prompt">{state.currentPublicQuestion.prompt}</h2>

        {#key state.currentPublicQuestion.qid}
          {#if state.currentPublicQuestion.type === 'tf'}
            <TrueFalse
              question={state.currentPublicQuestion}
              disabled={state.status !== 'playing'}
              activeHint={state.activeHint}
              onSubmit={handleAnswerSubmit}
            />
          {:else if state.currentPublicQuestion.type === 'mc'}
            <MultiChoice
              question={state.currentPublicQuestion}
              disabled={state.status !== 'playing'}
              activeHint={state.activeHint}
              onSubmit={handleAnswerSubmit}
            />
          {:else if state.currentPublicQuestion.type === 'fb'}
            <FillBlank
              question={state.currentPublicQuestion}
              disabled={state.status !== 'playing'}
              activeHint={state.activeHint}
              onSubmit={handleAnswerSubmit}
            />
          {:else if state.currentPublicQuestion.type === 'mt'}
            <MatchPairs
              question={state.currentPublicQuestion}
              disabled={state.status !== 'playing'}
              activeHint={state.activeHint}
              onSubmit={handleAnswerSubmit}
            />
          {:else if state.currentPublicQuestion.type === 'or'}
            <OrderBlocks
              question={state.currentPublicQuestion}
              disabled={state.status !== 'playing'}
              activeHint={state.activeHint}
              onSubmit={handleAnswerSubmit}
            />
          {/if}
        {/key}

        <!-- Panel de retroalimentación tras responder (SDD 6.5) -->
        {#if state.status === 'wave_resolved' && state.lastWaveResolution}
          {@const res = state.lastWaveResolution}
          <div class="resolution-panel" aria-live="polite">
            <div class="res-header">
              <strong class:ok-text={res.correct} class:err-text={!res.correct}>
                {res.correct
                  ? `¡Conjuro Certero! (−${res.playerDamage} HP al rival)`
                  : `Conjuro Fallido (Puntaje: ${Math.round(res.score * 100)}%)`}
              </strong>
            </div>

            <p class="solution-line">
              <strong>Solución válida:</strong>
              <code>{formatSolution(res.solution, state.currentPublicQuestion)}</code>
            </p>
            <p class="explanation-line">{res.explanation}</p>

            <div class="res-actions">
              <button type="button" class="btn-primary" on:click={() => matchEngine.nextWave()}>
                Siguiente Oleada →
              </button>
            </div>
          </div>
        {/if}
      </div>

      <!-- Barra lateral de Combo y Registro de eventos (SDD 6.3) -->
      <aside class="combat-sidebar moba-panel" aria-label="Estado de combo y registro de combate">
        <div class="combo-box">
          <span class="combo-label">Combo Actual</span>
          <strong class="combo-value">x{state.playerCombo}</strong>
        </div>

        <h3>Registro de Batalla</h3>
        <ul class="combat-log" aria-live="polite">
          {#each state.combatLog as entry (entry.id)}
            <li class={`log-item log-${entry.type}`}>
              <span class="log-wave">[O{entry.wave}]</span>
              <span>{entry.text}</span>
            </li>
          {/each}
        </ul>
      </aside>
    </div>

    <!-- Barra inferior de Habilidades (SDD 6.3) -->
    <div class="hud-skills moba-panel" role=" toolbar" aria-label="Habilidades de partida">
      <button
        type="button"
        class="skill-btn"
        disabled={state.status !== 'playing' || (state.mode === 'match' && state.skills.hint.used)}
        on:click={() => matchEngine.useSkill('hint')}
        aria-keyshortcuts="1"
      >
        <span class="key-badge">1</span>
        <span
          >Pista {state.mode === 'match'
            ? state.skills.hint.used
              ? '(Usada)'
              : '(1/1)'
            : '(∞)'}</span
        >
      </button>

      {#if state.mode === 'match'}
        <button
          type="button"
          class="skill-btn"
          disabled={state.status !== 'playing' || state.skills.shield.used}
          on:click={() => matchEngine.useSkill('shield')}
          aria-keyshortcuts="2"
        >
          <span class="key-badge">2</span>
          <span>Escudo {state.skills.shield.used ? '(Usado)' : '(1/1)'}</span>
        </button>

        <button
          type="button"
          class="skill-btn"
          disabled={state.status !== 'playing' || state.skills.extraTime.used}
          on:click={() => matchEngine.useSkill('extraTime')}
          aria-keyshortcuts="3"
        >
          <span class="key-badge">3</span>
          <span>+10s Tiempo {state.skills.extraTime.used ? '(Usado)' : '(1/1)'}</span>
        </button>
      {/if}

      <button
        type="button"
        class="btn-danger abandon-btn"
        on:click={() => {
          matchEngine.stopMatch();
          router.navigate('map');
        }}
      >
        Retirarse
      </button>
    </div>
  </section>
{/if}

<style>
  .status-box {
    max-width: 520px;
    margin: 2rem auto;
    text-align: center;
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .retry-actions {
    display: flex;
    justify-content: center;
    gap: 0.75rem;
  }

  .match-hud {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .hud-top {
    display: grid;
    grid-template-columns: 1fr auto 1fr;
    gap: 1rem;
    align-items: center;
  }

  .tower-status {
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
  }

  .tower-label {
    display: flex;
    justify-content: space-between;
    font-size: 0.9rem;
  }

  .hp-track {
    width: 100%;
    height: 14px;
    background: var(--bg-input);
    border-radius: 999px;
    overflow: hidden;
    border: 1px solid rgba(255, 255, 255, 0.15);
  }

  .hp-fill {
    height: 100%;
    transition: width 200ms ease-out;
  }

  .player-hp {
    background: linear-gradient(90deg, #10b981, var(--cyan-magic));
  }

  .rival-hp {
    background: linear-gradient(90deg, var(--crimson-dmg), #f97316);
  }

  .shield-pill {
    font-size: 0.8rem;
    color: var(--cyan-magic);
    font-weight: 700;
  }

  .wave-center {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.35rem;
  }

  .wave-counter {
    font-family: var(--font-display);
    color: var(--gold-primary);
    font-size: 0.9rem;
  }

  .timer-ring {
    width: 54px;
    height: 54px;
    border-radius: 50%;
    border: 3px solid var(--gold-primary);
    display: flex;
    align-items: center;
    justify-content: center;
    font-family: var(--font-mono);
    font-weight: 700;
  }

  .timer-ring.urgent {
    border-color: var(--crimson-dmg);
    color: var(--crimson-dmg);
  }

  .training-pill {
    font-size: 0.8rem;
    color: var(--cyan-magic);
  }

  .hud-body {
    display: grid;
    grid-template-columns: 1fr 280px;
    gap: 1rem;
    align-items: start;
  }

  .question-arena {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .question-arena.flash-hit {
    border-color: var(--cyan-magic);
    box-shadow: 0 0 20px var(--cyan-glow);
  }

  .question-arena.flash-miss {
    border-color: var(--crimson-dmg);
    box-shadow: 0 0 20px var(--crimson-glow);
  }

  .question-meta {
    display: flex;
    justify-content: space-between;
    font-size: 0.85rem;
    color: var(--text-muted);
  }

  .q-diff {
    color: var(--gold-primary);
  }

  .question-prompt {
    font-family: var(--font-ui);
    color: var(--text-main);
    font-size: 1.2rem;
  }

  .resolution-panel {
    margin-top: 0.75rem;
    padding: 1rem;
    background: var(--bg-input);
    border: 1px solid var(--gold-primary);
    border-radius: var(--radius-sm);
    display: flex;
    flex-direction: column;
    gap: 0.6rem;
  }

  .ok-text {
    color: var(--cyan-magic);
  }

  .err-text {
    color: var(--crimson-dmg);
  }

  .solution-line code {
    color: var(--gold-primary);
  }

  .explanation-line {
    font-size: 0.92rem;
    color: var(--text-muted);
  }

  .res-actions {
    display: flex;
    justify-content: flex-end;
  }

  .combat-sidebar {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .combo-box {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.65rem;
    background: var(--bg-input);
    border-radius: var(--radius-sm);
    border: var(--border-subtle);
  }

  .combo-value {
    font-family: var(--font-display);
    font-size: 1.4rem;
    color: var(--gold-primary);
  }

  .combat-log {
    list-style: none;
    display: flex;
    flex-direction: column;
    gap: 0.45rem;
    max-height: 280px;
    overflow-y: auto;
    font-size: 0.85rem;
  }

  .log-wave {
    color: var(--gold-primary);
    font-family: var(--font-mono);
    margin-right: 0.35rem;
  }

  .log-damage-dealt {
    color: var(--cyan-magic);
  }

  .log-damage-taken,
  .log-miss {
    color: #ff8fa3;
  }

  .hud-skills {
    display: flex;
    flex-wrap: wrap;
    gap: 0.75rem;
    align-items: center;
  }

  .skill-btn {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
  }

  .key-badge {
    width: 24px;
    height: 24px;
    border-radius: var(--radius-sm);
    background: var(--bg-input);
    border: 1px solid var(--gold-primary);
    color: var(--gold-primary);
    display: inline-flex;
    align-items: center;
    justify-content: center;
    font-family: var(--font-mono);
    font-size: 0.8rem;
  }

  .abandon-btn {
    margin-left: auto;
  }

  @media (max-width: 820px) {
    .hud-top {
      grid-template-columns: 1fr;
    }
    .hud-body {
      grid-template-columns: 1fr;
    }
  }
</style>
