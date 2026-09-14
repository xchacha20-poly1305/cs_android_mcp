import assert from 'node:assert/strict';
import { test } from 'node:test';
import { compactLicenses, compactLicenseLines } from '../dist/license.js';
import { apacheHeader, source, mitLicense } from './fixtures/source.mjs';

const notice = '<ignore long Apache-2.0 license; lines 1-15>';
const numbered = (content, first = 1) => content.split('\n').map((lineText, index) => ({
  lineText,
  lineNumber: String(first + index),
}));
const licenseBody = apacheHeader.split('\n').slice(1, -1).map(line => line.replace(/^ \* ?/, '')).join('\n');

test('compacts an AOSP header and preserves the entire source body', () => {
  assert.equal(compactLicenses(source, 'Activity.java'), source.replace(apacheHeader, notice));
  assert.ok(compactLicenses(source, 'Activity.java').length < source.length / 2);
});

test('includeLicense returns the original source exactly', () => {
  assert.equal(compactLicenses(source, 'Activity.java', true), source);
  assert.equal(compactLicenses(mitLicense, 'LICENSE', true), mitLicense);
});

for (const prefix of ['//', '#']) {
  test(`compacts a license in ${prefix} comments`, () => {
    const header = licenseBody.split('\n').map(line => `${prefix} ${line}`).join('\n');
    const body = '\n\nfunction_call();\n';
    assert.equal(compactLicenses(header + body, prefix === '#' ? 'build.py' : 'build.gradle'),
      '<ignore long Apache-2.0 license; lines 1-13>' + body);
  });
}

test('preserves shebangs, encoding comments, and their original line offsets', () => {
  const prefix = '#!/usr/bin/env python3\n# coding: utf-8\n\n';
  const header = licenseBody.split('\n').map(line => `# ${line}`).join('\n');
  const body = '\nprint("hello")\n';
  assert.equal(compactLicenses(prefix + header + body, 'build.py'),
    prefix + '<ignore long Apache-2.0 license; lines 4-16>' + body);
});

test('compacts XML comments after the XML declaration', () => {
  const declaration = '<?xml version="1.0" encoding="utf-8"?>\n';
  const xml = `${declaration}<!--\n${licenseBody}\n-->\n<resources />\n`;
  assert.equal(compactLicenses(xml, 'strings.xml'),
    `${declaration}<ignore long Apache-2.0 license; lines 2-16>\n<resources />\n`);
});

test('preserves CRLF, a BOM, leading whitespace, and the absence of a final newline', () => {
  const original = '\uFEFF' + source.trimEnd().replaceAll('\n', '\r\n');
  assert.equal(compactLicenses(original, 'Activity.java'),
    '\uFEFF' + source.trimEnd().replace(apacheHeader, notice).replaceAll('\n', '\r\n'));
  assert.equal(compactLicenses('\n\n' + source, 'Activity.java'),
    '\n\n' + source.replace(apacheHeader, '<ignore long Apache-2.0 license; lines 3-17>'));
});

test('preserves short SPDX and copyright notices', () => {
  const text = '// SPDX-License-Identifier: Apache-2.0\n// Copyright 2026 Example\nconst answer = 42;\n';
  assert.equal(compactLicenses(text, 'example.ts'), text);
  const short = '/* Licensed under the Apache License, Version 2.0; you may not use this file except in compliance. */';
  assert.equal(compactLicenses(short, 'example.c'), short);
});

test('preserves long ordinary comments mentioning a license name or SPDX identifier', () => {
  const text = `/**
 * Discuss the Apache License, Version 2.0 and SPDX-License-Identifier: Apache-2.0.
 * ${'This documentation describes the program behavior. '.repeat(20)}
 */
class Example {}
`;
  assert.equal(compactLicenses(text, 'Example.java'), text);
});

test('preserves licenses embedded in multiline code strings', () => {
  const texts = [
    `const example = \`\n${apacheHeader}\n\`;\n`,
    `license_example = """\n${apacheHeader}\n"""\n`,
    `class Example {\n  String text = """\n${apacheHeader}\n""";\n}\n`,
  ];
  for (const text of texts) assert.equal(compactLicenses(text, 'example.txt'), text);
});

test('preserves blocks sharing a line with code and all subsequent source', () => {
  const text = `${apacheHeader} class Example {}\n`;
  assert.equal(compactLicenses(text, 'Example.java'), text);
});

test('keeps ordinary comments and separate SPDX headers adjacent to a license', () => {
  const prefix = '// SPDX-License-Identifier: Apache-2.0\n// Build instructions: use the platform SDK.\n\n';
  const suffix = '\n/** Public API documentation. */\nclass Example {}';
  assert.equal(compactLicenses(prefix + apacheHeader + suffix, 'Example.java'),
    prefix + '<ignore long Apache-2.0 license; lines 4-18>' + suffix);
});

test('preserves documentation before or after a license in the same comment', () => {
  const headers = [
    apacheHeader.replace('/*\n', '/*\n * Public API: callers must initialize the service first.\n *\n'),
    apacheHeader.replace('\n */', '\n *\n * Public API: callers must initialize the service first.\n */'),
    `/*\n${mitLicense.trimEnd()}\n\nPublic API: callers must initialize the service first.\n*/`,
  ];
  for (const header of headers) {
    const text = header + '\nclass Example {}\n';
    assert.equal(compactLicenses(text, 'Example.java'), text);
  }
});

for (const path of ['LICENSE', 'lib/LICENCE.txt', 'COPYING', 'license.md', 'LICENSE-MIT']) {
  test(`compacts the real MIT document at ${path}`, () => {
    const count = mitLicense.trimEnd().split('\n').length;
    const trailing = mitLicense.slice(mitLicense.trimEnd().length);
    assert.equal(compactLicenses(mitLicense, path), `<ignore long MIT license; lines 1-${count}>${trailing}`);
  });
}

test('preserves unknown license text, whitespace-only files, and other documents', () => {
  for (const text of ['', ' \n\n', 'Copyright 2026. All rights reserved.', 'Custom terms. '.repeat(80)]) {
    assert.equal(compactLicenses(text, 'LICENSE'), text);
  }
  assert.equal(compactLicenses(mitLicense, 'README.md'), mitLicense);
  assert.equal(compactLicenses(mitLicense + '\nclass License {}', 'License.java'), mitLicense + '\nclass License {}');
});

test('search compaction preserves code line numbers and does not mutate API data', () => {
  const lines = numbered(source);
  const original = structuredClone(lines);
  const result = compactLicenseLines(lines, 'Activity.java');
  assert.deepEqual(result[0], { lineNumber: '1', lineText: notice });
  assert.deepEqual(result.slice(1), lines.slice(15));
  assert.deepEqual(lines, original);
  assert.deepEqual(compactLicenseLines(lines, 'Activity.java', true), original);
});

test('compacts a recognizable search snippet starting and ending inside a license', () => {
  const lines = numbered(apacheHeader).slice(2, -1);
  assert.deepEqual(compactLicenseLines(lines, 'Activity.java'), [{
    lineNumber: '3',
    lineText: '<ignore long Apache-2.0 license; lines 3-14>',
  }]);
});

test('never merges omitted ranges across gaps in search results', () => {
  const lines = [...numbered(apacheHeader), { lineNumber: '50', lineText: 'class Activity {}' }];
  assert.deepEqual(compactLicenseLines(lines, 'Activity.java'), [
    { lineNumber: '1', lineText: notice },
    { lineNumber: '50', lineText: 'class Activity {}' },
  ]);
});
