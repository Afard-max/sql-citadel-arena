<script>
  import { getModulesMetadata } from '../engine/loader.js';
  import { router } from '../router.js';

  export let params = {};

  const modules = getModulesMetadata();
  $: selectedId =
    params.module && modules.some((m) => m.id === params.module)
      ? params.module
      : modules[0]?.id || 'M01';
  $: currentModule = modules.find((m) => m.id === selectedId) || modules[0];
</script>

<section class="grimoire-screen">
  <div class="grimoire-header">
    <h1>Grimorio de Sintaxis (MySQL 8.4 LTS)</h1>
    <p class="subtitle">Manual de referencia rápida para cada reino de la Ciudadela.</p>
  </div>

  <div class="grimoire-layout">
    <aside class="module-list moba-panel" aria-label="Selector de módulo del Grimorio">
      {#each modules as mod (mod.id)}
        <button
          type="button"
          class="mod-tab"
          class:active={mod.id === selectedId}
          on:click={() => router.navigate('grimoire', { module: mod.id })}
        >
          <strong>{mod.id}</strong>
          <span>{mod.title}</span>
        </button>
      {/each}
    </aside>

    {#if currentModule}
      <article class="grimoire-content moba-panel">
        <header>
          <span class="realm-badge">{currentModule.id} · {currentModule.realm}</span>
          <h2>{currentModule.title}</h2>
          <p class="lore">{currentModule.lore}</p>
        </header>

        <div class="entries-list">
          {#each currentModule.grimoire || [] as entry (entry.topic)}
            <section class="grimoire-entry">
              <h3>{entry.topic}</h3>
              <pre class="sql-code-block"><code>{entry.syntax}</code></pre>
              <p>{entry.notes}</p>
            </section>
          {/each}
        </div>

        <footer class="grimoire-footer">
          <button
            type="button"
            class="btn-primary"
            on:click={() => router.navigate('prematch', { module: currentModule.id })}
          >
            Practicar {currentModule.id}
          </button>
        </footer>
      </article>
    {/if}
  </div>
</section>

<style>
  .grimoire-screen {
    display: flex;
    flex-direction: column;
    gap: 1.25rem;
  }

  .subtitle {
    color: var(--text-muted);
  }

  .grimoire-layout {
    display: grid;
    grid-template-columns: 270px 1fr;
    gap: 1.25rem;
    align-items: start;
  }

  .module-list {
    display: flex;
    flex-direction: column;
    gap: 0.45rem;
    padding: 0.85rem;
  }

  .mod-tab {
    display: flex;
    align-items: center;
    gap: 0.6rem;
    text-align: left;
    background: transparent;
    border-color: transparent;
    font-size: 0.9rem;
  }

  .mod-tab.active {
    border-color: var(--gold-primary);
    background: rgba(245, 197, 66, 0.14);
    color: var(--gold-primary);
  }

  .grimoire-content {
    display: flex;
    flex-direction: column;
    gap: 1.25rem;
  }

  .realm-badge {
    color: var(--cyan-magic);
    font-size: 0.85rem;
    font-weight: 700;
    text-transform: uppercase;
  }

  .lore {
    color: var(--text-muted);
    margin-top: 0.25rem;
  }

  .entries-list {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .grimoire-entry {
    background: var(--bg-input);
    border: var(--border-subtle);
    border-radius: var(--radius-sm);
    padding: 1rem;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .sql-code-block {
    background: #070b19;
    border-left: 3px solid var(--cyan-magic);
    padding: 0.75rem;
    overflow-x: auto;
    color: var(--cyan-magic);
    font-size: 0.92rem;
  }

  .grimoire-footer {
    display: flex;
    justify-content: flex-end;
  }

  @media (max-width: 768px) {
    .grimoire-layout {
      grid-template-columns: 1fr;
    }
  }
</style>
