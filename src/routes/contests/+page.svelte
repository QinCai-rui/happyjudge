<script lang="ts">
  import type { ActionData, PageServerData } from './$types';

  let { data, form }: { data: PageServerData; form: ActionData } = $props();
</script>

<svelte:head>
  <title>Contests - happyjudge</title>
</svelte:head>

<div class="mx-auto max-w-4xl">
  <h1 class="text-3xl font-bold tracking-tight">Contests</h1>
  <p class="text-muted mt-1 text-sm">
    Public contests are open to all logged-in users. Private contests require an invite.
  </p>

  <div class="mt-6 grid gap-4 sm:grid-cols-2">
    {#each data.contests as c}
      <a href={`/contest/${c.id}`} class="card hover:border-brand block transition-colors">
        <div class="flex items-center justify-between gap-2">
          <h2 class="text-lg font-semibold">{c.title}</h2>
          <span class="badge" data-status={c.status}>{c.status}</span>
        </div>
        <p class="text-muted mt-1 text-sm">
          {new Date(c.startsAt).toLocaleString()} → {new Date(c.endsAt).toLocaleString()}
        </p>
        <p class="text-muted mt-1 text-xs">{c.isPublic ? 'Public' : 'Private invite-only'}</p>
      </a>
    {:else}
      <p class="text-muted text-sm italic sm:col-span-2">
        No contests yet. Ask an organizer for an invite, or create one below.
      </p>
    {/each}
  </div>

  {#if data.user.canCreate || data.user.canAdmin}
    <form method="POST" action="?/create" class="card mt-8 space-y-4">
      <h2 class="text-xl font-semibold">Create a contest</h2>
      <div>
        <label class="form-label" for="title">Title</label>
        <input
          class="form-input"
          id="title"
          name="title"
          required
          minlength="3"
          maxlength="120"
          placeholder="Weekly #7"
        />
      </div>
      <div>
        <label class="form-label" for="description">Description</label>
        <textarea
          class="form-input"
          id="description"
          name="description"
          rows="3"
          placeholder="Rules, scoring (IOI partial, live)…"
        ></textarea>
      </div>
      <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label class="form-label" for="startsAt">Starts at</label>
          <input class="form-input" id="startsAt" name="startsAt" type="datetime-local" required />
        </div>
        <div>
          <label class="form-label" for="endsAt">Ends at</label>
          <input class="form-input" id="endsAt" name="endsAt" type="datetime-local" required />
        </div>
      </div>
      <label class="flex items-center gap-2 text-sm"
        ><input type="checkbox" name="isPublic" class="checkbox" /> Public contest: anyone logged in can view and join</label
      >
      <label class="flex items-center gap-2 text-sm"
        ><input type="checkbox" name="releaseOnEnd" class="checkbox" /> Release problems publicly when contest ends</label
      >
      {#if form?.message}<p class="form-error">{form.message}</p>{/if}
      <button class="btn-primary">Create contest</button>
    </form>
  {/if}
</div>
