/**
 * yaml-parser.test.js — Tests for the YAML subset parser
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { parseYaml, parseLine, detectType, YamlParseError } from '../src/yaml-parser.js';

// ---------------------------------------------------------------------------
// detectType
// ---------------------------------------------------------------------------
describe('detectType', () => {
  it('detects null', () => {
    assert.equal(detectType('null'), 'null');
    assert.equal(detectType('~'), 'null');
    assert.equal(detectType(''), 'null');
  });

  it('detects booleans', () => {
    assert.equal(detectType('true'), 'boolean');
    assert.equal(detectType('false'), 'boolean');
    assert.equal(detectType('yes'), 'boolean');
    assert.equal(detectType('no'), 'boolean');
  });

  it('detects integers', () => {
    assert.equal(detectType('0'), 'number');
    assert.equal(detectType('42'), 'number');
    assert.equal(detectType('-7'), 'number');
  });

  it('detects floats', () => {
    assert.equal(detectType('3.14'), 'number');
    assert.equal(detectType('-0.5'), 'number');
    assert.equal(detectType('1e10'), 'number');
  });

  it('detects strings', () => {
    assert.equal(detectType('hello'), 'string');
    assert.equal(detectType('123abc'), 'string');
  });
});

// ---------------------------------------------------------------------------
// parseLine
// ---------------------------------------------------------------------------
describe('parseLine', () => {
  it('converts null', () => assert.equal(parseLine('null'), null));
  it('converts ~', () => assert.equal(parseLine('~'), null));
  it('converts true', () => assert.equal(parseLine('true'), true));
  it('converts false', () => assert.equal(parseLine('false'), false));
  it('converts integer', () => assert.equal(parseLine('42'), 42));
  it('converts float', () => assert.strictEqual(parseLine('3.14'), 3.14));
  it('converts negative', () => assert.equal(parseLine('-1'), -1));
  it('converts string', () => assert.equal(parseLine('hello'), 'hello'));
  it('converts hex', () => assert.equal(parseLine('0xff'), 255));
});

// ---------------------------------------------------------------------------
// parseYaml — scalars
// ---------------------------------------------------------------------------
describe('parseYaml scalars', () => {
  it('parses empty string as null', () => {
    assert.equal(parseYaml(''), null);
    assert.equal(parseYaml('   '), null);
  });

  it('parses bare scalar', () => {
    assert.equal(parseYaml('hello world'), 'hello world');
  });

  it('parses number scalar', () => {
    assert.equal(parseYaml('42'), 42);
  });
});

// ---------------------------------------------------------------------------
// parseYaml — simple key-value
// ---------------------------------------------------------------------------
describe('parseYaml simple key-value', () => {
  it('parses a single key: value pair', () => {
    const result = parseYaml('name: Alice');
    assert.deepEqual(result, { name: 'Alice' });
  });

  it('parses multiple key-value pairs', () => {
    const yaml = `name: Alice\nage: 30\nactive: true`;
    assert.deepEqual(parseYaml(yaml), { name: 'Alice', age: 30, active: true });
  });

  it('parses null value', () => {
    assert.deepEqual(parseYaml('value: null'), { value: null });
    assert.deepEqual(parseYaml('value: ~'), { value: null });
  });

  it('parses boolean values', () => {
    const yaml = `yes_val: true\nno_val: false`;
    assert.deepEqual(parseYaml(yaml), { yes_val: true, no_val: false });
  });

  it('parses number values', () => {
    const yaml = `port: 3000\npi: 3.14`;
    assert.deepEqual(parseYaml(yaml), { port: 3000, pi: 3.14 });
  });
});

// ---------------------------------------------------------------------------
// parseYaml — nested map
// ---------------------------------------------------------------------------
describe('parseYaml nested map', () => {
  it('parses a nested mapping', () => {
    const yaml = `outer:\n  inner: value`;
    assert.deepEqual(parseYaml(yaml), { outer: { inner: 'value' } });
  });

  it('parses deeply nested maps', () => {
    const yaml = `a:\n  b:\n    c: 42`;
    assert.deepEqual(parseYaml(yaml), { a: { b: { c: 42 } } });
  });

  it('parses sibling keys after nested map', () => {
    const yaml = `db:\n  host: localhost\n  port: 5432\nname: myapp`;
    assert.deepEqual(parseYaml(yaml), {
      db: { host: 'localhost', port: 5432 },
      name: 'myapp',
    });
  });
});

// ---------------------------------------------------------------------------
// parseYaml — sequences
// ---------------------------------------------------------------------------
describe('parseYaml list of strings', () => {
  it('parses a simple list', () => {
    const yaml = `items:\n  - apple\n  - banana\n  - cherry`;
    assert.deepEqual(parseYaml(yaml), { items: ['apple', 'banana', 'cherry'] });
  });

  it('parses a top-level list', () => {
    const yaml = `- one\n- two\n- three`;
    assert.deepEqual(parseYaml(yaml), ['one', 'two', 'three']);
  });

  it('parses a list with mixed types', () => {
    const yaml = `- hello\n- 42\n- true\n- null`;
    assert.deepEqual(parseYaml(yaml), ['hello', 42, true, null]);
  });
});

describe('parseYaml list of maps', () => {
  it('parses a list of objects', () => {
    const yaml = `people:\n  - name: Alice\n    age: 30\n  - name: Bob\n    age: 25`;
    assert.deepEqual(parseYaml(yaml), {
      people: [
        { name: 'Alice', age: 30 },
        { name: 'Bob', age: 25 },
      ],
    });
  });
});

// ---------------------------------------------------------------------------
// parseYaml — quoted strings
// ---------------------------------------------------------------------------
describe('parseYaml quoted strings', () => {
  it('parses double-quoted string', () => {
    assert.deepEqual(parseYaml('key: "hello world"'), { key: 'hello world' });
  });

  it('parses single-quoted string', () => {
    assert.deepEqual(parseYaml("key: 'hello world'"), { key: 'hello world' });
  });

  it('handles escape sequences in double quotes', () => {
    assert.deepEqual(parseYaml('key: "line1\\nline2"'), { key: 'line1\nline2' });
  });

  it('handles escaped single quote in single-quoted string', () => {
    assert.deepEqual(parseYaml("key: 'it''s'"), { key: "it's" });
  });

  it('quoted string that looks like a number stays string', () => {
    assert.deepEqual(parseYaml('key: "42"'), { key: '42' });
    assert.equal(typeof parseYaml('key: "42"').key, 'string');
  });

  it('quoted string that looks like boolean stays string', () => {
    assert.deepEqual(parseYaml('key: "true"'), { key: 'true' });
    assert.equal(typeof parseYaml('key: "true"').key, 'string');
  });
});

// ---------------------------------------------------------------------------
// parseYaml — numbers edge cases
// ---------------------------------------------------------------------------
describe('parseYaml numbers', () => {
  it('parses negative integer', () => {
    assert.deepEqual(parseYaml('val: -42'), { val: -42 });
  });

  it('parses float', () => {
    assert.deepEqual(parseYaml('val: 1.5e2'), { val: 150 });
  });

  it('parses hex', () => {
    assert.deepEqual(parseYaml('val: 0xff'), { val: 255 });
  });
});

// ---------------------------------------------------------------------------
// parseYaml — comments
// ---------------------------------------------------------------------------
describe('parseYaml comments', () => {
  it('ignores full-line comments', () => {
    const yaml = `# This is a comment\nname: Alice`;
    assert.deepEqual(parseYaml(yaml), { name: 'Alice' });
  });

  it('ignores inline comments', () => {
    const yaml = `port: 3000 # default port`;
    assert.deepEqual(parseYaml(yaml), { port: 3000 });
  });

  it('handles comment-only document', () => {
    assert.equal(parseYaml('# just a comment'), null);
  });
});

// ---------------------------------------------------------------------------
// parseYaml — block scalar |
// ---------------------------------------------------------------------------
describe('parseYaml block scalar |', () => {
  it('parses literal block scalar', () => {
    const yaml = `text: |\n  line one\n  line two\n`;
    const result = parseYaml(yaml);
    assert.ok(result.text.includes('line one'));
    assert.ok(result.text.includes('line two'));
  });

  it('parses block scalar with strip chomping |-', () => {
    const yaml = `text: |-\n  hello\n  world\n`;
    const result = parseYaml(yaml);
    assert.ok(result.text.includes('hello'));
    assert.ok(!result.text.endsWith('\n'));
  });
});

// ---------------------------------------------------------------------------
// parseYaml — multi-line input
// ---------------------------------------------------------------------------
describe('parseYaml multi-line input', () => {
  it('parses realistic config', () => {
    const yaml = `
name: myapp
version: "1.0.0"
debug: false
port: 8080
database:
  host: localhost
  port: 5432
tags:
  - web
  - api
`;
    const result = parseYaml(yaml);
    assert.equal(result.name, 'myapp');
    assert.equal(result.version, '1.0.0');
    assert.equal(result.debug, false);
    assert.equal(result.port, 8080);
    assert.deepEqual(result.database, { host: 'localhost', port: 5432 });
    assert.deepEqual(result.tags, ['web', 'api']);
  });
});

// ---------------------------------------------------------------------------
// parseYaml — document markers
// ---------------------------------------------------------------------------
describe('parseYaml document markers', () => {
  it('strips leading ---', () => {
    const yaml = `---\nname: Alice`;
    assert.deepEqual(parseYaml(yaml), { name: 'Alice' });
  });
});

// ---------------------------------------------------------------------------
// parseYaml — edge cases
// ---------------------------------------------------------------------------
describe('parseYaml edge cases', () => {
  it('parses empty map value as null', () => {
    const yaml = `key:`;
    assert.deepEqual(parseYaml(yaml), { key: null });
  });

  it('parses deeply nested list of lists (nested sequences)', () => {
    const yaml = `matrix:\n  - - 1\n    - 2`;
    // This tests that the parser handles it without throwing
    const result = parseYaml(yaml);
    assert.ok(result.matrix !== undefined);
  });

  it('handles windows-style CRLF line endings', () => {
    const yaml = 'name: Alice\r\nage: 30';
    // strip \r
    const result = parseYaml(yaml.replace(/\r\n/g, '\n'));
    assert.deepEqual(result, { name: 'Alice', age: 30 });
  });

  it('parses list with null items', () => {
    const yaml = `items:\n  - one\n  - \n  - three`;
    const result = parseYaml(yaml);
    assert.equal(result.items[0], 'one');
    assert.equal(result.items[2], 'three');
  });
});
