import * as cheerio from 'cheerio';
import { SearchResult } from '@/types';

/**
 * Search the web using DuckDuckGo Lite scraping.
 */
export async function searchWeb(query: string): Promise<SearchResult[]> {
  // Always include "Citrix" in the search for relevance
  const searchQuery = query.toLowerCase().includes('citrix')
    ? query
    : `Citrix ${query}`;

  try {
    const encodedQuery = encodeURIComponent(searchQuery);
    // Use the "Lite" version which is simpler to parse and more reliable
    const url = `https://lite.duckduckgo.com/lite/?q=${encodedQuery}`;

    const response = await fetch(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Referer': 'https://duckduckgo.com/',
        'DNT': '1',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'same-origin',
        'Sec-Fetch-User': '?1',
        'Upgrade-Insecure-Requests': '1',
      },
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      throw new Error(`Search failed with status: ${response.status}`);
    }

    const html = await response.text();
    return parseDuckDuckGoLiteResults(html);
  } catch (error) {
    console.error('Search error:', error);
    return [];
  }
}

/**
 * Parse DuckDuckGo Lite HTML results page using Cheerio for robustness.
 */
function parseDuckDuckGoLiteResults(html: string): SearchResult[] {
  const results: SearchResult[] = [];
  const $ = cheerio.load(html);

  // In DDG Lite, results are typically inside tables/trs
  $('.result-link').each((i, el) => {
    if (i >= 10) return false; // Limit to top 10

    const $link = $(el);
    let url = $link.attr('href') || '';
    const title = $link.text().trim();

    // The snippet is usually in the next row's .result-snippet cell
    const snippet = $link.closest('tr').next().find('.result-snippet').text().trim();

    // Extract the actual URL from the proxy link (uddg param)
    if (url.includes('uddg=')) {
      try {
        const urlObj = new URL(url.startsWith('//') ? 'https:' + url : (url.startsWith('http') ? url : 'https://duckduckgo.com' + url));
        const uddg = urlObj.searchParams.get('uddg');
        if (uddg) {
          url = uddg;
        }
      } catch (e) {
        // Fallback if URL parsing fails
        const match = url.match(/uddg=([^&]+)/);
        if (match) url = decodeURIComponent(match[1]);
      }
    }

    // Sanitize absolute URL
    if (url.startsWith('//')) url = 'https:' + url;
    if (url.startsWith('/')) url = 'https://duckduckgo.com' + url;

    if (url && title && url.includes('http')) {
      results.push({ url, title, snippet });
    }
  });

  return results;
}

/**
 * Strip HTML tags from a string.
 */
function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}
