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
    // Use the "Lite" version which is more reliable for scraping
    const url = `https://lite.duckduckgo.com/lite/?q=${encodedQuery}`;

    const response = await fetch(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Referer': 'https://duckduckgo.com/',
        'DNT': '1',
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
 * Parse DuckDuckGo Lite HTML results page to extract search results.
 */
function parseDuckDuckGoResults(html: string): SearchResult[] {
  const results: SearchResult[] = [];

  // 1. Extract result links and titles
  // Pattern: <a ... class='result-link' ... href='...uddg=URL...'>TITLE</a>
  const linkRegex = /class=['"]result-link['"][^>]*href=['"]([^'"]+)['"][^>]*>([\s\S]*?)<\/a>/gi;
  
  // 2. Extract snippets
  // Pattern: <td class='result-snippet'>SNIPPET</td>
  const snippetRegex = /class=['"]result-snippet['"][^>]*>([\s\S]*?)<\/td>/gi;

  const linkMatches = [...html.matchAll(linkRegex)];
  const snippetMatches = [...html.matchAll(snippetRegex)];

  for (let i = 0; i < Math.min(linkMatches.length, 10); i++) {
    let url = linkMatches[i][1];
    const title = stripHtml(linkMatches[i][2]);
    const snippet = i < snippetMatches.length ? stripHtml(snippetMatches[i][1]) : '';

    // DuckDuckGo Lite uses proxy links like //duckduckgo.com/l/?uddg=URL
    if (url.includes('uddg=')) {
      const match = url.match(/uddg=([^&]+)/);
      if (match) {
        url = decodeURIComponent(match[1]);
      }
    }
    
    // Ensure absolute URL
    if (url.startsWith('//')) url = 'https:' + url;
    if (url.startsWith('/')) url = 'https://duckduckgo.com' + url;

    if (url && title && url.includes('http')) {
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
