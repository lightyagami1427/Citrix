import { NextRequest, NextResponse } from 'next/server';
import { searchWeb } from '@/lib/search';
import { filterTrustedSources } from '@/lib/filter';
import { scrapeUrls } from '@/lib/scraper';
import { generateResponse } from '@/lib/ai';
import { getCachedResponse, setCachedResponse } from '@/lib/cache';
import { ChatResponse } from '@/types';

export const maxDuration = 60;

export async function GET() {
  return NextResponse.json({ 
    status: 'online', 
    method: 'POST only',
    info: 'Please use POST to send queries.'
  });
}

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
      const isMissingKey = !process.env.SERPER_API_KEY;
      return NextResponse.json(
        {
          error: isMissingKey && process.env.VERCEL
            ? 'Search failed: Please configure SERPER_API_KEY in your Vercel project settings.' 
            : 'No search results found. Please try a different query or check your network connection.',
        },
        { status: 502 }
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

    // 4. Scrape content from trusted URLs with Hybrid Context Fallback
    console.log(
      `[Scrape] Attempting to scrape ${trustedResults.length} trusted URLs...`
    );
    const urls = trustedResults.map((r) => r.url);
    const scrapedResults = await scrapeUrls(urls);
    
    // Build hybrid context: Use scraped content if available, otherwise use search snippet
    const hybridContent = trustedResults.map((result) => {
      const scraped = scrapedResults.find((s) => s.url === result.url);
      if (scraped && scraped.success) {
        return scraped;
      }
      
      // Fallback to snippet if scraping failed
      return {
        url: result.url,
        title: result.title,
        content: result.snippet || 'No content could be extracted from this source.',
        success: true, // Mark as success so it's included in AI context
      };
    });

    console.log(`[AI] Generating response from ${hybridContent.length} sources (Hybrid Context)...`);
    
    // 5. Generate AI response
    const aiResponse = await generateResponse(trimmedQuery, hybridContent);
    const sources = trustedResults.map((r) => r.url);

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
