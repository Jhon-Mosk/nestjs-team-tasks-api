# Security Policy

## Supported Versions

This is a portfolio project. Security fixes are applied on a best‑effort basis.

## Reporting a Vulnerability

Please **do not open a public issue** for security vulnerabilities.

Instead, report privately:
- via GitHub Security Advisories (preferred), or
- by contacting the repository owner directly on GitHub.

Include:
- affected component / dependency
- steps to reproduce or PoC (if available)
- impact assessment
- suggested fix / upstream advisory link

## Dependency vulnerabilities

If `npm audit` reports vulnerabilities:
1) try `npm audit fix` (without `--force`)
2) re-run `npm test`, `npm run lint`, `npm run test:cov`, `npm run build`
3) open a PR with a clear description of changes

