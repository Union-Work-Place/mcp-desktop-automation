const test = require('node:test');
const assert = require('node:assert/strict');

const {
  SHIFTED_PUNCTUATION_KEYS,
  getKeyboardCompatibility,
  normalizeKey,
  normalizeModifiers,
  planTextKeystrokes,
} = require('../../src/domain/keyboard');
const { findCompatibleNode, getWellKnownCandidates } = require('../../launch');

test('keyboard aliases normalize across platforms', () => {
  assert.equal(normalizeKey('Esc'), 'escape');
  assert.equal(normalizeKey('return'), 'enter');
  assert.equal(normalizeKey('cmd'), 'command');
  assert.equal(normalizeKey('option'), 'alt');
  assert.equal(normalizeKey('primary', 'darwin'), 'command');
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

test('keyboard normalization accepts punctuation and special keys', () => {
  assert.equal(normalizeKey('minus'), 'minus');
  assert.equal(normalizeKey('equal'), 'equal');
  assert.equal(normalizeKey('bracket_left'), 'bracket_left');
  assert.equal(normalizeKey('bracket_right'), 'bracket_right');
  assert.equal(normalizeKey('backslash'), 'backslash');
  assert.equal(normalizeKey('semicolon'), 'semicolon');
  assert.equal(normalizeKey('quote'), 'quote');
  assert.equal(normalizeKey('grave'), 'grave');
  assert.equal(normalizeKey('comma'), 'comma');
  assert.equal(normalizeKey('period'), 'period');
  assert.equal(normalizeKey('slash'), 'slash');
  assert.equal(normalizeKey('print_screen'), 'print_screen');
  assert.equal(normalizeKey('scroll_lock'), 'scroll_lock');
  assert.equal(normalizeKey('num0'), 'num0');
  assert.equal(normalizeKey('num9'), 'num9');
  assert.equal(normalizeKey('numpad_0'), 'numpad_0');
  assert.equal(normalizeKey('numpad_add'), 'numpad_add');
  assert.equal(normalizeKey('numpad_subtract'), 'numpad_subtract');
  assert.equal(normalizeKey('numpad_multiply'), 'numpad_multiply');
  assert.equal(normalizeKey('numpad_divide'), 'numpad_divide');
  assert.equal(normalizeKey('numpad_enter'), 'numpad_enter');
  assert.equal(normalizeKey('numpad_decimal'), 'numpad_decimal');
  assert.equal(normalizeKey('numpad_equals'), 'numpad_equals');
  assert.equal(normalizeKey('numpad_lock'), 'numpad_lock');
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

test('keyboard normalization accepts literal punctuation characters', () => {
  assert.equal(normalizeKey('-'), 'minus');
  assert.equal(normalizeKey('='), 'equal');
  assert.equal(normalizeKey('['), 'bracket_left');
  assert.equal(normalizeKey(']'), 'bracket_right');
  assert.equal(normalizeKey('\\'), 'backslash');
  assert.equal(normalizeKey(';'), 'semicolon');
  assert.equal(normalizeKey('\''), 'quote');
  assert.equal(normalizeKey(','), 'comma');
  assert.equal(normalizeKey('.'), 'period');
  assert.equal(normalizeKey('/'), 'slash');
  assert.equal(normalizeKey('`'), 'grave');
  assert.equal(normalizeKey(' '), 'space');
});

test('planTextKeystrokes handles empty and non-linux inputs', () => {
  assert.deepEqual(planTextKeystrokes('', 'linux'), []);
  assert.deepEqual(planTextKeystrokes(null, 'linux'), []);
  assert.deepEqual(planTextKeystrokes('echo hello && bye', 'win32'), [
    { type: 'typeString', text: 'echo hello && bye' },
  ]);
  assert.deepEqual(planTextKeystrokes('echo hello && bye', 'darwin'), [
    { type: 'typeString', text: 'echo hello && bye' },
  ]);
});

test('planTextKeystrokes plans shifted punctuation on Linux for issue #11 command', () => {
  const input = 'mkdir -p /tmp/gui_smoke && cd /home/hospi/projects/smart_flower_pot/builds/debug';
  const plan = planTextKeystrokes(input, 'linux');

  assert.deepEqual(plan, [
    { type: 'typeString', text: 'mkdir -p /tmp/gui' },
    { type: 'keyTap', key: '-', modifiers: ['shift'], raw: '_' },
    { type: 'typeString', text: 'smoke ' },
    { type: 'keyTap', key: '7', modifiers: ['shift'], raw: '&' },
    { type: 'keyTap', key: '7', modifiers: ['shift'], raw: '&' },
    { type: 'typeString', text: ' cd /home/hospi/projects/smart' },
    { type: 'keyTap', key: '-', modifiers: ['shift'], raw: '_' },
    { type: 'typeString', text: 'flower' },
    { type: 'keyTap', key: '-', modifiers: ['shift'], raw: '_' },
    { type: 'typeString', text: 'pot/builds/debug' },
  ]);
});

test('planTextKeystrokes covers all shifted punctuation characters on Linux', () => {
  const allShifted = Object.keys(SHIFTED_PUNCTUATION_KEYS).join('');
  const plan = planTextKeystrokes(allShifted, 'linux');

  assert.equal(plan.length, Object.keys(SHIFTED_PUNCTUATION_KEYS).length);
  for (let i = 0; i < plan.length; i++) {
    const ch = allShifted[i];
    assert.deepEqual(plan[i], {
      type: 'keyTap',
      key: SHIFTED_PUNCTUATION_KEYS[ch],
      modifiers: ['shift'],
      raw: ch,
    });
  }
});
