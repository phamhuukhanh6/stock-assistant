# Claude Chatbot with Templates

This is a standalone chatbot application built using React, Tailwind CSS, and Express, integrated with the agent templates from the `claude-code-templates` repository.

## Features
- **Claude-like UI**: Clean, minimalist interface mimicking Claude.ai.
- **Agent Library**: Browse and select from over 100+ specialized agent templates.
- **Real-time Streaming**: Chat responses stream in real-time.
- **Markdown Support**: Rich text rendering for code blocks, lists, etc.

## Setup

### 1. Backend
```bash
cd backend
cp .env.example .env
# Edit .env and add your ANTHROPIC_API_KEY
npm install
node server.js
```

### 2. Frontend
```bash
cd frontend
npm install
npm run dev
```

## How it works
The backend scans the `claude-code-templates` directory for markdown files in `agents` folders. It parses the frontmatter and uses the remaining content as the system prompt for the Claude API.
