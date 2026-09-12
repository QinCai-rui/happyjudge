<script lang="ts">
  import type { ActionData, PageServerData } from './$types';

  let { data, form }: { data: PageServerData; form: ActionData } = $props();
  const c = $derived(data.contest);
  const toLocal = (d: string | Date) => {
    const dt = new Date(d);
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}T${pad(dt.getHours())}:${pad(dt.getMinutes())}`;
  };
</script>

<svelte:head>
  <title>Manage · {c.title} - happyjudge</title>
</svelte:head>

<div class="mx-auto max-w-4xl">
  <a class="btn-ghost text-sm" href={`/contest/${c.id}`}>← Back to contest</a>
  <h1 class="mt-2 text-3xl font-bold tracking-tight">Manage · {c.title}</h1>

  {#if form?.message}<p class="mt-4 form-success">{form.message}</p>{/if}

  <form method="POST" action="?/update" class="card mt-6 space-y-4">
    <h2 class="text-xl font-semibold">Timing & details</h2>
    <div>
      <label class="form-label" for="title">Title</label>
      <input class="form-input" id="title" name="title" value={c.title} required minlength="3" maxlength="120" />
    </div>
    <div>
      <label class="form-label" for="description">Description</label>
      <textarea class="form-input" id="description" name="description" rows="3">{c.description}</textarea>
    </div>
    <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <div>
        <label class="form-label" for="startsAt">Starts at</label>
        <input class="form-input" id="startsAt" name="startsAt" type="datetime-local" value={toLocal(c.startsAt)} required />
      </div>
      <div>
        <label class="form-label" for="endsAt">Ends at</label>
        <input class="form-input" id="endsAt" name="endsAt" type="datetime-local" value={toLocal(c.endsAt)} required />
      </div>
    </div>
    <label class="flex items-center gap-2 text-sm"><input type="checkbox" name="releaseOnEnd" checked={c.releaseOnEnd} class="checkbox" /> Release problems publicly when contest ends</label>
    <button class="btn-primary">Save</button>
  </form>

  <div class="card mt-6">
    <h2 class="text-xl font-semibold">Problems ({data.links.length})</h2>
    <ul class="mt-3 space-y-2">
      {#each data.links as l}
        <li class="flex items-center justify-between gap-2 text-sm">
          <span>{l.position + 1}. {l.problem?.title ?? l.problemId} · {l.points} pts</span>
          <form method="POST" action="?/removeProblem">
            <input type="hidden" name="problemId" value={l.problemId} />
            <button class="btn-danger text-xs">Remove</button>
          </form>
        </li>
      {:else}
        <li class="text-muted text-sm italic">No problems yet.</li>
      {/each}
    </ul>
    <form method="POST" action="?/addProblem" class="mt-4 flex flex-wrap items-end gap-2">
      <label class="text-sm">Problem
        <select name="problemId" class="form-input">
          {#each data.ownProblems as p}
            <option value={p.id}>{p.title} ({p.id})</option>
          {/each}
        </select>
      </label>
      <label class="text-sm">Points <input name="points" type="number" value="100" min="1" max="10000" class="form-input w-24" /></label>
      <button class="btn-primary">Add</button>
    </form>
    <p class="text-muted mt-2 text-xs">Adding a problem marks it private until release.</p>
  </div>

  <div class="card mt-6">
    <h2 class="text-xl font-semibold">Invites ({data.participants.length})</h2>
    <ul class="mt-3 space-y-2">
      {#each data.participants as p}
        <li class="flex items-center justify-between gap-2 text-sm">
          <span>{p.username}</span>
          <form method="POST" action="?/uninvite">
            <input type="hidden" name="userId" value={p.userId} />
            <button class="btn-danger text-xs">Remove</button>
          </form>
        </li>
      {/each}
    </ul>
    <form method="POST" action="?/invite" class="mt-4 flex items-end gap-2">
      <label class="text-sm">Username <input name="username" class="form-input" required placeholder="handle" /></label>
      <button class="btn-primary">Invite</button>
    </form>
  </div>

  <form method="POST" action="?/remove" class="mt-6" onsubmit={(e) => { if (!confirm('Delete this contest?')) e.preventDefault(); }}>
    <button class="btn-danger">Delete contest</button>
  </form>
</div>
