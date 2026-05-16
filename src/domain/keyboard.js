const { AutomationError, ErrorCodes } = require('./errors');

const KEY_ALIASES = {
  esc: 'escape',
  return: 'enter',
  del: 'delete',
  ins: 'insert',
  pgup: 'pageup',
  page_up: 'pageup',
  pgdn: 'pagedown',
  page_down: 'pagedown',
  spacebar: 'space',
};

const MODIFIER_ALIASES = {
  control: 'control',
  ctrl: 'control',
  ctl: 'control',
  shift: 'shift',
  alt: 'alt',
  option: 'alt',
  command: 'command',
  cmd: 'command',
  meta: 'command',
  super: 'command',
  win: 'command',
  windows: 'command',
};

const SUPPORTED_NAMED_KEYS = new Set([
  'backspace',
  'command',
  'control',
  'delete',
  'down',
  'end',
  'enter',
  'escape',
  'home',
  'insert',
  'left',
  'alt',
  'pagedown',
  'pageup',
  'right',
  'shift',
  'space',
  'tab',
  'up',
]);

function getPrimaryModifier(platform) {
  return platform === 'darwin' ? 'command' : 'control';
}

function normalizeKey(key, platform) {
  const normalized = String(key || '').trim().toLowerCase();
  const aliased = normalized === 'primary'
    ? getPrimaryModifier(platform || process.platform)
    : KEY_ALIASES[normalized] || MODIFIER_ALIASES[normalized] || normalized;

  if (/^[a-z0-9]$/.test(aliased) || /^f([1-9]|1[0-2])$/.test(aliased) || SUPPORTED_NAMED_KEYS.has(aliased)) {
    return aliased;
  }

  throw new AutomationError(ErrorCodes.UNSUPPORTED_KEY, `Unsupported key: ${key}.`, {
    key,
  });
}

function normalizeModifiers(modifiers, platform) {
  const primaryModifier = getPrimaryModifier(platform);
  const seen = new Set();

  return (modifiers || []).map((modifier) => String(modifier || '').trim().toLowerCase()).reduce((result, modifier) => {
    const resolved = modifier === 'primary' ? primaryModifier : MODIFIER_ALIASES[modifier];

    if (!resolved) {
      throw new AutomationError(ErrorCodes.UNSUPPORTED_KEY, `Unsupported modifier: ${modifier}.`, {
        modifier,
      });
    }

    if (!seen.has(resolved)) {
      seen.add(resolved);
      result.push(resolved);
    }

    return result;
  }, []);
}

function getKeyboardCompatibility(platform) {
  return {
    primaryModifier: getPrimaryModifier(platform),
    keyAliases: Object.assign({}, KEY_ALIASES),
    modifierAliases: Object.assign({ primary: getPrimaryModifier(platform) }, MODIFIER_ALIASES),
  };
}

module.exports = {
  getKeyboardCompatibility,
  normalizeKey,
  normalizeModifiers,
};
