<script lang="ts">
  import { onMount } from 'svelte';
  import { invalidateAll } from '$app/navigation';
  import type { PageServerData } from './$types';

  let { data }: { data: PageServerData } = $props();
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
</script>

<svelte:head>
  <title>{c.title} - happyjudge</title>
</svelte:head>

<div class="mx-auto max-w-4xl">
  <div class="contest-banner" data-status={c.status}>
    {#if c.status === 'upcoming'}
      ⏳ Starts <time datetime={String(c.startsAt)}>{new Date(c.startsAt).toLocaleString()}</time> ·
      <span aria-live="polite">{countdown}</span>
    {:else if c.status === 'live'}
      🟢 Live — ends <time datetime={String(c.endsAt)}>{new Date(c.endsAt).toLocaleString()}</time> ·
      <span aria-live="polite">{countdown} left</span>
    {:else}
      🏁 Ended <time datetime={String(c.endsAt)}>{new Date(c.endsAt).toLocaleString()}</time>
    {/if}
    <span class="badge ml-2" data-status={c.status}>{c.status}</span>
  </div>

  <h1 class="mt-4 text-3xl font-bold tracking-tight">{c.title}</h1>
  {#if c.description}<p class="text-muted mt-2 max-w-prose whitespace-pre-wrap">{c.description}</p>{/if}
  <p class="text-muted mt-2 text-sm">
    {data.participantCount} participant(s) · all-or-nothing subtasks · live scoreboard
  </p>

  <div class="mt-4 flex flex-wrap gap-2">
    <a class="btn-primary" href={`/contest/${c.id}/scoreboard`}>Scoreboard</a>
    {#if data.isManager}
      <a class="btn-ghost" href={`/contest/${c.id}/manage`}>Manage</a>
    {/if}
  </div>

  <h2 class="mt-8 text-xl font-semibold">Problems</h2>
  {#if c.status === 'upcoming' && !data.isManager}
    <p class="text-muted mt-2 text-sm italic">Problems unlock when the contest starts.</p>
  {:else}
    <ul class="mt-3 space-y-2">
      {#each data.problems as p, i}
        <li class="card flex items-center justify-between gap-3">
          <a class="font-medium hover:underline" href={`/contest/${c.id}/problem/${p.id}`}>
            {i + 1}. {p.title}
          </a>
          <span class="text-muted text-sm">{data.pointsByProblem[p.id] ?? 100} pts · {p.difficulty}</span>
        </li>
      {:else}
        <li class="text-muted text-sm italic">No problems added yet.</li>
      {/each}
    </ul>
  {/if}
</div>
