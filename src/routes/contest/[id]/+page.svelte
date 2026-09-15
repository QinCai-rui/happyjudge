<script lang="ts">
  import LocalTime from '$lib/components/LocalTime.svelte';
  import { onMount } from 'svelte';
  import { invalidateAll } from '$app/navigation';
  import type { PageServerData } from './$types';

  let { data, form }: { data: PageServerData; form: import('./$types').ActionData } = $props();
  const c = $derived(data.contest);
  let now = $state(Date.now());

  onMount(() => {
    let refreshedAtBoundary = false;
    let lastTarget = 0;
    const t = setInterval(() => {
      const current = Date.now();
      if (target !== lastTarget) {
        lastTarget = target;
        refreshedAtBoundary = false;
      }
      now = current;
      if (current >= target && !refreshedAtBoundary) {
        refreshedAtBoundary = true;
        void invalidateAll();
      }
    }, 1000);
    return () => clearInterval(t);
  });

  const target = $derived(c.status === 'upcoming' ? +new Date(c.startsAt) : +new Date(c.endsAt));
  const diff = $derived(Math.max(0, target - now));
  const countdown = $derived(
    `${Math.floor(diff / 3600000)}h ${Math.floor((diff % 3600000) / 60000)}m ${Math.floor((diff % 60000) / 1000)}s`,
  );
  const solvedProblems = $derived(
    data.problems.filter((problem) => data.problemProgress[problem.id]?.state === 'solved').length,
  );
  const attemptedProblems = $derived(
    data.problems.filter((problem) => data.problemProgress[problem.id]?.state === 'attempted').length,
  );
  const score = $derived(
    data.problems.reduce((total, problem) => total + (data.problemProgress[problem.id]?.score ?? 0), 0),
  );
</script>

<svelte:head>
  <title>{c.title} - happyjudge</title>
</svelte:head>

<div class="mx-auto max-w-4xl">
  <a href="/contests" class="text-muted mb-6 inline-block text-xs hover:underline">← All contests</a>
  <div class="contest-banner" data-status={c.status}>
    {#if c.status === 'upcoming'}
      Starts <LocalTime value={c.startsAt} /> ·
      <span class="tabular font-mono">{countdown}</span>
    {:else if c.status === 'live'}
      Live — ends <LocalTime value={c.endsAt} /> ·
      <span class="tabular font-mono">{countdown} left</span>
    {:else}
      Ended <LocalTime value={c.endsAt} />
    {/if}
    <span class="badge ml-2" data-status={c.status}>{c.status}</span>
  </div>

  <h1 class="page-title mt-8">{c.title}</h1>
  {#if c.description}<p class="text-muted mt-2 max-w-prose whitespace-pre-wrap">{c.description}</p>{/if}
  <p class="text-muted mt-2 text-sm">
    {data.participantCount} participant(s) · {c.isPublic ? 'public' : 'private invite-only'} · all-or-nothing subtasks ·
    live scoreboard
  </p>

  <div class="mt-4 flex flex-wrap gap-2">
    <a class="btn-primary" href={`/contest/${c.id}/scoreboard`}>Scoreboard</a>
    {#if c.isPublic && c.status !== 'ended' && !data.isManager && !data.isParticipant}
      <form method="POST" action="?/join"><button class="btn-primary">Join contest</button></form>
    {/if}
    {#if data.isManager}
      <a class="btn-ghost" href={`/contest/${c.id}/manage`}>Manage</a>
    {/if}
  </div>
  {#if form?.message}<p class="form-error mt-3" role="alert">{form.message}</p>{/if}

  <div class="mt-8 grid grid-cols-3 gap-2 border-y border-slate-200 py-5 dark:border-slate-800">
    <div>
      <p class="font-serif text-2xl">{solvedProblems}<span class="text-muted text-sm">/{data.problems.length}</span></p>
      <p class="text-muted mt-1 text-xs">Solved</p>
    </div>
    <div>
      <p class="font-serif text-2xl">{score}</p>
      <p class="text-muted mt-1 text-xs">Your score</p>
    </div>
    <div>
      <p class="font-serif text-2xl">{attemptedProblems}</p>
      <p class="text-muted mt-1 text-xs">In progress</p>
    </div>
  </div>

  <h2 class="section-heading mt-8 text-xl font-semibold">Contest problems</h2>
  {#if c.status === 'upcoming' && !data.isManager}
    <p class="text-muted mt-2 text-sm italic">Problems unlock when the contest starts.</p>
  {:else}
    <ul class="mt-3 space-y-2">
      {#each data.problems as p, i}
        <li class="card flex flex-wrap items-center justify-between gap-3 transition hover:border-blue-300">
          <a class="flex min-w-0 items-center font-medium hover:underline" href={`/contest/${c.id}/problem/${p.id}`}>
            <span class="mr-4 font-mono text-blue-600 dark:text-blue-300">{String.fromCharCode(65 + i)}</span>
            <span class="truncate">{p.title}</span>
          </a>
          <span class="flex items-center gap-3 text-sm">
            <span class="badge" data-progress={data.problemProgress[p.id]?.state ?? 'unattempted'}
              >{data.problemProgress[p.id]?.state ?? 'unattempted'}</span
            >
            <span class="text-muted">{data.problemProgress[p.id]?.score ?? 0}/{data.pointsByProblem[p.id] ?? 100}</span>
          </span>
        </li>
      {:else}
        <li class="text-muted text-sm italic">No problems added yet.</li>
      {/each}
    </ul>
  {/if}
</div>
