# Testing

## Requirements

- Node.js 18 or newer
- On Linux CI or headless environments, use Xvfb for tests that touch desktop APIs

## Commands

- `npm run lint` checks JavaScript sources with ESLint
- `npm run format` formats repository files with Prettier
- `npm test` runs the full test suite
- `npm run test:unit` validates unit-level behavior, including the VS Code MCP config
- `npm run test:contract` checks the MCP stdio contract and tool discovery
- `npm run test:smoke` runs a lightweight stdio smoke test against the launcher
- `npm run test:live-smoke` runs a live Linux desktop smoke test for `screen_capture`

## Notes

- In environments with an older system Node.js, point `MCP_DESKTOP_AUTOMATION_NODE` to a compatible runtime or run commands with Node 18+ directly.
- CI runs the test suite under `xvfb-run` so `robotjs` can resolve screen information on Linux.
- `npm run test:live-smoke` is intended for a real Linux desktop session with `xterm` available; it is not part of CI.