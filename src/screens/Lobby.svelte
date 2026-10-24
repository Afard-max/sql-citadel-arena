<script>
  import { progressStore, PLAYER_NAME_REGEX } from '../store/progress.js';
  import { getNextRankInfo } from '../engine/balance.js';
  import { router } from '../router.js';

  let nameInput = '';
  let nameError = '';
  let tutorialStep = 1;

  $: profile = $progressStore;
  $: hasSummoner = Boolean(profile.player?.name);
  $: nextRank = getNextRankInfo(profile.xp);
  $: xpProgressPct = nextRank.nextRank
    ? Math.min(100, Math.round((profile.xp / nextRank.requiredXp) * 100))
    : 100;

  function submitSummoner(e) {
    e.preventDefault();
    const trimmed = nameInput.trim();
    if (!PLAYER_NAME_REGEX.test(trimmed)) {
      nameError =
        'Usa entre 3 y 16 caracteres alfanuméricos, espacios, guiones (-) o guiones bajos (_).';
      return;
    }
    nameError = '';
    progressStore.setSummonerName(trimmed, true);
  }
</script>

{#if !hasSummoner}
  <section class="summoner-onboarding moba-panel" aria-labelledby="onboarding-title">
    <h1 id="onboarding-title">Registro de Invocador</h1>
    <p class="subtitle">Bienvenido a la Ciudadela de Consultas MySQL 8.4.</p>

    <div class="tutorial-steps" aria-live="polite">
      {#if tutorialStep === 1}
        <article class="tutorial-card">
          <h2>Paso 1 de 3: Duelos de Torres</h2>
          <p>
            Cada partida consta de 10 oleadas de sentencias SQL. Tus aciertos dañan la torre rival y
            los aciertos del bot dañan tu torre.
          </p>
        </article>
      {:else if tutorialStep === 2}
        <article class="tutorial-card">
          <h2>Paso 2 de 3: Cinco disciplinas arcanas</h2>
          <p>
            Resolverás retos de Verdadero/Falso, Opción Múltiple, Completar Huecos, Unir Conceptos y
            Ordenar Bloques, utilizando ratón, pantalla táctil o teclado.
          </p>
        </article>
      {:else}
        <article class="tutorial-card">
          <h2>Paso 3 de 3: Habilidades y Grimorio</h2>
          <p>
            En cada partida dispones de Pista (tecla 1), Escudo (tecla 2) y Tiempo Extra (tecla 3).
            Consulta el Grimorio cuando necesites repasar la sintaxis.
          </p>
        </article>
      {/if}

      <div class="tutorial-nav">
        <button
          type="button"
          disabled={tutorialStep === 1}
          on:click={() => (tutorialStep = Math.max(1, tutorialStep - 1))}
        >
          Anterior
        </button>
        <span>{tutorialStep} / 3</span>
        <button
          type="button"
          disabled={tutorialStep === 3}
          on:click={() => (tutorialStep = Math.min(3, tutorialStep + 1))}
        >
          Siguiente
        </button>
      </div>
    </div>

    <form class="summoner-form" on:submit={submitSummoner}>
      <label for="summoner-name-input">Nombre de Invocador (3–16 caracteres)</label>
      <input
        id="summoner-name-input"
        type="text"
        maxlength="16"
        placeholder="Ej. Alex_SQL"
        bind:value={nameInput}
        required
      />
      {#if nameError}
        <p class="error-msg" role="alert">{nameError}</p>
      {/if}
      <button type="submit" class="btn-primary">Entrar a la Ciudadela</button>
    </form>
  </section>
{:else}
  <section class="lobby-grid">
    <div class="moba-panel hero-card">
      <div class="profile-summary">
        <div class="avatar-shield" aria-hidden="true">🛡️</div>
        <div class="profile-meta">
          <span class="rank-chip">{profile.rank}</span>
          <h1>{profile.player.name}</h1>
          <div class="xp-bar-track" aria-label="Progreso de experiencia">
            <div class="xp-bar-fill" style={`width: ${xpProgressPct}%`}></div>
          </div>
          <p class="xp-caption">
            {profile.xp} XP
            {#if nextRank.nextRank}
              · Faltan {nextRank.remainingXp} XP para {nextRank.nextRank}
            {:else}
              · Rango Máximo Alcanzado
            {/if}
          </p>
        </div>
      </div>

      <div class="cta-zone">
        <button
          type="button"
          class="btn-primary play-cta"
          on:click={() => router.navigate('map', { mode: 'match' })}
        >
          JUGAR PARTIDA
        </button>
        <button
          type="button"
          class="btn-cyan"
          on:click={() => router.navigate('map', { mode: 'training' })}
        >
          Modo Entrenamiento (Sin rival / Sin tiempo)
        </button>
      </div>
    </div>

    <div class="lobby-shortcuts">
      <button
        type="button"
        class="moba-panel shortcut-card"
        on:click={() => router.navigate('map')}
      >
        <h2>Mapa de Reinos</h2>
        <p>Explora los 11 módulos desde Tipos de Datos hasta Consultas con JOIN.</p>
      </button>

      <button
        type="button"
        class="moba-panel shortcut-card"
        on:click={() => router.navigate('grimoire')}
      >
        <h2>Grimorio SQL</h2>
        <p>Referencia técnica de sintaxis MySQL 8.4 LTS por cada módulo.</p>
      </button>

      <button
        type="button"
        class="moba-panel shortcut-card"
        on:click={() => router.navigate('profile')}
      >
        <h2>Perfil y Errores</h2>
        <p>Estadísticas por tipo de minijuego, exportar/importar y repaso de fallos.</p>
      </button>

      <button
        type="button"
        class="moba-panel shortcut-card"
        on:click={() => router.navigate('settings')}
      >
        <h2>Ajustes</h2>
        <p>Sonido, movimiento reducido, modo libre y dificultad de rival por defecto.</p>
      </button>
    </div>
  </section>
{/if}

<style>
  .summoner-onboarding {
    max-width: 580px;
    margin: 1.5rem auto;
    display: flex;
    flex-direction: column;
    gap: 1.25rem;
  }

  .subtitle {
    color: var(--text-muted);
  }

  .tutorial-steps {
    background: var(--bg-input);
    border: var(--border-subtle);
    border-radius: var(--radius-sm);
    padding: 1rem;
    display: flex;
    flex-direction: column;
    gap: 0.85rem;
  }

  .tutorial-card h2 {
    font-size: 1.05rem;
    margin-bottom: 0.35rem;
  }

  .tutorial-nav {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .summoner-form {
    display: flex;
    flex-direction: column;
    gap: 0.65rem;
  }

  .summoner-form input {
    min-height: 44px;
    padding: 0.5rem 0.75rem;
    background: var(--bg-input);
    border: var(--border-gold);
    border-radius: var(--radius-sm);
  }

  .error-msg {
    color: var(--crimson-dmg);
    font-size: 0.9rem;
  }

  .lobby-grid {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
  }

  .hero-card {
    display: flex;
    flex-wrap: wrap;
    justify-content: space-between;
    align-items: center;
    gap: 1.5rem;
  }

  .profile-summary {
    display: flex;
    align-items: center;
    gap: 1rem;
    flex: 1;
    min-width: 260px;
  }

  .avatar-shield {
    width: 68px;
    height: 68px;
    border-radius: 50%;
    border: 2px solid var(--gold-primary);
    background: var(--bg-input);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 2rem;
    flex-shrink: 0;
  }

  .profile-meta {
    flex: 1;
  }

  .rank-chip {
    display: inline-block;
    font-size: 0.8rem;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--cyan-magic);
    font-weight: 700;
  }

  .xp-bar-track {
    width: 100%;
    height: 10px;
    background: var(--bg-input);
    border: 1px solid var(--gold-dim);
    border-radius: 999px;
    overflow: hidden;
    margin: 0.4rem 0;
  }

  .xp-bar-fill {
    height: 100%;
    background: linear-gradient(90deg, var(--cyan-magic), var(--gold-primary));
  }

  .xp-caption {
    font-size: 0.85rem;
    color: var(--text-muted);
  }

  .cta-zone {
    display: flex;
    flex-direction: column;
    gap: 0.65rem;
    min-width: 260px;
  }

  .play-cta {
    font-size: 1.25rem;
    min-height: 58px;
    box-shadow: 0 0 18px rgba(245, 197, 66, 0.35);
  }

  .lobby-shortcuts {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(230px, 1fr));
    gap: 1rem;
  }

  .shortcut-card {
    text-align: left;
    display: flex;
    flex-direction: column;
    gap: 0.45rem;
  }

  .shortcut-card h2 {
    font-size: 1.1rem;
  }

  .shortcut-card p {
    font-size: 0.9rem;
    color: var(--text-muted);
    font-weight: 400;
  }
</style>
