<script>
  export let question;
  export let disabled = false;
  export let activeHint = null;
  export let onSubmit = () => {};

  // Inicialización única (ver nota en FillBlank.svelte): evita reordenar en cada tick del timer.
  let items = [...(question?.blocks || [])];
  let grabbedIndex = null;
  let draggingIndex = null;

  function moveItem(fromIndex, toIndex) {
    if (disabled) return;
    if (toIndex < 0 || toIndex >= items.length || fromIndex === toIndex) return;
    const copy = [...items];
    const [moved] = copy.splice(fromIndex, 1);
    copy.splice(toIndex, 0, moved);
    items = copy;
  }

  function handleBlockKeydown(e, index) {
    if (disabled) return;
    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      grabbedIndex = grabbedIndex === index ? null : index;
    } else if (e.key === 'ArrowUp' && grabbedIndex === index && index > 0) {
      e.preventDefault();
      moveItem(index, index - 1);
      grabbedIndex = index - 1;
    } else if (e.key === 'ArrowDown' && grabbedIndex === index && index < items.length - 1) {
      e.preventDefault();
      moveItem(index, index + 1);
      grabbedIndex = index + 1;
    }
  }

  function handlePointerDownHandle(index) {
    if (disabled) return;
    draggingIndex = index;
  }

  function handlePointerEnterItem(targetIndex) {
    if (draggingIndex === null || draggingIndex === targetIndex) return;
    moveItem(draggingIndex, targetIndex);
    draggingIndex = targetIndex;
  }

  function handlePointerUpGlobal() {
    draggingIndex = null;
  }

  function confirmOrder() {
    if (disabled) return;
    onSubmit({ order: items.map((b) => b.id) });
  }
</script>

<svelte:window on:pointerup={handlePointerUpGlobal} />

<div class="or-game">
  <p class="or-instructions">
    Ordena los bloques para formar una sentencia válida. Usa el asa (⠿), los botones ↑/↓ o la barra
    espaciadora + flechas.
  </p>

  {#if activeHint?.message}
    <p class="hint-banner" role="status">{activeHint.message}</p>
  {/if}

  <ol class="blocks-list" aria-label="Secuencia de bloques SQL">
    {#each items as block, idx (block.id)}
      {@const isGrabbed = grabbedIndex === idx}
      {@const isHintFirst = activeHint?.firstBlockId === block.id}
      <li
        class="block-row"
        class:grabbed={isGrabbed}
        class:hint-highlight={isHintFirst}
        on:pointerenter={() => handlePointerEnterItem(idx)}
      >
        <span class="step-num">{idx + 1}</span>

        <button
          type="button"
          class="drag-handle"
          aria-label={`Bloque ${block.text}. Pulsa Espacio para tomar o soltar.`}
          aria-grabbed={isGrabbed}
          {disabled}
          on:pointerdown={() => handlePointerDownHandle(idx)}
          on:keydown={(e) => handleBlockKeydown(e, idx)}
        >
          <span class="grip" aria-hidden="true">⠿</span>
          <code class="block-code">{block.text}</code>
        </button>

        <div class="step-controls">
          <button
            type="button"
            class="ctrl-btn"
            aria-label="Subir bloque"
            disabled={disabled || idx === 0}
            on:click={() => moveItem(idx, idx - 1)}
          >
            ↑
          </button>
          <button
            type="button"
            class="ctrl-btn"
            aria-label="Bajar bloque"
            disabled={disabled || idx === items.length - 1}
            on:click={() => moveItem(idx, idx + 1)}
          >
            ↓
          </button>
        </div>
      </li>
    {/each}
  </ol>

  <div class="or-footer">
    <button type="button" class="btn-primary" {disabled} on:click={confirmOrder}>
      Confirmar orden de bloques
    </button>
  </div>
</div>

<style>
  .or-game {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .or-instructions {
    font-size: 0.9rem;
    color: var(--text-muted);
  }

  .hint-banner {
    background: rgba(245, 197, 66, 0.12);
    border-left: 3px solid var(--gold-primary);
    padding: 0.6rem 0.85rem;
    color: var(--gold-primary);
    font-size: 0.92rem;
  }

  .blocks-list {
    list-style: none;
    display: flex;
    flex-direction: column;
    gap: 0.55rem;
  }

  .block-row {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    background: var(--bg-input);
    border: var(--border-subtle);
    border-radius: var(--radius-sm);
    padding: 0.35rem 0.5rem;
  }

  .block-row.grabbed {
    border-color: var(--cyan-magic);
    box-shadow: 0 0 12px var(--cyan-glow);
  }

  .block-row.hint-highlight {
    border-color: var(--gold-primary);
  }

  .step-num {
    width: 26px;
    text-align: center;
    font-family: var(--font-display);
    color: var(--gold-primary);
    font-weight: 700;
  }

  .drag-handle {
    flex: 1;
    display: flex;
    align-items: center;
    gap: 0.75rem;
    text-align: left;
    background: transparent;
    border: none;
    padding: 0.45rem;
    touch-action: none;
  }

  .grip {
    color: var(--gold-dim);
    font-size: 1.2rem;
    cursor: grab;
  }

  .block-code {
    color: var(--cyan-magic);
    font-size: 0.95rem;
  }

  .step-controls {
    display: flex;
    gap: 0.3rem;
  }

  .ctrl-btn {
    padding: 0.25rem 0.6rem;
    min-width: 44px;
    min-height: 44px;
  }

  .or-footer {
    display: flex;
    justify-content: flex-end;
  }
</style>
