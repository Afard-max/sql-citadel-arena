<script>
  import { onMount, onDestroy } from 'svelte';

  export let question;
  export let disabled = false;
  export let activeHint = null;
  export let onSubmit = () => {};

  let selectedValue = null;

  function choose(val) {
    if (disabled) return;
    selectedValue = val;
    onSubmit({ value: val });
  }

  function handleKeydown(e) {
    if (disabled) return;
    const tag = document.activeElement?.tagName?.toLowerCase();
    if (tag === 'input' || tag === 'textarea') return;

    const key = e.key.toLowerCase();
    if (key === 'v') {
      e.preventDefault();
      choose(true);
    } else if (key === 'f') {
      e.preventDefault();
      choose(false);
    }
  }

  onMount(() => {
    window.addEventListener('keydown', handleKeydown);
  });

  onDestroy(() => {
    window.removeEventListener('keydown', handleKeydown);
  });
</script>

<div class="tf-game" role="group" aria-label="Pregunta de verdadero o falso">
  {#if question.statement}
    <pre class="sql-statement"><code>{question.statement}</code></pre>
  {/if}

  {#if activeHint?.message}
    <p class="hint-banner" role="status">{activeHint.message}</p>
  {/if}

  <div class="tf-actions">
    <button
      type="button"
      class="tf-btn btn-true"
      class:selected={selectedValue === true}
      {disabled}
      on:click={() => choose(true)}
      aria-keyshortcuts="V"
    >
      <span class="key-badge">V</span>
      <span>Verdadero</span>
    </button>

    <button
      type="button"
      class="tf-btn btn-false"
      class:selected={selectedValue === false}
      {disabled}
      on:click={() => choose(false)}
      aria-keyshortcuts="F"
    >
      <span class="key-badge">F</span>
      <span>Falso</span>
    </button>
  </div>
</div>

<style>
  .tf-game {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .sql-statement {
    background: var(--bg-input);
    border: var(--border-subtle);
    border-radius: var(--radius-sm);
    padding: 1rem;
    overflow-x: auto;
    color: var(--cyan-magic);
    font-size: 0.95rem;
  }

  .hint-banner {
    background: rgba(245, 197, 66, 0.12);
    border-left: 3px solid var(--gold-primary);
    padding: 0.6rem 0.85rem;
    color: var(--gold-primary);
    font-size: 0.92rem;
  }

  .tf-actions {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
    gap: 1rem;
  }

  .tf-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.75rem;
    min-height: 60px;
    font-size: 1.15rem;
  }

  .btn-true {
    border-color: var(--cyan-magic);
  }

  .btn-false {
    border-color: var(--crimson-dmg);
  }

  .tf-btn.selected {
    background: rgba(54, 209, 220, 0.25);
  }

  .key-badge {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    border-radius: var(--radius-sm);
    background: rgba(0, 0, 0, 0.4);
    border: 1px solid var(--gold-dim);
    font-family: var(--font-mono);
    font-size: 0.85rem;
    color: var(--gold-primary);
  }
</style>
