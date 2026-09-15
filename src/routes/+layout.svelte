<script lang="ts">
  import '../app.css';
  import { enhance } from '$app/forms';
  import { page } from '$app/state';

  let { data, children } = $props();
  const links = $derived([
    { href: '/', label: 'Problems', active: page.url.pathname === '/' || page.url.pathname.startsWith('/problem/') },
    { href: '/contests', label: 'Contests', active: page.url.pathname.startsWith('/contest') },
    { href: '/submissions', label: 'Submissions', active: page.url.pathname.startsWith('/submission') },
    ...(data.user?.canCreate || data.user?.canAdmin
      ? [{ href: '/create/problem', label: 'Authoring', active: page.url.pathname.startsWith('/create') }]
      : []),
    ...(data.user?.canAdmin
      ? [{ href: '/admin/users', label: 'Administration', active: page.url.pathname.startsWith('/admin') }]
      : []),
  ]);
  function toggleTheme() {
    const el = document.documentElement;
    el.classList.toggle('dark');
    try {
      localStorage.setItem('hj-theme', el.classList.contains('dark') ? 'dark' : 'light');
    } catch {}
  }
</script>

<a href="#main-content" class="skip-link btn-primary">Skip to content</a>
<div class="min-h-screen">
  <header
    class="sticky top-0 z-50 border-b border-slate-200 bg-slate-50/95 backdrop-blur-lg dark:border-slate-800 dark:bg-slate-950/95"
  >
    <div class="mx-auto flex min-h-20 max-w-[1440px] items-center gap-6 px-4 sm:px-8">
      <a href="/" class="flex shrink-0 items-center gap-3" aria-label="HappyJudge home">
        <span
          class="grid size-9 place-items-center rounded-sm border border-blue-600 font-serif text-xl text-blue-700 dark:border-blue-400 dark:text-blue-300"
          >h.</span
        >
        <span class="font-serif text-2xl tracking-tight">happyjudge<span class="text-blue-600">.</span></span>
      </a>
      {#if data.user}
        <nav aria-label="Primary" class="hidden items-center gap-1 xl:flex">
          {#each links as link}<a href={link.href} class="nav-link" aria-current={link.active ? 'page' : undefined}
              >{link.label}</a
            >{/each}
        </nav>
      {/if}
      <div class="ml-auto flex items-center gap-2 sm:gap-4">
        <button
          onclick={toggleTheme}
          class="btn-ghost border-0 bg-transparent px-2"
          aria-label="Toggle light and dark appearance"
          title="Toggle appearance"
        >
          <svg
            viewBox="0 0 24 24"
            class="size-5"
            fill="none"
            stroke="currentColor"
            stroke-width="1.5"
            aria-hidden="true"
            ><circle cx="12" cy="12" r="8" /><path d="M12 4a8 8 0 0 1 0 16Z" fill="currentColor" /></svg
          >
        </button>
        {#if data.user}
          <a
            href="/submissions"
            class="hidden max-w-40 truncate border-l border-slate-200 pl-4 text-sm sm:block dark:border-slate-700"
            >{data.user.username}</a
          >
          <form method="post" action="/?/logout" use:enhance>
            <button class="text-muted cursor-pointer text-xs hover:underline">Sign out</button>
          </form>
        {/if}
      </div>
    </div>
    {#if data.user}
      <nav
        aria-label="Compact navigation"
        class="flex gap-1 overflow-x-auto border-t border-slate-200 px-4 py-2 xl:hidden dark:border-slate-800"
      >
        {#each links as link}<a
            href={link.href}
            class="nav-link shrink-0"
            aria-current={link.active ? 'page' : undefined}>{link.label}</a
          >{/each}
      </nav>
    {/if}
  </header>
  <main id="main-content" tabindex="-1" class="mx-auto min-h-[75vh] max-w-[1440px] px-4 py-8 sm:px-8 sm:py-12">
    {@render children()}
  </main>
  <footer
    class="mx-auto flex max-w-[1440px] flex-wrap items-center justify-between gap-3 border-t border-slate-200 px-4 py-7 text-xs text-slate-500 sm:px-8 dark:border-slate-800 dark:text-slate-400"
  >
    <span class="font-serif text-base text-slate-700 dark:text-slate-300">happyjudge.</span>
    <span>A place to think, solve, and grow.</span>
    <span>Practice &amp; competitive programming</span>
  </footer>
</div>
