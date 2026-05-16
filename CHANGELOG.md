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

### Changed

- Screenshot storage now uses UUID ids, TTL and byte limits.
- Screen capture defaults to metadata-first responses with optional inline images.
- Launcher discovery is generic across common Unix and Windows runtime locations.

### Removed

- Unused runtime dependencies: axios, cors, express and ws.