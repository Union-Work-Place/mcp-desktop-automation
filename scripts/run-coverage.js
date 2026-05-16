#!/usr/bin/env node

'use strict';

var childProcess = require('child_process');
var path = require('path');

var PROJECT_ROOT = path.resolve(__dirname, '..');
var c8Bin = path.join(PROJECT_ROOT, 'node_modules', 'c8', 'bin', 'c8.js');

var child = childProcess.spawn(
  process.execPath,
  [
    c8Bin,
    '--reporter=text',
    '--reporter=lcov',
    '--report-dir',
    'coverage',
    '--all',
    '--src',
    'src',
    process.execPath,
    '--test',
    'test/**/*.test.js',
  ],
  {
    cwd: PROJECT_ROOT,
    env: process.env,
    stdio: 'inherit',
  },
);

child.on('exit', function (code, signal) {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }

  process.exit(code || 0);
});

child.on('error', function (error) {
  console.error('Failed to run coverage:', error.message);
  process.exit(1);
});