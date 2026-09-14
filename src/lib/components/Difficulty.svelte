<script lang="ts">
  import type { DifficultyEnum } from '$lib/server/db/schema';

  let { difficulty }: { difficulty: DifficultyEnum[number] } = $props();
</script>

<span
  class={'inline-flex items-center justify-center rounded-full px-3 py-1 text-xs font-bold capitalize ring-1 ring-inset ' +
    (difficulty === 'easy'
      ? 'bg-emerald-50 text-emerald-700 ring-emerald-600/20 dark:bg-emerald-950 dark:text-emerald-300'
      : difficulty === 'medium'
        ? 'bg-amber-50 text-amber-700 ring-amber-600/20 dark:bg-amber-950 dark:text-amber-300'
        : difficulty === 'hard'
          ? 'bg-orange-50 text-orange-700 ring-orange-600/20 dark:bg-orange-950 dark:text-orange-300'
          : difficulty === 'expert'
            ? 'bg-rose-50 text-rose-700 ring-rose-600/20 dark:bg-rose-950 dark:text-rose-300'
            : 'bg-violet-50 text-violet-700 ring-violet-600/20 dark:bg-violet-950 dark:text-violet-300')}
  >{difficulty}</span
>
