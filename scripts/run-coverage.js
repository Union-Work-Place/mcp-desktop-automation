#!/usr/bin/env node

'use strict';

var childProcess = require('child_process');
var fs = require('fs');
var path = require('path');

var PROJECT_ROOT = path.resolve(__dirname, '..');
var c8Bin = path.join(PROJECT_ROOT, 'node_modules', 'c8', 'bin', 'c8.js');
var TEST_ROOT = path.join(PROJECT_ROOT, 'test');

function collectTestFiles(dirPath) {
  var entries = [];

  try {
    entries = fs.readdirSync(dirPath, { withFileTypes: true });
  } catch (_error) {
    return [];
  }

  return entries
    .sort(function (left, right) {
      return left.name.localeCompare(right.name);
    })
    .reduce(function (result, entry) {
      var entryPath = path.join(dirPath, entry.name);

      if (entry.isDirectory()) {
        return result.concat(collectTestFiles(entryPath));
      }

      if (/\.test\.js$/.test(entry.name)) {
        result.push(path.relative(PROJECT_ROOT, entryPath));
      }

      return result;
    }, []);
}

var testFiles = collectTestFiles(TEST_ROOT);

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
  ].concat(testFiles),
  
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
