<script lang="ts">
  import LocalTime from '$lib/components/LocalTime.svelte';
  import type { PageServerData } from './$types';

  let { data }: { data: PageServerData } = $props();
</script>

<svelte:head>
  <title>Contest invite · {data.contest.title} - happyjudge</title>
</svelte:head>

<div class="mx-auto my-10 max-w-lg">
  <div class="card border-t-4 border-t-blue-600 p-8 sm:p-10">
    <p class="eyebrow">You're invited</p>
    <h1 class="mt-4 text-4xl">{data.contest.title}</h1>
    {#if data.contest.description}
      <p class="text-muted mt-2 whitespace-pre-wrap">{data.contest.description}</p>
    {/if}
    <p class="text-muted mt-4 text-sm">
      <LocalTime value={data.contest.startsAt} /> → <LocalTime value={data.contest.endsAt} />
    </p>
    <form method="POST" action="?/accept" class="mt-6">
      <button class="btn-primary w-full">Accept invitation</button>
    </form>
  </div>
</div>
