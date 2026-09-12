import { micromark } from 'micromark';
import { math, mathHtml } from 'micromark-extension-math';
import sanitizeHtml from 'sanitize-html';

const allowedTags = [
  'a',
  'article',
  'annotation',
  'aside',
  'b',
  'blockquote',
  'br',
  'caption',
  'code',
  'col',
  'colgroup',
  'dd',
  'del',
  'details',
  'div',
  'dl',
  'dt',
  'em',
  'figcaption',
  'figure',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'hr',
  'i',
  'img',
  'kbd',
  'li',
  'math',
  'mfrac',
  'mi',
  'mn',
  'mo',
  'mrow',
  'msup',
  'munder',
  'munderover',
  'mover',
  'msub',
  'msubsup',
  'mtext',
  'ol',
  'p',
  'pre',
  'q',
  's',
  'section',
  'semantics',
  'small',
  'span',
  'strong',
  'sub',
  'summary',
  'sup',
  'table',
  'tbody',
  'td',
  'tfoot',
  'th',
  'thead',
  'tr',
  'u',
  'ul',
];

/**
 * Parses markdown into HTML. Supports LaTeX.
 *
 * Raw HTML is supported for problem statements, then sanitized through an
 * allowlist before it reaches Svelte's {@html} rendering. Event handlers,
 * scripts, styles, and unsafe URL schemes are removed.
 *
 * @param markdown The markdown to parse into HTML.
 */
export function parseMarkdown(markdown: string) {
  const html = micromark(markdown, {
    allowDangerousHtml: true,
    extensions: [math()],
    htmlExtensions: [
      mathHtml({
        output: 'mathml',
      }),
    ],
  });

  return sanitizeHtml(html, {
    allowedTags,
    allowedAttributes: {
      '*': ['class', 'title'],
      a: ['href', 'target', 'rel'],
      annotation: ['encoding'],
      img: ['src', 'alt', 'width', 'height'],
      math: ['xmlns'],
      ol: ['start'],
      li: ['value'],
    },
    allowedSchemes: ['http', 'https', 'mailto'],
    allowProtocolRelative: false,
  });
}
