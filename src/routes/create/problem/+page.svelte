<script lang="ts">
  import AuthorSteps from '$lib/components/AuthorSteps.svelte';
  import StatementEditor from '$lib/components/StatementEditor.svelte';
  import type { ActionData, PageServerData } from './$types';

  let { data, form }: { data: PageServerData; form: ActionData } = $props();
  let statement = $state('');
</script>

<svelte:head>
  <title>Author a problem - happyjudge</title>
</svelte:head>

<div class="mx-auto max-w-3xl">
  <p class="eyebrow mb-3">The author's desk</p>
  <h1 class="page-title">Author a problem</h1>
  <p class="text-muted mt-1 text-sm">Create a statement, then add hidden testcases on the next screen.</p>
  <AuthorSteps />

  <form method="POST" action="?/create" class="card mt-6 space-y-4">
    <div>
      <label class="form-label" for="title">Title</label>
      <input
        class="form-input"
        id="title"
        name="title"
        required
        minlength="3"
        maxlength="120"
        placeholder="Sum of Two Numbers"
      />
    </div>
    <div class="grid grid-cols-1 gap-4 sm:grid-cols-3">
      <div>
        <label class="form-label" for="difficulty">Difficulty</label>
        <select class="form-input" id="difficulty" name="difficulty" required>
          <option value="easy">Easy</option>
          <option value="medium">Medium</option>
          <option value="hard">Hard</option>
          <option value="expert">Expert</option>
          <option value="insane">Insane</option>
        </select>
      </div>
      <div>
        <label class="form-label" for="timeLimit">Time limit (ms)</label>
        <input
          class="form-input"
          id="timeLimit"
          name="timeLimit"
          type="number"
          value="1000"
          min="250"
          max="15000"
          required
        />
      </div>
      <div>
        <label class="form-label" for="memoryLimit">Memory (MB)</label>
        <input
          class="form-input"
          id="memoryLimit"
          name="memoryLimit"
          type="number"
          value="256"
          min="16"
          max="2048"
          required
        />
      </div>
    </div>
    <div>
      <label class="form-label" for="statement">Statement</label>
      <StatementEditor bind:value={statement} rows={14} />
    </div>
    <div>
      <label class="form-label" for="samples">Sample testcases (JSON)</label>
      <textarea class="form-input font-mono" id="samples" name="samples" rows="3"
        >{'[{"input":"","output":""}]'}</textarea
      >
    </div>
    <div>
      <label class="form-label" for="tags">Tags (comma separated)</label>
      <input class="form-input" id="tags" name="tags" placeholder="math, dp" />
    </div>
    <div>
      <label class="form-label" for="displayGroup">Display group (optional)</label>
      <input class="form-input" id="displayGroup" name="displayGroup" placeholder="Week 1" />
    </div>
    <div class="flex flex-wrap gap-6">
      <label class="flex items-center gap-2 text-sm"
        ><input type="checkbox" name="isPublic" checked class="checkbox" /> Public problem</label
      >
      {#if data.user?.canAdmin}
        <label class="flex items-center gap-2 text-sm"
          ><input type="checkbox" name="homepage" class="checkbox" /> Show on homepage</label
        >
      {/if}
    </div>
    {#if form?.message}<p class="form-error">{form.message}</p>{/if}
    <button class="btn-primary w-full sm:w-auto">Create & continue to testcases →</button>
  </form>

  <h2 class="mt-10 text-xl font-semibold">Your recent problems</h2>
  <ul class="mt-3 space-y-2">
    {#each data.problems as p}
      <li class="card flex items-center justify-between gap-3">
        <a class="font-medium underline-offset-4 hover:underline" href={`/create/problem/${p.id}`}>{p.title}</a>
        <span class="flex gap-2 text-sm">
          <a class="btn-ghost" href={`/problem/${p.id}`}>View</a>
          <a class="btn-ghost" href={`/create/problem/${p.id}/testcases`}>Testcases</a>
        </span>
      </li>
    {:else}
      <li class="text-muted text-sm italic">No problems yet.</li>
    {/each}
  </ul>
</div>
