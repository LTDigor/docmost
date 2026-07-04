import { Injectable } from '@nestjs/common';
import { jsonToMarkdown } from '../../collaboration/collaboration.util';
import { EnvironmentService } from '../../integrations/environment/environment.service';

@Injectable()
export class McpTextSerializer {
  constructor(private readonly environmentService: EnvironmentService) {}

  serializePageContent(content: unknown): string {
    if (!content) return '';

    const markdown =
      typeof content === 'string' ? content : jsonToMarkdown(content as any);

    return this.normalizeMarkdown(markdown);
  }

  normalizeMarkdown(markdown: string): string {
    return markdown
      .replace(/\u00a0/g, ' ')
      .replace(/<!--[\s\S]*?-->/g, '')
      .replace(/\s+data-[a-zA-Z0-9_-]+="[^"]*"/g, '')
      .split('\n')
      .map((line) => line.trimEnd())
      .join('\n')
      .replace(/\n{4,}/g, '\n\n\n')
      .trim();
  }

  stripHtml(value: string | null | undefined): string {
    if (!value) return '';
    return value
      .replace(/<[^>]+>/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  truncateForMcp(markdown: string): string {
    const maxChars = this.environmentService.getMcpMaxPageChars();
    if (markdown.length <= maxChars) return markdown;
    return `${markdown.slice(0, maxChars).trimEnd()}\n\n[Content truncated]`;
  }

  buildPageUrl(page: { slugId: string; space?: { slug?: string } }): string {
    const appUrl = this.environmentService.getAppUrl();
    const spaceSlug = encodeURIComponent(page.space?.slug || '');
    return `${appUrl}/s/${spaceSlug}/p/${encodeURIComponent(page.slugId)}`;
  }
}
