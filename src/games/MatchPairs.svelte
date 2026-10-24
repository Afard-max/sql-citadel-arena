<script>
  import { onMount, tick } from 'svelte';

  export let question;
  export let disabled = false;
  export let activeHint = null;
  export let onSubmit = () => {};

  let pairs = {};
  let activeLeftId = null;
  let draggingLeftId = null;
  let pointerPos = { x: 0, y: 0 };

  let boardEl;
  let gridEl;
  let leftRefs = {};
  let rightRefs = {};
  let lines = [];

  const LINE_PAD = 4;

  // Curva suave horizontal: los cruces entre flechas se distinguen mucho mejor que con rectas
  function curvePath(ln) {
    const dx = Math.max(24, (ln.x2 - ln.x1) / 2);
    return `M ${ln.x1} ${ln.y1} C ${ln.x1 + dx} ${ln.y1}, ${ln.x2 - dx} ${ln.y2}, ${ln.x2} ${ln.y2}`;
  }

  $: leftItems = question?.left || [];
  $: rightItems = question?.right || [];
  $: allPaired = leftItems.length > 0 && Object.keys(pairs).length === leftItems.length;

  let hintApplied = false;
  $: if (activeHint?.pair && !hintApplied) {
    hintApplied = true;
    const { leftId, rightId } = activeHint.pair;
    if (leftId && rightId && pairs[leftId] !== rightId) {
      linkPair(leftId, rightId);
    }
  }

  function linkPair(leftId, rightId) {
    if (disabled) return;
    const next = { ...pairs };

    // Garantizar relación 1 a 1 (Sección 5.2 y 6.4 SDD)
    for (const [k, v] of Object.entries(next)) {
      if (v === rightId) {
        delete next[k];
      }
    }
    next[leftId] = rightId;
    pairs = next;
    activeLeftId = null;
    updateLines();
  }

  function removePair(leftId) {
    if (disabled || !pairs[leftId]) return;
    const next = { ...pairs };
    delete next[leftId];
    pairs = next;
    updateLines();
  }

  function handleLeftClick(leftId) {
    if (disabled) return;
    if (activeLeftId === leftId) {
      activeLeftId = null;
    } else {
      activeLeftId = leftId;
    }
  }

  function handleRightClick(rightId) {
    if (disabled) return;
    if (activeLeftId) {
      linkPair(activeLeftId, rightId);
    } else {
      // Si se toca un elemento derecho ya conectado, se elimina su vínculo
      const existingLeft = Object.keys(pairs).find((k) => pairs[k] === rightId);
      if (existingLeft) {
        removePair(existingLeft);
      }
    }
  }

  function handlePointerDownLeft(e, leftId) {
    if (disabled) return;
    draggingLeftId = leftId;
    activeLeftId = leftId;
    updatePointerCoords(e);
  }

  function handlePointerMove(e) {
    if (!draggingLeftId) return;
    updatePointerCoords(e);
  }

  function handlePointerUp(e) {
    if (!draggingLeftId) return;
    const targetEl = document.elementFromPoint(e.clientX, e.clientY);
    const rightBtn = targetEl?.closest?.('[data-right-id]');
    if (rightBtn) {
      const rightId = rightBtn.getAttribute('data-right-id');
      if (rightId) {
        linkPair(draggingLeftId, rightId);
      }
    }
    draggingLeftId = null;
  }

  function updatePointerCoords(e) {
    if (!gridEl) return;
    const rect = gridEl.getBoundingClientRect();
    pointerPos = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
  }

  async function updateLines() {
    await tick();
    if (!gridEl) return;
    const boardRect = gridEl.getBoundingClientRect();
    const computed = [];

    for (const [leftId, rightId] of Object.entries(pairs)) {
      const lEl = leftRefs[leftId];
      const rEl = rightRefs[rightId];
      if (lEl && rEl) {
        const lRect = lEl.getBoundingClientRect();
        const rRect = rEl.getBoundingClientRect();
        computed.push({
          leftId,
          rightId,
          x1: lRect.right - boardRect.left + LINE_PAD,
          y1: lRect.top + lRect.height / 2 - boardRect.top,
          x2: rRect.left - boardRect.left - LINE_PAD,
          y2: rRect.top + rRect.height / 2 - boardRect.top
        });
      }
    }
    lines = computed;
  }

  function getLeftCenter(leftId) {
    if (!gridEl || !leftRefs[leftId]) return { x: 0, y: 0 };
    const boardRect = gridEl.getBoundingClientRect();
    const lRect = leftRefs[leftId].getBoundingClientRect();
    return {
      x: lRect.right - boardRect.left + LINE_PAD,
      y: lRect.top + lRect.height / 2 - boardRect.top
    };
  }

  function confirmPairs() {
    if (disabled || !allPaired) return;
    onSubmit({ pairs });
  }

  onMount(() => {
    window.addEventListener('resize', updateLines);
    let ro = null;
    if (typeof ResizeObserver !== 'undefined' && gridEl) {
      ro = new ResizeObserver(() => updateLines());
      ro.observe(gridEl);
    }
    return () => {
      window.removeEventListener('resize', updateLines);
      ro?.disconnect();
    };
  });
