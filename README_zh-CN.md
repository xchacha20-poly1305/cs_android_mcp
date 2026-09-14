# Android Code Search MCP Server

[![npm version](https://img.shields.io/npm/v/cs-android-mcp)](https://www.npmjs.com/package/cs-android-mcp)
[![npm downloads](https://img.shields.io/npm/dm/cs-android-mcp)](https://www.npmjs.com/package/cs-android-mcp)
[![GitHub stars](https://img.shields.io/github/stars/steveday763/cs_android_mcp)](https://github.com/steveday763/cs_android_mcp)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)

[English](README.md) | 简体中文

一个用于搜索和浏览 Android 源码的 MCP (Model Context Protocol) 服务器，数据源自 cs.android.com。

## 效果预览

![Preview](preview.png)

## 功能

- **代码搜索** — 支持正则表达式搜索 Android 源码
- **文件内容** — 默认用简短提示省略长 license，减少 token 消耗，也可按需获取完整原文
- **符号建议** — 根据部分输入自动补全类名、方法名、文件名
- **多项目支持** — 可搜索 Android、AndroidX、Android Studio、LLVM 等项目

## 安装

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

### 其他 MCP 客户端

任何兼容 MCP 协议的客户端均可通过 stdio 接入：

```bash
npx -y @anrong/cs-android-mcp
```

或全局安装后使用：

```bash
npm install -g @anrong/cs-android-mcp
cs-android-mcp
```

## 可用工具

### search_android_code

在 Android 源码仓库中搜索代码。

| 参数 | 必填 | 说明 |
|---|---|---|
| `query` | 是 | 搜索查询（支持正则、`file:`、`class:`、`function:` 等操作符） |
| `project` | 否 | 按项目过滤：`android`、`androidx`、`android-studio`、`android-llvm` |
| `pageSize` | 否 | 返回结果数量（默认 10，最大 50） |
| `contextLines` | 否 | 匹配行的上下文行数（默认 1） |
| `includeLicense` | 否 | 在搜索片段中保留完整 license（默认 `false`） |

### get_file_content

获取源文件内容，默认省略长 license。

| 参数 | 必填 | 说明 |
|---|---|---|
| `project` | 是 | 项目名称 |
| `repository` | 是 | 仓库路径 |
| `branch` | 是 | 分支名称 |
| `path` | 是 | 文件路径 |
| `includeLicense` | 否 | 返回包含 license 的完整原文（默认 `false`） |

可识别的长 license 文件头（至少 400 字符）和独立的 `LICENSE` / `COPYING` 文档会替换为类似以下的提示：

```text
<ignore long Apache-2.0 license; lines 1-15>
```

短声明（包括 SPDX 标识）、普通注释和代码会保留。搜索片段保持原始行号，提示会标出被省略的原文行范围。文件大小元数据仍表示原文件大小。

支持 Apache-2.0、MIT、BSD、ISC、GPL/LGPL/AGPL、MPL-2.0 和 Unlicense 的常见格式，无法可靠识别的内容保持原样。

支持 `COPYING.MPL2` 等带版本号的文件名以及 `UNLICENSE`。文档按自身的许可证标题或授权声明识别，无法明确归类的许可证文档保留原文。

`android://source?...` 资源读取也采用相同行为。在资源 URI 末尾追加 `&includeLicense=true` 可获取完整原文。

### suggest_symbols

根据部分输入获取符号建议。

| 参数 | 必填 | 说明 |
|---|---|---|
| `query` | 是 | 部分查询字符串 |
| `maxResults` | 否 | 最大建议数量（默认 7） |

### list_projects

列出所有可搜索的 Android 源码项目。

## 测试

`npm test` 运行离线回归测试，`npm run test:live` 连接真实 Android Code Search 后端，验证文件工具、资源读取和搜索片段的两种 license 模式。详见[样本列表和实测结果](test/live/README.md)。

## 许可证

MIT
