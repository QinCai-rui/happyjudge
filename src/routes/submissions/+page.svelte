<script lang="ts">
  import type { PageServerData } from './$types';

  let { data }: { data: PageServerData } = $props();
  let status = $state('all');
  let query = $state('');

  const filtered = $derived(
    data.submissions.filter(
      (submission) =>
        (status === 'all' || submission.state === status) &&
        (!query.trim() || submission.problemTitle.toLowerCase().includes(query.trim().toLowerCase())),
    ),
  );
</script>

<svelte:head>
  <title>My submissions - happyjudge</title>
</svelte:head>

<div class="mx-auto max-w-5xl">
  <div class="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
    <div>
      <p class="eyebrow">Your activity</p>
      <h1 class="page-title mt-1">Submission history</h1>
      <p class="text-muted mt-2 text-sm">Review your latest 100 attempts and return to unfinished problems.</p>
    </div>
    <label class="relative block w-full sm:max-w-xs">
      <span class="sr-only">Search submissions</span>
      <input bind:value={query} class="form-input" type="search" placeholder="Search problems" />
    </label>
  </div>

  <div class="mt-6 flex gap-2 overflow-x-auto pb-2" aria-label="Filter submissions">
    {#each ['all', 'pending', 'accepted', 'failed'] as option}
      <button
        onclick={() => (status = option)}
        class="shrink-0 cursor-pointer rounded-full border px-3.5 py-1.5 text-sm font-semibold capitalize transition {status ===
        option
          ? 'border-blue-600 bg-blue-600 text-white'
          : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300'}"
        >{option}</button
      >
    {/each}
  </div>

  <div class="card mt-4 overflow-x-auto p-0">
    {#if filtered.length}
      <table class="scoreboard">
        <thead>
          <tr><th>Problem</th><th>Status</th><th>Language</th><th>Score</th><th>Submitted</th></tr>
        </thead>
        <tbody>
          {#each filtered as submission}
            <tr class="transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50">
              <td>
                <a
                  class="font-semibold text-slate-900 hover:text-blue-700 dark:text-white dark:hover:text-blue-400"
                  href={`/submission/${submission.id}`}>{submission.problemTitle}</a
                >
                {#if submission.contestId}<span class="text-muted mt-0.5 block text-xs">Contest submission</span>{/if}
              </td>
              <td><span class="badge" data-verdict={submission.state}>{submission.verdict}</span></td>
              <td class="whitespace-nowrap">{submission.language}</td>
              <td class="font-mono font-semibold">{submission.score}</td>
              <td class="text-muted whitespace-nowrap"
                ><time datetime={String(submission.submittedAt)}
                  >{new Date(submission.submittedAt).toLocaleString()}</time
                ></td
              >
            </tr>
          {/each}
        </tbody>
      </table>
    {:else}
      <div class="py-14 text-center">
        <p class="font-semibold">No submissions found</p>
        <p class="text-muted mt-1 text-sm">
          {data.submissions.length ? 'Try changing your filters.' : 'Solve a problem to see your attempts here.'}
        </p>
        {#if !data.submissions.length}<a class="btn-primary mt-4" href="/">Browse problems</a>{/if}
      </div>
    {/if}
  </div>
</div>
