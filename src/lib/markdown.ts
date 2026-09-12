import { micromark } from 'micromark';
import { math, mathHtml } from 'micromark-extension-math';

/**
 * Parses markdown into HTML. Supports LaTeX.
 *
 * SECURITY: raw HTML is NEVER passed through — `allowDangerousHtml: false`
 * forces micromark to escape `<script>`, `<img onerror=...>`, etc. Keep this
 * option and add a regression test if problem statements ever become
 * user-controlled. If richer HTML is needed later, sanitize with an
 * allowlist sanitizer before {@html ...} rendering.
 *
 * @param markdown The markdown to parse into HTML.
 */
export function parseMarkdown(markdown: string) {
  return micromark(markdown, {
    allowDangerousHtml: false,
    extensions: [math()],
    htmlExtensions: [
      mathHtml({
        output: 'mathml',
      }),
    ],
  });
}
