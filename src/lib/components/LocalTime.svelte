<script lang="ts">
  import { onMount } from 'svelte';

  let { value, class: className = '' }: { value: string | Date; class?: string } = $props();
  const iso = $derived(new Date(value).toISOString());
  const fallback = $derived(`${iso.slice(0, 16).replace('T', ' ')} UTC`);
  let label = $state('');

  onMount(() => {
    label = new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
  });
</script>

<time datetime={iso} title={`UTC ${iso}`} class={className}>{label || fallback}</time>
