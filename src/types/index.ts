export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  isError?: boolean;
  isLoading?: boolean;
}

export interface SearchResult {
  title: string;
  url: string;
  snippet: string;
}

export interface ScrapedContent {
  url: string;
  title: string;
  content: string;
  success: boolean;
}

export interface ChatRequest {
  query: string;
}

export interface ChatResponse {
  response: string;
  sources: string[];
  cached: boolean;
}
