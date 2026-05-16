const test = require('node:test');
const assert = require('node:assert/strict');

const { getPackCommand, getWindowsShell } = require('../../scripts/check-package-contents');

test('package check invokes npm directly on non-Windows platforms', () => {
  assert.deepEqual(getPackCommand('linux', {}), {
    command: 'npm',
    args: ['pack', '--json', '--dry-run'],
  });
});

test('package check invokes npm through cmd on Windows', () => {
  assert.deepEqual(getPackCommand('win32', { ComSpec: 'C:\\Windows\\System32\\cmd.exe' }), {
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
