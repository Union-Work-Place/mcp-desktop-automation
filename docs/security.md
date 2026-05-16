# Security

## Trust Model

This server can capture screen contents and synthesize keyboard and mouse input. Treat it as a privileged local automation process.

Only run it in trusted workspaces and trusted MCP clients.

## Configuration Guards

- `MCP_DESKTOP_AUTOMATION_ENABLE_INPUT=false`
  Disables keyboard and mouse actions.
- `MCP_DESKTOP_AUTOMATION_READ_ONLY=true`
  Allows inspection tools while denying synthetic input.
- `MCP_DESKTOP_AUTOMATION_DRY_RUN=true`
  Returns success responses without performing real keyboard or mouse activity.
- `MCP_DESKTOP_AUTOMATION_ALLOWED_TOOLS=a,b,c`
  Restricts the server to an explicit allowlist.
- `MCP_DESKTOP_AUTOMATION_BLOCKED_TOOLS=a,b,c`
  Disables specific tools.
- `MCP_DESKTOP_AUTOMATION_SAFE_AREA=x,y,width,height`
  Restricts mouse movement and click execution to a specific rectangle.

## Screen Capture Limits

- Stored screenshots are subject to TTL, max item count and max byte limits.
- Inline image responses are optional and bounded by `MCP_DESKTOP_AUTOMATION_SCREEN_CAPTURE_MAX_INLINE_BYTES`.
- The server does not log screenshot blob payloads to stderr.

## VS Code MCP Guidance

- Workspace MCP servers run with workspace trust implications.
- VS Code may ask you to trust a newly configured MCP server before it starts.
- Sandboxing is available on Linux and macOS for local stdio MCP servers, but not on Windows.

## Operational Recommendations

- Prefer read-only or dry-run mode in shared or production-like environments.
- Use tool allowlists for tightly scoped automation scenarios.
- Keep Node and native dependencies up to date.
- Review MCP output logs for policy denials or platform capability mismatches.