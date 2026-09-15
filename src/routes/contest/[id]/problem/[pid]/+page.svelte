<script lang="ts">
  import Difficulty from '$lib/components/Difficulty.svelte';
  import CodeMirror from '$lib/components/CodeMirror.svelte';
  import { parseMarkdown } from '$lib/markdown';
  import { enhance } from '$app/forms';
  import { onMount } from 'svelte';
  import type { ActionData, PageServerData } from './$types';

  let { data, form }: { data: PageServerData; form: ActionData } = $props();
  const currentIndex = $derived(data.contestProblems.findIndex((problem) => problem.id === data.problem.id));
  const previousProblem = $derived(currentIndex > 0 ? data.contestProblems[currentIndex - 1] : null);
  const nextProblem = $derived(
    currentIndex < data.contestProblems.length - 1 ? data.contestProblems[currentIndex + 1] : null,
  );
  const isLive = $derived(data.contest.status === 'live');
  let code = $state('');
  let language = $state('');
  let customInput = $state('');
  let submitting = $state(false);
  let running = $state(false);
  let mounted = $state(false);
  let draftStatus = $state('Drafts save automatically');
  let solutionCollapsed = $state(true);
  const draftKey = $derived(`hj:draft:contest:${data.contest.id}:problem:${data.problem.id}`);

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
  <title>{data.problem.title} · {data.contest.title} - happyjudge</title>
</svelte:head>

<div class="solver-layout" class:solution-collapsed={solutionCollapsed}>
  <section class="statement-panel">
    <a class="btn-ghost text-sm" href={`/contest/${data.contest.id}`}>← {data.contest.title}</a>
    <div
      class="mt-5 flex items-center gap-2 overflow-x-auto border-y border-slate-200 py-3 dark:border-slate-800"
      aria-label="Contest problems"
    >
      {#each data.contestProblems as contestProblem}
        <a
          href={`/contest/${data.contest.id}/problem/${contestProblem.id}`}
          class="grid size-9 shrink-0 place-items-center rounded border text-xs font-semibold {contestProblem.id ===
          data.problem.id
            ? 'border-blue-600 bg-blue-600 text-white'
            : 'border-slate-200 hover:border-blue-400 dark:border-slate-700'}"
          aria-current={contestProblem.id === data.problem.id ? 'page' : undefined}
          title={contestProblem.title}>{String.fromCharCode(65 + contestProblem.position)}</a
        >
      {/each}
      <a
        href={`/contest/${data.contest.id}/scoreboard`}
        class="text-muted ml-auto shrink-0 px-2 text-xs hover:underline">Standings →</a
      >
    </div>
    <div class="mt-2 flex flex-wrap items-center gap-4">
      <h1 class="page-title text-4xl">{data.problem.title}</h1>
      <Difficulty difficulty={data.problem.difficulty} />
      <span class="badge">{data.points} pts</span>
    </div>
    <p class="text-muted mt-1 text-sm">Time {data.problem.timeLimit}ms · Memory {data.problem.memoryLimit}MB</p>
    {#if !isLive}
      <div class="contest-banner mt-5" data-status="ended" role="status">
        This contest has ended. You can review the statement and your draft, but contest submissions are closed.
        {#if data.problem.isPublic}<a
            class="ml-1 font-semibold text-blue-700 underline dark:text-blue-300"
            href={`/problem/${data.problem.id}`}>Practice this problem →</a
          >{/if}
      </div>
    {/if}

    <article class="prose dark:prose-invert mt-4 max-w-none">{@html parseMarkdown(data.problem.statement)}</article>

    {#if data.problem.sampleTestcases.length > 0}
      <h2 class="mt-6 text-2xl font-semibold">Samples</h2>
      {#each data.problem.sampleTestcases as s, i}
        <h3 class="mt-3 font-semibold">Sample #{i + 1}</h3>
        <div class="grid gap-2 md:grid-cols-2">
          <div class="card overflow-hidden border p-0">
            <p
              class="text-muted flex justify-between border-b border-slate-200 px-3 py-2 text-xs dark:border-slate-700"
            >
              <span>Sample input</span><button
                type="button"
                class="text-blue-700 hover:underline dark:text-blue-300"
                onclick={() => useSampleInput(s.input)}>Use for run</button
              >
            </p>
            <CodeMirror value={s.input} basicEditSetup={false} readOnly={true} />
          </div>
          <div class="card overflow-hidden border p-0">
            <p class="text-muted border-b border-slate-200 px-3 py-2 text-xs dark:border-slate-700">Expected output</p>
            <CodeMirror value={s.output} basicEditSetup={false} readOnly={true} />
          </div>
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
        <h2 class="text-xl font-semibold">Your contest solution</h2>
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
    <select bind:value={language} name="lang" id="lang" class="form-input" disabled={!isLive || submitting || running}>
      {#each data.languages as l}
        <option value={l.id}>{l.name}</option>
      {/each}
    </select>
    <p class="form-label mt-3">Code</p>
    <CodeMirror bind:value={code} readOnly={!isLive} />
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
          disabled={!isLive || submitting || running}
          placeholder="Enter input for a test run"
        ></textarea>
      </div>
      <p class="text-muted mt-3 text-xs">
        Tip: press <kbd class="rounded border border-slate-300 px-1.5 py-0.5 font-mono dark:border-slate-600"
          >Ctrl/⌘ Enter</kbd
        > to submit.
      </p>
      <div class="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between">
        <button class="btn-ghost" type="submit" formaction="?/run" disabled={!isLive || submitting || running}
          >{running ? 'Running…' : 'Run with custom input'}</button
        >
        <button
          id="submit-solution"
          class="btn-primary sm:w-56"
          type="submit"
          disabled={!isLive || submitting || running}
          title="Ctrl/Command + Enter">{submitting ? 'Submitting…' : 'Submit to contest'}</button
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
    </form>{/if}
  <nav
    class="mt-6 flex items-center justify-between border-t border-slate-200 pt-4 text-sm lg:col-span-2 dark:border-slate-800"
    aria-label="Previous and next contest problem"
  >
    {#if previousProblem}<a
        class="text-blue-700 hover:underline dark:text-blue-300"
        href={`/contest/${data.contest.id}/problem/${previousProblem.id}`}
        >← {String.fromCharCode(65 + previousProblem.position)} {previousProblem.title}</a
      >{:else}<span></span>{/if}
    {#if nextProblem}<a
        class="text-right text-blue-700 hover:underline dark:text-blue-300"
        href={`/contest/${data.contest.id}/problem/${nextProblem.id}`}
        >{String.fromCharCode(65 + nextProblem.position)} {nextProblem.title} →</a
      >{/if}
  </nav>
</div>
