# Shadow CRM

Signal-driven lead scoring API for SMB outbound (MVP: performance marketing agencies → Shopify brands).

## Stack
- Node + Express + TypeScript
- Prisma + PostgreSQL
- Serverless entry for Vercel at `api/score.ts`

## Quick start
```bash
pnpm install
pnpm dev            # http://localhost:3000/score
pnpm build && pnpm start
```

## Scoring formula
`LeadScore = (ICP * 0.35) + (Intent * 0.30) + (Timing * 0.20) + (Momentum * 0.15)`

Tiers: A ≥ 80, B ≥ 65, C ≥ 50.

## API
POST `/score`
```json
{
  "icpFit": 85,
  "intent": 78,
  "timing": 65,
  "momentum": 70,
  "explanation": {
    "icpBreakdown": ["Shopify + Klaviyo detected"],
    "intentSignals": ["Hiring perf marketer (6d)"],
    "timingFactors": ["Ads rising"],
    "momentumIndicators": ["Traffic +20% QoQ"]
  }
}
```
Response: `{ "final": 77, "tier": "B", ... }`

## Deploy
- Backend: connect repo in Vercel; project root is the repo root; build command `pnpm install && pnpm build`; Vercel handles the serverless build output.
- Frontend (later): use GitHub Pages or Vercel static for `apps/frontend` when added.

## Env
Copy `.env.example` to `.env` and set `DATABASE_URL`, `PORT`, etc.
