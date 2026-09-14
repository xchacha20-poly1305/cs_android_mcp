# Android Code Search MCP Server

[![npm version](https://img.shields.io/npm/v/cs-android-mcp)](https://www.npmjs.com/package/cs-android-mcp)
[![npm downloads](https://img.shields.io/npm/dm/cs-android-mcp)](https://www.npmjs.com/package/cs-android-mcp)
[![GitHub stars](https://img.shields.io/github/stars/steveday763/cs_android_mcp)](https://github.com/steveday763/cs_android_mcp)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)

English | [简体中文](README_zh-CN.md)

A Model Context Protocol (MCP) server for searching and browsing Android source code via cs.android.com.

## Preview

![Preview](preview.png)

## Features

- **Code Search**: Search through Android source code with regex support
- **File Content**: Retrieve source files with long licenses summarized to save tokens; full original text is available on request
- **Symbol Suggestions**: Get autocomplete suggestions for classes, methods, files
- **Multiple Projects**: Search across Android, AndroidX, Android Studio, and LLVM projects

## Installation

### Claude Code

```bash
claude mcp add cs-android -- npx -y @anrong/cs-android-mcp
```

### Cursor

```json
{
  "mcpServers": {
    "cs-android": {
      "command": "npx",
      "args": ["-y", "@anrong/cs-android-mcp"]
    }
  }
}
```

### Other MCP Clients

Any MCP-compatible client can use the stdio transport:

```bash
npx -y @anrong/cs-android-mcp
```

Or install globally:

```bash
npm install -g @anrong/cs-android-mcp
cs-android-mcp
```

## Available Tools

### search_android_code

Search for code in Android source repositories.

| Parameter | Required | Description |
|---|---|---|
| `query` | Yes | Search query (supports regex, `file:`, `class:`, `function:` operators) |
| `project` | No | Filter by project: `android`, `androidx`, `android-studio`, `android-llvm` |
| `pageSize` | No | Number of results (default: 10, max: 50) |
| `contextLines` | No | Context lines around matches (default: 1) |
| `includeLicense` | No | Include full license text in snippets (default: `false`) |

### get_file_content

Get the content of a source file, with long licenses summarized by default.

| Parameter | Required | Description |
|---|---|---|
| `project` | Yes | Project name |
| `repository` | Yes | Repository path |
| `branch` | Yes | Branch name |
| `path` | Yes | File path |
| `includeLicense` | No | Return the full original content, including licenses (default: `false`) |

Recognized license headers of at least 400 characters and standalone `LICENSE` / `COPYING` documents are replaced with a notice such as:

```text
<ignore long Apache-2.0 license; lines 1-15>
```

Short notices (including SPDX identifiers), ordinary comments, and code are preserved. Search snippets keep their original line numbers; the notice identifies the omitted source lines. File size metadata refers to the original file.

Common Apache-2.0, MIT, BSD, ISC, GPL/LGPL/AGPL, MPL-2.0, and Unlicense boilerplate is recognized. Content that cannot be identified reliably is left unchanged.

Versioned names such as `COPYING.MPL2` and `UNLICENSE` are supported. Documents are identified by their own license title or grant; documents that cannot be classified unambiguously stay visible.

This also applies to `android://source?...` resources. Append `&includeLicense=true` to a resource URI to read the full original text.

### suggest_symbols

Get symbol suggestions for partial queries.

| Parameter | Required | Description |
|---|---|---|
| `query` | Yes | Partial query |
| `maxResults` | No | Max suggestions (default: 7) |

### list_projects

List all available Android source projects.

## Testing

Run `npm test` for offline regression tests, or `npm run test:live` to test against the real Android Code Search backend. The live suite covers file tools, resources, and search snippets in both license modes. See the [sample matrix and recorded results](test/live/README.md).

## License

MIT
