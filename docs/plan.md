# MCP Desktop Automation Roadmap

## Goal

To develop the current MCP desktop automation server into a supportable, cross-platform, and secure product: stabilize the launch, decouple the architecture, improve tooling, remove unnecessary features, add observability, and ensure full test coverage at the unit, MCP contract, integration, and platform smoke tests levels.

## Current Status

- The server runs via stdio and provides the get_screen_size, screen_capture, keyboard_press, keyboard_type, mouse_click, and mouse_move tools.
- The VS Code workspace config has been added to .vscode/mcp.json.
- There is a cross-platform launcher, launch.js, a Unix wrapper, launch.sh, and headless Linux processing for screen_capture.
- The main logic is contained in a single file, server.js. - There are no tests, linter, formatter, or CI quality gate for PR.
- The `package.json` file contains dependencies that the current code doesn't use: `axios`, `cors`, `express`, and `ws`.
- The Dockerfile runs `server.js` directly and doesn't use the new launcher.
- The README has been partially updated, but lacks an architectural description, platform matrix, diagnostic scripts, or full instructions for VS Code/Windows.

## Key Risks Review

- Native `robotjs` is sensitive to the Node ABI version and platform; the current run should be tested separately on Linux, macOS, and Win11.
- `screen_capture` stores base64 screenshots in memory without a limit, TTL, or eviction; memory growth is possible with long sessions.
- Screenshot keys are based on seconds, so collisions are possible with multiple captures in a second. - `screenshot://list` logs the result along with blob data, which can clutter stderr and reveal large images.
- `screenshot://{id}` doesn't explicitly handle unknown ids.
- Mouse coordinates have no screen range check or security policy.
- Keyboard operations lack layout normalization, a table of supported key names, or platform-specific modifier differences.
- `keyboard_press` uses the low-level `keyToggle`; for most combinations, a separate abstraction over `keyTap`/`keyToggle` with tests is safer.
- Some tool errors are returned as successful MCP responses with `success:false`, while others return `isError:true`; a unified error model is needed.
- The server has no config layer: there are no explicit limits, feature flags, deny/allow policies, timeouts, or dry-run mode. - There are no contract tests for the MCP protocol, so it is easy to break the schema, resources, or stdio lifecycle.

## Target Architecture

```text
src/ 
main.js # process entrypoint, stdio transport, lifecycle 
server/createServer.js # register MCP tools/resources/prompts 
config/index.js # env/config parsing, defaults, validation 
logging/index.js # structured stderr logging without payload leaks 
domain/ 
automation.js # use cases: mouse, keyboard, screenshot 
errors.js # typed domain errors -> MCP responses 
screenshots.js # screenshot store, ids, TTL, size limits 
adapters/ 
robotjsAdapter.js # robotjs wrapper 
screenshotAdapter.js # screenshot-desktop wrapper 
platform.js #OS/display/capability detection 
tools/ 
mouse.js 
keyboard.js 
screen.js 
resources/ 
screenshots.js 
test/ 
fakes/ 
robot.js
screenshot.js
```

Key principle: The MCP layer knows nothing about robotjs directly. Tools invoke domain use cases, domains work through adapters, and adapters can be replaced with fakes in tests. This will allow you to safely test automation without real clicks or keyboard input.

## Phase 0. Basic Inventory and Quality Gate

Goal: Fix current behavior and protect against regressions before major changes.

Tools:

- Add `engines.node >=18` to `package.json`.
- Add scripts: `lint`, `format`, `test`, `test:unit`, `test:contract`, `test:smoke`.
- Choose a minimal stack: Node test runner or Vitest, ESLint, Prettier.
- Fix smoke test for stdio MCP: connect, `tools/list`, `get_screen_size`, graceful close.
- Add JSON validation for `.vscode/mcp.json`.
- Add `docs/testing.md` with testing commands.
- Update Dockerfile to run the current entrypoint or explicitly document the difference.

Definition of Done:

- `npm test` runs and is not a placeholder.
- The first contract smoke test for MCP exists.
- CI runs install, lint, and tests on Linux.

## Phase 1. Architecture Separation

Goal: Remove the monolithic `server.js` and make the code testable.

Work:

- Move MCP server registration to `src/server/createServer.js`.
- Move tools to separate `src/tools/*` modules.
- Move `robotjs` and `screenshot-desktop` to adapters.
- Move response helpers and typed errors to a separate layer.
- Implement dependency injection for adapters, logger, config, and screenshot store.
- Leave `server.js` as a thin compatibility entrypoint for the transition period.

Definition of Done:

- Tools are tested without running a real MCP process.
- `server.js` only contains dependency creation and transport startup.
- The behavior of the current 6 tools does not change without explicit decision.

## Phase 2. Unified MCP Error and Response Model

Goal: Create predictable responses for clients and avoid crashing stdio.

To Do:

