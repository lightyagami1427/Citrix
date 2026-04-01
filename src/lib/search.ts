import { SearchResult } from '@/types';

/**
 * Search the web using DuckDuckGo HTML scraping.
 * We scrape the DuckDuckGo HTML results page directly to avoid
 * needing any paid API keys or npm packages that may break.
 */
export async function searchWeb(query: string): Promise<SearchResult[]> {
  // Always include "Citrix" in the search for relevance
  const searchQuery = query.toLowerCase().includes('citrix')
    ? query
    : `Citrix ${query}`;

  try {
    const encodedQuery = encodeURIComponent(searchQuery);
    const url = `https://html.duckduckgo.com/html/?q=${encodedQuery}`;

    const response = await fetch(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
      },
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      throw new Error(`Search failed with status: ${response.status}`);
    }

    const html = await response.text();
    return parseDuckDuckGoResults(html);
  } catch (error) {
    console.error('Search error:', error);
    return [];
  }
}

/**
 * Parse DuckDuckGo HTML results page to extract search results.
 */
function parseDuckDuckGoResults(html: string): SearchResult[] {
  const results: SearchResult[] = [];

  // DuckDuckGo HTML results contain links in <a class="result__a"> tags
  // and snippets in <a class="result__snippet"> tags
  const resultBlockRegex =
    /<div[^>]*class="[^"]*result[^"]*"[^>]*>[\s\S]*?<\/div>\s*<\/div>/gi;
  const linkRegex = /<a[^>]*class="result__a"[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi;
  const snippetRegex =
    /<a[^>]*class="result__snippet"[^>]*>([\s\S]*?)<\/a>/gi;

  // Simpler approach: extract all result links and snippets
  const linkMatches = [...html.matchAll(linkRegex)];
  const snippetMatches = [...html.matchAll(snippetRegex)];

  for (let i = 0; i < Math.min(linkMatches.length, 10); i++) {
    let url = linkMatches[i][1];
    const title = stripHtml(linkMatches[i][2]);
    const snippet = i < snippetMatches.length ? stripHtml(snippetMatches[i][1]) : '';

    // DuckDuckGo sometimes wraps URLs in a redirect
    if (url.includes('uddg=')) {
      const match = url.match(/uddg=([^&]*)/);
      if (match) {
        url = decodeURIComponent(match[1]);
      }
    }

    if (url && title) {
      results.push({ url, title, snippet });
    }
  }

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
