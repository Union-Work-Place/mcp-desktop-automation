# Changelog

## 1.0.0

### Added

- Baseline project quality gates with ESLint, Prettier, Node test runner, MCP contract smoke coverage and Linux CI execution.
- Layered runtime architecture under `src/` with dedicated config, adapters, domain services, MCP server registration and tool modules.
- Unified MCP response helpers and typed error model with stable error codes for screen capture, permissions, coordinates and automation failures.
- Configuration-driven safety controls for desktop automation, including input enable/disable, read-only mode, dry-run mode, allow/block lists and safe-area mouse restrictions.
- Bounded screenshot subsystem with UUID ids, TTL and byte limits, screenshot metadata, resource-backed payloads and screenshot diagnostics.
- Cross-platform launcher support for Linux, macOS and Windows, including `launch.sh`, `launch.cmd`, generic Node runtime discovery and ready-made MCP client configs.
- Expanded MCP tool surface with `get_desktop_capabilities`, `get_server_status`, `get_mouse_position`, `mouse_drag`, `mouse_scroll`, `wait_for_screen_change`, `keyboard_type_with_key_press` and `mouse_drag_with_key_press`.
- Keyboard compatibility model with normalized key aliases, modifier aliases and platform-aware primary modifier handling.
- Diagnostics resources, recent screenshot resources and guided MCP prompts for inspection, clicking and safe typing workflows.
- Structured stderr logging with startup diagnostics and operational visibility for stdio server runs.
- Comprehensive automated coverage with unit, contract and smoke tests, c8 coverage reporting and CI artifact upload.
- Release hardening assets including issue templates, security policy, release policy, package-content validation and npm publish workflow gates.
- Linux live smoke script that validates `get_server_status`, `get_desktop_capabilities`, `screen_capture` and `wait_for_screen_change` on a real desktop session.

### Changed

- `server.js` is now a thin stdio entrypoint that wires config, adapters, logging, screenshot store and MCP server creation instead of containing the full implementation inline.
- Screen capture now defaults to metadata-first responses with optional inline image payloads, timeout handling and graceful headless Linux errors instead of unstable raw inline responses.
- Linux screenshot handling now auto-detects an accessible X11 display from `/tmp/.X11-unix` when `DISPLAY` is missing, while still allowing an explicit display override and strict headless mode for tests.
- CI now validates Linux quality gates and Windows smoke scenarios across supported Node versions, with additional package validation and release publish checks.
- Package/runtime compatibility is aligned on Node 18+ and `@modelcontextprotocol/sdk` 1.29.0, with old npm/runtime path issues handled through compatibility wrappers.
- MCP prompt compatibility was tightened so prompt arguments remain valid across clients that serialize coordinate arguments differently.
- Documentation now reflects the actual production feature set across architecture, Linux, Windows, troubleshooting, release and testing guides.

### Removed

- Unused runtime dependencies: axios, cors, express and ws.