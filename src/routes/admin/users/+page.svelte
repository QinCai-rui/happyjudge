<script lang="ts">
  import type { PageServerData } from './$types';
  let { data }: { data: PageServerData } = $props();
</script>

<svelte:head>
  <title>Users - admin - happyjudge</title>
</svelte:head>

<div class="mx-auto max-w-3xl">
  <div class="section-heading">
    <p class="eyebrow mb-3">Administration</p>
    <h1 class="page-title">Members &amp; permissions</h1>
    <p class="text-muted mt-3 text-sm leading-6">
      Authors can create problems and organize contests. Administrators have full access to the platform.
    </p>
    <p class="text-muted mt-3 text-xs">{data.users.length} registered members</p>
  </div>
  <ul class="mt-6 space-y-2">
    {#each data.users as u}
      <li class="card">
        <form method="POST" action="?/update" class="flex flex-wrap items-center gap-4">
          <input type="hidden" name="id" value={u.id} />
          <span class="min-w-32 font-semibold">{u.username}</span>
          <label class="flex items-center gap-2 text-sm"
            ><input type="checkbox" name="canCreate" checked={u.canCreate} class="checkbox" /> Author</label
          >
          <label class="flex items-center gap-2 text-sm"
            ><input type="checkbox" name="canAdmin" checked={u.canAdmin} class="checkbox" /> Administrator</label
          >
          <button class="btn-primary ml-auto text-xs">Save</button>
        </form>
      </li>
    {/each}
  </ul>
</div>
