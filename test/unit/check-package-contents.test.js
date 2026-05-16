const test = require('node:test');
const assert = require('node:assert/strict');

const { getPackCommand, getWindowsShell } = require('../../scripts/check-package-contents');

test('package check prefers bundled npm-cli on non-Windows platforms when available', () => {
  assert.deepEqual(getPackCommand('linux', {}, {
    nodePath: '/opt/node/bin/node',
    existsSync(candidate) {
      return candidate === '/opt/node/lib/node_modules/npm/bin/npm-cli.js';
    },
  }), {
    command: '/opt/node/bin/node',
    args: ['/opt/node/lib/node_modules/npm/bin/npm-cli.js', 'pack', '--json', '--dry-run'],
  });
});

test('package check falls back to npm directly on non-Windows platforms', () => {
  assert.deepEqual(getPackCommand('linux', {}, {
    nodePath: '/opt/node/bin/node',
    existsSync() {
      return false;
    },
  }), {
    command: 'npm',
    args: ['pack', '--json', '--dry-run'],
  });
});

test('package check invokes bundled npm-cli with current node on Windows when available', () => {
  assert.deepEqual(getPackCommand('win32', { ComSpec: 'C:\\Windows\\System32\\cmd.exe' }, {
    nodePath: 'C:\\node\\node.exe',
    existsSync(candidate) {
      return candidate === 'C:\\node\\node_modules\\npm\\bin\\npm-cli.js';
    },
  }), {
    command: 'C:\\node\\node.exe',
    args: ['C:\\node\\node_modules\\npm\\bin\\npm-cli.js', 'pack', '--json', '--dry-run'],
  });
});

test('package check invokes npm through cmd on Windows as fallback', () => {
  assert.deepEqual(getPackCommand('win32', { ComSpec: 'C:\\Windows\\System32\\cmd.exe' }, {
    existsSync() {
      return false;
    },
  }), {
    command: 'C:\\Windows\\System32\\cmd.exe',
    args: ['/d', '/s', '/c', 'npm pack --json --dry-run'],
  });
});

test('package check falls back to SystemRoot for Windows shell resolution', () => {
  assert.equal(
    getWindowsShell({ SystemRoot: 'C:\\Windows' }),
    'C:\\Windows\\System32\\cmd.exe',
  );
});
