# Linux Guide

## Requirements

- Node.js 18+.
- Desktop session with `DISPLAY` or `WAYLAND_DISPLAY` for screenshots, or an accessible X11 socket under `/tmp/.X11-unix` for auto-detection.
- Native build dependencies required by `robotjs`.

## Local Run

```bash
npm install
npm start
```

## Headless Behavior

If `DISPLAY` and `WAYLAND_DISPLAY` are both missing, the server first tries to auto-detect an X11 display from `/tmp/.X11-unix`.

If no display can be resolved, `screen_capture` returns a controlled MCP error instead of terminating the server.

## Xvfb Example

```bash
xvfb-run -a npm test
```

The CI workflow uses `xvfb-run` for Linux test execution.

## Display Overrides

- `MCP_DESKTOP_AUTOMATION_DISPLAY=:0` forces a specific X11 display.
- `MCP_DESKTOP_AUTOMATION_AUTO_DETECT_DISPLAY=false` disables X11 socket auto-detection when you want strict headless behavior.

## Permissions And Environments

- X11: ensure the process can access the X server.
- Wayland: behavior depends on compositor restrictions and capture permissions.
- Containers: if screen capture is needed, run in an environment that exposes the display server intentionally.

## Diagnostics

- `get_desktop_capabilities` reports display mode as `x11`, `wayland` or `headless`.
- `diagnostics://status` reports screenshot store metrics and current platform policy.
- `npm run test:live-smoke` runs a live stdio smoke check on Linux and validates `screen_capture`.