<script lang="ts">
  import type { PageServerData } from './$types';
  let { data }: { data: PageServerData } = $props();
</script>

<svelte:head>
  <title>Users - admin - happyjudge</title>
</svelte:head>

<div class="mx-auto max-w-3xl">
  <h1 class="text-3xl font-bold tracking-tight">Users</h1>
  <p class="text-muted mt-1 text-sm"><code>canCreate</code> authors problems + own contests. <code>canAdmin</code> is everything.</p>
  <ul class="mt-6 space-y-2">
    {#each data.users as u}
      <li class="card">
        <form method="POST" action="?/update" class="flex flex-wrap items-center gap-4">
          <input type="hidden" name="id" value={u.id} />
          <span class="font-mono font-semibold">{u.username}</span>
          <label class="flex items-center gap-1 text-sm"><input type="checkbox" name="canCreate" checked={u.canCreate} class="checkbox" /> create</label>
          <label class="flex items-center gap-1 text-sm"><input type="checkbox" name="canAdmin" checked={u.canAdmin} class="checkbox" /> admin</label>
          <button class="btn-primary ml-auto text-xs">Save</button>
        </form>
      </li>
    {/each}
  </ul>
</div>
