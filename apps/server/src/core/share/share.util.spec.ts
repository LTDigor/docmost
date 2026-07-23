import { updateAttachmentAttr } from './share.util';

describe('updateAttachmentAttr', () => {
  it.each([
    [
      '/api/files/attachment-id/file.png',
      '/api/files/public/attachment-id/file.png?jwt=token',
    ],
    [
      '/files/attachment-id/file.png',
      '/files/public/attachment-id/file.png?jwt=token',
    ],
    [
      '/api/files/attachment-id/file.png?t=123',
      '/api/files/public/attachment-id/file.png?t=123&jwt=token',
    ],
  ])('rewrites %s to a public attachment URL', (src, expected) => {
    const node = { attrs: { src } };

    updateAttachmentAttr(node as any, 'src', 'token');

    expect(node.attrs.src).toBe(expected);
  });

  it('leaves unrelated URLs unchanged', () => {
    const node = { attrs: { src: 'https://example.com/file.png' } };

    updateAttachmentAttr(node as any, 'src', 'token');

    expect(node.attrs.src).toBe('https://example.com/file.png');
  });
});
