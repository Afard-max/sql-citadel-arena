<script>
  import { progressStore, MAX_IMPORT_BYTES } from '../store/progress.js';
  import { router } from '../router.js';

  const TYPE_LABELS = {
    tf: 'Verdadero / Falso',
    mc: 'Opción Múltiple',
    fb: 'Completar Huecos',
    mt: 'Unir con Flechas',
    or: 'Ordenar Bloques'
  };

  let statusMessage = '';
  let errorMessage = '';
  let confirmResetOpen = false;

  $: profile = $progressStore;
  $: globalAcc =
    profile.stats.answered > 0
      ? Math.round((profile.stats.correct / profile.stats.answered) * 100)
      : 0;

  function handleExport() {
    errorMessage = '';
    const jsonStr = progressStore.exportProfileJson();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sql-citadel-profile-${profile.player.name || 'invocador'}.json`;
    a.click();
    URL.revokeObjectURL(url);
    statusMessage = 'Perfil exportado correctamente.';
  }

  async function handleFileImport(e) {
    statusMessage = '';
    errorMessage = '';
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > MAX_IMPORT_BYTES) {
      errorMessage = 'El archivo supera el límite máximo permitido de 256 KB.';
      e.target.value = '';
      return;
    }

    const confirmed = window.confirm(
      '¿Deseas reemplazar tu progreso actual con el archivo seleccionado?'
    );
    if (!confirmed) {
      e.target.value = '';
      return;
    }

    try {
      const text = await file.text();
      progressStore.importProfileJson(text);
      statusMessage = 'Progreso importado y validado con éxito.';
    } catch (err) {
      errorMessage = err?.message || 'Error al importar el archivo JSON.';
    } finally {
      e.target.value = '';
    }
  }

  function handleResetConfirmed() {
    progressStore.resetProfile();
    confirmResetOpen = false;
    router.navigate('lobby');
  }
</script>

<section class="profile-screen">
  <div class="moba-panel profile-header">
    <div>
      <span class="rank-badge">{profile.rank}</span>
      <h1>{profile.player.name || 'Invocador'}</h1>
      <p>
        Experiencia Total: <strong>{profile.xp} XP</strong> · Precisión Global:
        <strong>{globalAcc}%</strong> ({profile.stats.correct}/{profile.stats.answered})
      </p>
    </div>

    {#if profile.mistakes.length > 0}
      <button
        type="button"
        class="btn-cyan"
        on:click={() => router.navigate('match', { mode: 'training', review: 'mistakes' })}
      >
        Repasar {profile.mistakes.length} errores pendientes
      </button>
    {/if}
  </div>

  <div class="profile-columns">
    <div class="moba-panel">
      <h2>Estadísticas por Tipo de Minijuego</h2>
      <ul class="stats-list">
        {#each Object.entries(TYPE_LABELS) as [key, label] (key)}
          {@const st = profile.stats.byType?.[key] || { answered: 0, correct: 0 }}
          {@const pct = st.answered > 0 ? Math.round((st.correct / st.answered) * 100) : 0}
          <li class="stat-row">
            <span>{label}</span>
            <strong>{st.correct} / {st.answered} ({pct}%)</strong>
          </li>
        {/each}
      </ul>
    </div>

    <div class="moba-panel">
      <h2>Historial Reciente (Últimas 20 Partidas)</h2>
      {#if profile.history.length === 0}
        <p class="muted">Aún no has registrado partidas clasificatorias.</p>
      {:else}
        <ul class="history-list">
          {#each profile.history as item, idx (idx)}
            <li class="history-row">
              <span>
                <strong>{item.moduleId}</strong> vs. {item.rival}
              </span>
              <span class:win={item.result === 'victory'} class:loss={item.result !== 'victory'}>
                {item.result === 'victory' ? 'VICTORIA' : 'DERROTA'} (+{item.xp} XP)
              </span>
            </li>
          {/each}
        </ul>
      {/if}
    </div>
  </div>

  <div class="moba-panel data-management">
    <h2>Gestión de Datos Locales</h2>
    <p class="muted">
      Tu perfil se guarda en este navegador (<code>localStorage</code>). Puedes respaldarlo o
      restaurarlo mediante un archivo JSON (máximo 256 KB).
    </p>

    {#if statusMessage}
      <p class="ok-banner" role="status">{statusMessage}</p>
    {/if}
    {#if errorMessage}
      <p class="err-banner" role="alert">{errorMessage}</p>
    {/if}

    <div class="data-actions">
      <button type="button" class="btn-primary" on:click={handleExport}>
        Exportar Progreso (.json)
      </button>

      <label class="import-label">
        <span>Importar Progreso (.json)</span>
        <input type="file" accept="application/json,.json" on:change={handleFileImport} />
      </label>

      {#if !confirmResetOpen}
        <button type="button" class="btn-danger" on:click={() => (confirmResetOpen = true)}>
          Borrar Progreso
        </button>
      {:else}
        <div class="confirm-delete-inline">
          <span>¿Confirmas borrar todo el perfil?</span>
          <button type="button" class="btn-danger" on:click={handleResetConfirmed}>
            Sí, borrar definitivamente
          </button>
          <button type="button" on:click={() => (confirmResetOpen = false)}>Cancelar</button>
        </div>
      {/if}
    </div>
  </div>
</section>

<style>
  .profile-screen {
    display: flex;
    flex-direction: column;
    gap: 1.25rem;
  }

  .profile-header {
    display: flex;
    flex-wrap: wrap;
    justify-content: space-between;
    align-items: center;
    gap: 1rem;
  }

  .rank-badge {
    color: var(--cyan-magic);
    font-weight: 700;
    text-transform: uppercase;
    font-size: 0.85rem;
  }

  .profile-columns {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
    gap: 1.25rem;
  }

  .stats-list,
  .history-list {
    list-style: none;
    margin-top: 0.85rem;
    display: flex;
    flex-direction: column;
    gap: 0.55rem;
  }

  .stat-row,
  .history-row {
    display: flex;
    justify-content: space-between;
    padding: 0.55rem 0.75rem;
    background: var(--bg-input);
    border-radius: var(--radius-sm);
    font-size: 0.92rem;
  }

  .win {
    color: var(--cyan-magic);
    font-weight: 700;
  }

  .loss {
    color: var(--crimson-dmg);
  }

  .muted {
    color: var(--text-muted);
    font-size: 0.92rem;
    margin-top: 0.4rem;
  }

  .data-management {
    display: flex;
    flex-direction: column;
    gap: 0.85rem;
  }

  .ok-banner {
    color: var(--cyan-magic);
    font-weight: 600;
  }

  .err-banner {
    color: var(--crimson-dmg);
    font-weight: 600;
  }

  .data-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 0.75rem;
    align-items: center;
  }

  .import-label {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-height: 44px;
    padding: 0.5rem 1rem;
    border: var(--border-gold);
    border-radius: var(--radius-sm);
    background: var(--bg-panel-elevated);
    cursor: pointer;
    font-weight: 600;
  }

  .import-label input {
    display: none;
  }

  .confirm-delete-inline {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.5rem;
  }
</style>
