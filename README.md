# Shadow CRM - Backend

Signal-driven lead generation engine for SMB outbound sales. Scrapes public signals across the web and auto-generates ultra-targeted lead lists with contextual messaging.

## Project Structure

```
src/
├── index.ts                 # Main Express app
├── types.ts                 # TypeScript type definitions
├── lib/
│   └── prisma.ts           # Database client
├── services/
│   ├── scoringEngine.ts     # Lead scoring logic (ICP Fit, Intent, Timing, Momentum)
│   ├── leadRepository.ts    # Lead CRUD and scoring
│   ├── accountRepository.ts # Account CRUD and querying
│   ├── clientRepository.ts  # Client CRUD and ICP management
│   └── signalRepository.ts  # Signal storage and retrieval
└── routes/
    ├── leads.ts             # Lead endpoints
    ├── accounts.ts          # Account endpoints
    └── clients.ts           # Client endpoints

prisma/
└── schema.prisma            # Database schema
```

## Setup

### Prerequisites
- Node.js 18+
- PostgreSQL
- npm or yarn

### Installation

1. Install dependencies:
   ```bash
   npm install
   ```

2. Create `.env` file:
   ```bash
   cp .env.example .env
   ```

3. Update `.env` with your database URL:
   ```
   DATABASE_URL="postgresql://user:password@localhost:5432/shadow_crm"
   ```

4. Push database schema:
   ```bash
   npm run db:push
   ```

### Development

```bash
npm run dev
```

Server runs on `http://localhost:3000`

### Building

```bash
npm run build
npm start
```

## API Endpoints

### Clients
- `POST /api/clients` - Create client
- `GET /api/clients` - Get all clients
- `GET /api/clients/:id` - Get client with stats
- `PATCH /api/clients/:id` - Update client
- `PATCH /api/clients/:id/icp` - Update ICP profile
- `DELETE /api/clients/:id` - Delete client

### Accounts
- `POST /api/accounts` - Create/update account
- `GET /api/accounts` - Search accounts with filters
- `GET /api/accounts/:id` - Get account details
- `GET /api/accounts/domain/:domain` - Get by domain
- `GET /api/accounts/:id/signals` - Get account signals
- `GET /api/accounts/:id/hiring-signals` - Get hiring signals
- `GET /api/accounts/shopify-klaviyo` - Get high-intent targets

### Leads
- `POST /api/leads/:clientId` - Create lead
- `GET /api/leads/:clientId` - Get client's leads (filter by tier)
- `GET /api/leads/:clientId/:leadId` - Get single lead
- `PATCH /api/leads/:leadId/status` - Update lead status
- `GET /api/leads/:clientId/distribution` - Get tier distribution

## Lead Scoring Formula

```
Final Score = (ICP Fit × 0.35) + (Intent × 0.30) + (Timing × 0.20) + (Momentum × 0.15)
```

### Components

**ICP Fit Score (0-100)**
- Industry Match (0-25)
- Company Size (0-20)
- Geography (0-10)
- Revenue Proxy (0-15)
- Tech Stack (0-30)

**Intent Signal Score (0-100)**
- Hiring Signals (0-40) - Decays over time
- Website Changes (0-20)
- Ad Activity (0-20)
- Tech Stack Changes (0-20)

**Timing Score (0-100)**
- Hiring While Growing (0-40)
- Funding Events (0-30)
- Leadership Changes (0-20)
- Product Launches (0-10)

**Momentum Score (0-100)**
- Hiring Velocity (0-30)
- Content Velocity (0-20)
- Ad Velocity (0-30)
- Traffic Growth (0-20)

### Lead Tiers
- **Tier A** (80-100): Contact immediately
- **Tier B** (65-79): Add to next sequence
- **Tier C** (50-64): Monitor

## Database Schema

### Clients
- Client account info
- ICP Profile (auto-segmentation)
- Lead and signal associations

### Accounts
- Prospect company details
- Tech Stack detection
- Hiring signals
- Associated signals and leads

### Signals
- Raw signal storage (hiring, website changes, ad activity, etc)
- Confidence scores
- Decay tracking

### Leads
- Score components and tiers
- Signal context
- Status tracking

## Signal Decay Model

Signals decay exponentially over time:
```
Decay Factor = e^(-λt)
where λ = 0.03 per day
```

After 30 days: ~41% of original weight
After 60 days: ~16% of original weight
After 90 days: ~6% of original weight

## Next Steps

- [ ] Build scraper pipeline (websites, job boards, tech stack detection)
- [ ] Implement signal normalization layer
- [ ] Add webhook integrations (HubSpot, Pipedrive)
- [ ] Build message generation engine
- [ ] Add job queue system for background processing
- [ ] Implement data export (CSV, Webhook)
