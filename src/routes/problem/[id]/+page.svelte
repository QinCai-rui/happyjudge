<script lang="ts">
  import { enhance } from '$app/forms';
  import Difficulty from '$lib/components/Difficulty.svelte';
  import CodeMirror from '$lib/components/CodeMirror.svelte';
  import { parseMarkdown } from '$lib/markdown';
  import type { ActionData } from './$types';

  let { data, form }: { data: import('./$types').PageServerData; form: ActionData } = $props();

  let code = $state('');
  let submitting = $state(false);
</script>

<svelte:head>
  <title>{data.problem.title} - happyjudge</title>
</svelte:head>

<div class="mx-auto max-w-4xl">
  <div class="flex flex-wrap items-center gap-4">
    <h1 class="text-3xl font-bold tracking-tight">{data.problem.title}</h1>
    <Difficulty difficulty={data.problem.difficulty} />
  </div>
  <p class="text-muted mt-1 text-sm">Time limit: {data.problem.timeLimit}ms · Memory limit: {data.problem.memoryLimit}MB</p>

  <article class="prose dark:prose-invert mt-4 max-w-none">{@html parseMarkdown(data.problem.statement)}</article>

  {#if data.problem.sampleTestcases.length > 0}
    <h2 class="mt-6 text-2xl font-semibold">Sample Testcases</h2>
    {#each data.problem.sampleTestcases as sample, i}
      <h3 class="mt-3 font-semibold">Sample #{i + 1}</h3>
      <div class="grid gap-2 md:grid-cols-2">
        <div class="card overflow-hidden p-0"><CodeMirror value={sample.input} basicEditSetup={false} readOnly={true} /></div>
        <div class="card overflow-hidden p-0"><CodeMirror value={sample.output} basicEditSetup={false} readOnly={true} /></div>
      </div>
    {/each}
  {/if}

  <form
    method="POST"
    action="?/submit"
    class="card mt-6"
    use:enhance={() => {
      submitting = true;
      return async ({ update }) => {
        await update();
        submitting = false;
      };
    }}
  >
    <h2 class="text-xl font-semibold">Submit</h2>
    {#if form?.message}<p class="form-error mt-2" role="alert">{form.message}</p>{/if}
    <label class="form-label mt-3" for="lang">Language</label>
    <select name="lang" id="lang" class="form-input" disabled={submitting}>
      {#each data.languages as language}
        <option value={language.id}>{language.name}</option>
      {/each}
    </select>
    <p class="form-label mt-3">Code</p>
    <CodeMirror bind:value={code} />
    <textarea id="code" name="code" bind:value={code} class="hidden"></textarea>
    <button class="btn-primary mt-4 w-full sm:w-72" disabled={submitting}>
      {submitting ? 'Judging…' : 'Submit'}
    </button>
    {#if submitting}<p class="text-muted mt-2 text-sm" aria-live="polite">Your code is being judged…</p>{/if}
  </form>
</div>
