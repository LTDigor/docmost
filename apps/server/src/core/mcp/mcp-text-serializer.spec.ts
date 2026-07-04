jest.mock('../../collaboration/collaboration.util', () => ({
  jsonToMarkdown: jest.fn(() => {
    return [
      '## Hiring',
      '',
      '- Prepare CV',
      '',
      '[Source](https://example.com)',
    ].join('\n');
  }),
}));

import { McpTextSerializer } from './mcp-text-serializer';

describe('McpTextSerializer', () => {
  const serializer = new McpTextSerializer({
    getAppUrl: () => 'https://docmost.offercore.ru',
    getMcpMaxPageChars: () => 80_000,
  } as never);

  it('returns model-readable markdown without ProseMirror JSON leakage', () => {
    const markdown = serializer.serializePageContent({
      type: 'doc',
      content: [
        {
          type: 'heading',
          attrs: { level: 2 },
          content: [{ type: 'text', text: 'Hiring' }],
        },
        {
          type: 'bulletList',
          content: [
            {
              type: 'listItem',
              content: [
                {
                  type: 'paragraph',
                  content: [{ type: 'text', text: 'Prepare CV' }],
                },
              ],
            },
          ],
        },
        {
          type: 'paragraph',
          content: [
            {
              type: 'text',
              text: 'Source',
              marks: [
                {
                  type: 'link',
                  attrs: { href: 'https://example.com', target: '_blank' },
                },
              ],
            },
          ],
        },
      ],
    });

    expect(markdown).toContain('## Hiring');
    expect(markdown).toContain('Prepare CV');
    expect(markdown).toContain('[Source](https://example.com)');
    expect(markdown).not.toContain('"type"');
    expect(markdown).not.toContain('ProseMirror');
  });

  it('builds stable source links from page and space slugs', () => {
    expect(
      serializer.buildPageUrl({
        slugId: 'abc123',
        space: { slug: 'employment' },
      } as never),
    ).toBe('https://docmost.offercore.ru/s/employment/p/abc123');
  });
});
