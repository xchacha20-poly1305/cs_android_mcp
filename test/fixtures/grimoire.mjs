import { source, mitLicense } from './source.mjs';

// Exercise the real MCP handlers and API parsing without relying on the network.
globalThis.fetch = async (url, options) => {
  if (String(url).includes('/batch?')) {
    return new Response(JSON.stringify({
      searchResults: [['Activity.java', source], ['LICENSE', mitLicense]].map(([path, content]) => ({
        fileSearchResult: {
          fileSpec: {
            sourceRoot: {
              repositoryKey: { ossProject: 'android', repositoryName: 'platform/superproject' },
              refSpec: 'refs/heads/main',
            },
            path,
          },
          snippets: [{
            snippetLines: content.trimEnd().split('\n').map((lineText, index) => ({
              ...(lineText ? { lineText } : {}),
              lineNumber: String(index + 1),
            })),
          }],
        },
      })),
    }));
  }
  if (String(url).includes('/GetContentsStreaming?')) {
    const path = JSON.parse(options.body)[0][1];
    const content = path === 'LICENSE' ? mitLicense : source;
    return new Response(JSON.stringify([[[null, [null, ['text/x-java']], content, String(Buffer.byteLength(content))]]]));
  }
  throw new Error(`Unexpected request: ${url}`);
};
