# MCP Desktop Automation

MCP server for desktop automation over stdio. It exposes screen inspection, mouse, keyboard and diagnostics tools for VS Code, Claude Desktop and other MCP clients.

## What It Does

- Captures the screen and stores screenshots as MCP resources with TTL and byte limits.
- Reports desktop capabilities, server status and current screen size.
- Performs mouse movement, drag, scroll and click operations.
- Types text and sends normalized key combinations with platform-aware modifier aliases.
- Exposes prompts and diagnostics resources for safer guided usage.

## Requirements

- Node.js 18+.
- Desktop permissions for screen capture and synthetic input.
- A graphical session for screenshots on Linux (`DISPLAY` or `WAYLAND_DISPLAY`).

## Quick Start

### Run From This Repository

```bash
npm install
npm start
```

The entrypoint is [launch.js](launch.js). It tries to locate a compatible Node.js runtime automatically on Linux, macOS and Windows.

If your MCP client launches the server with an older Node.js, set `MCP_DESKTOP_AUTOMATION_NODE` to a Node.js 18+ executable.

### VS Code Workspace MCP

Use [.vscode/mcp.json](.vscode/mcp.json) or the example in [docs/configs/vscode-workspace.mcp.json](docs/configs/vscode-workspace.mcp.json).

### Claude Desktop

Use the example in [docs/configs/claude-desktop.json](docs/configs/claude-desktop.json).

## Tools

- `get_desktop_capabilities`: reports platform, display mode, keyboard compatibility and enabled policy flags.
- `get_server_status`: reports Node version, platform diagnostics and screenshot store status.
- `get_screen_size`: returns the current screen size.
- `screen_capture`: captures the current screen and returns metadata plus an optional inline image.
- `wait_for_screen_change`: polls the screen until content changes and then captures the updated image.
- `get_mouse_position`: returns the current mouse position.
- `mouse_move`: moves the mouse to specific coordinates.
- `mouse_drag`: drags the mouse to specific coordinates.
- `mouse_drag_with_key_press`: drags the mouse while holding a normalized key with optional modifiers.
- `mouse_scroll`: scrolls the mouse wheel by delta values.
- `mouse_click`: performs a click or double click.
- `keyboard_type`: types text at the current cursor position.
- `keyboard_type_with_key_press`: types text while holding a normalized key with optional modifiers.
- `keyboard_press`: presses a normalized key with optional normalized modifiers.

## Examples

Hold `shift` while typing:

```json
{
  "name": "keyboard_type_with_key_press",
  "arguments": {
    "key": "shift",
    "text": "hello world"
  }
}
```

Hold the primary modifier while dragging:

```json
{
  "name": "mouse_drag_with_key_press",
  "arguments": {
    "x": 640,
    "y": 360,
    "key": "primary"
  }
}
```

## Resources

- `screenshot://list`: JSON metadata for stored screenshots.
- `screenshot://recent`: JSON metadata for the latest stored screenshot.
- `screenshot://{id}`: binary screenshot content.
- `diagnostics://status`: JSON server and screenshot store status.
- `diagnostics://capabilities`: JSON desktop capability report.

## Prompts

- `inspect-screen`: guided inspection flow for current desktop state.
- `click-by-coordinates`: guided mouse move + click flow.
- `type-text-safely`: guided text-entry flow with policy checks.

## Safety And Policy

The server supports configuration-driven safety controls:

- `MCP_DESKTOP_AUTOMATION_ENABLE_INPUT=false` disables keyboard and mouse tools.
- `MCP_DESKTOP_AUTOMATION_READ_ONLY=true` leaves read-only tools enabled.
- `MCP_DESKTOP_AUTOMATION_DRY_RUN=true` returns success without performing input.
- `MCP_DESKTOP_AUTOMATION_ALLOWED_TOOLS` and `MCP_DESKTOP_AUTOMATION_BLOCKED_TOOLS` provide allow/deny lists.
- `MCP_DESKTOP_AUTOMATION_SAFE_AREA=x,y,width,height` limits mouse movement and clickable area.
- `MCP_DESKTOP_AUTOMATION_SCREENSHOT_*` options control timeouts, TTL and byte limits.

See [docs/security.md](docs/security.md) for the full model.

## Platform Notes

- Linux: screenshots require `DISPLAY` or `WAYLAND_DISPLAY`. Headless environments return a controlled MCP error instead of crashing.
- Windows 11: use Node 18+ and grant desktop/input permissions as required by your environment.
- macOS: accessibility and screen-recording permissions may be required.

Platform-specific setup is documented in [docs/linux.md](docs/linux.md) and [docs/windows.md](docs/windows.md).

## Development

- `npm run lint`
- `npm test`
- `npm run test:coverage`

Additional references:

- [docs/architecture.md](docs/architecture.md)
- [docs/testing.md](docs/testing.md)
- [docs/troubleshooting.md](docs/troubleshooting.md)
- [docs/release-checklist.md](docs/release-checklist.md)

## Known Limits

- Screenshot cropping and OCR are not implemented yet; they remain future extensions that require an image-processing backend.
- `robotjs` is native and can be sensitive to Node ABI and platform packaging.
- Windows CI is configured at the workflow level, but local verification still depends on native build prerequisites on the target machine.

## License

MIT. See [LICENSE](LICENSE).
