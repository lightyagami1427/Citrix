import { SearchResult } from '@/types';

/**
 * Search the web using Serper.dev (Google Search API) or DuckDuckGo Lite fallback.
 */
export async function searchWeb(query: string): Promise<SearchResult[]> {
  const apiKey = process.env.SERPER_API_KEY;

  // Always include "Citrix" in the search for relevance
  const searchQuery = query.toLowerCase().includes('citrix')
    ? query
    : `Citrix ${query}`;

  // If API key is available, use Serper.dev (Reliable & Vercel-friendly)
  if (apiKey) {
    try {
      console.log(`[Search] Using Serper.dev for: "${searchQuery}"`);
      const response = await fetch('https://google.serper.dev/search', {
        method: 'POST',
        headers: {
          'X-API-KEY': apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ q: searchQuery }),
        signal: AbortSignal.timeout(10000),
      });

      if (!response.ok) {
        throw new Error(`Serper API failed with status: ${response.status}`);
      }

      const data = await response.json();
      const results: SearchResult[] = (data.organic || []).map((r: any) => ({
        url: r.link,
        title: r.title,
        snippet: r.snippet || '',
      }));

      return results;
    } catch (error) {
      console.error('[Search] Serper.dev error:', error);
      // Fall through to fallback
    }
  } else {
    console.warn('[Search] No SERPER_API_KEY found. Falling back to DuckDuckGo (likely to be blocked on Vercel).');
  }

  // Fallback: DuckDuckGo Lite Scraping
  try {
    const encodedQuery = encodeURIComponent(searchQuery);
    const url = `https://lite.duckduckgo.com/lite/?q=${encodedQuery}`;

    const response = await fetch(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Referer': 'https://duckduckgo.com/',
      },
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      throw new Error(`Search failed with status: ${response.status}`);
    }

    const html = await response.text();
    return parseDuckDuckGoLiteResults(html);
  } catch (error) {
    console.error('[Search] Fallback search error:', error);
    return [];
  }
}

/**
 * Parse DuckDuckGo Lite HTML results (Simplified fallback logic).
 */
function parseDuckDuckGoLiteResults(html: string): SearchResult[] {
  const results: SearchResult[] = [];
  
  const linkRegex = /<a[^>]+class=["']result-link["'][^>]+href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/g;
  let match;
  let count = 0;

  while ((match = linkRegex.exec(html)) !== null && count < 8) {
    let url = match[1];
    const title = stripHtml(match[2]);

    if (url.includes('uddg=')) {
      const uddgMatch = url.match(/uddg=([^&]+)/);
      if (uddgMatch) url = decodeURIComponent(uddgMatch[1]);
    }

    if (url.startsWith('//')) url = 'https:' + url;
    if (url.startsWith('/')) url = 'https://duckduckgo.com' + url;

    if (url.includes('http')) {
      results.push({ url, title, snippet: '' });
      count++;
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
    .replace(/\s+/g, ' ')
    .trim();
}
