<script lang="ts">
  import type { PageServerData } from './$types';

  let { data }: { data: PageServerData } = $props();

  let query = $state('');
  let difficulty = $state('all');
  const difficulties = ['all', 'easy', 'medium', 'hard', 'expert', 'insane'];
  const filteredProblems = $derived(
    data.problems.filter((problem) => {
      const search = query.trim().toLowerCase();
      const matchesSearch =
        !search ||
        problem.title.toLowerCase().includes(search) ||
        (problem.tags ?? []).some((tag) => tag.toLowerCase().includes(search));
      return matchesSearch && (difficulty === 'all' || problem.difficulty === difficulty);
    }),
  );
</script>

<svelte:head>
  <title>Home - happyjudge</title>
</svelte:head>

<section
  class="overflow-hidden rounded-3xl bg-slate-950 px-6 py-8 text-white shadow-xl shadow-blue-950/10 sm:px-10 sm:py-10 dark:border dark:border-slate-800"
>
  <div class="max-w-2xl">
    <p class="text-xs font-bold tracking-widest text-blue-400 uppercase">Practice workspace</p>
    <h1 class="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
      Ready for your next challenge, {data.user.username}?
    </h1>
    <p class="mt-3 max-w-xl text-sm leading-6 text-slate-300 sm:text-base">
      Sharpen your problem-solving skills with curated tasks, or compete against others in a timed contest.
    </p>
    <div class="mt-6 flex flex-wrap gap-3">
      <a class="btn-primary" href="#problems">Browse problems</a>
      <a
        class="inline-flex min-h-10 items-center justify-center rounded-xl border border-slate-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
        href="/contests">View contests <span aria-hidden="true">→</span></a
      >
    </div>
  </div>
</section>

<section id="problems" class="scroll-mt-24 pt-10">
  <div class="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
    <div>
      <p class="eyebrow">Problem library</p>
      <h2 class="section-title mt-1">Recommended for you</h2>
      <p class="text-muted mt-1 text-sm">
        {data.problems.length} curated {data.problems.length === 1 ? 'problem' : 'problems'} available
      </p>
    </div>
    <label class="relative block w-full sm:max-w-xs">
      <span class="sr-only">Search problems</span>
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        class="pointer-events-none absolute top-3 left-3.5 size-5 text-slate-400"
        aria-hidden="true"
        ><circle cx="11" cy="11" r="7" stroke-width="1.8" /><path
          d="m20 20-4-4"
          stroke-width="1.8"
          stroke-linecap="round"
        /></svg
      >
      <input bind:value={query} class="form-input pl-11" type="search" placeholder="Search by title or tag" />
    </label>
  </div>

  <div class="mt-5 flex gap-2 overflow-x-auto pb-2" aria-label="Filter by difficulty">
    {#each difficulties as option}
      <button
        onclick={() => (difficulty = option)}
        class="shrink-0 cursor-pointer rounded-full border px-3.5 py-1.5 text-sm font-semibold capitalize transition {difficulty ===
        option
          ? 'border-blue-600 bg-blue-600 text-white'
          : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300'}"
        >{option}</button
      >
    {/each}
  </div>

  <div class="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
    {#each filteredProblems as problem}
      <a
        href={`/problem/${problem.id}`}
        class="card group block p-0 transition duration-200 hover:-translate-y-0.5 hover:border-blue-300 hover:shadow-lg hover:shadow-slate-900/8 dark:hover:border-blue-700"
      >
        <div class="p-5">
          <div class="flex items-start justify-between gap-4">
            <div class="flex flex-wrap gap-2">
              <span class="badge" data-difficulty={problem.difficulty}>{problem.difficulty}</span>
              <span class="badge" data-progress={data.progress[problem.id]}>{data.progress[problem.id]}</span>
            </div>
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              class="size-5 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-blue-600 dark:text-slate-600"
              aria-hidden="true"
              ><path d="M5 12h14m-5-5 5 5-5 5" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" /></svg
            >
          </div>
          <h3
            class="mt-4 text-lg font-bold tracking-tight text-slate-900 group-hover:text-blue-700 dark:text-white dark:group-hover:text-blue-400"
          >
            {problem.title}
          </h3>
          {#if (problem.tags ?? []).length > 0}
            <div class="mt-3 flex flex-wrap gap-1.5">
              {#each problem.tags.slice(0, 3) as tag}
                <span class="text-xs font-medium text-slate-500 dark:text-slate-400">#{tag}</span>
              {/each}
            </div>
          {/if}
        </div>
      </a>
    {:else}
      <div class="card py-12 text-center sm:col-span-2 lg:col-span-3">
        <p class="font-semibold">No matching problems</p>
        <p class="text-muted mt-1 text-sm">Try a different search term or difficulty.</p>
        {#if query || difficulty !== 'all'}<button
            class="btn-ghost mt-4"
            onclick={() => {
              query = '';
              difficulty = 'all';
            }}>Clear filters</button
          >{/if}
      </div>
    {/each}
  </div>
</section>
