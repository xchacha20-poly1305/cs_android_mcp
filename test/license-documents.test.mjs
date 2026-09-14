import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { compactLicenses } from '../dist/license.js';

const documents = JSON.parse(readFileSync(new URL('./fixtures/upstream/license-documents.json', import.meta.url), 'utf8'));

for (const document of documents) {
  test(`classifies real ${document.id} text by its own license, not referenced names`, () => {
    // Use a canonical filename to test classification independently of filenames.
    const compacted = compactLicenses(document.content, 'LICENSE');
    if (document.expectedLicense) {
      assert.ok(compacted.startsWith(`<ignore long ${document.expectedLicense} license; `));
    } else {
      assert.equal(compacted, document.content);
    }
    assert.equal(compactLicenses(document.content, 'LICENSE', true), document.content);
  });
}

for (const path of ['COPYING.MPL2', 'COPYING.MPL-2.0', 'LICENSE-MPL-2.0.txt']) {
  test(`recognizes the MPL document filename ${path}`, () => {
    const document = documents.find(document => document.id === 'mpl-document');
    assert.ok(compactLicenses(document.content, path).startsWith('<ignore long MPL-2.0 license; '));
    assert.equal(compactLicenses(document.content, path + '.java'), document.content);
  });
}
