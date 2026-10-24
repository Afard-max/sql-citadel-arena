<script>
  import { router } from './router.js';
  import { progressStore } from './store/progress.js';

  import Lobby from './screens/Lobby.svelte';
  import MapScreen from './screens/Map.svelte';
  import PreMatch from './screens/PreMatch.svelte';
  import Match from './screens/Match.svelte';
  import Results from './screens/Results.svelte';
  import Grimoire from './screens/Grimoire.svelte';
  import Profile from './screens/Profile.svelte';
  import Settings from './screens/Settings.svelte';

  $: currentRoute = $router.route;
  $: routeParams = $router.params;
  $: reducedMotion = Boolean($progressStore.settings?.reducedMotion);
  $: corrupted = progressStore.storageCorrupted;

  function confirmResetCorrupted() {
    progressStore.resetProfile();
  }
</script>

<div class="app-shell" class:reduced-motion={reducedMotion}>
  <header class="topbar">
    <button
      type="button"
      class="brand-btn"
      on:click={() => router.navigate('lobby')}
      aria-label="Ir al Lobby de SQL Citadel Arena"
    >
      <span class="crest" aria-hidden="true">⚔</span>
      <span class="brand-title">SQL Citadel Arena</span>
    </button>

    {#if $progressStore.player.name && currentRoute !== 'match'}
      <nav class="quick-nav" aria-label="Navegación principal">
        <button
          type="button"
          class:active={currentRoute === 'lobby'}
          on:click={() => router.navigate('lobby')}
        >
          Lobby
        </button>
        <button
          type="button"
          class:active={currentRoute === 'map'}
          on:click={() => router.navigate('map')}
        >
          Mapa
        </button>
        <button
          type="button"
          class:active={currentRoute === 'grimoire'}
          on:click={() => router.navigate('grimoire')}
        >
          Grimorio
        </button>
        <button
          type="button"
          class:active={currentRoute === 'profile'}
          on:click={() => router.navigate('profile')}
        >
          Perfil
        </button>
        <button
          type="button"
          class:active={currentRoute === 'settings'}
          on:click={() => router.navigate('settings')}
        >
          Ajustes
        </button>
      </nav>
    {/if}
  </header>

  {#if $corrupted}
    <div class="corrupted-modal-backdrop" role="dialog" aria-modal="true">
      <div class="moba-panel corrupted-modal">
        <h2>Datos de perfil dañados</h2>
        <p>
          El registro guardado en este navegador no cumple con el esquema de validación. ¿Deseas
          inicializar un perfil limpio?
        </p>
        <button type="button" class="btn-primary" on:click={confirmResetCorrupted}>
          Confirmar y crear nuevo perfil
        </button>
      </div>
    </div>
  {/if}

  <main class="screen-container">
    {#if currentRoute === 'lobby'}
      <Lobby />
    {:else if currentRoute === 'map'}
      <MapScreen params={routeParams} />
    {:else if currentRoute === 'prematch'}
      <PreMatch params={routeParams} />
    {:else if currentRoute === 'match'}
      <Match params={routeParams} />
    {:else if currentRoute === 'results'}
      <Results />
    {:else if currentRoute === 'grimoire'}
      <Grimoire params={routeParams} />
    {:else if currentRoute === 'profile'}
      <Profile />
    {:else if currentRoute === 'settings'}
      <Settings />
    {:else}
      <Lobby />
    {/if}
  </main>
</div>

<style>
  .app-shell {
    min-height: 100vh;
    display: flex;
    flex-direction: column;
  }

  .app-shell.reduced-motion :global(*),
  .app-shell.reduced-motion :global(*::before),
  .app-shell.reduced-motion :global(*::after) {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }

  .topbar {
    display: flex;
    flex-wrap: wrap;
    justify-content: space-between;
    align-items: center;
    gap: 0.75rem;
    padding: 0.75rem 1.25rem;
    background: rgba(11, 16, 38, 0.92);
    border-bottom: var(--border-subtle);
  }

  .brand-btn {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    background: transparent;
    border: none;
    padding: 0.25rem 0.5rem;
  }

  .crest {
    color: var(--gold-primary);
    font-size: 1.35rem;
  }

  .brand-title {
    font-family: var(--font-display);
    color: var(--gold-primary);
    font-size: 1.15rem;
    letter-spacing: 0.06em;
  }

  .quick-nav {
    display: flex;
    flex-wrap: wrap;
    gap: 0.45rem;
  }

  .quick-nav button {
    padding: 0.35rem 0.75rem;
    font-size: 0.9rem;
    border-color: transparent;
    background: transparent;
    color: var(--text-muted);
  }

  .quick-nav button.active {
    border-color: var(--gold-primary);
    color: var(--gold-primary);
    background: rgba(245, 197, 66, 0.1);
  }

  .screen-container {
    flex: 1;
    width: 100%;
    max-width: 1120px;
    margin: 0 auto;
    padding: 1.25rem;
  }

  .corrupted-modal-backdrop {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.78);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 1rem;
    z-index: 50;
  }

  .corrupted-modal {
    max-width: 440px;
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  @media (max-width: 480px) {
    .screen-container {
      padding: 0.75rem;
    }
  }
</style>
