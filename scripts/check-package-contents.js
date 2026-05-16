#!/usr/bin/env node

'use strict';

var childProcess = require('child_process');
var path = require('path');

var PROJECT_ROOT = path.resolve(__dirname, '..');
var npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';

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
  var output = childProcess.execFileSync(
    npmCommand,
    ['pack', '--json', '--dry-run'],
    { cwd: PROJECT_ROOT, encoding: 'utf8' },
  );
  var packResult = JSON.parse(output)[0];

  validate(packResult.files);
  process.stdout.write('Package validation passed for ' + packResult.filename + '\n');
}

main();
