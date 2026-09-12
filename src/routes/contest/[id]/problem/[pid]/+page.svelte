<script lang="ts">
  import Difficulty from '$lib/components/Difficulty.svelte';
  import CodeMirror from '$lib/components/CodeMirror.svelte';
  import { parseMarkdown } from '$lib/markdown';

  let { data } = $props();
  let code = $state('');
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

  <article class="prose max-w-none dark:prose-invert mt-4">{@html parseMarkdown(data.problem.statement)}</article>

  {#if data.problem.sampleTestcases.length > 0}
    <h2 class="mt-6 text-2xl font-semibold">Samples</h2>
    {#each data.problem.sampleTestcases as s, i}
      <h3 class="mt-3 font-semibold">Sample #{i + 1}</h3>
      <div class="grid gap-2 md:grid-cols-2">
        <div class="border card p-0 overflow-hidden"><CodeMirror value={s.input} basicEditSetup={false} readOnly={true} /></div>
        <div class="border card p-0 overflow-hidden"><CodeMirror value={s.output} basicEditSetup={false} readOnly={true} /></div>
      </div>
    {/each}
  {/if}

  <form method="POST" action="?/submit" class="card mt-6">
    <h2 class="text-xl font-semibold">Submit to contest</h2>
    <label class="form-label mt-3" for="lang">Language</label>
    <select name="lang" id="lang" class="form-input">
      {#each data.languages as l}
        <option value={l.id}>{l.name}</option>
      {/each}
    </select>
    <p class="form-label mt-3">Code</p>
    <CodeMirror bind:value={code} />
    <textarea name="code" bind:value={code} class="hidden"></textarea>
    <button class="btn-primary mt-4">Submit</button>
  </form>
</div>
