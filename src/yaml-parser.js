/**
 * yaml-parser.js — YAML subset parser
 * Supports: scalars, quoted strings, lists, maps, nested structures,
 * block scalars (| and >), comments, YAML 1.2 types
 */

export class YamlParseError extends Error {
  constructor(message, line) {
    super(message);
    this.name = 'YamlParseError';
    this.line = line;
  }
}

/**
 * Detect the type of a raw scalar string value.
 * @param {string} value
 * @returns {'null'|'boolean'|'number'|'string'}
 */
export function detectType(value) {
  if (value === 'null' || value === '~' || value === '') return 'null';
  if (value === 'true' || value === 'false' ||
      value === 'yes' || value === 'no' ||
      value === 'on' || value === 'off') return 'boolean';
  if (/^-?(?:0|[1-9]\d*)$/.test(value)) return 'number';
  if (/^-?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?$/.test(value)) return 'number';
  if (/^0x[0-9a-fA-F]+$/.test(value)) return 'number';
  if (/^0o[0-7]+$/.test(value)) return 'number';
  if (value === '.inf' || value === '-.inf' || value === '.nan') return 'number';
  return 'string';
}

/**
 * Convert a raw scalar string to its JS value.
 * @param {string} value
 * @returns {null|boolean|number|string}
 */
export function parseLine(value) {
  const type = detectType(value);
  if (type === 'null') return null;
  if (type === 'boolean') {
    return value === 'true' || value === 'yes' || value === 'on';
  }
  if (type === 'number') {
    if (value === '.inf') return Infinity;
    if (value === '-.inf') return -Infinity;
    if (value === '.nan') return NaN;
    if (/^0x/i.test(value)) return parseInt(value, 16);
    if (/^0o/i.test(value)) return parseInt(value.slice(2), 8);
    return Number(value);
  }
  return value;
}

/**
 * Strip a trailing comment from a value token (outside of quotes).
 * @param {string} token
 * @returns {string}
 */
function stripComment(token) {
  let inSingle = false;
  let inDouble = false;
  for (let i = 0; i < token.length; i++) {
    const ch = token[i];
    if (ch === "'" && !inDouble) { inSingle = !inSingle; continue; }
    if (ch === '"' && !inSingle) { inDouble = !inDouble; continue; }
    if (!inSingle && !inDouble && ch === '#' && (i === 0 || token[i - 1] === ' ')) {
      return token.slice(0, i).trimEnd();
    }
  }
  return token;
}

/**
 * Parse a quoted string (single or double).
 * @param {string} raw — includes opening and closing quote
 * @param {number} lineNum
 * @returns {string}
 */
