# Linux Guide

## Requirements

- Node.js 18+.
- Desktop session with `DISPLAY` or `WAYLAND_DISPLAY` for screenshots.
- Native build dependencies required by `robotjs`.

## Local Run

```bash
npm install
npm start
```

## Headless Behavior

If `DISPLAY` and `WAYLAND_DISPLAY` are both missing, `screen_capture` and `wait_for_screen_change` return a controlled MCP error instead of terminating the server.

## Xvfb Example

```bash
xvfb-run -a npm test
```

The CI workflow uses `xvfb-run` for Linux test execution.

## Permissions And Environments

- X11: ensure the process can access the X server.
- Wayland: behavior depends on compositor restrictions and capture permissions.
- Containers: if screen capture is needed, run in an environment that exposes the display server intentionally.

## Diagnostics

- `get_desktop_capabilities` reports display mode as `x11`, `wayland` or `headless`.
- `diagnostics://status` reports screenshot store metrics and current platform policy.