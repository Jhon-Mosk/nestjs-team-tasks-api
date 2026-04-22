# Contributing

Thanks for considering contributing.

## Development setup

Requirements:
- Node.js (see `package.json` → `engines.node`)
- Docker + Docker Compose

Install and run:

```bash
cd repo
npm ci
npm run start:dev
```

## Environment

Create `.env` from `.env.example`.

## Tests

```bash
cd repo
npm run lint
npm test
npm run test:cov
```

Integration tests require Postgres + Redis:

```bash
docker compose up -d postgres redis
npm run test:integration
```

## Commit messages

This repository uses Conventional Commits (enforced by commitlint).

Examples:
- `feat(auth): add refresh token rotation`
- `fix(tasks): enforce org isolation on list`
- `chore(deps): npm audit fix`

## Pull requests

- Keep PRs focused and small.
- Include a short Summary and a Test plan.
- Ensure CI is green before requesting review.

