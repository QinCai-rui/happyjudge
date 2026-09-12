<script lang="ts">
  import type { PageServerData } from './$types';

  let { data }: { data: PageServerData } = $props();
</script>

<svelte:head>
  <title>Home - happyjudge</title>
</svelte:head>

<h1 class="text-3xl font-bold tracking-tight">Hi, {data.user.username}!</h1>
<p class="text-muted mt-1 text-sm">Public problems · <a class="underline" href="/contests">your contests →</a></p>

<h2 class="mt-6 mb-3 text-xl font-semibold">Recommended problems</h2>

<div class="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
  {#each data.problems as problem}
    <a href={`/problem/${problem.id}`} class="card block transition-colors hover:border-sky-400">
      <h3 class="text-base font-semibold">{problem.title}</h3>
      <p class="mt-1"><span class="badge">{problem.difficulty}</span></p>
      {#if (problem.tags ?? []).length > 0}
        <div class="mt-2 flex flex-wrap gap-1">
          {#each problem.tags as tag}
            <span class="badge">{tag}</span>
          {/each}
        </div>
      {/if}
    </a>
  {:else}
    <p class="text-muted italic">The admin hasn't added any problems to the homepage yet! :O</p>
  {/each}
</div>
