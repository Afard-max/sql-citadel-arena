<script>
  export let question;
  export let disabled = false;
  export let activeHint = null;
  export let onSubmit = () => {};

  let selectedIds = [];
  let noneSelected = false;

  $: isMulti = Boolean(question?.multi);
  $: discardedId = activeHint?.discardOptionId || null;

  function toggleOption(id) {
    if (disabled) return;
    noneSelected = false;

    if (isMulti) {
      if (selectedIds.includes(id)) {
        selectedIds = selectedIds.filter((item) => item !== id);
      } else {
        selectedIds = [...selectedIds, id];
      }
    } else {
      selectedIds = [id];
    }
  }

  function selectNone() {
    if (disabled) return;
    noneSelected = !noneSelected;
    if (noneSelected) {
      selectedIds = [];
    }
  }

  function confirmSelection() {
    if (disabled) return;
    if (!noneSelected && selectedIds.length === 0) return;
    onSubmit({ selected: noneSelected ? [] : selectedIds });
  }
</script>

<div class="mc-game">
  <p class="mc-mode-badge">
    {isMulti
      ? 'Opción múltiple: elige todas las respuestas correctas'
      : 'Opción única: selecciona una opción o «Ninguna es correcta»'}
  </p>

  {#if activeHint?.message}
    <p class="hint-banner" role="status">{activeHint.message}</p>
  {/if}

  <div class="options-grid" role="group" aria-label="Opciones de respuesta">
    {#each question.options || [] as opt (opt.id)}
      {@const isSelected = selectedIds.includes(opt.id)}
      {@const isDiscarded = discardedId === opt.id}
      <button
        type="button"
        class="option-card"
        class:selected={isSelected}
        class:discarded={isDiscarded}
        disabled={disabled || isDiscarded}
        aria-pressed={isSelected}
        on:click={() => toggleOption(opt.id)}
      >
        <span class="checkbox-indicator" aria-hidden="true">
          {isSelected ? '✓' : ''}
        </span>
        <code class="option-text">{opt.text}</code>
      </button>
    {/each}
  </div>

  <div class="mc-footer">
    <button
      type="button"
      class="none-btn"
      class:selected={noneSelected}
      {disabled}
      aria-pressed={noneSelected}
      on:click={selectNone}
    >
      Ninguna es correcta
    </button>

    <button
      type="button"
      class="btn-primary confirm-btn"
      disabled={disabled || (!noneSelected && selectedIds.length === 0)}
      on:click={confirmSelection}
    >
      Confirmar conjuro
    </button>
  </div>
</div>

<style>
  .mc-game {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .mc-mode-badge {
    font-size: 0.9rem;
    color: var(--gold-primary);
  }

  .hint-banner {
    background: rgba(245, 197, 66, 0.12);
    border-left: 3px solid var(--gold-primary);
    padding: 0.6rem 0.85rem;
    color: var(--gold-primary);
    font-size: 0.92rem;
  }

  .options-grid {
    display: flex;
    flex-direction: column;
    gap: 0.65rem;
  }

  .option-card {
    display: flex;
    align-items: center;
    gap: 0.85rem;
    text-align: left;
    padding: 0.85rem 1rem;
    background: var(--bg-input);
    border: var(--border-subtle);
  }

  .option-card.selected {
    border-color: var(--cyan-magic);
    background: rgba(54, 209, 220, 0.16);
  }

  .option-card.discarded {
    text-decoration: line-through;
    opacity: 0.35;
  }

  .checkbox-indicator {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 24px;
    height: 24px;
    border: 1px solid var(--gold-primary);
    border-radius: var(--radius-sm);
    color: var(--cyan-magic);
    font-weight: 700;
    flex-shrink: 0;
  }

  .option-text {
    font-size: 0.95rem;
    word-break: break-word;
  }

  .mc-footer {
    display: flex;
    flex-wrap: wrap;
    gap: 0.75rem;
    justify-content: space-between;
    align-items: center;
    margin-top: 0.5rem;
  }

  .none-btn.selected {
    border-color: var(--crimson-dmg);
    background: rgba(230, 57, 70, 0.22);
  }

  .confirm-btn {
    margin-left: auto;
  }
</style>
