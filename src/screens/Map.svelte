<script>
  import { getModulesMetadata } from '../engine/loader.js';
  import { progressStore } from '../store/progress.js';
  import { router } from '../router.js';

  export let params = {};

  const modules = getModulesMetadata();

  $: mode = params.mode === 'training' ? 'training' : 'match';
  $: freeMode = Boolean($progressStore.settings?.freeMode);
  $: userModules = $progressStore.modules || {};

  function isUnlocked(modId) {
    if (freeMode || mode === 'training') return true;
    return Boolean(userModules[modId]?.unlocked);
  }

  function selectModule(modId) {
    if (!isUnlocked(modId)) return;
    router.navigate('prematch', { module: modId, mode });
  }
</script>

<section class="map-screen">
  <div class="map-header">
    <div>
      <h1>Mapa de Reinos SQL</h1>
      <p class="subtitle">
        Modo actual:
        <strong>{mode === 'training' ? 'Entrenamiento Libre' : 'Partida Clasificatoria'}</strong>
        {#if freeMode}
          · <span class="badge-free">Modo Libre Activo</span>
        {/if}
      </p>
    </div>

    <div class="mode-switch">
      <button
        type="button"
        class:btn-primary={mode === 'match'}
        on:click={() => router.navigate('map', { mode: 'match' })}
      >
        Modo Partida
      </button>
      <button
        type="button"
        class:btn-cyan={mode === 'training'}
        on:click={() => router.navigate('map', { mode: 'training' })}
      >
        Modo Entrenamiento
      </button>
    </div>
  </div>

  <ol class="realms-trail" aria-label="Lista de reinos SQL">
    {#each modules as mod, index (mod.id)}
      {@const unlocked = isUnlocked(mod.id)}
      {@const modState = userModules[mod.id] || { stars: 0, bestScore: 0, plays: 0 }}
      <li class="realm-node" class:locked={!unlocked}>
        <div class="node-connector" aria-hidden="true">
          <span class="node-number">{index + 1}</span>
        </div>

        <div class="moba-panel realm-card">
          <div class="realm-top">
            <span class="mod-code">{mod.id} · {mod.realm}</span>
            <div class="stars-row" aria-label={`${modState.stars} de 3 estrellas`}>
              {#each [1, 2, 3] as starIdx (starIdx)}
                <span class="star" class:earned={modState.stars >= starIdx}>★</span>
              {/each}
            </div>
          </div>

          <h2>{mod.title}</h2>
          <p class="lore">{mod.lore}</p>

          <div class="realm-footer">
            <span class="best-score">
              Mejor precisión: {modState.bestScore}% · Partidas: {modState.plays}
            </span>

            <div class="realm-actions">
              <button
                type="button"
                on:click={() => router.navigate('grimoire', { module: mod.id })}
              >
                Grimorio
              </button>
              <button
                type="button"
                class="btn-primary"
                disabled={!unlocked}
                on:click={() => selectModule(mod.id)}
              >
                {unlocked ? 'Combatir' : '🔒 Bloqueado'}
              </button>
            </div>
          </div>
        </div>
      </li>
    {/each}
  </ol>
</section>

<style>
  .map-screen {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
  }

  .map-header {
    display: flex;
    flex-wrap: wrap;
    justify-content: space-between;
    align-items: center;
    gap: 1rem;
  }

  .subtitle {
    color: var(--text-muted);
  }

  .badge-free {
    color: var(--cyan-magic);
    font-weight: 700;
  }

  .mode-switch {
    display: flex;
    gap: 0.5rem;
  }

  .realms-trail {
    list-style: none;
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .realm-node {
    display: flex;
    gap: 1rem;
    align-items: stretch;
  }

  .realm-node.locked .realm-card {
    opacity: 0.6;
  }

  .node-connector {
    display: flex;
    flex-direction: column;
    align-items: center;
  }

  .node-number {
    width: 38px;
    height: 38px;
    border-radius: 50%;
    background: var(--bg-panel-elevated);
    border: 2px solid var(--gold-primary);
    display: flex;
    align-items: center;
    justify-content: center;
    font-family: var(--font-display);
    color: var(--gold-primary);
    font-weight: 700;
    flex-shrink: 0;
  }

  .realm-card {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .realm-top {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .mod-code {
    font-size: 0.85rem;
    color: var(--cyan-magic);
    font-weight: 700;
    text-transform: uppercase;
  }

  .stars-row {
    font-size: 1.25rem;
    letter-spacing: 0.1em;
  }

  .star {
    color: #334155;
  }

  .star.earned {
    color: var(--gold-primary);
  }

  .lore {
    color: var(--text-muted);
    font-size: 0.92rem;
  }

  .realm-footer {
    display: flex;
    flex-wrap: wrap;
    justify-content: space-between;
    align-items: center;
    gap: 0.75rem;
    margin-top: 0.35rem;
  }

  .best-score {
    font-size: 0.85rem;
    color: var(--text-muted);
  }

  .realm-actions {
    display: flex;
    gap: 0.5rem;
  }

  @media (max-width: 540px) {
    .node-connector {
      display: none;
    }
  }
</style>
