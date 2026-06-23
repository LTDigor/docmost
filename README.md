# Docmost

OfferCore production fork of Docmost.

Upstream project: `https://docmost.com`

## Fork Notes

- GitHub repository: `https://github.com/LTDigor/docmost`
- Production deploy workflow: `.github/workflows/deploy-production.yml`
- Pushes to `main` or `master` build and push Docker images to
  `ghcr.io/ltdigor/docmost`.
- The deploy workflow updates the VPS through
  `/usr/local/sbin/deploy-docmost-from-github`.
- Swagger UI: `/api-docs`
- Raw OpenAPI JSON: `/api-docs-json`

Do not deploy this fork manually unless the current task explicitly asks for a
manual production operation.

Invitation email subjects use `MAIL_FROM_NAME` as the organization name. In
production this should stay `OfferCore`.

## Development

```bash
pnpm install
pnpm dev
pnpm build
pnpm test
```

## License

Docmost core is AGPL-3.0. Enterprise directories follow the license in
`packages/ee/License`.
