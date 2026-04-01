import * as cheerio from 'cheerio';
import { ScrapedContent } from '@/types';

/**
 * Scrape meaningful content from a URL.
 * Extracts headings, paragraphs, list items, and code blocks.
 * Strips navigation, footer, ads, and scripts.
 */
export async function scrapeUrl(url: string): Promise<ScrapedContent> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    const response = await fetch(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        Accept:
          'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
      },
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('text/html')) {
      throw new Error('Not an HTML page');
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    // Remove unwanted elements
    $(
      'script, style, nav, footer, header, aside, iframe, noscript, ' +
        '.sidebar, .navigation, .menu, .footer, .header, .ad, .advertisement, ' +
        '.cookie-banner, .popup, .modal, #cookie-consent, .social-share, ' +
        '.related-articles, .comments, form'
    ).remove();

    const title = $('title').text().trim() || $('h1').first().text().trim();

    // Extract content in order of importance
    const contentParts: string[] = [];

    // Headings
    $('h1, h2, h3').each((_, el) => {
      const text = $(el).text().trim();
      if (text && text.length > 3) {
        contentParts.push(`## ${text}`);
      }
    });

    // Main content: paragraphs
    $('article p, main p, .content p, .article-body p, #content p, p').each(
      (_, el) => {
        const text = $(el).text().trim();
        if (text && text.length > 20) {
          contentParts.push(text);
        }
      }
    );

    // List items (often contain troubleshooting steps)
    $('article li, main li, .content li, ol li, ul li').each((_, el) => {
      const text = $(el).text().trim();
      if (text && text.length > 10) {
        contentParts.push(`• ${text}`);
      }
    });

    // Code blocks (useful for commands)
    $('pre, code').each((_, el) => {
      const text = $(el).text().trim();
      if (text && text.length > 5 && text.length < 500) {
        contentParts.push(`[Code]: ${text}`);
      }
    });

    // Deduplicate and join
    const seen = new Set<string>();
    const uniqueParts = contentParts.filter((part) => {
      const key = part.substring(0, 80);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    const content = uniqueParts.join('\n').substring(0, 3000);

    return {
      url,
      title,
      content: content || 'No meaningful content extracted.',
      success: content.length > 50,
    };
  } catch (error) {
    console.error(`Scrape error for ${url}:`, error);
    return {
      url,
      title: '',
      content: '',
      success: false,
    };
  }
}

/**
 * Scrape multiple URLs concurrently.
 * Returns only successful scrapes.
 */
export async function scrapeUrls(urls: string[]): Promise<ScrapedContent[]> {
  const results = await Promise.allSettled(urls.map((url) => scrapeUrl(url)));

  return results
    .filter(
      (r): r is PromiseFulfilledResult<ScrapedContent> =>
        r.status === 'fulfilled' && r.value.success
    )
    .map((r) => r.value);
}
