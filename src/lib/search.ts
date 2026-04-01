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
    // Use Brave Search which is currently more bot-friendly than DuckDuckGo
    const url = `https://search.brave.com/search?q=${encodedQuery}`;

    const response = await fetch(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Referer': 'https://search.brave.com/',
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
    return parseBraveResults(html);
  } catch (error) {
    console.error('Search error:', error);
    return [];
  }
}

/**
 * Parse Brave Search HTML results page to extract search results.
 */
function parseBraveResults(html: string): SearchResult[] {
  const results: SearchResult[] = [];

  // Pattern: <a ... class="l1" ... href="URL"> ... <div class="title">TITLE</div> ... </a>
  // Brave uses class "l1" for the main result link.
  const resultBlockRegex = /<div[^>]*class=['"]result['"][^>]*>([\s\S]*?)<\/div>\s*<\/div>/gi;
  const linkRegex = /<a[^>]*class=['"][^'"]*l1[^'"]*['"][^>]*href=['"]([^'"]+)['"][^>]*>([\s\S]*?)<\/a>/gi;
  const snippetRegex = /<div[^>]*class=['"]snippet-description[^'"]*['"][^>]*>([\s\S]*?)<\/div>/gi;

  const linkMatches = [...html.matchAll(linkRegex)];
  const snippetMatches = [...html.matchAll(snippetRegex)];

  for (let i = 0; i < Math.min(linkMatches.length, 10); i++) {
    const url = linkMatches[i][1];
    let titleRaw = linkMatches[i][2];
    
    // Title is usually inside a div.title inside the link
    const titleMatch = titleRaw.match(/<div[^>]*class=['"]title['"][^>]*>([\s\S]*?)<\/div>/i);
    const title = stripHtml(titleMatch ? titleMatch[1] : titleRaw);
    
    const snippet = i < snippetMatches.length ? stripHtml(snippetMatches[i][1]) : '';

    if (url && title && url.startsWith('http')) {
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
