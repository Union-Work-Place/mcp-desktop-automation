#!/usr/bin/env node

'use strict';

var childProcess = require('child_process');
var fs = require('fs');
var path = require('path');

var PROJECT_ROOT = path.resolve(__dirname, '..');

function resolveNpmCli() {
  var execDir = path.dirname(process.execPath);
  var candidates = process.platform === 'win32'
    ? [
        path.resolve(execDir, 'node_modules', 'npm', 'bin', 'npm-cli.js'),
        path.resolve(execDir, '..', 'node_modules', 'npm', 'bin', 'npm-cli.js'),
      ]
    : [
        path.resolve(execDir, '..', 'lib', 'node_modules', 'npm', 'bin', 'npm-cli.js'),
        path.resolve(execDir, '..', 'node_modules', 'npm', 'bin', 'npm-cli.js'),
      ];

  for (var index = 0; index < candidates.length; index += 1) {
    if (fs.existsSync(candidates[index])) {
      return candidates[index];
    }
  }

  throw new Error('Unable to locate npm-cli.js for package validation.');
}

function validate(files) {
  var names = files.map(function (file) {
    return file.path;
  });
  var required = ['launch.js', 'launch.cmd', 'launch.sh', 'server.js', 'README.md', 'LICENSE'];
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
  var npmCli = resolveNpmCli();
  var output = childProcess.execFileSync(
    process.execPath,
    [npmCli, 'pack', '--json', '--dry-run'],
    { cwd: PROJECT_ROOT, encoding: 'utf8' },
  );
  var packResult = JSON.parse(output)[0];

  validate(packResult.files);
  process.stdout.write('Package validation passed for ' + packResult.filename + '\n');
}

main();