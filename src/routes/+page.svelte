<script lang="ts">
  import Difficulty from '$lib/components/Difficulty.svelte';
  import type { PageServerData } from './$types';
  let { data }: { data: PageServerData } = $props();
  let query = $state('');
  let difficulty = $state('all');
  let progress = $state('all');
  let view = $state<'recommended' | 'all' | 'solved'>('recommended');
  const difficulties = ['all', 'easy', 'medium', 'hard', 'expert', 'insane'];
  const solved = $derived(data.problems.filter((p) => data.progress[p.id] === 'solved').length);
  const attempted = $derived(data.problems.filter((p) => data.progress[p.id] === 'attempted').length);
  const continueProblems = $derived(
    data.recentProblemIds
      .map((id) => data.problems.find((problem) => problem.id === id))
      .filter((problem): problem is NonNullable<typeof problem> =>
        Boolean(problem && data.progress[problem.id] !== 'solved'),
      )
      .slice(0, 3),
  );
  const filteredProblems = $derived(
    data.problems.filter((p) => {
      const search = query.trim().toLowerCase();
      return (
        (!search ||
          p.title.toLowerCase().includes(search) ||
          (p.tags ?? []).some((t) => t.toLowerCase().includes(search))) &&
        (difficulty === 'all' || p.difficulty === difficulty) &&
        (progress === 'all' || data.progress[p.id] === progress) &&
        (view !== 'recommended' || data.progress[p.id] !== 'solved') &&
        (view !== 'solved' || data.progress[p.id] === 'solved')
      );
    }),
  );
</script>

<svelte:head><title>Problem library - happyjudge</title></svelte:head>

<section class="section-heading grid gap-8 pb-8 lg:grid-cols-[1fr_auto] lg:items-end">
  <div>
    <p class="eyebrow">The practice room</p>
    <h1 class="mt-3 text-4xl sm:text-5xl">Good problems. Better thinking.</h1>
    <p class="text-muted mt-4 max-w-xl text-sm leading-7">
      Welcome back, {data.user.username}. Find your next problem, work through an idea, and make a little progress.
    </p>
  </div>
  <div class="flex gap-8 border-l-2 border-blue-600 pl-6">
    <div>
      <p class="font-serif text-3xl">{solved}</p>
      <p class="text-muted mt-1 text-xs">Solved</p>
    </div>
    <div>
      <p class="font-serif text-3xl">{attempted}</p>
      <p class="text-muted mt-1 text-xs">In progress</p>
    </div>
    <div>
      <p class="font-serif text-3xl">{data.problems.length}</p>
      <p class="text-muted mt-1 text-xs">In the library</p>
    </div>
  </div>
</section>

