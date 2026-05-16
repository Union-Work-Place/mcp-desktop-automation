# Architecture

## Runtime Shape

The server is a stdio MCP process started through [launch.js](../launch.js). The entrypoint resolves a compatible Node runtime, starts [server.js](../server.js), and the server composes adapters, policy-aware tools, diagnostics, resources and prompts.

## Module Layout

```text
src/
  adapters/
    platform.js
    robotjsAdapter.js
    screenshotAdapter.js
  config/
    index.js
  domain/
    errors.js
    keyboard.js
    policy.js
    screenshots.js
  logging/
    index.js
  server/
    createServer.js
    mcpResponses.js
  tools/
    keyboard.js
    mouse.js
    screen.js
```

## Responsibilities

- Adapters isolate platform-specific and native integrations.
- Domain modules own validation, policy decisions, keyboard normalization and screenshot storage rules.
- Tool modules translate domain behavior into MCP tool responses.
- The server module registers MCP tools, resources and prompts.
- The logger emits structured JSON diagnostics to stderr without leaking image payloads.

## Data Flow

1. MCP client calls a tool over stdio.
2. `createServer` dispatches to a tool module.
3. Tool module validates policy and arguments.
4. Tool module delegates to adapters and screenshot store.
5. Response helpers convert the result into MCP content.

## Screenshot Lifecycle

1. `screen_capture` or `wait_for_screen_change` asks the screenshot adapter for an image.
2. The screenshot is stored in the bounded screenshot store with UUID, TTL and byte metadata.
3. The tool returns metadata and, optionally, an inline image if allowed by limits.
4. The same screenshot is later accessible through `screenshot://{id}`.

## Safety Model

- Policy flags are read from environment variables once at startup.
- Input tools can be disabled globally, restricted to read-only mode or forced into dry-run.
- Mouse movement is checked against screen bounds and optional safe area restrictions.
- Headless Linux is treated as a recoverable capability limitation, not a fatal process error.

## Diagnostics

- Startup emits structured diagnostics with Node version, policy summary and platform capability data.
- Runtime tools expose `get_desktop_capabilities` and `get_server_status`.
- Diagnostics resources expose the same information to MCP clients as JSON.