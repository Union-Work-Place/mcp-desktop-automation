# Troubleshooting

## Server Does Not Start

- Check the MCP output log in your client.
- Verify that Node 18+ is available.
- If the wrong Node runtime is used, set `MCP_DESKTOP_AUTOMATION_NODE`.

## Screen Capture Fails On Linux

- Confirm `DISPLAY` or `WAYLAND_DISPLAY` is set.
- If the Linux session is graphical but those variables are empty, check whether `/tmp/.X11-unix/X0` or another X11 socket exists. The server auto-detects that path by default.
- Use `MCP_DESKTOP_AUTOMATION_DISPLAY=:0` when you need to force a specific X11 display.
- Use `MCP_DESKTOP_AUTOMATION_AUTO_DETECT_DISPLAY=false` when you want to keep strict headless behavior for tests.
- If you are in CI or a headless session, use Xvfb when appropriate.
- Inspect `get_desktop_capabilities` to confirm what the server sees.

## Keyboard Or Mouse Tools Return Permission Errors

- Check `MCP_DESKTOP_AUTOMATION_ENABLE_INPUT`.
- Check `MCP_DESKTOP_AUTOMATION_READ_ONLY` and `MCP_DESKTOP_AUTOMATION_DRY_RUN`.
- Check tool allowlist and blocklist configuration.
- If safe area is configured, verify that the target point is inside it.

## Screenshots Disappear

Stored screenshots are intentionally bounded by TTL, max item count and max byte limits. Use the resource URI soon after capture or raise the store limits explicitly.

## Native Module Problems

- `robotjs` can fail when built for a different Node ABI.
- Reinstall dependencies with the intended Node version.
- Re-check Linux system packages or Windows native build prerequisites.