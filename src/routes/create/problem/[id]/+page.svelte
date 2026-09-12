<script lang="ts">
  import type { ActionData, PageServerData } from './$types';

  let { data, form }: { data: PageServerData; form: ActionData } = $props();
  const p = $derived(data.problem);
</script>

<svelte:head>
  <title>Edit {p.title} - happyjudge</title>
</svelte:head>

<div class="mx-auto max-w-3xl">
  <div class="flex flex-wrap items-center justify-between gap-3">
    <h1 class="text-3xl font-bold tracking-tight">Edit problem</h1>
    <div class="flex gap-2 text-sm">
      <a class="btn-ghost" href={`/problem/${p.id}`}>View</a>
      <a class="btn-ghost" href={`/create/problem/${p.id}/testcases`}>Testcases →</a>
    </div>
  </div>

  <form method="POST" action="?/save" class="card mt-6 space-y-4">
    <div>
      <label class="form-label" for="title">Title</label>
      <input class="form-input" id="title" name="title" value={p.title} required minlength="3" maxlength="120" />
    </div>
    <div class="grid grid-cols-1 gap-4 sm:grid-cols-3">
      <div>
        <label class="form-label" for="difficulty">Difficulty</label>
        <select class="form-input" id="difficulty" name="difficulty">
          {#each ['easy', 'medium', 'hard', 'expert', 'insane'] as d}
            <option value={d} selected={p.difficulty === d}>{d}</option>
          {/each}
        </select>
      </div>
      <div>
        <label class="form-label" for="timeLimit">Time limit (ms)</label>
        <input class="form-input" id="timeLimit" name="timeLimit" type="number" value={p.timeLimit} min="250" max="15000" required />
      </div>
      <div>
        <label class="form-label" for="memoryLimit">Memory (MB)</label>
        <input class="form-input" id="memoryLimit" name="memoryLimit" type="number" value={p.memoryLimit} min="16" max="2048" required />
      </div>
    </div>
    <div>
      <label class="form-label" for="statement">Statement (markdown)</label>
      <textarea class="form-input font-mono" id="statement" name="statement" rows="12" required>{p.statement}</textarea>
    </div>
    <div>
      <label class="form-label" for="samples">Sample testcases (JSON)</label>
      <textarea class="form-input font-mono" id="samples" name="samples" rows="3">{JSON.stringify(p.sampleTestcases)}</textarea>
    </div>
    <div>
      <label class="form-label" for="tags">Tags (comma separated)</label>
      <input class="form-input" id="tags" name="tags" value={(p.tags ?? []).join(', ')} />
    </div>
    <div>
      <label class="form-label" for="displayGroup">Display group</label>
      <input class="form-input" id="displayGroup" name="displayGroup" value={p.displayGroup ?? ''} />
    </div>
    <div class="flex flex-wrap gap-6">
      <label class="flex items-center gap-2 text-sm"><input type="checkbox" name="isPublic" checked={p.isPublic} class="checkbox" /> Public problem</label>
      {#if data.user?.canAdmin}
        <label class="flex items-center gap-2 text-sm"><input type="checkbox" name="homepage" checked={p.homepage} class="checkbox" /> Show on homepage</label>
      {/if}
    </div>
    {#if form?.message}<p class={form.message === 'Saved.' ? 'form-success' : 'form-error'}>{form.message}</p>{/if}
    <div class="flex gap-3">
      <button class="btn-primary">Save</button>
    </div>
  </form>

  <form method="POST" action="?/remove" class="mt-6" onsubmit={(e) => { if (!confirm('Delete this problem?')) e.preventDefault(); }}>
    <button class="btn-danger">Delete problem</button>
  </form>
</div>
