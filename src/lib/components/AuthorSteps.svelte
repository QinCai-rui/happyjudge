<script lang="ts">
  let { problemId, active = 'statement' }: { problemId?: string; active?: 'statement' | 'testcases' } = $props();
</script>

<nav
  aria-label="Problem authoring steps"
  class="my-6 flex flex-wrap gap-4 border-y border-slate-200 py-4 text-sm dark:border-slate-800"
>
  <a
    href={problemId ? `/create/problem/${problemId}` : '/create/problem'}
    aria-current={active === 'statement' ? 'step' : undefined}
    class="author-step flex items-center gap-2"
  >
    <span class="font-mono text-xs">01</span> Statement &amp; settings
  </a>
  <span class="text-muted" aria-hidden="true">/</span>
  {#if problemId}
    <a
      href={`/create/problem/${problemId}/testcases`}
      aria-current={active === 'testcases' ? 'step' : undefined}
      class="author-step flex items-center gap-2"><span class="font-mono text-xs">02</span> Testcases</a
    >
  {:else}
    <span class="text-muted flex items-center gap-2"><span class="font-mono text-xs">02</span> Testcases</span>
  {/if}
</nav>
