# ADR-0000: CI/CD Pipeline Standards

## Status: PROPOSED

## Decision
**GitHub Actions** for CI/CD, deploying to **Cloudflare Pages / Workers** via Wrangler. Pipeline: build → test → security scan → deploy.

## Pipeline Stages
1. **Install** — `npm ci` (locked dependencies, `--prefer-offline --no-audit --no-fund`)
2. **Build** — `npm run build` (vinext build)
3. **Type-check** — `npx tsc --noEmit`
4. **Tests** — `npm run check` (all test files)
5. **Security scan** — dependency audit, secret scanning (gitleaks)
6. **Deploy** — Wrangler deploy to Cloudflare Workers (dev → staging → prod)

## Environment Promotion
- `main` branch → dev (auto)
- `staging` tag → staging (manual approval)
- `release/*` tag → prod (manual approval)

## Secrets Management
- Cloudflare Secrets (Wrangler secrets) for: `WESTOS_OWNER_EMAIL`, `WESTOS_INVENTORY_INTERNAL_KEY`, `WESTOS_JWT_SECRET`, payment provider keys, courier keys, notification keys
- **Never** commit `.env`, `.dev.vars`, or secrets to repo (enforced by `.gitignore`)

## Owner
DevOps

## Target Date
Phase 0, Week 1-2