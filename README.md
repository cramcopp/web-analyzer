<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Web Analyzer Pro - Deployment
This project is configured for Cloudflare Workers with the OpenNext adapter.

View your app in AI Studio: https://ai.studio/apps/07ef72ae-2e23-4af2-921d-d87a095a3626

## Cloudflare Target
The old Pages-only setup is no longer the best fit because this app has authenticated API routes, Stripe webhooks, Firebase calls, long-running scan jobs, and Cloudflare Workflows.

Use two Cloudflare Workers:
- `web-analyzer-pro`: Next.js app built by `@opennextjs/cloudflare`
- `scan-workflow`: long-running crawl workflow in `lib/workflow-scanner.ts`

## Commands
- `npm run lint`: code quality check
- `npm run build`: Next.js production build
- `npm run cf:build`: OpenNext Cloudflare Worker bundle
- `npm run cf:dry-run`: validates both Cloudflare Workers without uploading
- `npm run deploy:workflow`: deploys the scan workflow Worker
- `npm run deploy`: deploys the web app Worker
- `npm run deploy:all`: deploys workflow first, then app

## GitHub Actions
`.github/workflows/cloudflare-workers.yml` deploys on every push to `main`.

Required GitHub Actions secrets:
- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_ACCOUNT_ID`

The workflow still runs install, lint, audit, and build when secrets are missing, but it skips the Cloudflare upload step.

## Existing Cloudflare Pages Project
Pages is not bad for static or simple frontend apps, but Workers is the cleaner target for this SaaS.

To migrate:
1. Keep the existing Pages project as a rollback target until the Worker is live.
2. Create or connect a Cloudflare Workers build for this GitHub repo.
3. Use `npm run deploy:all` as the deploy command, or deploy `scan-workflow` first and `web-analyzer-pro` second.
4. Move the production custom domain from the Pages project to the Worker once the Worker deployment is healthy.

## Cost Controls
AI is intentionally budgeted:
- `AI_REPORT_MODE=budget` by default
- `AI_WORKFLOW_SUMMARY=false` so scans do not call Gemini automatically
- AI reports are cached by a deterministic grounding hash in Firestore
- If `CLOUDFLARE_ACCOUNT_ID` is set, Gemini requests route through Cloudflare AI Gateway for gateway-level caching, analytics, and rate limiting

Secrets must be stored in Cloudflare, not committed:
- `FIREBASE_API_KEY`
- `FIREBASE_PROJECT_ID`
- `GEMINI_API_KEY`
- `INTERNAL_SECRET`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- Google OAuth/Search Console keys as needed
- `CLOUDFLARE_ACCOUNT_ID` and optional `AI_GATEWAY_TOKEN` if AI Gateway is enabled
