<script>
  import { matchEngine } from '../engine/match.js';
  import { router } from '../router.js';

  $: summary = $matchEngine.summary;

  function retrySameMatch() {
    if (!summary) {
      router.navigate('map');
      return;
    }
    router.navigate('match', {
      module: summary.moduleId,
      rival: summary.rivalLevel,
      mode: summary.mode
    });
  }
</script>

{#if !summary}
  <section class="moba-panel empty-results">
    <h1>Sin resultados recientes</h1>
    <button type="button" class="btn-primary" on:click={() => router.navigate('map')}>
      Ir al Mapa de Reinos
    </button>
  </section>
{:else}
  <section class="results-screen moba-panel">
    <header class="results-banner" class:victory={summary.victory} class:defeat={!summary.victory}>
      <h1>{summary.victory ? '¡VICTORIA EN LA CIUDADELA!' : 'DERROTA DE TORRE'}</h1>
      {#if summary.mode === 'match'}
        <div class="stars-display" aria-label={`${summary.stars} de 3 estrellas`}>
          {#each [1, 2, 3] as s (s)}
            <span class="star" class:earned={summary.stars >= s}>★</span>
          {/each}
        </div>
      {/if}
    </header>

    <div class="metrics-grid">
      <div class="metric-card">
        <span>XP Ganada</span>
        <strong>+{summary.xpEarned} XP</strong>
      </div>
      <div class="metric-card">
        <span>Precisión</span>
        <strong>{Math.round(summary.accuracy * 100)}%</strong>
      </div>
      <div class="metric-card">
        <span>Mejor Combo</span>
        <strong>x{summary.bestCombo}</strong>
      </div>
      <div class="metric-card">
        <span>Torre Jugador / Rival</span>
        <strong>{summary.playerHp} HP / {summary.rivalHp} HP</strong>
      </div>
    </div>

    {#if summary.mistakes && summary.mistakes.length > 0}
      <div class="mistakes-section">
        <h2>Pergaminos Fallados ({summary.mistakes.length})</h2>
        <ul class="mistakes-list">
          {#each summary.mistakes as m (m.qid)}
            <li class="mistake-item">
              <div class="mistake-head">
                <code>{m.qid}</code>
                <span>Puntaje: {Math.round(m.score * 100)}%</span>
              </div>
              <p class="mistake-prompt">{m.prompt}</p>
              <p class="mistake-exp">{m.explanation}</p>
            </li>
          {/each}
        </ul>
      </div>
    {/if}

    <div class="results-actions">
      <button type="button" on:click={() => router.navigate('map')}>Mapa de Reinos</button>
      {#if summary.mistakes && summary.mistakes.length > 0}
        <button
          type="button"
          class="btn-cyan"
          on:click={() =>
            router.navigate('match', {
              module: summary.moduleId,
              mode: 'training',
              review: 'mistakes'
            })}
        >
          Repasar Errores
        </button>
      {/if}
      <button type="button" class="btn-primary" on:click={retrySameMatch}>
        Reintentar Reino
      </button>
    </div>
  </section>
{/if}

<style>
  .empty-results,
  .results-screen {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
  }

  .results-banner {
    text-align: center;
    padding: 1.25rem;
    border-radius: var(--radius-sm);
    background: var(--bg-input);
    border: var(--border-subtle);
  }

  .results-banner.victory h1 {
    color: var(--gold-primary);
  }

  .results-banner.defeat h1 {
    color: var(--crimson-dmg);
  }

  .stars-display {
    font-size: 2rem;
    margin-top: 0.4rem;
  }

  .star {
    color: #334155;
  }

  .star.earned {
    color: var(--gold-primary);
  }

  .metrics-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
    gap: 0.85rem;
  }

  .metric-card {
    background: var(--bg-input);
    border: var(--border-subtle);
    border-radius: var(--radius-sm);
    padding: 0.9rem;
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  .metric-card span {
    font-size: 0.85rem;
    color: var(--text-muted);
  }

  .metric-card strong {
    font-size: 1.3rem;
    color: var(--cyan-magic);
  }

  .mistakes-section {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .mistakes-list {
    list-style: none;
    display: flex;
    flex-direction: column;
    gap: 0.65rem;
  }

  .mistake-item {
    background: var(--bg-input);
    border-left: 3px solid var(--crimson-dmg);
    padding: 0.85rem;
    border-radius: var(--radius-sm);
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
  }

  .mistake-head {
    display: flex;
    justify-content: space-between;
    font-size: 0.85rem;
    color: var(--gold-primary);
  }

  .mistake-prompt {
    font-weight: 600;
  }

  .mistake-exp {
    font-size: 0.9rem;
    color: var(--text-muted);
  }

  .results-actions {
    display: flex;
    flex-wrap: wrap;
    justify-content: flex-end;
    gap: 0.75rem;
  }
</style>
