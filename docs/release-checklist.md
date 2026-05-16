# Release Checklist

- Confirm `npm run lint` passes.
- Confirm `npm test` passes.
- Confirm `npm run test:coverage` passes and produces `coverage/`.
- Review package contents against the `files` allowlist in [package.json](../package.json).
- Review [CHANGELOG.md](../CHANGELOG.md) and add a release entry.
- Remove obsolete planning artifacts before cutting the release.
- Confirm CI is green for the current branch.
- Re-check workspace and published MCP configuration examples.
- Verify README and platform docs match the current feature set.