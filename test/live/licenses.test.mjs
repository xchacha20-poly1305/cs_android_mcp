import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { after, before, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

const samples = JSON.parse(await readFile(new URL('./cases.json', import.meta.url), 'utf8'));
const observations = [];
const startedAt = new Date().toISOString();
const client = new Client({ name: 'live-license-validation', version: '1.0.0' });

before(async () => {
  await client.connect(new StdioClientTransport({
    command: process.execPath,
    args: [fileURLToPath(new URL('../../dist/index.js', import.meta.url))],
    stderr: 'pipe',
  }));
});

after(async () => {
  await client.close();
  if (process.env.CS_ANDROID_LIVE_REPORT) {
    const path = process.env.CS_ANDROID_LIVE_REPORT;
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, JSON.stringify({ startedAt, finishedAt: new Date().toISOString(), observations }, null, 2) + '\n');
  }
});

function toolText(response) {
  const text = response.content?.[0]?.text;
  assert.ok(!response.isError, text);
  assert.equal(typeof text, 'string');
  return text;
}

function fileText(response, path) {
  const text = toolText(response);
  const prefix = `# File: ${path}\n\n\`\`\`\n`;
  const end = text.lastIndexOf('\n```\n\nOriginal size: ');
  assert.ok(text.startsWith(prefix) && end >= prefix.length, 'Missing file content or metadata');
  return text.slice(prefix.length, end);
}

const noticePattern = /^<ignore long (.+) license; lines (\d+)(?:-(\d+))?>\r?$/;

// Independently replay each declared omission against the original lines. This
// catches lost code, incorrect ranges, and changes outside the reported spans.
function verifyOmissions(original, displayed, numbered) {
  const originalLines = original.split('\n');
  const notices = [];
  let cursor = 0;
  for (const line of displayed.split('\n')) {
    const numberedLine = numbered ? line.match(/^(\d+): (.*)$/) : undefined;
    const match = (numbered ? numberedLine?.[2] : line)?.match(noticePattern);
    if (match) {
      const [, license, first, last = first] = match;
      const start = Number(first);
      const end = Number(last);
      assert.ok(end >= start, 'Reversed omission range');
      if (numbered) {
        assert.equal(Number(numberedLine[1]), start);
        for (let number = start; number <= end; number++) {
          assert.ok(originalLines[cursor++]?.startsWith(`${number}: `), `Missing original search line ${number}`);
        }
      } else {
        assert.equal(cursor + 1, start, 'Omission starts at the wrong source line');
        assert.ok(end <= originalLines.length, 'Omission exceeds the file');
        cursor = end;
      }
      notices.push({ license, start, end });
    } else {
      assert.ok(line === originalLines[cursor], `Changed content outside an omission at original line ${cursor + 1}`);
      cursor++;
    }
  }
  assert.equal(cursor, originalLines.length, 'Source lines disappeared after the last omission');
  return notices;
}

async function record(t, sample, run) {
  const started = performance.now();
  const observation = { id: sample.id, kind: sample.kind, path: sample.path, query: sample.query };
  try {
    Object.assign(observation, await run(), { status: 'passed' });
    t.diagnostic(`${observation.originalCharacters} -> ${observation.displayedCharacters} characters; ${observation.notices.length} omission(s)`);
  } catch (error) {
    observation.status = 'failed';
    observation.error = String(error);
    throw error;
  } finally {
    observation.elapsedMs = Math.round(performance.now() - started);
    observations.push(observation);
  }
}

for (const sample of samples.files) {
  test(sample.id, { timeout: 45000 }, async t => record(t, { ...sample, kind: 'file' }, async () => {
    const { project, repository, branch, path } = sample;
    const args = { project, repository, branch, path };
    const uri = 'android://source?' + new URLSearchParams(args);
    const results = await Promise.allSettled([
      client.callTool({ name: 'get_file_content', arguments: args }),
      client.callTool({ name: 'get_file_content', arguments: { ...args, includeLicense: true } }),
      client.readResource({ uri }),
      client.readResource({ uri: uri + '&includeLicense=true' }),
    ]);
    const [compactTool, originalTool, compactResource, originalResource] = results.map(result => {
      if (result.status === 'rejected') throw result.reason;
      return result.value;
    });
    const original = fileText(originalTool, path);
    const displayed = fileText(compactTool, path);
    assert.ok(original.length > 0, 'The backend returned no source content');
    assert.ok(originalResource.contents[0].text === original, 'Original resource differs from original tool output');
    assert.ok(compactResource.contents[0].text === displayed, 'Compacted resource differs from compacted tool output');
    assert.equal(compactResource.contents[0].uri, uri);
    const notices = verifyOmissions(original, displayed, false);
    if (sample.expectedLicense) {
      assert.deepEqual(notices, [{ license: sample.expectedLicense, start: sample.range[0], end: sample.range[1] }]);
      assert.ok(displayed.length < original.length, 'No content was saved');
    } else {
      assert.equal(notices.length, 0, 'Content that should be preserved was suppressed');
    }
    const metadata = toolText(compactTool);
    assert.ok(metadata.includes(`Original size: ${Buffer.byteLength(original)} bytes`), 'File size no longer matches the original bytes');
    assert.ok(metadata.includes(`MIME Type: ${compactResource.contents[0].mimeType}`), 'Tool and resource MIME types differ');
    return {
      source: `https://cs.android.com/${project}/${repository}/+/${branch}:${path}`,
      uri,
      mimeType: compactResource.contents[0].mimeType,
      originalCharacters: original.length,
      displayedCharacters: displayed.length,
      originalSha256: createHash('sha256').update(original).digest('hex'),
      notices,
      checks: ['tool/resource equality', 'original mode equality', 'unchanged content outside omissions', 'original size and MIME type'],
    };
  }));
}

for (const sample of samples.searches) {
  test(sample.id, { timeout: 45000 }, async t => record(t, { ...sample, kind: 'search' }, async () => {
    const args = { query: sample.query, contextLines: sample.contextLines, pageSize: 3 };
    const results = await Promise.allSettled([false, true].map(includeLicense =>
      client.callTool({ name: 'search_android_code', arguments: { ...args, includeLicense } })
    ));
    const [displayed, original] = results.map(result => {
      if (result.status === 'rejected') throw result.reason;
      return toolText(result.value);
    });
    assert.ok(original.startsWith('# Search Results'), 'The live query returned no search results');
    const hasSourceLines = /^\d+: /m.test(original);
    assert.ok(hasSourceLines || sample.allowMissingSnippets, 'The backend returned files but no source snippets');
    assert.doesNotMatch(original, /^\d+: undefined$/m);
    assert.doesNotMatch(displayed, /^\d+: undefined$/m);
    const notices = verifyOmissions(original, displayed, true);
    if (sample.expectedLicense && hasSourceLines) {
      assert.ok(notices.length > 0, `No ${sample.expectedLicense} search content was compacted`);
      assert.ok(notices.every(notice => notice.license === sample.expectedLicense), 'A search license was mislabeled');
    } else {
      assert.equal(notices.length, 0, 'A short notice, unknown license, or code snippet was suppressed');
    }
    return {
      hasSourceLines,
      originalCharacters: original.length,
      displayedCharacters: displayed.length,
      notices,
      checks: ['both tool modes succeed', 'blank lines stay blank', 'original search line numbers', 'unchanged content outside omissions'],
    };
  }));
}
