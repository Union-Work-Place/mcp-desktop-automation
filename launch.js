#!/usr/bin/env node

'use strict';

var childProcess = require('child_process');
var fs = require('fs');
var os = require('os');
var path = require('path');

var MIN_NODE_MAJOR = 18;
var SCRIPT_DIR = __dirname;
var SERVER_JS = path.join(SCRIPT_DIR, 'server.js');

function parseMajor(version) {
  var match = String(version || '').match(/v?(\d+)/);
  return match ? Number(match[1]) : 0;
}

function isCompatibleNode(nodePath) {
  if (!nodePath || !fs.existsSync(nodePath)) {
    return false;
  }

  try {
    var output = childProcess.execFileSync(nodePath, ['-p', 'process.versions.node'], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
    return parseMajor(output) >= MIN_NODE_MAJOR;
  } catch (_error) {
    return false;
  }
}

function addCandidate(target, seen, value) {
  if (!value) {
    return;
  }

  var resolved = value;
  if (!seen[resolved]) {
    seen[resolved] = true;
    target.push(resolved);
  }
}

function getPathCandidates() {
  var candidates = [];
  var pathParts = String(process.env.PATH || '').split(path.delimiter);
  var names = process.platform === 'win32' ? ['node.exe', 'node.cmd', 'nodejs.exe'] : ['node', 'nodejs'];

  pathParts.forEach(function (entry) {
    if (!entry) {
      return;
    }

    names.forEach(function (name) {
      candidates.push(path.join(entry, name));
    });
  });

  return candidates;
}

function getWellKnownCandidates() {
  var home = os.homedir();

  if (process.platform === 'win32') {
    return [
      process.env.MCP_DESKTOP_AUTOMATION_NODE,
      path.join(process.env.LOCALAPPDATA || '', 'nodejs', 'node.exe'),
      path.join(process.env.ProgramFiles || '', 'nodejs', 'node.exe'),
      path.join(process.env['ProgramFiles(x86)'] || '', 'nodejs', 'node.exe'),
      path.join(process.env.APPDATA || '', 'nvm', 'node.exe'),
    ];
  }

  return [
    process.env.MCP_DESKTOP_AUTOMATION_NODE,
    path.join(home, '.local', 'nodejs', 'node-v22.14.0-linux-x64', 'bin', 'node'),
    path.join(home, '.local', 'nodejs', 'node-v20.18.0-linux-x64', 'bin', 'node'),
    path.join(home, '.nvm', 'versions', 'node', 'current', 'bin', 'node'),
    '/usr/local/bin/node',
    '/usr/bin/node',
    '/opt/homebrew/bin/node',
  ];
}

function findCompatibleNode() {
  var candidates = [];
  var seen = Object.create(null);

  addCandidate(candidates, seen, process.env.MCP_DESKTOP_AUTOMATION_NODE);
  addCandidate(candidates, seen, process.execPath);
  getPathCandidates().forEach(function (candidate) {
    addCandidate(candidates, seen, candidate);
  });
  getWellKnownCandidates().forEach(function (candidate) {
    addCandidate(candidates, seen, candidate);
  });

  for (var index = 0; index < candidates.length; index += 1) {
    if (isCompatibleNode(candidates[index])) {
      return candidates[index];
    }
  }

  return null;
}

function main() {
  var currentMajor = parseMajor(process.versions && process.versions.node);
  var nodePath = currentMajor >= MIN_NODE_MAJOR ? process.execPath : findCompatibleNode();

  if (!nodePath) {
    console.error('Could not find a compatible Node.js runtime (>=18).');
    console.error('Set MCP_DESKTOP_AUTOMATION_NODE or install Node.js >=18.');
    process.exit(1);
  }

  var child = childProcess.spawn(nodePath, [SERVER_JS].concat(process.argv.slice(2)), {
    cwd: SCRIPT_DIR,
    env: process.env,
    stdio: 'inherit',
  });

  child.on('exit', function (code, signal) {
    if (signal) {
      process.kill(process.pid, signal);
      return;
    }

    process.exit(code || 0);
  });

  child.on('error', function (error) {
    console.error('Failed to start server:', error.message);
    process.exit(1);
  });
}

main();