# DocuMind AI

> **Intelligent Document Analysis & AI-Powered Insights**

DocuMind AI is a modern, full-stack document intelligence web application built with Next.js 15 App Router. Upload PDFs, ask questions, and get AI-powered answers with citations — all in a premium dark-themed interface.

![DocuMind AI](https://img.shields.io/badge/Next.js-15-black?style=flat-square&logo=nextdotjs)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?style=flat-square&logo=typescript)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-4-38bdf8?style=flat-square&logo=tailwindcss)
![Groq](https://img.shields.io/badge/Groq-LLaMA_3.1-orange?style=flat-square)

---

## ✨ Features

- **📄 PDF Upload & Processing** — Upload PDFs up to 20MB, automatic text extraction and chunking
- **🤖 AI Chat with RAG** — Ask questions about your documents with BM25 retrieval and streaming AI responses
- **📊 Document Summaries** — Generate structured summaries in 6 modes (Quick, Normal, Standard, Deep, Executive, Student)
- **📈 Analytics Dashboard** — Track your query history, document stats, and model usage
- **🔐 Privacy First** — All data stored in localStorage, no server-side storage
- **📱 PWA Support** — Install as a native app on any device
- **🎨 Premium Dark Theme** — Polished UI inspired by Notion, Linear, and Perplexity AI

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ and npm
- A [Groq API Key](https://console.groq.com/keys)

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/documind-ai.git
cd documind-ai

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local
# Edit .env.local and add your GROQ_API_KEY

# Start the development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## 🌐 Deploy to Vercel

1. Push your code to a GitHub repository
2. Connect the repo to [Vercel](https://vercel.com)
3. Set the environment variable: `GROQ_API_KEY`
4. Deploy — that's it!

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/yourusername/documind-ai&env=GROQ_API_KEY)

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────┐
│                    Client (Browser)                  │
│                                                     │
│  localStorage ─── Documents, Chats, Query Log       │
│  BM25 Retrieval ─ Client-side keyword scoring       │
│  React UI ─────── Next.js App Router + Tailwind     │
│                                                     │
├─────────────────────────────────────────────────────┤
│                Next.js API Routes (Serverless)       │
│                                                     │
│  /api/documents/upload ─── PDF parsing + chunking    │
│  /api/query/stream ─────── Groq LLM + SSE stream    │
│  /api/documents/summarize ─ Structured summaries     │
│                                                     │
├─────────────────────────────────────────────────────┤
│                   Groq Cloud API                     │
│              (llama-3.1-8b-instant)                  │
└─────────────────────────────────────────────────────┘
```

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 15 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS + Custom CSS |
| Icons | Lucide React |
| Charts | Recharts |
| Markdown | react-markdown + remark-gfm |
| PDF Parsing | pdf-parse |
| AI/LLM | Groq SDK (LLaMA 3.1 8B Instant) |
| Storage | Browser localStorage |
| Deployment | Vercel |

## 📁 Project Structure

```
src/
├── app/
│   ├── api/
│   │   ├── documents/
│   │   │   ├── upload/route.ts      # PDF upload & chunking
│   │   │   └── summarize/route.ts   # AI summarization
│   │   └── query/
│   │       └── stream/route.ts      # RAG query streaming
│   ├── auth/page.tsx                # Login page
│   ├── documents/page.tsx           # Document management
│   ├── analytics/page.tsx           # Analytics dashboard
│   ├── layout.tsx                   # Root layout
│   ├── page.tsx                     # Workspace (main page)
│   └── globals.css                  # Design system
├── components/
│   ├── workspace/
│   │   ├── ChatSidebar.tsx
│   │   ├── ChatInput.tsx
│   │   ├── ChatMessages.tsx
│   │   └── DocumentSummaryPanel.tsx
│   ├── Navbar.tsx
│   ├── MobileTabBar.tsx
│   ├── SmartText.tsx
│   ├── ConfirmDialog.tsx
│   └── Skeletons.tsx
├── contexts/
│   ├── AuthContext.tsx
│   └── ToastContext.tsx
├── lib/
│   ├── storage.ts                   # localStorage utilities
│   ├── chunking.ts                  # Text chunking
│   ├── retrieval.ts                 # BM25 search engine
│   └── utils.ts                     # General utilities
└── types/
    └── index.ts                     # TypeScript interfaces
```

## 🔑 Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `GROQ_API_KEY` | Yes | Your Groq API key for LLM inference |

## 📄 License

MIT License — see [LICENSE](LICENSE) for details.
