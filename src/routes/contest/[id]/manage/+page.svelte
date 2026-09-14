<script lang="ts">
  import type { ActionData, PageServerData } from './$types';

  let { data, form }: { data: PageServerData; form: ActionData } = $props();
  const c = $derived(data.contest);
  let copied = $state(false);
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

  {#if form?.message}<p class="form-success mt-4">{form.message}</p>{/if}

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
        <input
          class="form-input"
          id="startsAt"
          name="startsAt"
          type="datetime-local"
          value={toLocal(c.startsAt)}
          required
        />
      </div>
      <div>
        <label class="form-label" for="endsAt">Ends at</label>
        <input class="form-input" id="endsAt" name="endsAt" type="datetime-local" value={toLocal(c.endsAt)} required />
      </div>
    </div>
    <label class="flex items-center gap-2 text-sm"
      ><input type="checkbox" name="isPublic" checked={c.isPublic} class="checkbox" /> Public contest: anyone logged in can
      view and join</label
    >
    <label class="flex items-center gap-2 text-sm"
      ><input type="checkbox" name="releaseOnEnd" checked={c.releaseOnEnd} class="checkbox" /> Release problems publicly
      when contest ends</label
    >
    <button class="btn-primary">Save</button>
  </form>

  <div class="card mt-6">
    <h2 class="text-xl font-semibold">Invite link</h2>
    <p class="text-muted mt-1 text-sm">Anyone with this link can join this private contest.</p>
    <div class="mt-3 flex flex-col gap-2 sm:flex-row">
      <input class="form-input font-mono text-xs" readonly value={data.inviteUrl} aria-label="Contest invite link" />
      <button
        class="btn-primary"
        type="button"
        onclick={async () => {
          await navigator.clipboard.writeText(data.inviteUrl);
          copied = true;
        }}>Copy</button
      >
    </div>
    {#if copied}<p class="form-success mt-2 text-sm" role="status">Copied.</p>{/if}
    <form method="POST" action="?/regenerateInvite" class="mt-3">
      <button class="btn-ghost text-xs">Regenerate link</button>
    </form>
  </div>

  <div class="card mt-6">
    <h2 class="text-xl font-semibold">Problems ({data.links.length})</h2>
    <ul class="mt-3 space-y-2">
      {#each data.links as l}
        <li class="flex items-center justify-between gap-2 text-sm">
          <span>{l.position + 1}. {l.problem?.title ?? l.problemId} · {l.points} pts</span>
          <span class="flex shrink-0 items-center gap-2">
            {#if data.canAddAnyProblem || l.problem?.authorId === data.userId}
              <a class="btn-ghost text-xs" href={`/create/problem/${l.problemId}`}>Edit</a>
              <a class="btn-ghost text-xs" href={`/create/problem/${l.problemId}/testcases`}>Testcases</a>
            {/if}
            <form method="POST" action="?/removeProblem">
              <input type="hidden" name="problemId" value={l.problemId} />
              <button class="btn-danger text-xs">Remove</button>
            </form>
          </span>
        </li>
      {:else}
        <li class="text-muted text-sm italic">No problems yet.</li>
      {/each}
    </ul>
    {#if data.ownProblems.length > 0 || data.canAddAnyProblem}
      <form method="POST" action="?/addProblem" class="mt-4 flex flex-wrap items-end gap-2">
        {#if data.ownProblems.length > 0}
          <label class="text-sm"
            >Problem
            <select name="problemId" class="form-input">
              {#each data.ownProblems as p}
                <option value={p.id}>{p.title} ({p.id})</option>
              {/each}
            </select>
          </label>
        {/if}
        {#if data.canAddAnyProblem}
          <label class="text-sm"
            >{data.ownProblems.length > 0 ? 'Or any problem ID' : 'Problem ID'}
            <input name="problemIdManual" class="form-input" placeholder="paste problem id" /></label
          >
        {/if}
        <label class="text-sm"
          >Points <input name="points" type="number" value="100" min="1" max="10000" class="form-input w-24" /></label
        >
        <button class="btn-primary">Add</button>
      </form>
    {:else}
      <p class="mt-4 text-sm">
        You haven't authored any problems yet — <a class="underline" href="/create/problem">create one first</a>, then
        add it here.
      </p>
    {/if}
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

  {#if data.canManageEditors}
    <div class="card mt-6">
      <h2 class="text-xl font-semibold">Editors ({data.editors.length})</h2>
      <p class="text-muted mt-1 text-sm">
        Editors can change contest details, problems, testcases, and participants. Only the author or an admin can grant
        access or delete the contest.
      </p>
      <ul class="mt-3 space-y-2">
        {#each data.editors as editor}
          <li class="flex items-center justify-between gap-2 text-sm">
            <span>{editor.username}</span>
            <form method="POST" action="?/removeEditor">
              <input type="hidden" name="userId" value={editor.userId} />
              <button class="btn-danger text-xs">Remove access</button>
            </form>
          </li>
        {:else}
          <li class="text-muted text-sm italic">No editors yet.</li>
        {/each}
      </ul>
      <form method="POST" action="?/grantEditor" class="mt-4 flex items-end gap-2">
        <label class="text-sm"
          >Username <input name="username" class="form-input" required placeholder="handle" /></label
        >
        <button class="btn-primary">Grant access</button>
      </form>
    </div>
  {:else}
    <p class="text-muted mt-6 text-sm">
      You are an editor. Contest deletion and editor access changes are restricted to the author and admins.
    </p>
  {/if}

  {#if data.canDelete}
    <form
      method="POST"
      action="?/remove"
      class="mt-6"
      onsubmit={(e) => {
        if (!confirm('Delete this contest?')) e.preventDefault();
      }}
    >
      <button class="btn-danger">Delete contest</button>
    </form>
  {/if}
</div>