{#if continueProblems.length > 0}
  <section class="mb-10" aria-labelledby="continue-title">
    <div class="mb-4 flex items-end justify-between gap-4">
      <div>
        <p class="eyebrow">Pick up where you left off</p>
        <h2 id="continue-title" class="mt-2 font-serif text-2xl">Continue solving</h2>
      </div>
      <a href="#library-title" class="text-sm font-semibold text-blue-700 hover:underline dark:text-blue-300"
        >Browse all →</a
      >
    </div>
    <div class="grid gap-3 md:grid-cols-3">
      {#each continueProblems as problem}
        <a
          href={`/problem/${problem.id}`}
          class="card group border-l-4 border-l-amber-500 transition hover:-translate-y-0.5 hover:border-blue-400"
        >
          <div class="flex items-start justify-between gap-3">
            <span class="badge" data-progress="attempted">In progress</span><span class="text-muted text-xs"
              >{problem.difficulty}</span
            >
          </div>
          <h3 class="mt-4 font-serif text-xl group-hover:text-blue-700 dark:group-hover:text-blue-300">
            {problem.title}
          </h3>
          <p class="text-muted mt-3 text-xs">Return to your solution <span aria-hidden="true">→</span></p>
        </a>
      {/each}
    </div>
  </section>
{/if}

<div class="grid gap-8 lg:grid-cols-[minmax(0,1fr)_240px]">
  <section class="min-w-0" aria-labelledby="library-title">
    <div class="flex flex-wrap items-end justify-between gap-4">
      <div>
        <h2 id="library-title" class="section-title">Problem library</h2>
        <p class="text-muted mt-1 text-xs">{filteredProblems.length} of {data.problems.length} problems</p>
      </div>
      <label class="w-full sm:w-72"
        ><span class="sr-only">Search by title or tag</span><input
          bind:value={query}
          type="search"
          class="form-input"
          placeholder="Search by title or tag…"
        /></label
      >
    </div>
    <div
      class="mt-5 flex flex-wrap items-center gap-1 border-b border-slate-200 pb-2 dark:border-slate-800"
      role="tablist"
      aria-label="Problem views"
    >
      <button
        type="button"
        class="filter-tab"
        role="tab"
        aria-selected={view === 'recommended'}
        onclick={() => (view = 'recommended')}>Recommended</button
      >
      <button type="button" class="filter-tab" role="tab" aria-selected={view === 'all'} onclick={() => (view = 'all')}
        >All problems</button
      >
      <button
        type="button"
        class="filter-tab"
        role="tab"
        aria-selected={view === 'solved'}
        onclick={() => (view = 'solved')}>Solved</button
      >
      <span class="text-muted ml-auto hidden text-xs sm:inline"
        >Use <kbd class="font-mono">/</kbd> for quick navigation</span
      >
    </div>
    <div class="my-5 flex flex-wrap gap-1" aria-label="Filter by difficulty">
      {#each difficulties as option}<button
          class="filter-tab"
          aria-pressed={difficulty === option}
          onclick={() => (difficulty = option)}>{option === 'all' ? 'All difficulties' : option}</button
        >{/each}
    </div>
    <div class="card overflow-x-auto p-0">
      <table class="scoreboard">
        <thead><tr><th class="w-14">#</th><th>Problem</th><th>Difficulty</th><th>Progress</th></tr></thead>
        <tbody>
          {#each filteredProblems as problem, i}
            <tr class="group hover:bg-slate-50 dark:hover:bg-slate-800/50">
              <td class="text-muted font-mono text-xs">{String(i + 1).padStart(2, '0')}</td>
              <td
                ><a class="font-semibold hover:text-blue-600 hover:underline" href={`/problem/${problem.id}`}
                  >{problem.title}</a
                >
                {#if problem.tags?.length}<p class="text-muted mt-1 text-xs">{problem.tags.join(' · ')}</p>{/if}
              </td>
              <td><Difficulty difficulty={problem.difficulty} /></td>
              <td
                ><span class="badge whitespace-nowrap" data-progress={data.progress[problem.id]}
                  >{data.progress[problem.id]}</span
                ></td
              >
            </tr>
          {:else}
            <tr
              ><td colspan="4" class="py-12 text-center"
                ><p class="font-semibold">No matching problems</p>
                <p class="text-muted mt-2 text-sm">Try another title, tag, or filter.</p>
                <button
                  class="btn-ghost mt-4"
                  onclick={() => {
                    query = '';
                    difficulty = 'all';
                    progress = 'all';
                  }}>Reset filters</button
                ></td
              ></tr
            >
          {/each}
        </tbody>
      </table>
    </div>
  </section>
  <aside class="space-y-7 lg:border-l lg:border-slate-200 lg:pl-7 dark:lg:border-slate-800">
    <section>
      <p class="eyebrow mb-3">Your practice</p>
      <label class="form-label" for="progress">Problem progress</label><select
        id="progress"
        class="form-input"
        bind:value={progress}
        ><option value="all">All problems</option><option value="unattempted">Not started</option><option
          value="attempted">In progress</option
        ><option value="solved">Solved</option></select
      >
    </section>
    <section class="border-t border-slate-200 pt-6 dark:border-slate-800">
      <p class="eyebrow">Put it into practice</p>
      <h2 class="mt-3 font-serif text-2xl">A different kind of challenge.</h2>
      <p class="text-muted mt-3 text-sm leading-6">
        Test your ideas against the clock. Explore public contests or join one with an invitation.
      </p>
      <a href="/contests" class="mt-4 inline-flex text-sm font-semibold text-blue-700 dark:text-blue-300"
        >Explore contests <span class="ml-2" aria-hidden="true">→</span></a
      >
    </section>
    <a href="/submissions" class="text-muted block text-sm hover:underline">Review your submissions →</a>
  </aside>
</div>
