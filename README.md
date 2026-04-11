# Bamboo Comms

Bamboo Comms is a full-stack real-time communication platform for team messaging
and customer support, with AI-assisted workflows built on **Next.js**,
**NestJS**, **Prisma**, **PostgreSQL**, and **Socket.IO**.

The project has evolved beyond a chat demo into a product-oriented foundation
for team communication, customer support workflows, and AI-assisted responses.

This platform currently includes:

- JWT authentication
- Channels and direct messages
- Realtime messaging
- Presence and typing indicators
- Customer support conversations and admin inbox workflows
- AI assistant support
- User avatars and uploads
- Responsive UI
- Prisma ORM and PostgreSQL

---

## Live Demo

https://bamboo-comms.joachimtramper.dev

---

## Tech Stack

- Frontend: Next.js (React + TypeScript)
- Backend: NestJS + Prisma ORM
- Database: PostgreSQL (Docker)
- Realtime: WebSockets (Socket.IO)
- Monorepo: pnpm workspaces

---

## Deployment

- Frontend: Vercel
- Backend & PostgreSQL: Railway
- Custom domain with HTTPS

---

## Project Structure

```text
apps/
├─ api/ -> NestJS backend (REST + WebSocket)
└─ web/ -> Next.js frontend UI
```

---

## Core Features

### Authentication

- Register and login
- JWT access tokens
- Automatic token injection in API and WebSocket calls

### Messaging

- Public channels
- Direct message channels
- Live message streaming
- Auto-scrolling
- Persistent message history

### Presence

Lightweight realtime presence system:

- **Online** when connected
- **Idle** after 5 minutes of inactivity
- **Offline** when all sockets disconnect

### Typing Indicators

- Realtime
- Supports multiple typers and the AI assistant
- Per-channel and conversation-scoped where relevant

### Avatars & Uploads

- Local image uploads
- Avatar management UI
- Fallback avatar
- Uploads folder git-ignored by default

---

## Support System

The platform now includes a dedicated support workflow layered on top of the
realtime communication system.

- Customers can start support conversations directly from the product UI
- Each support request is created as a dedicated conversation thread
- The first customer message is required at creation, so support threads are
  never created empty
- Admins get a support inbox with conversation previews and lifecycle controls
- Support conversations are grouped into:
  - Open
  - Closed
- Admins can reply in real time and close or reopen conversations
- Customers can only have **one open support conversation at a time**
- Support messages are scoped to their conversation and do not leak into
  general chat
- Realtime updates cover:
  - new messages
  - unread counts
  - conversation previews
  - first response timestamps

---

## Realtime & UX

The application now uses realtime behavior for both chat and support workflows.

- Live conversation preview updates in the support inbox
- Unread badges on individual support conversations
- Section-level unread badges for collapsed admin inbox groups
- Conversation-scoped realtime events for support threads
- Stable active conversation selection during live updates
- Realtime inbox refresh for support status, assignment, and message activity

---

## UI & Product Quality

The UI has been improved to support a more product-ready communication and
support experience.

- Responsive layout for desktop and mobile
- Sidebar scaling improvements for mixed chat and support navigation
- Scrollable inbox regions for larger support volumes
- Collapsible **Open / Closed** sections in the admin support inbox
- Floating desktop support entry for non-admin users
- Empty states, loading states, and safer async interaction handling

---

## AI Assistant

The application includes an integrated AI assistant, **BambooBob**, powered by
**Groq LLMs**.

BambooBob supports the platform as an assistive feature for chat and support
workflows without taking over the core product experience.

### Capabilities

- Mention-based interaction (`@BambooBob`) for natural language questions
- Deterministic command handling for reliable responses
- Context-aware replies using recent message history
- Channel summaries and daily digests
- Graceful fallback when the LLM is unavailable

### Available Commands

- `!help` - show available commands
- `!rules` - show channel rules
- `!ping` - simple connectivity test
- `!whoami` - show your user id
- `!summarize` - summarize recent messages
- `!digest` - summarize the last 24 hours
- `!digest on` - enable daily message digest
- `!digest off` - disable daily digest
- `!digest status` - show current digest status
- `!digest HH:mm` - set daily digest time and enable it

### Design Notes

- Commands are handled deterministically for speed and reliability
- LLM usage is invoked only when needed
- System prompts enforce concise, language-matching responses
- Normal message flow is not blocked if the AI service fails

---

## Prerequisites

- Node.js 18+ (recommended 20+)
- pnpm (via Corepack or manual install)
- Docker Desktop (for PostgreSQL)

---

## Quick Start

1. Clone and install

   ```bash
   git clone https://github.com/JoachimTramper/Bamboo-Comms.git
   cd Bamboo-Comms
   pnpm install
   ```

2. Environment variables

   The project uses separate environment files for backend and frontend.

   - Backend variables go in `apps/api/.env`
   - Frontend variables go in `apps/web/.env.local`

   ### Backend (`apps/api/.env`)

   ```env
   DATABASE_URL="postgresql://postgres:postgres@localhost:5432/chat"
   JWT_SECRET="dev-secret-change-me"

   # AI (Groq)
   GROQ_API_KEY="your-groq-api-key"
   GROQ_MODEL="llama-3.1-8b-instant"
   GROQ_BASE_URL="https://api.groq.com/openai/v1"

   # Workspace invite
   INVITE_CODE="ember-lion-47x9-qm2"
   ```

   ### Frontend (`apps/web/.env.local`)

   ```env
   NEXT_PUBLIC_API_BASE="http://localhost:3000"
   PORT=3001
   ```

3. Start the database

   ```bash
   docker-compose up -d
   ```

   The database will listen on port `5432`.

4. Run database migrations and seed data

   ```bash
   pnpm -F api db:migrate
   pnpm -F api exec prisma generate
   pnpm -F api db:seed
   ```

5. Start the backend

   ```bash
   pnpm -F api start:dev
   ```

   API base URL: `http://localhost:3000`

6. Start the frontend

   ```bash
   pnpm -F web dev -- --port 3001
   ```

   Frontend URL: `http://localhost:3001`

   Ensure the frontend env points at the API:

   ```env
   NEXT_PUBLIC_API_BASE=http://localhost:3000
   ```

7. Use the invite code when registering

   ```text
   ember-lion-47x9-qm2
   ```

---

## Useful Commands

- Backend (NestJS): `pnpm start:dev`
- Frontend (Next.js): `pnpm --filter web dev`
- Backend only: `pnpm -F api start:dev`
- Frontend only: `pnpm -F web dev -- --port 3001`
- Start database: `docker-compose up -d`
- Stop database/containers: `docker-compose down`

---

## Docker Compose

```yaml
version: "3.9"

services:
  db:
    image: postgres:15
    restart: always
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: chat
    ports:
      - "5432:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data

volumes:
  pgdata:
```

---

## Notes

- The backend uses a `JwtStrategy` to validate Bearer tokens on protected routes
  and socket connections
- Prisma manages the schema and migrations across chat and support data models
- The frontend stores the access token in session storage and attaches it to
  requests
- The support system builds on the existing realtime infrastructure rather than
  replacing it
- The AI assistant is implemented as a NestJS service and communicates with
  Groq using an OpenAI-compatible API

---

## Current Status

- The core chat system is stable
- The support system is implemented end-to-end
- Realtime synchronization is working across chat and support flows
- Support lifecycle controls, including open, close, and reopen behavior, are
  implemented

Bamboo Comms is actively evolving toward a production-ready communication and
support platform.

---

## License

MIT © 2025 Joachim Tramper