- Implement `okResponse`, `errorResponse`, and `imageResponse` helpers.
- All tool failures return `isError:true` to the MCP with a short error code and a user-readable message.
- Add error codes: `DISPLAY_UNAVAILABLE`, `INVALID_COORDINATES`, `UNSUPPORTED_KEY`, `SCREENSHOT_FAILED`, `AUTOMATION_UNAVAILABLE`, and `PERMISSION_DENIED`.
- Eliminate large payloads from stderr logs.
- Add graceful handling for unknown screenshot resource IDs.
- Add timeouts for screenshots and potentially hanging operations.

Definition of Done:

- Contract tests verify the success/error pattern of each tool. - No expected failure closes the MCP connection.

## Phase 3. Security and Policy Layer

Goal: Reduce the risk of dangerous desktop automation actions.

Work:

- Add the config `MCP_DESKTOP_AUTOMATION_ENABLE_INPUT=true|false`.
- Add read-only mode: only `get_screen_size` and `screen_capture` are allowed.
- Add an allow/deny policy for tools via the env or config file.
- Add a bounds check for mouse coordinates based on the current screen size.
- Add an optional safe area for the mouse: prevent clicks outside the specified rectangle.
- Add a dry-run mode for keyboard/mouse tools.
- Document the VS Code MCP trust model and sandbox restrictions on Windows.

Definition of Done:

- Unsafe tools can be disabled without code changes.
- Unit tests cover policy decisions and coordinate restrictions.

## Phase 4. Screenshot Subsystem Improvements

Goal: Make screen capture reliable and manageable.

Work:

- Replace timestamp ids with `crypto.randomUUID()` or a monotonic id with collision protection.
- Add a screenshot store with TTL, max items, and max bytes.
- Add `screen_capture` parameters: display id, format, resize width/height, quality, includeImage boolean.
- Add a separate `list_screenshots` tool or leave only the MCP resource but define the contract.
- Add metadata: createdAt, width, height, byteSize, mimeType.
- Add protection against the 1MB response limit: return metadata + resource link by default, and make inline images optional.
- Support headless Linux strategy: understandable error, Xvfb instruction, smoke test under Xvfb.

Definition of Done:

- Screenshot store does not grow indefinitely.
- Large screenshots don't break MCP response.
- Resource tests cover list/read/not found/expired.

## Phase 5. Keyboard and Mouse: Platform Compatibility

Goal: Make automation behavior predictable on Linux, macOS, and Win11.

Work:

- Introduce a table of supported keys and aliases for `robotjs`.
- Normalize modifiers: `control`, `ctrl`, `command`, `meta`, platform-specific primary modifier.
- Rewrite `keyboard_press` using a secure adapter API.
- Add tools: `mouse_drag`, `mouse_scroll`, `get_mouse_position`.
- Add click count and delay parameters, but with limits.
- Add multi-monitor awareness if the adapter and platform support it.
- Add explicit platform capability report tool `get_desktop_capabilities`.

Definition of Done:

- Unit tests cover key normalization and modifier mapping.
- Contract tests verify the schema of new tools.
- Smoke tests separately document Linux and Win11 expectations.

## Phase 6. Launch, Installation, and Cross-Platform

Goal: Make installation and launch straightforward for VS Code, npm, Docker, and Windows.

Work:

- Improve `launch.js`: remove hardcoded local Node versions, replace with generic discovery in `node-v*/bin/node` directories and Windows nvm/nvs/asdf paths.
- Add `launch.cmd` or document why `launch.js` is sufficient for npm bin on Windows.
- Add launcher logic tests with fake filesystem/process paths.
- Update Dockerfile for the current entrypoint and Node LTS.
- Add `.npmignore` or `files` to `package.json`.
- Check npm package bin behavior on Windows.
- Add ready-made configs: VS Code workspace, VS Code user, Claude Desktop, Cursor/Windsurf if applicable.

Definition of Done:

- Launcher unit tests cover Linux/macOS/Win11 discovery.
- MCP config examples do not contain machine-specific absolute paths.
- Docker smoke test passes or is explicitly excluded from the matrix with a reason.

## Phase 7. Dependencies and Runtime Modernization

Goal: Reduce the support surface and update the stack.

Work:

- Remove unused dependencies `axios`, `cors`, `express`, `ws`, if HTTP transport is not planned for the next phase.
- If HTTP transport is needed, move it to a separate phase and implement it deliberately.
- Lock in a compatible version of `@modelcontextprotocol/sdk` and Node LTS.
- Check alternatives to `robotjs`, as the package is native and may be problematic on newer Node/Windows systems.
- Add a dependency audit policy and renovate/dependabot.
- Regenerate the lockfile with a modern npm.

Definition of Done:

- `npm ci` is reproducible on clean Linux and Win11.
- The lockfile matches the supported npm.
- No unused runtime dependencies.

## Phase 8. Full Test Coverage

