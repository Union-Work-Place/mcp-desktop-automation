# Changelog

## Unreleased

### Added

- Structured stderr logging with startup diagnostics.
- Server status and desktop capability tools.
- Mouse drag, scroll and position tools.
- Screen change waiting tool.
- MCP prompts for screen inspection, coordinate clicking and safe typing.
- Diagnostics and recent screenshot resources.
- Coverage tooling and CI artifact upload.
- Release-hardening issue templates, package contents validation and npm publish gates.
- Security policy and documented semantic versioning and changelog policy.
- Linux live smoke script for `screen_capture` and `wait_for_screen_change` on real desktop sessions.

### Changed

- Screenshot storage now uses UUID ids, TTL and byte limits.
- Screen capture defaults to metadata-first responses with optional inline images.
- Launcher discovery is generic across common Unix and Windows runtime locations.
- CI now covers Linux quality gates and Windows smoke validation across supported Node versions.
- MCP click-by-coordinates prompt now accepts string prompt arguments for broader client compatibility.
- Linux screen capture can now auto-detect an accessible X11 display from `/tmp/.X11-unix` when `DISPLAY` is missing.

### Removed

- Unused runtime dependencies: axios, cors, express and ws.