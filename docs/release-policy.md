# Release Policy

## Versioning

This project follows semantic versioning:

- Patch: fixes, diagnostics, tests and low-risk compatibility updates.
- Minor: new MCP tools, prompts, resources and backward-compatible configuration additions.
- Major: breaking tool contract changes, removed capabilities, or incompatible runtime requirements.

## Changelog Policy

- Every user-visible change must be added to [CHANGELOG.md](../CHANGELOG.md).
- Group entries into Added, Changed and Removed sections.
- Mention platform or runtime-impacting changes explicitly.

## Release Gates

- `npm run lint`
- `npm test`
- `npm run test:coverage`
- `npm run test:package`
- Green CI on the release commit