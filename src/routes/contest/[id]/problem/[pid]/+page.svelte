<script lang="ts">
  import Difficulty from '$lib/components/Difficulty.svelte';
  import CodeMirror from '$lib/components/CodeMirror.svelte';
  import { parseMarkdown } from '$lib/markdown';
  import { enhance } from '$app/forms';
  import { onMount } from 'svelte';
  import type { ActionData, PageServerData } from './$types';

  let { data, form }: { data: PageServerData; form: ActionData } = $props();
  let code = $state('');
  let language = $state('');
  let customInput = $state('');
  let submitting = $state(false);
  let running = $state(false);
  let mounted = $state(false);
  let draftStatus = $state('Drafts save automatically');
  const draftKey = $derived(`hj:draft:contest:${data.contest.id}:problem:${data.problem.id}`);

  onMount(() => {
    try {
      const draft = JSON.parse(localStorage.getItem(draftKey) ?? 'null');
      if (draft?.code) code = draft.code;
      language = data.languages.some((item) => item.id === draft?.language)
        ? draft.language
        : (data.languages[0]?.id ?? '');
    } catch {}
    mounted = true;
  });

  $effect(() => {
    if (!mounted) return;
    const snapshot = JSON.stringify({ code, language });
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
</script>

<svelte:head>
  <title>{data.problem.title} · {data.contest.title} - happyjudge</title>
</svelte:head>

<div class="mx-auto max-w-4xl">
  <a class="btn-ghost text-sm" href={`/contest/${data.contest.id}`}>← {data.contest.title}</a>
  <div class="mt-2 flex flex-wrap items-center gap-4">
    <h1 class="text-3xl font-bold tracking-tight">{data.problem.title}</h1>
    <Difficulty difficulty={data.problem.difficulty} />
    <span class="badge">{data.points} pts</span>
  </div>
  <p class="text-muted mt-1 text-sm">Time {data.problem.timeLimit}ms · Memory {data.problem.memoryLimit}MB</p>

  <article class="prose dark:prose-invert mt-4 max-w-none">{@html parseMarkdown(data.problem.statement)}</article>

  {#if data.problem.sampleTestcases.length > 0}
    <h2 class="mt-6 text-2xl font-semibold">Samples</h2>
    {#each data.problem.sampleTestcases as s, i}
      <h3 class="mt-3 font-semibold">Sample #{i + 1}</h3>
      <div class="grid gap-2 md:grid-cols-2">
        <div class="card overflow-hidden border p-0">
          <CodeMirror value={s.input} basicEditSetup={false} readOnly={true} />
        </div>
        <div class="card overflow-hidden border p-0">
          <CodeMirror value={s.output} basicEditSetup={false} readOnly={true} />
        </div>
      </div>
    {/each}
  {/if}

  <form
    method="POST"
    action="?/submit"
    class="card mt-6"
    use:enhance={(({ submitter }) => {
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
    })}
  >
    <div class="flex flex-wrap items-center justify-between gap-2">
      <h2 class="text-xl font-semibold">Contest workspace</h2>
      <span class="text-muted text-xs" role="status">{draftStatus}</span>
    </div>
    {#if form?.message}<p class="form-error mt-2" role="alert">{form.message}</p>{/if}
    <label class="form-label mt-3" for="lang">Language</label>
    <select bind:value={language} name="lang" id="lang" class="form-input" disabled={submitting || running}>
      {#each data.languages as l}
        <option value={l.id}>{l.name}</option>
      {/each}
    </select>
    <p class="form-label mt-3">Code</p>
    <CodeMirror bind:value={code} />
    <textarea name="code" bind:value={code} class="hidden"></textarea>
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
      <div class="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between">
        <button
          class="btn-ghost"
          type="submit"
          formaction="?/run"
          disabled={submitting || running}
          >{running ? 'Running…' : 'Run with custom input'}</button
        >
        <button class="btn-primary sm:w-56" type="submit" disabled={submitting || running}
          >{submitting ? 'Submitting…' : 'Submit to contest'}</button
        >
      </div>
    </div>
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
  </form>
</div>
