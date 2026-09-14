<script lang="ts">
  import type { ActionData, PageServerData } from './$types';

  let { data, form }: { data: PageServerData; form: ActionData } = $props();
</script>

<svelte:head>
  <title>Testcases · {data.problem.title} - happyjudge</title>
</svelte:head>

<div class="mx-auto max-w-4xl">
  <div class="flex flex-wrap items-center justify-between gap-3">
    <h1 class="text-3xl font-bold tracking-tight">Testcases · {data.problem.title}</h1>
    <a class="btn-ghost" href={`/create/problem/${data.problem.id}`}>← Back to problem</a>
  </div>
  <p class="text-muted mt-1 text-sm">
    Testcases with the same group form one all-or-nothing subtask. Its points are the sum of its testcase weights.
    Hidden outputs never leave the server.
  </p>

  {#if form?.message}<p class="mt-4 {form.success ? 'form-success' : 'form-error'}">{form.message}</p>{/if}

  <div class="mt-6 space-y-4">
    {#each data.testcases as tc (tc.id)}
      <form method="POST" action="?/update" class="card grid grid-cols-1 gap-3 md:grid-cols-2">
        <input type="hidden" name="id" value={tc.id} />
        <div>
          <label class="form-label" for={'input-' + tc.id}>Input #{tc.id}</label>
          <textarea class="form-input font-mono" id={'input-' + tc.id} name="input" rows="4">{tc.input}</textarea>
        </div>
        <div>
          <label class="form-label" for={'output-' + tc.id}>Expected output</label>
          <textarea class="form-input font-mono" id={'output-' + tc.id} name="output" rows="4">{tc.output}</textarea>
        </div>
        <div class="flex flex-wrap items-end gap-3 md:col-span-2">
          <label class="text-sm">Subtask <input class="form-input w-32" name="caseGroup" value={tc.caseGroup} /></label>
          <label class="text-sm"
            >Weight <input
              class="form-input w-24"
              name="weight"
              type="number"
              value={tc.weight}
              min="0"
              max="10000"
            /></label
          >
          <label class="flex items-center gap-2 text-sm"
            ><input type="checkbox" name="isHidden" checked={tc.isHidden} class="checkbox" /> Hidden</label
          >
          <span class="ml-auto flex gap-2">
            <button class="btn-primary">Save</button>
            <button class="btn-danger" formaction="?/remove" formnovalidate>Delete</button>
          </span>
        </div>
      </form>
    {:else}
      <p class="text-muted text-sm italic">
        No testcases yet — add the first one below. Submissions with zero testcases will fail judging.
      </p>
    {/each}
  </div>

  <form method="POST" action="?/add" class="card mt-8 grid grid-cols-1 gap-3 md:grid-cols-2">
    <h2 class="text-lg font-semibold md:col-span-2">Add testcase</h2>
    <div>
      <label class="form-label" for="input">Input</label>
      <textarea class="form-input font-mono" id="input" name="input" rows="4" placeholder="stdin…"></textarea>
    </div>
    <div>
      <label class="form-label" for="output">Expected output</label>
      <textarea class="form-input font-mono" id="output" name="output" rows="4" required placeholder="expected stdout…"
      ></textarea>
    </div>
    <div class="flex flex-wrap items-end gap-3 md:col-span-2">
      <label class="text-sm">Subtask <input class="form-input w-32" name="caseGroup" value="Misc" /></label>
      <label class="text-sm"
        >Weight <input class="form-input w-24" name="weight" type="number" value="1" min="0" max="10000" /></label
      >
      <label class="flex items-center gap-2 text-sm"
        ><input type="checkbox" name="isHidden" checked class="checkbox" /> Hidden</label
      >
      <button class="btn-primary ml-auto">Add testcase</button>
    </div>
  </form>
</div>
