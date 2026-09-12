<script lang="ts">
  import { enhance } from '$app/forms';
  import type { ActionData } from './$types';

  let { form }: { form: ActionData } = $props();
</script>

<svelte:head>
  <title>Login - happyjudge</title>
</svelte:head>

<div class="mx-auto max-w-md">
  <h1 class="text-3xl font-bold tracking-tight">Welcome back</h1>
  <p class="text-muted mt-1 text-sm">Login or register to start solving.</p>
  <form class="card mt-6 space-y-4" method="post" action="?/login" use:enhance>
    <div>
      <label class="form-label" for="username">Username</label>
      <input id="username" name="username" required autocomplete="username" class="form-input" />
    </div>
    <div>
      <label class="form-label" for="password">Password</label>
      <input id="password" type="password" name="password" required autocomplete="current-password" class="form-input" />
    </div>
    <button class="btn-primary w-full">Login</button>
    <div class="text-muted text-center text-sm">or</div>
    <button class="btn-ghost w-full" formaction="?/register">Register new account</button>
    {#if form?.message}<p class="form-error" role="alert">{form.message}</p>{/if}
  </form>
</div>
