/**
 * yaml-writer.js — Convert JavaScript values to YAML strings
 */

/**
 * @typedef {Object} YamlWriterOptions
 * @property {number} [indent=2] - Spaces per indentation level
 * @property {number} [lineWidth=80] - Soft wrap width for folded strings
 */

const SPECIAL_STRINGS = new Set([
  'null', '~', 'true', 'false', 'yes', 'no', 'on', 'off', '',
  '.inf', '-.inf', '.nan',
]);

/** Characters that require quoting a string when they appear at the start */
const UNSAFE_START = /^[\[{\|\>*&!%@`'"?,:-]/;

/** A YAML scalar that needs quoting */
function needsQuoting(str) {
  if (SPECIAL_STRINGS.has(str.toLowerCase())) return true;
  if (UNSAFE_START.test(str)) return true;
  // Contains characters that are dangerous inside a plain scalar
  if (/[:#\[\]{},]/.test(str)) return true;
  // Looks like a number
  if (/^-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?$/.test(str)) return true;
  if (/^0x[0-9a-fA-F]+$/i.test(str)) return true;
  if (/^0o[0-7]+$/i.test(str)) return true;
  // Leading/trailing whitespace
  if (str !== str.trim()) return true;
  return false;
}

/**
 * Escape a string value for use in double-quoted YAML.
 * @param {string} str
 * @returns {string}
 */
function escapeDoubleQuoted(str) {
  return str
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r')
    .replace(/\t/g, '\\t')
    .replace(/[\x00-\x1f\x7f]/g, (ch) => {
      const code = ch.charCodeAt(0);
      return `\\u${code.toString(16).padStart(4, '0')}`;
    });
}

/**
 * Serialize a scalar value to YAML.
 * @param {*} value
 * @returns {string}
 */
function serializeScalar(value) {
  if (value === null || value === undefined) return 'null';
  if (typeof value === 'boolean') return String(value);
  if (typeof value === 'number') {
    if (!isFinite(value)) return value > 0 ? '.inf' : '-.inf';
    if (isNaN(value)) return '.nan';
    return String(value);
  }
  if (typeof value === 'string') {
    if (value.includes('\n')) {
      // Use literal block scalar
      return null; // Handled by the caller for block scalars
    }
    if (needsQuoting(value)) {
      return `"${escapeDoubleQuoted(value)}"`;
    }
    return value;
  }
  return String(value);
}

/**
 * Convert a JS value to a YAML string.
 * @param {*} obj
 * @param {YamlWriterOptions} [options]
 * @returns {string}
 */
export function toYaml(obj, options = {}) {
  const indentSize = options.indent ?? 2;
  const pad = ' '.repeat(indentSize);

  function stringify(value, depth, inlineKey) {
    const currentPad = pad.repeat(depth);

    if (value === null || value === undefined) {
      return 'null';
    }

    if (Array.isArray(value)) {
      if (value.length === 0) return '[]';
      const lines = value.map((item) => {
        const rendered = stringify(item, depth + 1, false);
        if (typeof item === 'object' && item !== null && !Array.isArray(item) && Object.keys(item).length > 0) {
          // The object was rendered as multi-line; the first line is already indented by depth+1
          // We need to de-indent the first key and re-indent with '- '
          const innerLines = rendered.split('\n');
          const firstLine = innerLines[0];
          // firstLine is already at depth+1 indentation
          const stripped = firstLine.slice((depth + 1) * indentSize);
          const rest = innerLines.slice(1).join('\n');
          return `${currentPad}- ${stripped}${rest ? '\n' + rest : ''}`;
        }
        if (Array.isArray(item) && item.length > 0) {
          const innerLines = rendered.split('\n');
          const firstLine = innerLines[0];
          const stripped = firstLine.slice((depth + 1) * indentSize);
          const rest = innerLines.slice(1).join('\n');
          return `${currentPad}- ${stripped}${rest ? '\n' + rest : ''}`;
        }
        return `${currentPad}- ${rendered}`;
      });
      return lines.join('\n');
    }

    if (typeof value === 'object') {
      const keys = Object.keys(value);
      if (keys.length === 0) return '{}';
      const lines = keys.map((key) => {
        const safeKey = needsQuoting(key) ? `"${escapeDoubleQuoted(key)}"` : key;
        const child = value[key];

        if (typeof child === 'string' && child.includes('\n')) {
          // Block scalar
          const blockLines = child.split('\n');
          // Determine chomping: if ends with \n, clip; otherwise strip
          const chomping = child.endsWith('\n') ? '' : '-';
          const bodyLines = child.endsWith('\n') ? blockLines.slice(0, -1) : blockLines;
          const indented = bodyLines.map((l) => `${currentPad}${pad}${l}`).join('\n');
          return `${currentPad}${safeKey}: |${chomping}\n${indented}`;
        }

        if (Array.isArray(child)) {
          if (child.length === 0) return `${currentPad}${safeKey}: []`;
          const rendered = stringify(child, depth + 1, true);
          return `${currentPad}${safeKey}:\n${rendered}`;
        }

        if (typeof child === 'object' && child !== null) {
          if (Object.keys(child).length === 0) return `${currentPad}${safeKey}: {}`;
          const rendered = stringify(child, depth + 1, true);
          return `${currentPad}${safeKey}:\n${rendered}`;
        }

        const scalar = serializeScalar(child);
        return `${currentPad}${safeKey}: ${scalar}`;
      });
      return lines.join('\n');
    }

    // Primitive scalar
    if (typeof value === 'string' && value.includes('\n')) {
      const chomping = value.endsWith('\n') ? '' : '-';
      const bodyLines = value.endsWith('\n') ? value.slice(0, -1).split('\n') : value.split('\n');
      const indented = bodyLines.map((l) => `${currentPad}${l}`).join('\n');
      return `|${chomping}\n${indented}`;
    }

    const scalar = serializeScalar(value);
    return scalar;
  }

  const result = stringify(obj, 0, false);
  return result + '\n';
}
