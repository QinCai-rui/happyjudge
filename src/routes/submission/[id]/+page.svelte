<script lang="ts">
  import CodeMirror from '$lib/components/CodeMirror.svelte';
  import { invalidateAll } from '$app/navigation';
  import { onMount } from 'svelte';

  let { data } = $props();

  let groups: string[] = $derived([...new Set(data.submission.results.map((x) => x.caseGroup))]);

  let results = $derived(
    groups.map((g) => ({
      groupId: g,
      results: data.submission.results.filter((x) => x.caseGroup === g),
      score: data.submission.results
        .filter((x) => x.caseGroup === g)
        .reduce((total, result) => total + result.score, 0),
    })),
  );

  onMount(() => {
    if (data.submission.results.length) return;
    const timer = setInterval(async () => {
      if (data.submission.results.length) {
        clearInterval(timer);
        return;
      }
      await invalidateAll();
    }, 2000);
    return () => clearInterval(timer);
  });
</script>

<svelte:head>
  <title>Submission to "{data.submission.problem.title}" - happyjudge</title>
</svelte:head>

<div class="mx-auto max-w-4xl">
  <h1 class="text-3xl font-bold tracking-tight">
    Submission to {#if data.submission.contestId}<a
        href={'/contest/' + data.submission.contestId + '/problem/' + data.submission.problemId}
        class="underline underline-offset-4">{data.submission.problem.title}</a
      >{:else}<a href={'/problem/' + data.submission.problemId} class="underline underline-offset-4"
        >{data.submission.problem.title}</a
      >{/if}
  </h1>
  <p class="text-muted mt-1 text-sm">Language: {data.submission.language}</p>

  {#if !data.submission.results.length}
    <div class="card mt-6 flex items-center gap-4" aria-live="polite">
      <span class="size-5 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" aria-hidden="true"
      ></span>
      <div>
        <p class="font-semibold">Judging your submission</p>
        <p class="text-muted text-sm">Results will appear here automatically.</p>
      </div>
    </div>
  {:else}
    <div class="card mt-6 overflow-x-auto p-0">
      <table class="scoreboard">
        <thead>
          <tr>
            <th>Subtask</th>
            <th>Case</th>
            <th>Time</th>
            <th>Verdict</th>
            <th>Score</th>
          </tr>
        </thead>
        {#each results as group}
          <tbody>
            <tr class="bg-zinc-100 dark:bg-zinc-800">
              <th scope="row" class="font-semibold">{group.groupId}</th>
              <td></td><td></td><td></td>
              <td>+{group.score.toFixed(2)}</td>
            </tr>
            {#each group.results as caseResult, j}
              <tr>
                <td></td>
                <td>Case {group.groupId}.{j + 1}</td>
                <td>{(caseResult.timeTaken / 1000).toFixed(3)}s</td>
                <td><span class="badge">{caseResult.verdict}</span></td>
                <td>{caseResult.score}</td>
              </tr>
            {/each}
          </tbody>
        {/each}
        <tbody>
          <tr>
            <td colspan="4" class="text-right font-semibold">Total</td>
            <td class="font-bold">{results.map((x) => x.score).reduce((a, b) => a + b, 0)}</td>
          </tr>
        </tbody>
      </table>
    </div>
  {/if}

  <h2 class="mt-6 text-2xl font-semibold">Code</h2>
  <p class="text-muted my-2 text-sm">Written in {data.submission.language}</p>
  <div class="card overflow-hidden p-0">
    <CodeMirror value={data.submission.code} basicEditSetup={false} readOnly={true} />
  </div>
</div>
