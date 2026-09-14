<script lang="ts">
  import type { PageServerData } from './$types';

  let { data }: { data: PageServerData } = $props();

  function ordinal(value: number | null): string {
    if (value === null) return '';
    const remainder = value % 100;
    if (remainder >= 11 && remainder <= 13) return `${value}th`;
    if (value % 10 === 1) return `${value}st`;
    if (value % 10 === 2) return `${value}nd`;
    if (value % 10 === 3) return `${value}rd`;
    return `${value}th`;
  }

  function displayScore(score: number): string {
    return String(parseFloat(score.toFixed(2)));
  }

  function formatDuration(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = seconds % 60;
    return `${hours}:${String(minutes).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')}`;
  }

  function bestTitle(score: number, bestIndex: number | null, attempts: number, bestAt: Date | null): string {
    if (bestIndex === null || bestAt === null) return `${attempts} attempt${attempts === 1 ? '' : 's'}; no score yet`;
    return `Best ${displayScore(score)} on attempt ${bestIndex}/${attempts} at ${new Date(bestAt).toLocaleString()}`;
  }
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
    <table class="scoreboard-detailed min-w-max">
      <thead>
        <tr>
          <th>#</th>
          <th>Username</th>
          {#each data.board.problems as p, i}
            <th class="problem-heading" title={p.title}
              ><span class="block truncate"
                ><span class="mr-1 text-emerald-200">{String.fromCharCode(65 + i)}</span>{p.title}</span
              ><span class="block text-xs font-normal">({p.points})</span></th
            >
          {/each}
          <th>Score</th>
          <th>Time</th>
        </tr>
      </thead>
      <tbody>
        {#each data.board.rows as row}
          <tr class:me={row.userId === data.currentUserId}>
            <td class="tabular font-bold">{row.rank}</td>
            <td class="font-semibold">{row.userId === data.currentUserId ? '★ ' : ''}{row.username}</td>
            {#each row.cells as cell}
              {#if !cell.isAttempted}
                <td class="cell-empty">—</td>
              {:else}
                <td
                  class:cell-full={cell.isFull}
                  class:cell-partial={cell.score > 0 && !cell.isFull}
                  class:cell-failed={cell.score === 0}
                  title={bestTitle(cell.score, cell.bestIndex, cell.attempts, cell.bestAt)}
                >
                  <div class="tabular font-semibold">{displayScore(cell.score)}</div>
                  <div class="cell-sub">
                    <sup>{ordinal(cell.bestIndex)}{cell.bestIndex === null ? '' : ' try'}</sup>
                    <span>({cell.attempts})</span>{#if cell.hasPending}<span class="ml-1" title="judging">…</span>{/if}
                  </div>
                </td>
              {/if}
            {/each}
            <td class="tabular font-bold">{displayScore(row.total)}</td>
            <td class="tabular">{formatDuration(row.totalTimeSecs)}</td>
          </tr>
        {:else}
          <tr
            ><td colspan={data.board.problems.length + 4} class="text-muted p-6 text-center italic"
              >No participants yet.</td
            ></tr
          >
        {/each}
      </tbody>
    </table>
  </div>
</div>
