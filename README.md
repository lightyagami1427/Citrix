# 🛡️ Citrix Troubleshooting Copilot

AI-powered support assistant for Citrix engineers. Get real-time troubleshooting help with root cause analysis, step-by-step action plans, and verified sources from trusted Citrix documentation.

![Next.js](https://img.shields.io/badge/Next.js-15-black)
![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue)
![OpenRouter](https://img.shields.io/badge/LLM-OpenRouter-purple)

## ✨ Features

- **🔍 Real-time Web Search** — Searches the web for relevant Citrix troubleshooting content
- **🧹 Trusted Source Filtering** — Only uses results from Citrix official docs, Stack Overflow, and trusted blogs
- **🕸️ Content Scraping** — Extracts meaningful content from each source URL
- **🧠 AI-Powered Analysis** — Generates structured root cause + action plan using LLM via OpenRouter
- **💾 Smart Caching** — Caches responses for repeated queries (1-hour TTL)
- **📋 Copy to Clipboard** — One-click copy for any response
- **🔄 Regenerate** — Re-run analysis with fresh data
- **⚡ Fast** — Parallel scraping, response target < 5 seconds

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- An [OpenRouter API key](https://openrouter.ai/keys)

### Setup

```bash
# 1. Install dependencies
npm install

# 2. Add your OpenRouter API key to .env.local
# Edit .env.local and replace 'your_openrouter_api_key_here' with your actual key

# 3. Start the dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Environment Variables

| Variable | Description | Default |
|---|---|---|
| `OPENROUTER_API_KEY` | Your OpenRouter API key | *required* |
| `OPENROUTER_MODEL` | LLM model to use | `google/gemini-2.0-flash-001` |

### Recommended Models (via OpenRouter)

| Model | Speed | Cost | Quality |
|---|---|---|---|
| `google/gemini-2.0-flash-001` | ⚡ Fast | 💲 Free/cheap | ✅ Good |
| `meta-llama/llama-4-maverick` | ⚡ Fast | 💲 Free/cheap | ✅ Good |
| `openai/gpt-4o-mini` | ⚡ Fast | 💲 Low | ✅✅ Great |
| `anthropic/claude-3.5-sonnet` | 🐢 Medium | 💲💲 Medium | ✅✅✅ Best |

## 🏗️ Architecture

```
User Query → DuckDuckGo Search → Filter Trusted Sources → Scrape Content → AI Analysis → Structured Response
```

### Trusted Sources
- `citrix.com`, `support.citrix.com`, `docs.citrix.com`
- `stackoverflow.com`, `serverfault.com`
- `carlstalhood.com`, `jasonsamuel.com`
- `reddit.com/r/Citrix`
- And more...

## 📦 Tech Stack

- **Frontend**: Next.js 15, React 19, TypeScript
- **Styling**: Vanilla CSS (dark theme, glassmorphism)
- **Search**: DuckDuckGo HTML scraping
- **Scraping**: Cheerio
- **AI**: OpenRouter (OpenAI-compatible API)
- **Caching**: In-memory with LRU eviction

## 🚀 Deploy to Vercel

```bash
npm run build
```

Or deploy directly via the [Vercel Dashboard](https://vercel.com) by importing this repo.

> ⚠️ Don't forget to add `OPENROUTER_API_KEY` and `OPENROUTER_MODEL` as environment variables in your Vercel project settings.

## 📄 License

MIT
