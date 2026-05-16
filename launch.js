#!/usr/bin/env node

'use strict';

var childProcess = require('child_process');
var fs = require('fs');
var os = require('os');
var path = require('path');

var MIN_NODE_MAJOR = 18;
var SCRIPT_DIR = __dirname;
var SERVER_JS = path.join(SCRIPT_DIR, 'server.js');

function getPathModule(platform) {
  return platform === 'win32' ? path.win32 : path.posix;
}

function parseMajor(version) {
  var match = String(version || '').match(/v?(\d+)/);
  return match ? Number(match[1]) : 0;
}

function isCompatibleNode(nodePath, existsSync, execFileSync) {
  if (!nodePath || !existsSync(nodePath)) {
    return false;
  }

  try {
    var output = execFileSync(nodePath, ['-p', 'process.versions.node'], {
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

function getPathCandidates(env, platform) {
  var candidates = [];
  var pathModule = getPathModule(platform);
  var pathParts = String((env && env.PATH) || '').split(pathModule.delimiter);
  var names = platform === 'win32' ? ['node.exe', 'node.cmd', 'nodejs.exe'] : ['node', 'nodejs'];

  pathParts.forEach(function (entry) {
    if (!entry) {
      return;
    }

    names.forEach(function (name) {
      candidates.push(pathModule.join(entry, name));
    });
  });

  return candidates;
}

function expandVersionedNodePaths(baseDir, suffixParts, readdirSync, pathModule) {
  if (!baseDir) {
    return [];
  }

  try {
    return readdirSync(baseDir, { withFileTypes: true })
      .filter(function (entry) {
        return entry.isDirectory() && /^node-v/i.test(entry.name);
      })
      .map(function (entry) {
        return pathModule.join.apply(pathModule, [baseDir, entry.name].concat(suffixParts));
      });
  } catch (_error) {
    return [];
  }
}

function getWellKnownCandidates(options) {
  var env = options.env || process.env;
  var platform = options.platform || process.platform;
  var homedir = options.homedir || os.homedir;
  var readdirSync = options.readdirSync || fs.readdirSync;
  var pathModule = getPathModule(platform);
  var home = homedir();

  if (platform === 'win32') {
    return [
      env.MCP_DESKTOP_AUTOMATION_NODE,
      pathModule.join(env.LOCALAPPDATA || '', 'nodejs', 'node.exe'),
      pathModule.join(env.ProgramFiles || '', 'nodejs', 'node.exe'),
      pathModule.join(env['ProgramFiles(x86)'] || '', 'nodejs', 'node.exe'),
      pathModule.join(env.APPDATA || '', 'nvm', 'node.exe'),
      pathModule.join(env.NVS_HOME || '', 'default', 'node.exe'),
    ].concat(
      expandVersionedNodePaths(
        pathModule.join(home, '.asdf', 'installs', 'nodejs'),
        ['bin', 'node.exe'],
        readdirSync,
        pathModule,
      ),
    );
  }

  return [
    env.MCP_DESKTOP_AUTOMATION_NODE,
    '/usr/local/bin/node',
    '/usr/bin/node',
    '/opt/homebrew/bin/node',
  ]
    .concat(expandVersionedNodePaths(pathModule.join(home, '.local', 'nodejs'), ['bin', 'node'], readdirSync, pathModule))
    .concat(
      expandVersionedNodePaths(pathModule.join(home, '.nvm', 'versions', 'node'), ['bin', 'node'], readdirSync, pathModule),
    )
    .concat(
      expandVersionedNodePaths(pathModule.join(home, '.asdf', 'installs', 'nodejs'), ['bin', 'node'], readdirSync, pathModule),
    );
}

function findCompatibleNode(options) {
  var env = (options && options.env) || process.env;
  var platform = (options && options.platform) || process.platform;
  var execPath = (options && options.execPath) || process.execPath;
  var existsSync = (options && options.existsSync) || fs.existsSync;
  var execFileSync = (options && options.execFileSync) || childProcess.execFileSync;
  var candidates = [];
  var seen = Object.create(null);

  function compatible(pathToNode) {
    return isCompatibleNode(pathToNode, existsSync, execFileSync);
  }

  addCandidate(candidates, seen, env.MCP_DESKTOP_AUTOMATION_NODE);
  addCandidate(candidates, seen, execPath);
  getPathCandidates(env, platform).forEach(function (candidate) {
    addCandidate(candidates, seen, candidate);
  });
  getWellKnownCandidates(options || {}).forEach(function (candidate) {
    addCandidate(candidates, seen, candidate);
  });

  for (var index = 0; index < candidates.length; index += 1) {
    if (compatible(candidates[index])) {
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

if (require.main === module) {
  main();
}

module.exports = {
  findCompatibleNode,
  getPathCandidates,
  getWellKnownCandidates,
  parseMajor,
};