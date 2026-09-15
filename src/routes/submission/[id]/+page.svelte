<script lang="ts">
  import CodeMirror from '$lib/components/CodeMirror.svelte';
  import LocalTime from '$lib/components/LocalTime.svelte';
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
  const scoreLabel = $derived(
    data.submission.contestId
      ? `${data.submission.score}/${data.submission.scoreMaximum}`
      : `${data.submission.score}%`,
  );
  const verdict = $derived(
    !data.submission.results.length
      ? 'Judging'
      : data.submission.results.every((result) => result.verdict === 'Accepted')
        ? 'Accepted'
        : (data.submission.results.find((result) => result.verdict !== 'Accepted')?.verdict ?? 'Finished'),
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
  <a href="/submissions" class="text-muted mb-6 inline-block text-xs hover:underline">← Submission history</a>
  <p class="eyebrow mb-3">Solution review</p>
  <h1 class="text-3xl font-bold tracking-tight">
    Submission to {#if data.submission.contestId}<a
        href={'/contest/' + data.submission.contestId + '/problem/' + data.submission.problemId}
        class="underline underline-offset-4">{data.submission.problem.title}</a
      >{:else}<a href={'/problem/' + data.submission.problemId} class="underline underline-offset-4"
        >{data.submission.problem.title}</a
      >{/if}
  </h1>
  <div
    class="mt-4 flex flex-wrap items-center justify-between gap-4 border-y border-slate-200 py-4 dark:border-slate-800"
  >
    <div>
      <p class="text-muted text-xs">
        {data.submission.language} · submitted <LocalTime value={data.submission.submittedAt} />
      </p>
      <p class="mt-2 text-2xl font-semibold">{verdict}</p>
    </div>
    {#if data.submission.results.length}<div class="text-right">
        <p class="font-serif text-3xl">{scoreLabel}</p>
        <p class="text-muted text-xs">{data.submission.contestId ? 'Contest points' : 'Score'}</p>
      </div>{/if}
  </div>

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
            <th>{data.submission.contestId ? 'Points' : 'Score (%)'}</th>
          </tr>
        </thead>
        {#each results as group}
          <tbody>
            <tr class="bg-slate-100 dark:bg-slate-800">
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
            <td class="font-bold">{scoreLabel}</td>
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