function parseQuotedString(raw, lineNum) {
  const quote = raw[0];
  if (raw[raw.length - 1] !== quote) {
    throw new YamlParseError(`Unterminated quoted string`, lineNum);
  }
  const inner = raw.slice(1, -1);
  if (quote === "'") {
    // Single-quoted: escape '' → '
    return inner.replace(/''/g, "'");
  }
  // Double-quoted: process escape sequences
  return inner.replace(/\\(["\\\/bfnrt]|u[0-9a-fA-F]{4}|n|r|t|0)/g, (_, esc) => {
    const map = { '"': '"', '\\': '\\', '/': '/', b: '\b', f: '\f', n: '\n', r: '\r', t: '\t', '0': '\0' };
    if (esc[0] === 'u') return String.fromCharCode(parseInt(esc.slice(1), 16));
    return map[esc] ?? esc;
  });
}

/**
 * Parse a scalar token: quoted or unquoted.
 * @param {string} token
 * @param {number} lineNum
 * @returns {*}
 */
function parseScalar(token, lineNum) {
  token = token.trim();
  if (token === '') return null;
  if ((token[0] === '"' || token[0] === "'")) {
    return parseQuotedString(token, lineNum);
  }
  // Strip trailing comment for unquoted values
  const cleaned = stripComment(token).trim();
  return parseLine(cleaned);
}

// ---------------------------------------------------------------------------
// Tokeniser / line-based parser
// ---------------------------------------------------------------------------

/** Measure the indentation (number of leading spaces) of a line. */
function indent(line) {
  let i = 0;
  while (i < line.length && line[i] === ' ') i++;
  return i;
}

/** Returns true if the line is empty or comment-only. */
function isBlankOrComment(line) {
  const trimmed = line.trimStart();
  return trimmed === '' || trimmed[0] === '#';
}

/**
 * Find the matching closing quote, handling escapes.
 * Returns the index one past the closing quote, or -1 if not found.
 */
function findClosingQuote(str, start, quote) {
  let i = start;
  while (i < str.length) {
    if (str[i] === '\\' && quote === '"') { i += 2; continue; }
    if (str[i] === quote) {
      if (quote === "'" && str[i + 1] === "'") { i += 2; continue; }
      return i + 1;
    }
    i++;
  }
  return -1;
}

/**
 * Split a line at the first colon that is a key separator.
 * Handles quoted keys and colons inside quoted values.
 * @returns {{ key: string, value: string }|null}
 */
function splitKeyValue(line) {
  let i = 0;
  // The key may optionally be quoted
  let keyStart = 0;
  let keyEnd = -1;

  if (line[i] === '"' || line[i] === "'") {
    const q = line[i];
    const end = findClosingQuote(line, i + 1, q);
    if (end === -1) return null;
    keyEnd = end;
    i = end;
  }

  // Now scan for ': ' or ':' at end
  while (i < line.length) {
    if (line[i] === '"' || line[i] === "'") {
      const q = line[i];
      const end = findClosingQuote(line, i + 1, q);
      if (end === -1) break;
      i = end;
      continue;
    }
    if (line[i] === ':') {
      if (i + 1 === line.length || line[i + 1] === ' ' || line[i + 1] === '\t') {
        const key = (keyEnd !== -1) ? line.slice(keyStart, keyEnd) : line.slice(0, i).trim();
        const value = line.slice(i + 1).trimStart();
        return { key, value };
      }
    }
    i++;
  }
  return null;
}

/**
 * Main recursive-descent parser.
 * @param {string[]} lines — all lines of the document
 * @param {{ index: number }} cursor — mutable line index
 * @param {number} baseIndent — expected indentation for this level
 * @returns {*} parsed JS value
 */
function parseBlock(lines, cursor, baseIndent) {
  // Skip blanks / comments
  while (cursor.index < lines.length && isBlankOrComment(lines[cursor.index])) {
    cursor.index++;
  }

  if (cursor.index >= lines.length) return null;

  const firstLine = lines[cursor.index];
  const firstIndent = indent(firstLine);

  // Detect if first meaningful line is a list item
  const trimmed = firstLine.trimStart();

  if (trimmed.startsWith('- ') || trimmed === '-') {
    return parseSequence(lines, cursor, firstIndent);
  }

  return parseMapping(lines, cursor, firstIndent);
}

/**
 * Parse a YAML block sequence (list items starting with '- ').
 */
function parseSequence(lines, cursor, baseIndent) {
  const result = [];

  while (cursor.index < lines.length) {
    // Skip blanks / comments
    while (cursor.index < lines.length && isBlankOrComment(lines[cursor.index])) {
      cursor.index++;
    }
    if (cursor.index >= lines.length) break;

    const line = lines[cursor.index];
    const lineIndent = indent(line);
    if (lineIndent < baseIndent) break;
    if (lineIndent > baseIndent) {
      // Unexpected deeper indent — should not happen at sequence level
      break;
    }

    const trimmed = line.trimStart();
    if (!trimmed.startsWith('-')) break;

    const lineNum = cursor.index + 1;
    const rest = line.slice(lineIndent + 1); // after '-'

    // rest may be empty (value is a block on the next line) or start with ' value'
    if (rest === '' || rest.trim() === '' || rest[0] !== ' ' && rest[0] !== '\t') {
      // Bare '-' with potential block below
      cursor.index++;
      // Skip blanks/comments
      while (cursor.index < lines.length && isBlankOrComment(lines[cursor.index])) {
        cursor.index++;
      }
      if (cursor.index < lines.length && indent(lines[cursor.index]) > baseIndent) {
        result.push(parseBlock(lines, cursor, indent(lines[cursor.index])));
      } else {
        result.push(null);
      }
      continue;
    }

    const valueStr = rest.slice(1); // after '- '
    const valueTrimmed = valueStr.trimStart();

    // Inline block scalar
    if (valueTrimmed.startsWith('|') || valueTrimmed.startsWith('>')) {
      cursor.index++;
      result.push(parseBlockScalar(lines, cursor, baseIndent + 2, valueTrimmed, lineNum));
      continue;
    }

    // Does it look like a nested map or sequence?
    const nextLineCheck = cursor.index + 1;
    let nextContentIndent = -1;
    for (let ni = nextLineCheck; ni < lines.length; ni++) {
      if (!isBlankOrComment(lines[ni])) { nextContentIndent = indent(lines[ni]); break; }
    }

    if (valueTrimmed === '' || valueTrimmed[0] === '#') {
      // Value is on next lines
      cursor.index++;
      if (nextContentIndent > baseIndent) {
        result.push(parseBlock(lines, cursor, nextContentIndent));
      } else {
        result.push(null);
      }
      continue;
    }

    // Inline value — could itself be a map: "key: value"
    const kv = splitKeyValue(valueTrimmed);
    if (kv) {
      // Inline map item: '- key: value'
      cursor.index++;
      const mapResult = {};

      const mapIndent = lineIndent + 2; // indent for this map

      // Process the first kv pair
      const keyStr = kv.key;
      const key = (keyStr[0] === '"' || keyStr[0] === "'") ? parseQuotedString(keyStr, lineNum) : keyStr;
      const valStr = kv.value.trimStart();

      if (valStr === '' || valStr[0] === '#') {
        // Value is a block
        while (cursor.index < lines.length && isBlankOrComment(lines[cursor.index])) cursor.index++;
        if (cursor.index < lines.length && indent(lines[cursor.index]) > mapIndent) {
          mapResult[key] = parseBlock(lines, cursor, indent(lines[cursor.index]));
        } else {
          mapResult[key] = null;
        }
      } else if (valStr.startsWith('|') || valStr.startsWith('>')) {
        mapResult[key] = parseBlockScalar(lines, cursor, mapIndent + 2, valStr, lineNum);
      } else {
        mapResult[key] = parseScalar(valStr, lineNum);
      }

      // Continue reading sibling keys at the same mapIndent
      while (cursor.index < lines.length) {
        while (cursor.index < lines.length && isBlankOrComment(lines[cursor.index])) cursor.index++;
        if (cursor.index >= lines.length) break;
        const sibLine = lines[cursor.index];
        const sibIndent = indent(sibLine);
        if (sibIndent !== mapIndent) break;
        const sibTrimmed = sibLine.trimStart();
        if (sibTrimmed.startsWith('-')) break; // back to list
        const sibKv = splitKeyValue(sibTrimmed);
        if (!sibKv) break;
        const sibLineNum = cursor.index + 1;
        cursor.index++;
        const sibKeyStr = sibKv.key;
        const sibKey = (sibKeyStr[0] === '"' || sibKeyStr[0] === "'") ? parseQuotedString(sibKeyStr, sibLineNum) : sibKeyStr;
        const sibValStr = sibKv.value.trimStart();
        if (sibValStr === '' || sibValStr[0] === '#') {
          while (cursor.index < lines.length && isBlankOrComment(lines[cursor.index])) cursor.index++;
          if (cursor.index < lines.length && indent(lines[cursor.index]) > mapIndent) {
            mapResult[sibKey] = parseBlock(lines, cursor, indent(lines[cursor.index]));
          } else {
            mapResult[sibKey] = null;
          }
        } else if (sibValStr.startsWith('|') || sibValStr.startsWith('>')) {
          mapResult[sibKey] = parseBlockScalar(lines, cursor, mapIndent + 2, sibValStr, sibLineNum);
        } else {
          mapResult[sibKey] = parseScalar(sibValStr, sibLineNum);
        }
      }

      result.push(mapResult);
      continue;
    }

    // Plain scalar
    cursor.index++;
    result.push(parseScalar(valueTrimmed, lineNum));
  }

  return result;
}

/**
 * Parse a YAML block mapping (key: value pairs).
 */
function parseMapping(lines, cursor, baseIndent) {
  const result = {};

  while (cursor.index < lines.length) {
    while (cursor.index < lines.length && isBlankOrComment(lines[cursor.index])) {
      cursor.index++;
    }
    if (cursor.index >= lines.length) break;

    const line = lines[cursor.index];
    const lineIndent = indent(line);
    if (lineIndent < baseIndent) break;
    if (lineIndent > baseIndent) break; // deeper indent shouldn't appear here

    const trimmed = line.trimStart();

    // If this line looks like a list item, stop
    if (trimmed.startsWith('- ') || trimmed === '-') break;

    const lineNum = cursor.index + 1;
    const kv = splitKeyValue(trimmed);
    if (!kv) {
      // Not a key:value — treat as scalar? Just skip unexpected lines.
      cursor.index++;
      continue;
    }

    cursor.index++;

    const keyStr = kv.key;
    const key = (keyStr[0] === '"' || keyStr[0] === "'") ? parseQuotedString(keyStr, lineNum) : keyStr;
    const valStr = kv.value.trimStart();

    if (valStr === '' || valStr[0] === '#') {
      // Value is the next block
      while (cursor.index < lines.length && isBlankOrComment(lines[cursor.index])) cursor.index++;
      if (cursor.index < lines.length && indent(lines[cursor.index]) > baseIndent) {
        result[key] = parseBlock(lines, cursor, indent(lines[cursor.index]));
      } else {
        result[key] = null;
      }
    } else if (valStr.startsWith('|') || valStr.startsWith('>')) {
      result[key] = parseBlockScalar(lines, cursor, baseIndent + 2, valStr, lineNum);
    } else {
      result[key] = parseScalar(valStr, lineNum);
    }
  }

  return result;
}

/**
 * Parse a block scalar (| or >).
 * @param {string} indicator — e.g. '|', '|-', '|2', '>', '>-'
 */
function parseBlockScalar(lines, cursor, expectedIndent, indicator, lineNum) {
  const chomping = indicator.includes('-') ? 'strip' : indicator.includes('+') ? 'keep' : 'clip';
  const isFolded = indicator[0] === '>';

  // Determine actual indent from first content line
  let blockIndent = expectedIndent;
  // Look ahead
  for (let i = cursor.index; i < lines.length; i++) {
    if (isBlankOrComment(lines[i])) continue;
    blockIndent = indent(lines[i]);
    break;
  }

  const contentLines = [];

  while (cursor.index < lines.length) {
    const line = lines[cursor.index];
    // Empty lines within block scalar
    if (line.trimStart() === '') {
      contentLines.push('');
      cursor.index++;
      continue;
    }
    const lineInd = indent(line);
    if (lineInd < blockIndent) break;
    contentLines.push(line.slice(blockIndent));
    cursor.index++;
  }

  // Remove trailing empty lines based on chomping
  if (chomping === 'strip') {
    while (contentLines.length > 0 && contentLines[contentLines.length - 1] === '') {
      contentLines.pop();
    }
    return contentLines.join(isFolded ? ' ' : '\n');
  } else if (chomping === 'clip') {
    while (contentLines.length > 1 && contentLines[contentLines.length - 1] === '') {
      contentLines.pop();
    }
    return contentLines.join(isFolded ? ' ' : '\n') + (contentLines.length > 0 ? '\n' : '');
  } else {
    // keep
    return contentLines.join(isFolded ? ' ' : '\n') + '\n';
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Parse a YAML string into a JavaScript value.
 * @param {string} text
 * @returns {*} parsed JS value
 * @throws {YamlParseError}
 */
export function parseYaml(text) {
  if (typeof text !== 'string') throw new YamlParseError('Input must be a string', 0);
  if (text.trim() === '') return null;

  // Strip leading document markers
  let body = text;
  body = body.replace(/^---[ \t]*\n?/m, '');
  body = body.replace(/^\.\.\.[ \t]*$/m, '');

  const lines = body.split('\n');
  // Remove trailing empty line caused by split
  if (lines[lines.length - 1] === '') lines.pop();

  const cursor = { index: 0 };

  // Skip leading blanks/comments
  while (cursor.index < lines.length && isBlankOrComment(lines[cursor.index])) {
    cursor.index++;
  }
  if (cursor.index >= lines.length) return null;

  const firstLine = lines[cursor.index];
  const firstTrimmed = firstLine.trimStart();

  // Bare scalar (no colon, no list marker)
  if (!firstTrimmed.startsWith('- ') && firstTrimmed !== '-' && !splitKeyValue(firstTrimmed)) {
    return parseScalar(firstTrimmed, cursor.index + 1);
  }

  return parseBlock(lines, cursor, indent(firstLine));
}
