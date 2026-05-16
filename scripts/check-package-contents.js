#!/usr/bin/env node

'use strict';

var childProcess = require('child_process');
var fs = require('fs');
var path = require('path');

var PROJECT_ROOT = path.resolve(__dirname, '..');

function resolveNpmCli(platform, nodePath, existsSync) {
  var currentNodePath = nodePath || process.execPath;
  var fileExists = existsSync || fs.existsSync;
  var pathModule = platform === 'win32' ? path.win32 : path.posix;
  var execDir = pathModule.dirname(currentNodePath);
  var candidates = platform === 'win32'
    ? [
        pathModule.resolve(execDir, 'node_modules', 'npm', 'bin', 'npm-cli.js'),
        pathModule.resolve(execDir, '..', 'node_modules', 'npm', 'bin', 'npm-cli.js'),
      ]
    : [
        pathModule.resolve(execDir, '..', 'lib', 'node_modules', 'npm', 'bin', 'npm-cli.js'),
        pathModule.resolve(execDir, '..', 'node_modules', 'npm', 'bin', 'npm-cli.js'),
      ];

  for (var index = 0; index < candidates.length; index += 1) {
    if (fileExists(candidates[index])) {
      return candidates[index];
    }
  }

  return null;
}

function getWindowsShell(env) {
  if (env && env.ComSpec) {
    return env.ComSpec;
  }

  if (env && env.SystemRoot) {
    return path.win32.join(env.SystemRoot, 'System32', 'cmd.exe');
  }

  return 'C:\\Windows\\System32\\cmd.exe';
}

function getPackCommand(platform, env, options) {
  var runtimeOptions = options || {};
  var nodePath = runtimeOptions.nodePath || process.execPath;
  var npmCli = resolveNpmCli(platform, nodePath, runtimeOptions.existsSync);

  if (npmCli) {
    return {
      command: nodePath,
      args: [npmCli, 'pack', '--json', '--dry-run'],
    };
  }

  if (platform === 'win32') {
    return {
      command: getWindowsShell(env),
      args: ['/d', '/s', '/c', 'npm pack --json --dry-run'],
    };
  }

  return {
    command: 'npm',
    args: ['pack', '--json', '--dry-run'],
  };
}

function validate(files) {
  var names = files.map(function (file) {
    return file.path;
  });
  var required = ['launch.js', 'launch.cmd', 'launch.sh', 'server.js', 'README.md', 'CHANGELOG.md', 'LICENSE'];
  var forbiddenPrefixes = ['coverage/', 'test/', '.vscode/'];

  required.forEach(function (requiredPath) {
    if (!names.includes(requiredPath)) {
      throw new Error('Missing required packaged file: ' + requiredPath);
    }
  });

  if (!names.some(function (name) { return name.indexOf('src/') === 0; })) {
    throw new Error('Packaged tarball does not include src/.');
  }

  names.forEach(function (name) {
    forbiddenPrefixes.forEach(function (prefix) {
      if (name.indexOf(prefix) === 0) {
        throw new Error('Forbidden file present in package: ' + name);
      }
    });
  });
}

function main() {
  var packCommand = getPackCommand(process.platform, process.env, { nodePath: process.execPath });
  var output = childProcess.execFileSync(
    packCommand.command,
    packCommand.args,
    { cwd: PROJECT_ROOT, encoding: 'utf8' },
  );
  var packResult = JSON.parse(output)[0];

  validate(packResult.files);
  process.stdout.write('Package validation passed for ' + packResult.filename + '\n');
}

if (require.main === module) {
  main();
}

module.exports = {
  getPackCommand,
  getWindowsShell,
  main,
  resolveNpmCli,
  validate,
};
