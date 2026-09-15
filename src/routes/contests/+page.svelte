<script lang="ts">
  import LocalTime from '$lib/components/LocalTime.svelte';
  import { normalizeScheduleForm } from '$lib/datetime';
  import type { ActionData, PageServerData } from './$types';

  let { data, form }: { data: PageServerData; form: ActionData } = $props();
</script>

<svelte:head>
  <title>Contests - happyjudge</title>
</svelte:head>

<div class="mx-auto max-w-4xl">
  <div class="section-heading">
    <p class="eyebrow mb-3">The competition hall</p>
    <h1 class="page-title">Contests</h1>
    <p class="text-muted mt-1 text-sm">
      Public contests are open to all logged-in users. Private contests require an invite.
    </p>
  </div>

  <div class="mt-6 grid gap-3">
    {#each data.contests as c}
      <a
        href={`/contest/${c.id}`}
        class="card block border-l-4 border-l-blue-600 transition-colors hover:border-blue-400"
      >
        <div class="flex items-center justify-between gap-2">
          <h2 class="font-serif text-2xl">{c.title}</h2>
          <span class="badge" data-status={c.status}>{c.status}</span>
        </div>
        <p class="text-muted mt-3 text-sm">
          <LocalTime value={c.startsAt} /> → <LocalTime value={c.endsAt} />
        </p>
        <div class="mt-4 flex justify-between text-xs">
          <span class="text-muted">{c.isPublic ? 'Open to all members' : 'By invitation'}</span><span
            class="font-semibold text-blue-700 dark:text-blue-300">View contest →</span
          >
        </div>
      </a>
    {:else}
      <p class="text-muted text-sm italic sm:col-span-2">
        No contests yet. Ask an organizer for an invite, or create one below.
      </p>
    {/each}
  </div>

  {#if data.user.canCreate || data.user.canAdmin}
    <form method="POST" action="?/create" class="card mt-8 space-y-4" onsubmit={normalizeScheduleForm}>
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
      <fieldset class="border-y border-slate-200 py-5 dark:border-slate-800">
        <legend class="font-semibold">Schedule</legend>
        <p class="text-muted mt-1 text-sm">
          Enter the schedule in your local timezone. Participants see it in their own local timezone.
        </p>
        <div class="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label class="form-label" for="startsAt">Starts at <span class="text-muted font-normal">(your local time)</span></label>
            <input class="form-input" id="startsAt" name="startsAt" type="datetime-local" required />
          </div>
          <div>
            <label class="form-label" for="endsAt">Ends at <span class="text-muted font-normal">(your local time)</span></label>
            <input class="form-input" id="endsAt" name="endsAt" type="datetime-local" required />
          </div>
        </div>
      </fieldset>
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
