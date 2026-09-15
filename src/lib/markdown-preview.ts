import { parseMarkdown } from '$lib/markdown';

// Keep author preview identical to the sanitized reader rendering.
export function renderMarkdownPreview(markdown: string): string {
  return parseMarkdown(markdown);
}
