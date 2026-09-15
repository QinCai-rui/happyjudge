<script lang="ts">
  import { tick } from 'svelte';
  import { renderMarkdownPreview } from '$lib/markdown-preview';

  let { value = $bindable(''), rows = 14, id = 'statement' }: { value?: string; rows?: number; id?: string } = $props();
  let textarea = $state<HTMLTextAreaElement>();
  let view = $state<'edit' | 'preview'>('edit');
  const preview = $derived(renderMarkdownPreview(value));

  async function wrap(before: string, after: string, placeholder: string) {
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selected = value.slice(start, end) || placeholder;
    value = `${value.slice(0, start)}${before}${selected}${after}${value.slice(end)}`;
    await tick();
    textarea.focus();
    textarea.setSelectionRange(start + before.length, start + before.length + selected.length);
  }
</script>

<div class="statement-editor">
  <div class="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-3 dark:border-slate-800">
    <div class="flex gap-1" role="tablist" aria-label="Statement editor view">
      <button
        type="button"
        class="filter-tab"
        role="tab"
        aria-selected={view === 'edit'}
        onclick={() => (view = 'edit')}>Write</button
      >
      <button
        type="button"
        class="filter-tab"
        role="tab"
        aria-selected={view === 'preview'}
        onclick={() => (view = 'preview')}>Preview</button
      >
    </div>
    <div class="flex flex-wrap gap-1" aria-label="Statement formatting">
      <button type="button" class="btn-ghost min-h-8 px-2 text-xs" onclick={() => wrap('`', '`', 'code')}
        >Inline code</button
      >
      <button
        type="button"
        class="btn-ghost min-h-8 px-2 text-xs"
        onclick={() => wrap('```\n', '\n```', 'your code or input')}>Code block</button
      >
      <button type="button" class="btn-ghost min-h-8 px-2 text-xs" onclick={() => wrap('## ', '', 'Section heading')}
        >Heading</button
      >
    </div>
  </div>
  {#if view === 'edit'}
    <textarea
      bind:this={textarea}
      bind:value
      class="form-input mt-3 font-mono text-sm leading-6"
      {id}
      name="statement"
      {rows}
      required
      aria-label="Problem statement in Markdown"
      placeholder={'Describe the problem in Markdown.\n\nUse `inline code` for identifiers and fenced code blocks for input or output examples.'}
    ></textarea>
  {:else}
    <article
      class="prose dark:prose-invert mt-3 min-h-72 max-w-none rounded border border-slate-200 bg-slate-50 p-5 dark:border-slate-700 dark:bg-slate-950"
    >
      {#if value.trim()}{@html preview}{:else}<p class="text-muted">Your rendered statement will appear here.</p>{/if}
    </article>
  {/if}
  <p class="text-muted mt-2 text-xs">
    <code>`inline code`</code> is for identifiers. Use <strong>Code block</strong> for input, output, and multi-line snippets.
  </p>
</div>
