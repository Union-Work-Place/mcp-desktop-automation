#!/usr/bin/env node

'use strict';

var childProcess = require('child_process');
var path = require('path');

var SCRIPT_DIR = __dirname;
var PROJECT_ROOT = path.resolve(SCRIPT_DIR, '..');
var launchHelpers = require('../launch');

function main() {
  var currentMajor = launchHelpers.parseMajor(process.versions && process.versions.node);
  var nodePath = currentMajor >= 18 ? process.execPath : launchHelpers.findCompatibleNode();
  var args = process.argv.slice(2);

  if (!nodePath) {
    console.error('Could not find a compatible Node.js runtime (>=18).');
    process.exit(1);
  }

  if (args.length === 0) {
    console.error('Missing node arguments to execute.');
    process.exit(1);
  }

  var child = childProcess.spawn(nodePath, args, {
    cwd: PROJECT_ROOT,
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
    console.error('Failed to start process:', error.message);
    process.exit(1);
  });
}

if (require.main === module) {
  main();
}

module.exports = {
  main,
};