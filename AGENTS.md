# Repository Instructions

This checkout is the OfferCore production fork of Docmost:
`https://github.com/LTDigor/docmost`.

## Production CI/CD

- Production CI is configured in `.github/workflows/deploy-production.yml`.
- Pushes to `main` or `master` build a Docker image in GitHub Actions, push
  `ghcr.io/ltdigor/docmost:<commit-sha>` and `ghcr.io/ltdigor/docmost:main`,
  then deploy the exact commit image to the production VPS through
  `/usr/local/sbin/deploy-docmost-from-github`.
- The deploy workflow uses the `DOCMOST_DEPLOY_*` GitHub secrets. Do not expose
  or print those secret values.
- Do not manually deploy, restart, roll back, or change production services
  unless the current user turn explicitly asks for that live action.
- Do not claim a production change is live until the GitHub Actions deploy and
  the production health checks have succeeded.
- Invitation email subjects must use the configured organization name from
  `MAIL_FROM_NAME`; do not hardcode `OfferCore` in the mail subject and do not
  use the inviting admin's profile name as the organization name.

## Local Work

- Work on the repository primary branch by default unless the user asks for a
  feature branch.
- Preserve unrelated dirty worktree changes. Do not reset or revert changes you
  did not make unless the user explicitly asks.
- Keep production-facing wording and branding as OfferCore unless the task
  explicitly asks for upstream Docmost wording.
