/**
 * yaml-writer.test.js — Tests for YAML serializer
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { toYaml } from '../src/yaml-writer.js';
import { parseYaml } from '../src/yaml-parser.js';

// ---------------------------------------------------------------------------
// Basic serialization
// ---------------------------------------------------------------------------
describe('toYaml simple object', () => {
  it('serializes a flat object', () => {
    const yaml = toYaml({ name: 'Alice', age: 30 });
    assert.ok(yaml.includes('name: Alice'));
    assert.ok(yaml.includes('age: 30'));
  });

  it('serializes null value', () => {
    const yaml = toYaml({ val: null });
    assert.ok(yaml.includes('val: null'));
  });

  it('serializes boolean values', () => {
    const yaml = toYaml({ enabled: true, disabled: false });
    assert.ok(yaml.includes('enabled: true'));
    assert.ok(yaml.includes('disabled: false'));
  });

  it('serializes number values', () => {
    const yaml = toYaml({ port: 3000, ratio: 1.5 });
    assert.ok(yaml.includes('port: 3000'));
    assert.ok(yaml.includes('ratio: 1.5'));
  });

  it('ends with newline', () => {
    const yaml = toYaml({ a: 1 });
    assert.ok(yaml.endsWith('\n'));
  });
});

// ---------------------------------------------------------------------------
// Nested objects
// ---------------------------------------------------------------------------
describe('toYaml nested object', () => {
  it('serializes a nested mapping', () => {
    const yaml = toYaml({ db: { host: 'localhost', port: 5432 } });
    assert.ok(yaml.includes('db:'));
    assert.ok(yaml.includes('  host: localhost'));
    assert.ok(yaml.includes('  port: 5432'));
  });

  it('serializes deeply nested', () => {
    const yaml = toYaml({ a: { b: { c: 42 } } });
    assert.ok(yaml.includes('a:'));
    assert.ok(yaml.includes('  b:'));
    assert.ok(yaml.includes('    c: 42'));
  });
});

// ---------------------------------------------------------------------------
// Arrays
// ---------------------------------------------------------------------------
describe('toYaml array', () => {
  it('serializes a flat array', () => {
    const yaml = toYaml({ items: ['a', 'b', 'c'] });
    assert.ok(yaml.includes('items:'));
    assert.ok(yaml.includes('  - a'));
    assert.ok(yaml.includes('  - b'));
  });

  it('serializes array of numbers', () => {
    const yaml = toYaml([1, 2, 3]);
    assert.ok(yaml.includes('- 1'));
    assert.ok(yaml.includes('- 2'));
  });

  it('serializes empty array as []', () => {
    const yaml = toYaml({ list: [] });
    assert.ok(yaml.includes('list: []'));
  });

  it('serializes array of objects', () => {
    const yaml = toYaml({ people: [{ name: 'Alice' }, { name: 'Bob' }] });
    assert.ok(yaml.includes('- name: Alice'));
    assert.ok(yaml.includes('- name: Bob'));
  });
});

// ---------------------------------------------------------------------------
// Mixed types
// ---------------------------------------------------------------------------
describe('toYaml mixed types', () => {
  it('handles mixed value types', () => {
    const obj = { str: 'hello', num: 42, bool: true, nil: null, arr: [1, 2] };
    const yaml = toYaml(obj);
    assert.ok(yaml.includes('str: hello'));
    assert.ok(yaml.includes('num: 42'));
    assert.ok(yaml.includes('bool: true'));
    assert.ok(yaml.includes('nil: null'));
    assert.ok(yaml.includes('- 1'));
  });
});

// ---------------------------------------------------------------------------
// String escaping / quoting
// ---------------------------------------------------------------------------
describe('toYaml string escaping', () => {
  it('quotes strings that look like booleans', () => {
    const yaml = toYaml({ val: 'true' });
    assert.ok(yaml.includes('"true"'));
  });

  it('quotes strings that look like numbers', () => {
    const yaml = toYaml({ val: '42' });
    assert.ok(yaml.includes('"42"'));
  });

  it('quotes empty string', () => {
    const yaml = toYaml({ val: '' });
    assert.ok(yaml.includes('""'));
  });

  it('quotes strings containing colon-space', () => {
    const yaml = toYaml({ val: 'key: value' });
    // Should be quoted because of ':'
    assert.ok(yaml.includes('"'));
  });

  it('uses block scalar for multi-line string', () => {
    const yaml = toYaml({ text: 'line one\nline two' });
    assert.ok(yaml.includes('|'));
    assert.ok(yaml.includes('line one'));
    assert.ok(yaml.includes('line two'));
  });
});

// ---------------------------------------------------------------------------
// Empty containers
// ---------------------------------------------------------------------------
describe('toYaml empty containers', () => {
  it('serializes empty object as {}', () => {
    const yaml = toYaml({ val: {} });
    assert.ok(yaml.includes('val: {}'));
  });

  it('serializes empty array as []', () => {
    const yaml = toYaml({ val: [] });
    assert.ok(yaml.includes('val: []'));
  });
});

// ---------------------------------------------------------------------------
// Round trip
// ---------------------------------------------------------------------------
describe('toYaml round trip', () => {
  it('round-trips a simple object', () => {
    const obj = { name: 'Alice', age: 30, active: true };
    const yaml = toYaml(obj);
    const back = parseYaml(yaml);
    assert.deepEqual(back, obj);
  });

  it('round-trips nested object', () => {
    const obj = { db: { host: 'localhost', port: 5432 }, tags: ['web', 'api'] };
    const yaml = toYaml(obj);
    const back = parseYaml(yaml);
    assert.deepEqual(back, obj);
  });

  it('round-trips array of objects', () => {
    const obj = [{ name: 'Alice', score: 100 }, { name: 'Bob', score: 80 }];
    const yaml = toYaml(obj);
    const back = parseYaml(yaml);
    assert.deepEqual(back, obj);
  });

  it('round-trips object with null values', () => {
    const obj = { present: 'yes', absent: null };
    const yaml = toYaml(obj);
    const back = parseYaml(yaml);
    assert.deepEqual(back, obj);
  });

  it('round-trips numbers', () => {
    const obj = { port: 3000, ratio: 1.5, neg: -7 };
    const yaml = toYaml(obj);
    const back = parseYaml(yaml);
    assert.deepEqual(back, obj);
  });

  it('round-trips deeply nested structure', () => {
    const obj = {
      app: {
        name: 'myapp',
        config: {
          db: { host: 'localhost', port: 5432 },
          cache: { ttl: 60 },
        },
        tags: ['prod', 'stable'],
      },
    };
    const yaml = toYaml(obj);
    const back = parseYaml(yaml);
    assert.deepEqual(back, obj);
  });
});
