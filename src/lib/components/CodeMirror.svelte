<script lang="ts">
  import { onMount } from 'svelte';

  import { EditorView, basicSetup } from 'codemirror';
  import { EditorState } from '@codemirror/state';
  import { lineNumbers } from '@codemirror/view';

  let { value = $bindable(''), basicEditSetup = true, readOnly = false } = $props();

  let divEl: HTMLDivElement; // the warning here is actually okay! https://github.com/sveltejs/svelte/issues/13102
  let view: EditorView | undefined;

  $effect(() => {
    if (view && value !== view.state.doc.toString()) {
      view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: value } });
    }
  });

  onMount(() => {
    let startState = EditorState.create({
      doc: value,
      extensions: [basicEditSetup ? basicSetup : [lineNumbers()], EditorState.readOnly.of(readOnly)],
    });

    view = new EditorView({
      state: startState,
      parent: divEl,
      dispatchTransactions: (transactions) => {
        view?.update(transactions);
        value = view?.state.doc.toString() ?? '';
      },
    });

    return () => view?.destroy();
  });
</script>

<div class="code-editor" class:editable={!readOnly} bind:this={divEl}></div>
