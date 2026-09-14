import document from '../../../../docs/PROGRAMMATIC_API.md?raw';

export function GET() {
  return new Response(document, {
    headers: {
      'content-type': 'text/markdown; charset=utf-8',
      'cache-control': 'public, max-age=300',
    },
  });
}
