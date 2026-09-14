<script lang="ts">
  import '../app.css';
  import { enhance } from '$app/forms';
  import { page } from '$app/state';

  let { data, children } = $props();

  function toggleTheme() {
    const el = document.documentElement;
    el.classList.toggle('dark');
    try {
      localStorage.setItem('hj-theme', el.classList.contains('dark') ? 'dark' : 'light');
    } catch {}
  }

  const isActive = (href: string) => (href === '/' ? page.url.pathname === '/' : page.url.pathname.startsWith(href));
</script>

<div class="min-h-screen">
  <header
    class="sticky top-0 z-50 border-b border-slate-200/80 bg-white/90 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-950/85"
  >
    <div class="mx-auto max-w-7xl px-4 sm:px-6">
      <nav aria-label="Primary" class="flex min-h-16 items-center gap-1">
        <a
          href="/"
          class="mr-3 flex items-center gap-2 rounded-lg font-mono text-lg font-semibold tracking-tight"
          aria-label="happyjudge home"
        >
          <span class="grid size-8 place-items-center rounded-lg bg-blue-600 text-sm font-bold text-white shadow-sm"
            >HJ</span
          >
          <span class="hidden sm:inline"><span class="text-blue-600 dark:text-blue-400">happy</span>judge</span>
        </a>
        {#if data.user}
          <div class="hidden items-center gap-1 sm:flex">
            <a href="/" class="nav-link" aria-current={isActive('/') ? 'page' : undefined}>Problems</a>
            <a
              href="/contests"
              class="nav-link"
              aria-current={isActive('/contests') || isActive('/contest/') ? 'page' : undefined}>Contests</a
            >
            <a
              href="/submissions"
              class="nav-link hidden md:inline-flex"
              aria-current={isActive('/submissions') || isActive('/submission/') ? 'page' : undefined}>Submissions</a
            >
            {#if data.user.canCreate || data.user.canAdmin}
              <a
                href="/create/problem"
                class="nav-link hidden sm:inline-flex"
                aria-current={isActive('/create') ? 'page' : undefined}>Author</a
              >
            {/if}
            {#if data.user.canAdmin}
              <a
                href="/admin/users"
                class="nav-link hidden md:inline-flex"
                aria-current={isActive('/admin') ? 'page' : undefined}>Admin</a
              >
            {/if}
          </div>
        {/if}
        <div class="ml-auto flex items-center gap-2">
          <button
            onclick={toggleTheme}
            class="grid size-10 cursor-pointer place-items-center rounded-xl text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
            aria-label="Toggle dark mode"
            title="Toggle appearance"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" class="size-5" aria-hidden="true"
              ><path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="1.8"
                d="M21 12.8A8.5 8.5 0 1 1 11.2 3 7 7 0 0 0 21 12.8Z"
              /></svg
            >
          </button>
          {#if data.user}
            <a
              href="/submissions"
              class="flex items-center gap-2 border-l border-slate-200 pl-3 dark:border-slate-800"
              aria-label={`View ${data.user.username}'s submissions`}
            >
              <span
                class="grid size-8 place-items-center rounded-full bg-slate-100 text-xs font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-200"
                >{data.user.username.slice(0, 2).toUpperCase()}</span
              >
              <span class="hidden text-sm font-semibold lg:inline">{data.user.username}</span>
            </a>
            <form method="post" action="/?/logout" use:enhance>
              <button class="btn-ghost border-0 bg-transparent px-3 shadow-none">Sign out</button>
            </form>
          {/if}
        </div>
      </nav>
    </div>
  </header>

  {#if data.user}
    <nav
      aria-label="Mobile navigation"
      class="fixed inset-x-3 bottom-3 z-50 grid grid-cols-3 rounded-2xl border border-slate-200 bg-white/95 p-1.5 shadow-xl backdrop-blur-xl sm:hidden dark:border-slate-700 dark:bg-slate-900/95"
    >
      <a href="/" class="nav-link justify-center" aria-current={isActive('/') ? 'page' : undefined}>Problems</a>
      <a
        href="/contests"
        class="nav-link justify-center"
        aria-current={isActive('/contests') || isActive('/contest/') ? 'page' : undefined}>Contests</a
      >
      <a
        href="/submissions"
        class="nav-link justify-center"
        aria-current={isActive('/submissions') || isActive('/submission/') ? 'page' : undefined}>Activity</a
      >
    </nav>
  {/if}

  <main class="mx-auto max-w-7xl px-4 py-8 pb-24 sm:px-6 sm:py-12">
    {@render children()}
  </main>

  <footer
    class="mx-auto mt-8 flex max-w-7xl flex-col gap-2 border-t border-slate-200 px-4 py-6 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between sm:px-6 dark:border-slate-800 dark:text-slate-400"
  >
    <span class="font-medium">happyjudge</span>
    <span>Focused practice. Fair competition. Better solutions.</span>
  </footer>
</div>
