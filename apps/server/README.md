# Docmost Server

NestJS backend for Docmost.

## Commands

```bash
pnpm install
pnpm --filter server start:dev
pnpm --filter server test
```

## Migrations

```bash
pnpm --filter server migration:create --name=change_name
pnpm --filter server migration:generate --name=change_name
pnpm --filter server migration:run
pnpm --filter server migration:revert
pnpm --filter server migration:show
```

## OfferCore Notes

Production deployment for this fork is controlled by the root GitHub Actions
workflow. Do not deploy or restart production from this package README.
