import assert from 'node:assert/strict';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { apacheHeader, source, mitLicense } from './fixtures/source.mjs';

test('MCP tools and resources compact by default and can return original licenses', { timeout: 15000 }, async (t) => {
  const client = new Client({ name: 'license-test', version: '1.0.0' });
  const transport = new StdioClientTransport({
    command: process.execPath,
    args: [
      '--import', fileURLToPath(new URL('./fixtures/grimoire.mjs', import.meta.url)),
      fileURLToPath(new URL('../dist/index.js', import.meta.url)),
    ],
    stderr: 'pipe',
  });
  t.after(() => client.close());
  await client.connect(transport);

  const { tools } = await client.listTools();
  for (const name of ['get_file_content', 'search_android_code']) {
    const parameter = tools.find(tool => tool.name === name).inputSchema.properties.includeLicense;
    assert.equal(parameter.type, 'boolean');
    assert.equal(parameter.default, false);
  }

  const fileArgs = { project: 'android', repository: 'platform/superproject', branch: 'main', path: 'Activity.java' };
  const compactFile = await client.callTool({ name: 'get_file_content', arguments: fileArgs });
  assert.equal(compactFile.isError, undefined);
  assert.match(compactFile.content[0].text, /<ignore long Apache-2\.0 license; lines 1-15>/);
  assert.match(compactFile.content[0].text, /public class Activity \{\}/);
  assert.match(compactFile.content[0].text, new RegExp(`Original size: ${Buffer.byteLength(source)} bytes`));
  assert.doesNotMatch(compactFile.content[0].text, /Licensed under the Apache/);

  const originalFile = await client.callTool({ name: 'get_file_content', arguments: { ...fileArgs, includeLicense: true } });
  assert.ok(originalFile.content[0].text.includes(source));
  assert.doesNotMatch(originalFile.content[0].text, /<ignore long/);

  const licenseFile = await client.callTool({ name: 'get_file_content', arguments: { ...fileArgs, path: 'LICENSE' } });
  assert.match(licenseFile.content[0].text, /<ignore long MIT license; lines 1-21>/);
  const originalLicense = await client.callTool({ name: 'get_file_content', arguments: { ...fileArgs, path: 'LICENSE', includeLicense: true } });
  assert.ok(originalLicense.content[0].text.includes(mitLicense));

  const search = await client.callTool({ name: 'search_android_code', arguments: { query: 'Activity' } });
  assert.match(search.content[0].text, /1: <ignore long Apache-2\.0 license; lines 1-15>/);
  assert.match(search.content[0].text, /16: package android.app;/);
  assert.match(search.content[0].text, /19: public class Activity \{\}/);
  assert.match(search.content[0].text, /<ignore long MIT license; lines 1-21>/);
  assert.match(search.content[0].text, /\n17: \n/);
  assert.doesNotMatch(search.content[0].text, /undefined/);
  const originalSearch = await client.callTool({ name: 'search_android_code', arguments: { query: 'Activity', includeLicense: true } });
  assert.match(originalSearch.content[0].text, /4:  \* Licensed under the Apache License/);
  assert.doesNotMatch(originalSearch.content[0].text, /<ignore long/);
  assert.match(originalSearch.content[0].text, /\n17: \n/);
  assert.doesNotMatch(originalSearch.content[0].text, /undefined/);

  const { resources } = await client.listResources();
  const resource = await client.readResource({ uri: resources[0].uri });
  assert.equal(resource.contents[0].text, source.replace(apacheHeader, '<ignore long Apache-2.0 license; lines 1-15>'));
  const originalResource = await client.readResource({ uri: resources[0].uri + '&includeLicense=true' });
  assert.equal(originalResource.contents[0].text, source);
});
