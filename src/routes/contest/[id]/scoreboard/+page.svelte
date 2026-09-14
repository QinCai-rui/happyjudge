<script lang="ts">
  import type { PageServerData } from './$types';

  let { data }: { data: PageServerData } = $props();
</script>

<svelte:head>
  <title>Scoreboard · {data.contest.title} - happyjudge</title>
</svelte:head>

<div class="mx-auto max-w-5xl">
  <a class="btn-ghost text-sm" href={`/contest/${data.contest.id}`}>← {data.contest.title}</a>
  <h1 class="mt-2 text-3xl font-bold tracking-tight">
    Scoreboard <span class="badge" data-status={data.contest.status}>{data.contest.status}</span>
  </h1>
  <p class="text-muted mt-1 text-sm">All-or-nothing subtasks · always live · best score per problem counts.</p>

  <div class="card mt-6 overflow-x-auto p-0">
    <table class="scoreboard">
      <thead>
        <tr>
          <th>#</th>
          <th>Handle</th>
          {#each data.board.problems as p}
            <th title={p.title}>{p.title.slice(0, 12)}<span class="block text-xs font-normal">/{p.points}</span></th>
          {/each}
          <th>Total</th>
        </tr>
      </thead>
      <tbody>
        {#each data.board.rows as r, i}
          <tr>
            <td class="font-bold">{i + 1}</td>
            <td>{r.username}</td>
            {#each r.per as score}
              <td class={score > 0 ? 'score-cell positive' : 'score-cell'}>{score}</td>
            {/each}
            <td class="font-bold">{r.total}</td>
          </tr>
        {:else}
          <tr
            ><td colspan={data.board.problems.length + 3} class="text-muted p-6 text-center italic"
              >No participants yet.</td
            ></tr
          >
        {/each}
      </tbody>
    </table>
  </div>
</div>
