# Changelog

All notable changes to Shadow CRM are documented in this file.

## [1.0.0] - 2026-04-06

### Added
- **Authentication** — Supabase Auth with email/password and Google OAuth, session management via middleware, password reset flow, protected dashboard routes
- **Database** — PostgreSQL schema (profiles, contacts, deals, activities, chat_history) with Row Level Security policies, auto-updating timestamps, and profile auto-creation on signup
- **Contacts** — Full CRUD with search, status filtering (lead/prospect/customer/churned), tags, inline editing
- **Deals** — Pipeline management with stage tracking (discovery → closed), value tracking, contact associations, currency support
- **Activities** — Activity logging (call/email/meeting/note) with contact linking, completion tracking, scheduling
- **AI Chat** — CRM-focused AI assistant with conversation history, suggested prompts, typing indicators; supports OpenAI API with local fallback
- **Dashboard** — Overview with pipeline stats, stage distribution, recent activity, revenue tracking
- **UI/UX** — Light/dark mode with CSS variables, Inter font, responsive navbar with mobile hamburger, skeleton loaders, empty states, error states with retry
- **API** — RESTful routes for all entities with Zod validation, consistent `{ success, data, error }` responses, proper HTTP status codes
- **Custom 404** page
- **Code Quality** — TypeScript strict mode, Zod validation, no hardcoded keys

### Preserved
- Original Express.js backend (signal-driven lead generation engine) in `/src` directory
- Prisma schema and all existing scoring, scraping, and webhook functionality
- All legacy API routes and queue workers

## [0.1.0] - Initial

### Added
- Signal-driven lead generation engine
- Multi-factor lead scoring (ICP, Intent, Timing, Momentum)
- Web scraping with tech stack detection
- HubSpot and Pipedrive webhook integrations
- AI message generation (template-based)
- Bull/Redis job queue system