</script>

<!-- svelte-ignore a11y-no-static-element-interactions -->
<div
  class="mt-game"
  bind:this={boardEl}
  on:pointermove={handlePointerMove}
  on:pointerup={handlePointerUp}
>
  <p class="mt-instructions">
    Selecciona un elemento izquierdo y luego su pareja derecha (o arrastra entre ellos). Toca una
    flecha para eliminarla.
  </p>

  {#if activeHint?.message}
    <p class="hint-banner" role="status">{activeHint.message}</p>
  {/if}

  <div class="mt-board" bind:this={gridEl}>
    <svg class="mt-svg-layer" aria-hidden="true">
      <defs>
        <marker
          id="mt-arrow-head"
          viewBox="0 0 10 10"
          refX="8"
          refY="5"
          markerWidth="7"
          markerHeight="7"
          orient="auto-start-reverse"
        >
          <path d="M 0 0 L 10 5 L 0 10 z" fill="var(--cyan-magic)" />
        </marker>
      </defs>
      {#each lines as ln (ln.leftId)}
        <!-- Atajo solo de ratón: por teclado el vínculo se quita pulsando el elemento derecho. -->
        <!-- svelte-ignore a11y_click_events_have_key_events -->
        <g
          class="arrow-group"
          on:click={() => removePair(ln.leftId)}
          style="cursor: pointer; pointer-events: stroke;"
        >
          <!-- Zona de clic ancha e invisible para poder eliminar la flecha con comodidad -->
          <path d={curvePath(ln)} fill="none" stroke="transparent" stroke-width="16" />
          <path
            d={curvePath(ln)}
            fill="none"
            stroke="var(--cyan-magic)"
            stroke-width="3"
            stroke-linecap="round"
            marker-end="url(#mt-arrow-head)"
          />
          <circle cx={ln.x1} cy={ln.y1} r="4" fill="var(--gold-primary)" />
        </g>
      {/each}

      {#if draggingLeftId}
        {@const start = getLeftCenter(draggingLeftId)}
        <line
          x1={start.x}
          y1={start.y}
          x2={pointerPos.x}
          y2={pointerPos.y}
          stroke="var(--gold-primary)"
          stroke-width="2"
          stroke-dasharray="4 4"
        />
      {/if}
    </svg>

    <div class="mt-column">
      {#each leftItems as item (item.id)}
        {@const isPaired = Boolean(pairs[item.id])}
        <button
          type="button"
          class="mt-node left-node"
          class:active={activeLeftId === item.id}
          class:paired={isPaired}
          bind:this={leftRefs[item.id]}
          {disabled}
          on:click={() => handleLeftClick(item.id)}
          on:pointerdown={(e) => handlePointerDownLeft(e, item.id)}
        >
          <code>{item.text}</code>
        </button>
      {/each}
    </div>

    <div class="mt-column">
      {#each rightItems as item (item.id)}
        {@const linkedLeft = Object.keys(pairs).find((k) => pairs[k] === item.id)}
        <button
          type="button"
          class="mt-node right-node"
          class:paired={Boolean(linkedLeft)}
          data-right-id={item.id}
          bind:this={rightRefs[item.id]}
          {disabled}
          on:click={() => handleRightClick(item.id)}
        >
          <span>{item.text}</span>
        </button>
      {/each}
    </div>
  </div>

  <div class="mt-footer">
    <button
      type="button"
      class="btn-primary"
      disabled={disabled || !allPaired}
      on:click={confirmPairs}
    >
      Confirmar vínculos ({Object.keys(pairs).length}/{leftItems.length})
    </button>
  </div>
</div>

<style>
  .mt-game {
    position: relative;
    display: flex;
    flex-direction: column;
    gap: 1rem;
    user-select: none;
  }

  .mt-instructions {
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

  .mt-board {
    position: relative;
    display: grid;
    grid-template-columns: 1fr 1fr;
    column-gap: clamp(4rem, 14%, 7rem);
    row-gap: 0;
    align-items: center;
  }

  .mt-svg-layer {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    pointer-events: none;
    z-index: 2;
  }

  .mt-column {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    z-index: 3;
  }

  .mt-node {
    text-align: left;
    padding: 0.75rem;
    background: var(--bg-input);
    border: var(--border-subtle);
    font-size: 0.9rem;
    touch-action: none;
  }

  .mt-node.active {
    border-color: var(--gold-primary);
    box-shadow: 0 0 10px rgba(245, 197, 66, 0.4);
  }

  .mt-node.paired {
    border-color: var(--cyan-magic);
    background: rgba(54, 209, 220, 0.12);
  }

  .mt-footer {
    display: flex;
    justify-content: flex-end;
  }

  @media (max-width: 540px) {
    .mt-board {
      column-gap: 2.75rem;
    }
    .mt-node {
      font-size: 0.82rem;
      padding: 0.55rem;
    }
  }
</style>
