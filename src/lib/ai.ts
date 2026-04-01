import OpenAI from 'openai';
import { ScrapedContent } from '@/types';

let openaiClient: OpenAI | null = null;

function getOpenAIClient() {
  if (!openaiClient) {
    openaiClient = new OpenAI({
      baseURL: 'https://openrouter.ai/api/v1',
      apiKey: process.env.OPENROUTER_API_KEY || '',
    });
  }
  return openaiClient;
}

const SYSTEM_PROMPT = `You are a senior Citrix support engineer with 15+ years of experience troubleshooting Citrix environments including Citrix Virtual Apps and Desktops (CVAD), NetScaler/ADC, StoreFront, Workspace, Provisioning Services (PVS), HDX, and related technologies.

You are given a user's troubleshooting question and extracted content from trusted Citrix sources. Your job is to analyze the sources and provide a clear, actionable response.

RULES:
1. ONLY use information from the provided source content. Do NOT make up information.
2. If the sources don't contain enough information, say so honestly.
3. Prefer Citrix official documentation over community sources.
4. Be specific with version numbers, registry keys, commands, and file paths when available.
5. Prioritize the most effective and least disruptive fixes first.

You MUST format your response EXACTLY in this structure:

🔍 Why this issue happens
- Explain root cause point 1
- Explain root cause point 2
- (Add more points as needed, each backed by source evidence)

🛠️ Action Plan
1. First step (most likely fix)
2. Second step
3. Third step
(Provide 3-6 concrete, actionable steps. Include specific commands, registry paths, or configuration changes where applicable.)

🔗 Sources
- Source title or description (URL)
- Source title or description (URL)

IMPORTANT: Always follow this exact format with the emoji headers. Be concise but thorough.`;

/**
 * Generate a structured troubleshooting response using OpenRouter.
 */
export async function generateResponse(
  query: string,
  scrapedContent: ScrapedContent[]
): Promise<string> {
  const model = process.env.OPENROUTER_MODEL || 'google/gemini-2.0-flash-001';

  // Build context from scraped content
  const sourceContext = scrapedContent
    .map(
      (s, i) =>
        `--- Source ${i + 1}: ${s.title} (${s.url}) ---\n${s.content}\n`
    )
    .join('\n');

  const userMessage = `User's troubleshooting question: "${query}"

Here is the extracted content from trusted Citrix sources:

${sourceContext}

Based on the above sources, provide your analysis following the required format.`;

  try {
    const completion = await getOpenAIClient().chat.completions.create({
      model,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userMessage },
      ],
      temperature: 0.3,
      max_tokens: 2000,
    });

    const content = completion.choices[0]?.message?.content;

    if (!content) {
      throw new Error('Empty response from AI model');
    }

    return content;
  } catch (error: unknown) {
    console.error('AI generation error:', error);

    if (error instanceof Error) {
      if (error.message.includes('401') || error.message.includes('Unauthorized')) {
        throw new Error(
          'Invalid OpenRouter API key. Please check your OPENROUTER_API_KEY in .env.local'
        );
      }
      if (error.message.includes('429')) {
        throw new Error(
          'Rate limit exceeded. Please wait a moment and try again.'
        );
      }
      if (error.message.includes('402')) {
        throw new Error(
          'Insufficient credits on OpenRouter. Please add credits at openrouter.ai'
        );
      }
    }

    throw new Error('Failed to generate AI response. Please try again.');
  }
}