Goal: Cover behavior without dangerous real-world clicks and add controlled platform smoke tests.

Minimal test structure:

- Unit tests:
- config parsing;
- response helpers;
- error mapping;
- screenshot store;
- key/modifier normalization;
- coordinate validation;
- policy layer;
- launcher discovery.
- Adapter tests with fakes:
- robot adapter calls expected methods;
- screenshot adapter handles success, timeout, missing display and thrown errors.
- MCP contract tests: 
- initialize/connect/close; 
- `tools/list` includes expected schemas; 
- every tool returns valid MCP content; 
- expected failures return `isError:true` without process exit; 
- resources list/read/not found behavior.
- Integration tests: 
- stdio process starts from `launch.js`; 
- VS Code `.vscode/mcp.json` shape is valid; 
- headless Linux `screen_capture` returns controlled error; 
- Xvfb Linux screenshot success path, if Xvfb is available.
- Platform smoke tests: 
- Linux latest Node LTS; 
- Windows 11 latest Node LTS; 
- optional macOS latest Node LTS.

Coverage target:

- 90%+ line coverage for pure modules.
- 100% branch coverage for policy, validation, error mapping and launcher discovery.
- Every MCP tool has at least one success contract test and one failure contract test where applicable.

Definition of Done:

- CI publications coverage report.
- Dangerous desktop operations are mocked by default.
- Real automation smoke tests are opt-in and clearly labeled.

## Phase 9. Observability and Diagnostics

Goal: Facilitate user support.

Work:

- Add structured stderr logs: level, event, tool, durationMs, errorCode.
- Exclude image/base64 payloads from logs.
- Add `get_server_status` or `get_desktop_capabilities` tools.
- Add startup diagnostics: node version, platform, display availability, enabled tools.
- Add troubleshooting docs for Node ABI, permissions, Wayland/X11, Windows UAC, antivirus/permissions.

Definition of Done:

- Startup errors can be diagnosed by the first lines of the MCP output log.
- Logs do not contain screenshots or private screen content.

## Phase 10. Expanding MCP Capabilities

Goal: Make the server more useful without overloading the basic API.

Work:

- Add prompts for common scenarios: inspect screen, click by coordinates, type text safely.
- Add resources for capabilities, recent screenshots, and diagnostics.
- Consider an MCP Apps UI for viewing the latest screenshot and selecting coordinates, if the client supports it.
- Add the `wait_for_screen_change` tool with a timeout and lightweight image diff.
- Add OCR as an optional feature flag if a confirmed scenario occurs.
- Add image crop region capture to reduce payload.

Definition of Done:

- New features are disableable and documented.
- Payload limits and privacy expectations are clearly described.

## Phase 11. Documentation and User Experience

Goal: Make the project easy to install, develop, and operate.

To Do:

- Rewrite the README for real-world scenarios: VS Code, Claude Desktop, npm, local development.
- Add docs/architecture.md with the target module schema.
- Add docs/security.md with the trust model and policy settings.
- Add docs/windows.md for Win11: Node, permissions, npm install, MCP config.
- Add docs/linux.md: X11/Wayland, headless, Xvfb, permissions.
- Add docs/troubleshooting.md.
- Add a changelog and release checklist.

Definition of Done:

- A new user can install and test the server using the documentation. - The developer can run tests and understand the architecture without reading all the code.

## Phase 12. Release Readiness

Goal: Prepare the server for safe publication and maintenance.

Work:

- Set up a CI matrix: Linux, Win11, Node 18/20/22 where supported.
- Add npm publish checks: test, lint, package contents check.
- Add semantic versioning and a changelog policy.
- Add GitHub issue templates for bug/platform reports.
- Add a security policy.
- Check the npm package entrypoint for a clean install.

Definition of Done:

- Release is impossible without green quality gates.
- Package contains only the required files.
- Supported platforms and limitations are clearly stated.

## Proposed Workflow

1. [x] First, Phase 0, to get the baseline and safety net.
2. [x] Then Phases 1 and 2, along with small PRs: architecture plus a unified error model.
3. [x] After that, Phases 3 and 4, because security and screenshots pose the highest risk.
4. [ ] Then Phases 5 and 6 for cross-platform and Win11.
5. [ ] Next, Phases 7 and 8: dependencies and full test coverage.
6. [ ] Then Phases 9-11: diagnostics, feature expansion, and documentation.
7. [ ] Finally, Phase 12 for release readiness.

## First Specific Tasks for the Next Phase

- Add `engines`, real test scripts, and a basic test runner.
- Write MCP contract smoke tests for `tools/list` and `get_screen_size`. - Move response helpers and screenshot store out of `server.js`.
- Add a limited screenshot store with TTL and UUID ids.
- Remove screenshot blobs logging.
- Update Dockerfile to `launch.js`.
- Start Windows-oriented launcher tests.
