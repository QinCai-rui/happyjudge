<script lang="ts">
  import type { PageServerData } from './$types';

  let { data }: { data: PageServerData } = $props();
</script>

<svelte:head>
  <title>Contest invite · {data.contest.title} - happyjudge</title>
</svelte:head>

<div class="mx-auto max-w-md">
  <div class="card">
    <p class="text-muted text-sm font-semibold uppercase">Contest invitation</p>
    <h1 class="mt-2 text-2xl font-bold">{data.contest.title}</h1>
    {#if data.contest.description}
      <p class="text-muted mt-2 whitespace-pre-wrap">{data.contest.description}</p>
    {/if}
    <p class="text-muted mt-4 text-sm">
      {new Date(data.contest.startsAt).toLocaleString()} → {new Date(data.contest.endsAt).toLocaleString()}
    </p>
    <form method="POST" action="?/accept" class="mt-6">
      <button class="btn-primary w-full">Accept invitation</button>
    </form>
  </div>
</div>
