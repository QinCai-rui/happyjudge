<script lang="ts">
  import { enhance } from '$app/forms';
  import { onMount } from 'svelte';
  import Difficulty from '$lib/components/Difficulty.svelte';
  import CodeMirror from '$lib/components/CodeMirror.svelte';
  import { parseMarkdown } from '$lib/markdown';
  import type { ActionData } from './$types';

  let { data, form }: { data: import('./$types').PageServerData; form: ActionData } = $props();

  let code = $state('');
  let language = $state('');
  let customInput = $state('');
  let submitting = $state(false);
  let running = $state(false);
  let mounted = $state(false);
  let draftStatus = $state('Drafts save automatically');
  let solutionCollapsed = $state(true);
  const draftKey = $derived(`hj:draft:problem:${data.problem.id}`);

  onMount(() => {
    try {
      const draft = JSON.parse(localStorage.getItem(draftKey) ?? 'null');
      if (draft?.code) code = draft.code;
      if (typeof draft?.customInput === 'string') customInput = draft.customInput;
      language = data.languages.some((item) => item.id === draft?.language)
        ? draft.language
        : (data.languages[0]?.id ?? '');
    } catch {}
    mounted = true;
  });

  $effect(() => {
    if (!mounted) return;
    const snapshot = JSON.stringify({ code, language, customInput });
    draftStatus = 'Saving draft…';
    const timer = setTimeout(() => {
      try {
        localStorage.setItem(draftKey, snapshot);
        draftStatus = 'Draft saved locally';
      } catch {
        draftStatus = 'Draft could not be saved';
      }
    }, 400);
    return () => clearTimeout(timer);
  });

  function submitShortcut(event: KeyboardEvent) {
    if ((event.metaKey || event.ctrlKey) && event.key === 'Enter' && !submitting && !running) {
      event.preventDefault();
      document.getElementById('submit-solution')?.click();
    }
  }

  function useSampleInput(input: string) {
    customInput = input;
    document.getElementById('stdin')?.focus();
  }

</script>

<svelte:window onkeydown={submitShortcut} />

<svelte:head>
  <title>{data.problem.title} - happyjudge</title>
</svelte:head>

