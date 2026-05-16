# Windows 11 Guide

## Requirements

- Node.js 18+.
- Build prerequisites required by native `robotjs` installation.
- Screen recording and accessibility permissions where enforced by your environment.

## Local Run

```powershell
npm install
node .\launch.js
```

For convenience, a wrapper is also included in [launch.cmd](../launch.cmd).

## VS Code MCP Configuration

Use [docs/configs/vscode-user.mcp.json](configs/vscode-user.mcp.json) as a template for a user-level configuration, or keep the workspace config using `node ${workspaceFolder}/launch.js`.

## Node Runtime Resolution

The launcher checks:

- `MCP_DESKTOP_AUTOMATION_NODE`
- `PATH`
- `%LOCALAPPDATA%\nodejs\node.exe`
- `%ProgramFiles%\nodejs\node.exe`
- `%ProgramFiles(x86)%\nodejs\node.exe`
- `%APPDATA%\nvm\node.exe`
- `%NVS_HOME%\default\node.exe`

If your client still starts the wrong Node version, set `MCP_DESKTOP_AUTOMATION_NODE` explicitly.

## Common Issues

- Native build failures: install the required Windows build tools and retry `npm install`.
- Input blocked by policy: inspect `get_desktop_capabilities` or `get_server_status`.
- `screen_capture` unavailable: confirm desktop session permissions and that the process runs in an interactive session.