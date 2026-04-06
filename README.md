# Shadow CRM

[![Next.js](https://img.shields.io/badge/Next.js-14-black?logo=next.js)](https://nextjs.org/)
[![Supabase](https://img.shields.io/badge/Supabase-Auth%20%2B%20DB-3ecf8e?logo=supabase)](https://supabase.com/)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178c6?logo=typescript)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind%20CSS-3.4-06b6d4?logo=tailwindcss)](https://tailwindcss.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)

Signal-driven CRM for SMB outbound sales. Track contacts, manage deals through your pipeline, log activities, and get AI-powered sales insights — all backed by Supabase auth and PostgreSQL with Row Level Security.

---

## Features

| Area | What it does |
|------|-------------|
| **Authentication** | Email/password + Google OAuth via Supabase Auth, session middleware, password reset, protected routes |
| **Contacts** | Full CRUD with search, status filtering (lead / prospect / customer / churned), tags |
| **Deals** | Pipeline stages (discovery → closed), value + currency tracking, contact associations |
| **Activities** | Log calls, emails, meetings, notes; mark complete; link to contacts and deals |
| **AI Assistant** | CRM-focused chatbot with conversation history, suggested prompts, typing indicators |
| **Dashboard** | Pipeline stats, stage distribution, revenue tracking, recent activity feed |
| **Dark Mode** | System-aware toggle with CSS custom properties (light: #f7f6f2, dark: #0f0f0f) |
| **Signal Engine** | (Backend) Multi-factor lead scoring, web scraping, tech stack detection, webhook integrations |

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript (strict) |
| Auth | Supabase Auth (`@supabase/ssr`) |
| Database | Supabase PostgreSQL + RLS |
| Styling | Tailwind CSS 3.4 + CSS variables |
| Validation | Zod |
| Icons | Lucide React |
| AI | OpenAI API (optional, with local fallback) |
| Backend | Express.js + Prisma + Bull/Redis (legacy signal engine) |

## Getting Started

### Prerequisites

- Node.js 18+
- A [Supabase](https://supabase.com/) project (free tier works)

### 1. Clone and install

```bash
git clone https://github.com/ayushjhaa1187-spec/Shadow-CRM.git
cd Shadow-CRM
npm install
```

### 2. Set up environment

```bash
cp .env.example .env.local
```

Fill in your Supabase credentials:

| Variable | Description | Required |
|----------|-------------|----------|
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase project URL | Yes |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Your Supabase anon/public key | Yes |
| `OPENAI_API_KEY` | OpenAI API key for full AI chat | No |
| `OPENAI_MODEL` | Model to use (default: `gpt-4o-mini`) | No |

### 3. Set up the database

Run the migration in Supabase SQL Editor:

```sql
-- Copy contents of supabase/migrations/001_initial_schema.sql
```

This creates all tables (profiles, contacts, deals, activities, chat_history) with:
- UUID primary keys
- Row Level Security policies
- Auto-updating timestamps
- Profile auto-creation on signup

### 4. Run the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## API Routes

All API routes return `{ success: boolean, data?: T, error?: string }`.

| Method | Route | Description |
|--------|-------|-------------|
| `GET` | `/api/contacts` | List contacts (query: `status`, `search`) |
| `POST` | `/api/contacts` | Create contact |
| `GET` | `/api/contacts/[id]` | Get single contact |
| `PATCH` | `/api/contacts/[id]` | Update contact |
| `DELETE` | `/api/contacts/[id]` | Delete contact |
| `GET` | `/api/deals` | List deals (query: `stage`, `contact_id`) |
| `POST` | `/api/deals` | Create deal |
| `GET` | `/api/deals/[id]` | Get single deal |
| `PATCH` | `/api/deals/[id]` | Update deal |
| `DELETE` | `/api/deals/[id]` | Delete deal |
| `GET` | `/api/activities` | List activities (query: `contact_id`, `type`) |
| `POST` | `/api/activities` | Create activity |
| `PATCH` | `/api/activities/[id]` | Update activity |
| `DELETE` | `/api/activities/[id]` | Delete activity |
| `POST` | `/api/chat` | Send message to AI assistant |
| `GET` | `/api/chat/history` | List chat conversations |
| `GET` | `/api/chat/[id]` | Get chat conversation |
| `DELETE` | `/api/chat/[id]` | Delete chat conversation |

## Project Structure

```
├── app/                    # Next.js App Router
│   ├── api/               # API routes (contacts, deals, activities, chat)
│   ├── auth/callback/     # OAuth callback handler
│   ├── dashboard/         # Protected dashboard pages
│   ├── login/             # Login page
│   ├── signup/            # Signup page
│   └── reset-password/    # Password reset
├── components/            # React components (navbar, skeleton, empty/error states)
├── lib/                   # Shared utilities
│   ├── supabase/         # Supabase client (browser + server)
│   ├── types/            # TypeScript type definitions
│   ├── validations.ts    # Zod schemas
│   └── api-response.ts   # Consistent API response helpers
├── src/                   # Legacy Express backend (signal engine)
├── supabase/             # Database migrations and seed data
└── middleware.ts          # Auth session refresh + route protection
```

## Legacy Backend

The original Express.js signal engine lives in `/src`. It provides:

- **Lead Scoring** — Multi-factor scoring (ICP fit, intent, timing, momentum)
- **Web Scraping** — Website analysis, tech stack detection, job board scraping
- **Webhook Integrations** — HubSpot, Pipedrive, custom webhooks
- **Queue System** — Bull/Redis for background scraping and scoring jobs

Run separately with `npm run backend:dev`.

## License

MIT — Built by **Ayush Kumar Jha**
