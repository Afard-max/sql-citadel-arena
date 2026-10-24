<script>
  import { progressStore } from '../store/progress.js';
  import { BALANCE } from '../engine/balance.js';

  $: settings = $progressStore.settings;

  function toggleSetting(key) {
    progressStore.updateSettings({ [key]: !settings[key] });
  }

  function changeDefaultRival(e) {
    progressStore.updateSettings({ rivalLevelDefault: e.target.value });
  }
</script>

<section class="settings-screen moba-panel">
  <h1>Ajustes de la Ciudadela</h1>

  <div class="settings-list">
    <div class="setting-item">
      <div>
        <h2>Efectos de Sonido</h2>
        <p>Activa o silencia los efectos acústicos de combate.</p>
      </div>
      <button
        type="button"
        class:btn-primary={settings.sound}
        aria-pressed={settings.sound}
        on:click={() => toggleSetting('sound')}
      >
        {settings.sound ? 'Activado' : 'Silenciado'}
      </button>
    </div>

    <div class="setting-item">
      <div>
        <h2>Movimiento Reducido</h2>
        <p>Minimiza animaciones y transiciones visuales en la interfaz.</p>
      </div>
      <button
        type="button"
        class:btn-primary={settings.reducedMotion}
        aria-pressed={settings.reducedMotion}
        on:click={() => toggleSetting('reducedMotion')}
      >
        {settings.reducedMotion ? 'Activado' : 'Desactivado'}
      </button>
    </div>

    <div class="setting-item">
      <div>
        <h2>Modo Libre (Desbloquear todos los reinos)</h2>
        <p>Permite jugar cualquier módulo (M01–M11) sin exigir estrellas en el anterior.</p>
      </div>
      <button
        type="button"
        class:btn-primary={settings.freeMode}
        aria-pressed={settings.freeMode}
        on:click={() => toggleSetting('freeMode')}
      >
        {settings.freeMode ? 'Activado' : 'Desactivado'}
      </button>
    </div>

    <div class="setting-item">
      <div>
        <label for="default-rival-select">
          <h2>Nivel de Rival por Defecto</h2>
        </label>
        <p>Oponente preseleccionado al entrar a la pantalla Pre-partida.</p>
      </div>
      <select
        id="default-rival-select"
        value={settings.rivalLevelDefault}
        on:change={changeDefaultRival}
      >
        {#each Object.values(BALANCE.rivals) as rv (rv.id)}
          <option value={rv.id}>{rv.name}</option>
        {/each}
      </select>
    </div>
  </div>
</section>

<style>
  .settings-screen {
    max-width: 760px;
    margin: 0 auto;
    display: flex;
    flex-direction: column;
    gap: 1.25rem;
  }

  .settings-list {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .setting-item {
    display: flex;
    flex-wrap: wrap;
    justify-content: space-between;
    align-items: center;
    gap: 1rem;
    padding: 1rem;
    background: var(--bg-input);
    border: var(--border-subtle);
    border-radius: var(--radius-sm);
  }

  .setting-item h2 {
    font-size: 1.05rem;
  }

  .setting-item p {
    font-size: 0.9rem;
    color: var(--text-muted);
  }

  select {
    min-height: 44px;
    padding: 0.45rem 0.75rem;
    background: var(--bg-panel-elevated);
    border: var(--border-gold);
    border-radius: var(--radius-sm);
  }
</style>
