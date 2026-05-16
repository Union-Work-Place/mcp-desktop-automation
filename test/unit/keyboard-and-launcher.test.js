const test = require('node:test');
const assert = require('node:assert/strict');

const { getKeyboardCompatibility, normalizeKey, normalizeModifiers } = require('../../src/domain/keyboard');
const { findCompatibleNode, getWellKnownCandidates } = require('../../launch');

test('keyboard aliases normalize across platforms', () => {
  assert.equal(normalizeKey('Esc'), 'escape');
  assert.equal(normalizeKey('return'), 'enter');
  assert.deepEqual(normalizeModifiers(['ctrl', 'primary', 'cmd'], 'win32'), ['control', 'command']);
  assert.deepEqual(normalizeModifiers(['primary', 'option'], 'darwin'), ['command', 'alt']);

  const compatibility = getKeyboardCompatibility('darwin');
  assert.equal(compatibility.primaryModifier, 'command');
  assert.equal(compatibility.modifierAliases.primary, 'command');
});

test('keyboard normalization rejects unsupported values', () => {
  assert.throws(() => normalizeKey('capslock'), /Unsupported key/i);
  assert.throws(() => normalizeModifiers(['hyper'], 'linux'), /Unsupported modifier/i);
});

test('launcher discovers versioned unix runtimes without hardcoded versions', () => {
  const nodePath = findCompatibleNode({
    env: { PATH: '' },
    platform: 'linux',
    execPath: '/usr/bin/node-old',
    homedir: () => '/home/test',
    readdirSync(baseDir) {
      if (baseDir === '/home/test/.local/nodejs') {
        return [
          { name: 'node-v18.20.0-linux-x64', isDirectory: () => true },
          { name: 'node-v22.0.0-linux-x64', isDirectory: () => true },
        ];
      }

      return [];
    },
    existsSync(candidate) {
      return candidate === '/home/test/.local/nodejs/node-v22.0.0-linux-x64/bin/node';
    },
    execFileSync(candidate) {
      if (candidate === '/home/test/.local/nodejs/node-v22.0.0-linux-x64/bin/node') {
        return '22.0.0';
      }

      throw new Error('not compatible');
    },
  });

  assert.equal(nodePath, '/home/test/.local/nodejs/node-v22.0.0-linux-x64/bin/node');
});

test('launcher includes common Windows runtime locations', () => {
  const candidates = getWellKnownCandidates({
    env: {
      MCP_DESKTOP_AUTOMATION_NODE: 'C:\\custom\\node.exe',
      LOCALAPPDATA: 'C:\\Users\\alice\\AppData\\Local',
      ProgramFiles: 'C:\\Program Files',
      'ProgramFiles(x86)': 'C:\\Program Files (x86)',
      APPDATA: 'C:\\Users\\alice\\AppData\\Roaming',
      NVS_HOME: 'C:\\nvs',
    },
    platform: 'win32',
    homedir: () => 'C:\\Users\\alice',
    readdirSync() {
      return [];
    },
  });

  assert.ok(candidates.includes('C:\\custom\\node.exe'));
  assert.ok(candidates.includes('C:\\Program Files\\nodejs\\node.exe'));
  assert.ok(candidates.includes('C:\\nvs\\default\\node.exe'));
});