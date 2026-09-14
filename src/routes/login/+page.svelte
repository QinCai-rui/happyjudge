<script lang="ts">
  import { enhance } from '$app/forms';
  import type { ActionData, PageServerData } from './$types';

  let { data, form }: { data: PageServerData; form: ActionData } = $props();
</script>

<svelte:head>
  <title>Login - happyjudge</title>
</svelte:head>

<div
  class="mx-auto grid max-w-5xl overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl shadow-slate-900/5 lg:grid-cols-2 dark:border-slate-800 dark:bg-slate-900"
>
  <section class="hidden bg-slate-950 p-10 text-white lg:flex lg:flex-col lg:justify-between">
    <div>
      <span class="grid size-10 place-items-center rounded-xl bg-blue-600 font-mono text-sm font-bold">HJ</span>
    </div>
    <div>
      <p class="text-xs font-bold tracking-widest text-blue-400 uppercase">Build skill through practice</p>
      <h1 class="mt-3 text-4xl font-bold tracking-tight">Solve better.<br />Compete smarter.</h1>
      <p class="mt-4 max-w-sm leading-7 text-slate-300">
        A focused online judge for practice, private contests, and transparent partial scoring.
      </p>
    </div>
  </section>
  <section class="p-6 sm:p-10 lg:p-12">
    <p class="eyebrow">Account access</p>
    <h1 class="page-title mt-2">Welcome back</h1>
    <p class="text-muted mt-2 text-sm">Sign in to continue solving and competing.</p>
    <form class="mt-8 space-y-5" method="post" action="?/login" use:enhance>
      <input type="hidden" name="redirect" value={data.redirectTo} />
      <div>
        <label class="form-label" for="username">Username</label>
        <input
          id="username"
          name="username"
          required
          autocomplete="username"
          class="form-input"
          placeholder="Enter your username"
        />
      </div>
      <div>
        <label class="form-label" for="password">Password</label>
        <input
          id="password"
          type="password"
          name="password"
          required
          autocomplete="current-password"
          class="form-input"
          placeholder="Enter your password"
        />
      </div>
      <button class="btn-primary w-full">Login</button>
      <div class="flex items-center gap-3">
        <span class="h-px flex-1 bg-slate-200 dark:bg-slate-700"></span><span
          class="text-muted text-xs font-medium uppercase">New here?</span
        ><span class="h-px flex-1 bg-slate-200 dark:bg-slate-700"></span>
      </div>
      <button class="btn-ghost w-full" formaction="?/register">Create an account</button>
      {#if form?.message}<p class="form-error" role="alert">{form.message}</p>{/if}
    </form>
    <p class="text-muted mt-8 text-center text-xs">
      By continuing, you agree to follow the contest rules and code of conduct.
    </p>
  </section>
</div>
