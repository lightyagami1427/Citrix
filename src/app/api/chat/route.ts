import { NextRequest, NextResponse } from 'next/server';
import { searchWeb } from '@/lib/search';
import { filterTrustedSources } from '@/lib/filter';
import { scrapeUrls } from '@/lib/scraper';
import { generateResponse } from '@/lib/ai';
import { getCachedResponse, setCachedResponse } from '@/lib/cache';
import { ChatResponse } from '@/types';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { query } = body;

    if (!query || typeof query !== 'string' || query.trim().length === 0) {
      return NextResponse.json(
        { error: 'Please provide a valid troubleshooting query.' },
        { status: 400 }
      );
    }

    const trimmedQuery = query.trim();

    if (trimmedQuery.length < 5) {
      return NextResponse.json(
        { error: 'Query is too short. Please provide more details.' },
        { status: 400 }
      );
    }

    // 1. Check cache
    const cached = getCachedResponse(trimmedQuery);
    if (cached) {
      const response: ChatResponse = {
        response: cached.response,
        sources: cached.sources,
        cached: true,
      };
      return NextResponse.json(response);
    }

    // 2. Search the web
    console.log(`[Search] Querying: "${trimmedQuery}"`);
    const searchResults = await searchWeb(trimmedQuery);

    if (searchResults.length === 0) {
      return NextResponse.json(
        {
          error:
            'No search results found. Please try a different query or check your network connection.',
        },
        { status: 404 }
      );
    }

    // 3. Filter trusted sources
    console.log(`[Filter] ${searchResults.length} results → filtering...`);
    const trustedResults = filterTrustedSources(searchResults);

    if (trustedResults.length === 0) {
      return NextResponse.json({
        response:
          '⚠️ No trusted Citrix sources found for your query. Try refining your search with more specific Citrix product names (e.g., "Citrix VDA registration failure" or "NetScaler SSL certificate error").',
        sources: [],
        cached: false,
      } as ChatResponse);
    }

    // 4. Scrape content from trusted URLs
    console.log(
      `[Scrape] Scraping ${trustedResults.length} trusted URLs...`
    );
    const urls = trustedResults.map((r) => r.url);
    const scrapedContent = await scrapeUrls(urls);

    if (scrapedContent.length === 0) {
      // Fallback: use search snippets as context
      const fallbackContent = trustedResults.map((r) => ({
        url: r.url,
        title: r.title,
        content: r.snippet,
        success: true,
      }));

      console.log('[Scrape] Using search snippets as fallback...');
      const aiResponse = await generateResponse(trimmedQuery, fallbackContent);
      const sources = trustedResults.map((r) => r.url);

      setCachedResponse(trimmedQuery, aiResponse, sources);

      return NextResponse.json({
        response: aiResponse,
        sources,
        cached: false,
      } as ChatResponse);
    }

    // 5. Generate AI response
    console.log(
      `[AI] Generating response from ${scrapedContent.length} sources...`
    );
    const aiResponse = await generateResponse(trimmedQuery, scrapedContent);
    const sources = scrapedContent.map((s) => s.url);

    // 6. Cache the result
    setCachedResponse(trimmedQuery, aiResponse, sources);

    const response: ChatResponse = {
      response: aiResponse,
      sources,
      cached: false,
    };

    return NextResponse.json(response);
  } catch (error: unknown) {
    console.error('[API Error]', error);

    const errorMessage =
      error instanceof Error ? error.message : 'An unexpected error occurred';

    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
