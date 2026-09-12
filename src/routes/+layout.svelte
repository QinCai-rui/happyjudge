<script lang="ts">
  import '../app.css';
  import { enhance } from '$app/forms';

  let { data, children } = $props();

  function toggleTheme() {
    const el = document.documentElement;
    el.classList.toggle('dark');
    try {
      localStorage.setItem('hj-theme', el.classList.contains('dark') ? 'dark' : 'light');
    } catch {}
  }
</script>

<div class="mx-auto min-h-screen max-w-6xl px-4 pb-16">
  <header>
    <nav
      aria-label="Primary"
      class="mt-3 mb-4 flex flex-wrap items-center gap-2 rounded-2xl border border-zinc-200 bg-white px-4 py-3 shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
    >
      <a href="/" class="mr-2 font-mono text-lg"><span class="font-bold">happy</span>judge</a>
      {#if data.user}
        <a href="/contests" class="btn-ghost border-0 shadow-none">Contests</a>
        {#if data.user.canCreate || data.user.canAdmin}
          <a href="/create/problem" class="btn-ghost border-0 shadow-none">Author</a>
        {/if}
        {#if data.user.canAdmin}
          <a href="/admin/users" class="btn-ghost border-0 shadow-none">Users</a>
        {/if}
      {/if}
      <div class="ml-auto flex items-center gap-2">
        <button
          onclick={toggleTheme}
          class="btn-ghost"
          aria-label="Toggle dark mode"
          title="Toggle dark mode">◐</button
        >
        {#if data.user}
          <span class="text-muted hidden text-sm sm:inline">{data.user.username}</span>
          <form method="post" action="/?/logout" use:enhance>
            <button class="btn-primary">Sign out</button>
          </form>
        {/if}
      </div>
    </nav>
  </header>

  <main>
    {@render children()}
  </main>

  <footer class="text-muted mt-12 border-t border-zinc-200 pt-4 text-xs dark:border-zinc-800">
    happyjudge · IOI partial scoring · invite-only contests
  </footer>
</div>
