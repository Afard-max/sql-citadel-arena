<script>
  import { getModuleMetaById } from '../engine/loader.js';
  import { BALANCE } from '../engine/balance.js';
  import { progressStore } from '../store/progress.js';
  import { router } from '../router.js';

  export let params = {};

  $: moduleId = params.module || 'M01';
  $: mode = params.mode === 'training' ? 'training' : 'match';
  $: moduleMeta = getModuleMetaById(moduleId) || {
    id: 'M01',
    title: 'Tipos de datos',
    realm: 'Bastión de los Tipos',
    lore: ''
  };

  let selectedRival = $progressStore.settings?.rivalLevelDefault || 'novato';

  function launchBattle() {
    router.navigate('match', {
      module: moduleMeta.id,
      rival: selectedRival,
      mode
    });
  }
</script>

<section class="prematch-screen moba-panel">
  <div class="prematch-header">
    <span class="realm-tag">{moduleMeta.id} · {moduleMeta.realm}</span>
    <h1>{moduleMeta.title}</h1>
    <p>{moduleMeta.lore}</p>
  </div>

  <div class="towers-versus">
    <div class="tower-box player-tower">
      <div class="tower-icon" aria-hidden="true">🏰</div>
      <h2>{$progressStore.player.name || 'Invocador'}</h2>
      <p>Vida de Torre: {BALANCE.towerMaxHp} HP</p>
    </div>

    <div class="vs-badge">VS</div>

    <div class="tower-box rival-tower">
      <div class="tower-icon" aria-hidden="true">🗼</div>
      {#if mode === 'training'}
        <h2>Maniquí de Entrenamiento</h2>
        <p>Sin daño · Pistas ilimitadas · Sin límite de tiempo</p>
      {:else}
        <h2>{BALANCE.rivals[selectedRival]?.name}</h2>
        <p>
          Precisión del bot: {Math.round((BALANCE.rivals[selectedRival]?.accuracy || 0.55) * 100)}%
        </p>
      {/if}
    </div>
  </div>

  {#if mode === 'match'}
    <div class="rival-selector" role="radiogroup" aria-label="Nivel del rival">
      <h3>Selecciona el nivel del rival</h3>
      <div class="rival-buttons">
        {#each Object.values(BALANCE.rivals) as rv (rv.id)}
          <button
            type="button"
            class="rival-option"
            class:selected={selectedRival === rv.id}
            on:click={() => (selectedRival = rv.id)}
          >
            <strong>{rv.name}</strong>
            <span>Acierto: {Math.round(rv.accuracy * 100)}%</span>
          </button>
        {/each}
      </div>
    </div>
  {/if}

  <div class="skills-brief">
    <h3>Habilidades Equipadas (Teclas 1, 2 y 3)</h3>
    <div class="skills-grid">
      <div class="skill-card">
        <span class="key-hint">1</span>
        <div>
          <strong>Pista Arcana</strong>
          <p>Revela una ayuda de sintaxis (reduce el daño de esa oleada al 50%).</p>
        </div>
      </div>

      <div class="skill-card">
        <span class="key-hint">2</span>
        <div>
          <strong>Escudo de Bastión</strong>
          <p>Anula por completo el siguiente ataque exitoso del rival.</p>
        </div>
      </div>

      <div class="skill-card">
        <span class="key-hint">3</span>
        <div>
          <strong>Dilatación Temporal</strong>
          <p>Añade +{BALANCE.extraTimeSeconds} segundos al temporizador de la oleada actual.</p>
        </div>
      </div>
    </div>
  </div>

  <div class="prematch-actions">
    <button type="button" on:click={() => router.navigate('map', { mode })}>
      Volver al Mapa
    </button>
    <button type="button" class="btn-primary start-btn" on:click={launchBattle}>
      ¡Iniciar Batalla!
    </button>
  </div>
</section>

<style>
  .prematch-screen {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
  }

  .realm-tag {
    color: var(--cyan-magic);
    font-weight: 700;
    font-size: 0.85rem;
    text-transform: uppercase;
  }

  .towers-versus {
    display: grid;
    grid-template-columns: 1fr auto 1fr;
    gap: 1rem;
    align-items: center;
    background: var(--bg-input);
    border: var(--border-subtle);
    border-radius: var(--radius-md);
    padding: 1.25rem;
  }

  .tower-box {
    text-align: center;
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
  }

  .tower-icon {
    font-size: 2.5rem;
  }

  .vs-badge {
    font-family: var(--font-display);
    font-size: 1.5rem;
    color: var(--gold-primary);
    font-weight: 700;
  }

  .rival-selector {
    display: flex;
    flex-direction: column;
    gap: 0.65rem;
  }

  .rival-buttons {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 0.75rem;
  }

  .rival-option {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 0.25rem;
    text-align: left;
  }

  .rival-option.selected {
    border-color: var(--cyan-magic);
    background: rgba(54, 209, 220, 0.16);
  }

  .skills-brief {
    display: flex;
    flex-direction: column;
    gap: 0.65rem;
  }

  .skills-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
    gap: 0.75rem;
  }

  .skill-card {
    display: flex;
    gap: 0.75rem;
    align-items: flex-start;
    background: var(--bg-input);
    border: var(--border-subtle);
    border-radius: var(--radius-sm);
    padding: 0.75rem;
  }

  .key-hint {
    width: 28px;
    height: 28px;
    border-radius: var(--radius-sm);
    background: var(--bg-panel-elevated);
    border: 1px solid var(--gold-primary);
    color: var(--gold-primary);
    display: inline-flex;
    align-items: center;
    justify-content: center;
    font-family: var(--font-mono);
    flex-shrink: 0;
  }

  .skill-card p {
    font-size: 0.85rem;
    color: var(--text-muted);
  }

  .prematch-actions {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 1rem;
  }

  .start-btn {
    min-width: 200px;
  }

  @media (max-width: 600px) {
    .towers-versus {
      grid-template-columns: 1fr;
    }
  }
</style>