<div class="solver-layout" class:solution-collapsed={solutionCollapsed}>
  <section class="statement-panel">
    <a class="text-muted mb-5 inline-block text-xs hover:underline" href="/">← Problem library</a>
    <div class="flex flex-wrap items-center gap-4">
      <h1 class="page-title text-4xl">{data.problem.title}</h1>
      <Difficulty difficulty={data.problem.difficulty} />
    </div>
    <p class="text-muted mt-1 text-sm">
      Time limit: {data.problem.timeLimit}ms · Memory limit: {data.problem.memoryLimit}MB
    </p>

    <article class="prose dark:prose-invert mt-4 max-w-none">{@html parseMarkdown(data.problem.statement)}</article>

    {#if data.problem.sampleTestcases.length > 0}
      <h2 class="mt-6 text-2xl font-semibold">Sample Testcases</h2>
      {#each data.problem.sampleTestcases as sample, i}
        <h3 class="mt-3 font-semibold">Sample #{i + 1}</h3>
        <div class="grid gap-2 md:grid-cols-2">
          <figure class="card overflow-hidden p-0">
            <figcaption
              class="border-b border-slate-200 px-4 py-2 text-xs font-bold tracking-wide text-slate-500 uppercase dark:border-slate-700 dark:text-slate-400"
            >
              <span>Sample input</span>
              <button
                type="button"
                class="text-blue-700 hover:underline dark:text-blue-300"
                onclick={() => useSampleInput(sample.input)}>Use for run</button
              >
            </figcaption>
            <CodeMirror value={sample.input} basicEditSetup={false} readOnly={true} />
          </figure>
          <figure class="card overflow-hidden p-0">
            <figcaption
              class="border-b border-slate-200 px-4 py-2 text-xs font-bold tracking-wide text-slate-500 uppercase dark:border-slate-700 dark:text-slate-400"
            >
              Expected output
            </figcaption>
            <CodeMirror value={sample.output} basicEditSetup={false} readOnly={true} />
          </figure>
        </div>
      {/each}
    {/if}
  </section>
  {#if solutionCollapsed}
    <aside class="solution-panel-collapsed">
      <button
        type="button"
        class="btn-primary text-xs"
        aria-expanded="false"
        aria-label="Open solution to submit"
        onclick={() => (solutionCollapsed = false)}>Submit</button
      >
    </aside>
  {:else}<form
      method="POST"
      action="?/submit"
      class="card solution-panel"
      use:enhance={({ submitter }) => {
        const isRun = submitter?.getAttribute('formaction') === '?/run';
        if (isRun) running = true;
        else submitting = true;

        return async ({ result, update }) => {
          if (result.type === 'redirect') localStorage.removeItem(draftKey);
          try {
            await update();
          } finally {
            submitting = false;
            running = false;
          }
        };
      }}
    >
    <div class="flex flex-wrap items-center justify-between gap-2">
      <div>
        <h2 class="text-xl font-semibold">Your solution</h2>
        <p class="text-muted mt-1 text-xs">Drafts save in this browser.</p>
      </div>
      <div class="flex items-center gap-3">
        <span class="text-muted text-xs" role="status">{draftStatus}</span><button
          type="button"
          class="btn-ghost min-h-8 px-2 py-1 text-xs"
          aria-expanded="true"
          onclick={() => (solutionCollapsed = true)}>Collapse</button
        >
      </div>
    </div>
    {#if form?.message}<p class="form-error mt-2" role="alert">{form.message}</p>{/if}
    <label class="form-label mt-3" for="lang">Language</label>
    <select bind:value={language} name="lang" id="lang" class="form-input" disabled={submitting || running}>
      {#each data.languages as language}
        <option value={language.id}>{language.name}</option>
      {/each}
    </select>
    <p class="form-label mt-3">Code</p>
    <CodeMirror bind:value={code} />
    <textarea id="code" name="code" bind:value={code} class="hidden"></textarea>
    <div class="mt-4 grid gap-4 border-t border-slate-200 pt-4 dark:border-slate-700">
      <div>
        <label class="form-label" for="stdin">Custom input <span class="text-muted font-normal">(optional)</span></label
        >
        <textarea
          bind:value={customInput}
          class="form-input font-mono"
          id="stdin"
          name="stdin"
          rows="4"
          placeholder="Enter input for a test run"
        ></textarea>
      </div>
      <p class="text-muted mt-3 text-xs">
        Tip: press <kbd class="rounded border border-slate-300 px-1.5 py-0.5 font-mono dark:border-slate-600"
          >Ctrl/⌘ Enter</kbd
        > to submit.
      </p>
      <div class="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between">
        <button class="btn-ghost" type="submit" formaction="?/run" disabled={submitting || running}>
          {running ? 'Running…' : 'Run with custom input'}
        </button>
        <button
          id="submit-solution"
          class="btn-primary sm:w-56"
          type="submit"
          disabled={submitting || running}
          title="Ctrl/Command + Enter"
        >
          {submitting ? 'Submitting…' : 'Submit for judging'}
        </button>
      </div>
    </div>
    {#if submitting}<p class="text-muted mt-2 text-sm" aria-live="polite">Your code is being judged…</p>{/if}
    {#if form?.runResult}
      <section
        class="mt-5 rounded-xl border border-slate-200 bg-slate-950 p-4 text-slate-100 dark:border-slate-700"
        aria-live="polite"
      >
        <div class="flex flex-wrap items-center justify-between gap-2 text-xs">
          <span class="font-bold tracking-wide uppercase">Run output</span>
          <span class="text-slate-400">Exit {form.runResult.exitCode} · {form.runResult.timeTaken.toFixed(0)} ms</span>
        </div>
        {#if form.runResult.compileError}<p class="mt-3 text-xs font-semibold text-red-300">Compiler output</p>
          <pre class="mt-1 overflow-auto text-sm whitespace-pre-wrap text-red-200">{form.runResult
              .compileError}</pre>{/if}
        {#if form.runResult.stderr}<p class="mt-3 text-xs font-semibold text-amber-300">Standard error</p>
          <pre class="mt-1 overflow-auto text-sm whitespace-pre-wrap text-amber-100">{form.runResult.stderr}</pre>{/if}
        <p class="mt-3 text-xs font-semibold text-slate-400">Standard output</p>
        <pre class="mt-1 min-h-6 overflow-auto text-sm whitespace-pre-wrap">{form.runResult.stdout ||
            '(no output)'}</pre>
      </section>
    {/if}
    </form>{/if}
</div>
