<script>
  export let question;
  export let disabled = false;
  export let activeHint = null;
  export let onSubmit = () => {};

  $: blankCount = Number(question?.blanks) || 1;
  let answers = [];

  $: if (question) {
    answers = Array.from({ length: blankCount }, () => '');
  }

  $: segments = parseTemplate(question?.template || '{{1}}');

  function parseTemplate(tpl) {
    const parts = [];
    const regex = /\{\{(\d+)\}\}/g;
    let lastIdx = 0;
    let match;

    while ((match = regex.exec(tpl)) !== null) {
      if (match.index > lastIdx) {
        parts.push({ type: 'text', value: tpl.slice(lastIdx, match.index) });
      }
      parts.push({ type: 'blank', index: Number(match[1]) - 1 });
      lastIdx = regex.lastIndex;
    }

    if (lastIdx < tpl.length) {
      parts.push({ type: 'text', value: tpl.slice(lastIdx) });
    }
    return parts;
  }

  function handleFormSubmit(e) {
    e.preventDefault();
    if (disabled) return;
    if (answers.some((a) => !a || a.trim() === '')) return;
    onSubmit({ answers });
  }
</script>

<form class="fb-game" on:submit={handleFormSubmit} autocomplete="off">
  {#if activeHint?.message}
    <p class="hint-banner" role="status">{activeHint.message}</p>
  {/if}

  <div class="sql-template-box sql-code">
    {#each segments as seg, i (i)}
      {#if seg.type === 'text'}
        <span>{seg.value}</span>
      {:else}
        <label class="sr-only" for={`blank-input-${seg.index}`}>
          Hueco {seg.index + 1}
        </label>
        <input
          id={`blank-input-${seg.index}`}
          type="text"
          class="blank-input sql-code"
          maxlength="64"
          autocomplete="off"
          autocapitalize="off"
          spellcheck="false"
          placeholder={`#${seg.index + 1}`}
          bind:value={answers[seg.index]}
          {disabled}
        />
      {/if}
    {/each}
  </div>

  <div class="fb-footer">
    <span class="helper-text">Pulsa Tab para cambiar de hueco y Enter para confirmar.</span>
    <button
      type="submit"
      class="btn-primary"
      disabled={disabled || answers.some((a) => !a || a.trim() === '')}
    >
      Ejecutar sentencia
    </button>
  </div>
</form>

<style>
  .fb-game {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .hint-banner {
    background: rgba(245, 197, 66, 0.12);
    border-left: 3px solid var(--gold-primary);
    padding: 0.6rem 0.85rem;
    color: var(--gold-primary);
    font-size: 0.92rem;
  }

  .sql-template-box {
    background: var(--bg-input);
    border: var(--border-subtle);
    border-radius: var(--radius-sm);
    padding: 1.15rem;
    line-height: 2.2;
    font-size: 1rem;
    white-space: pre-wrap;
  }

  .blank-input {
    display: inline-block;
    width: 150px;
    min-height: 38px;
    margin: 0 0.25rem;
    padding: 0.2rem 0.5rem;
    background: var(--bg-panel-elevated);
    border: 1px solid var(--cyan-magic);
    border-radius: var(--radius-sm);
    color: var(--gold-primary);
    font-size: 0.95rem;
  }

  .fb-footer {
    display: flex;
    flex-wrap: wrap;
    justify-content: space-between;
    align-items: center;
    gap: 0.75rem;
  }

  .helper-text {
    font-size: 0.85rem;
    color: var(--text-muted);
  }
</style>
