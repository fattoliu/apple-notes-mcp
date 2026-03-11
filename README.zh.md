# Apple Notes MCP

一个 TypeScript MCP（Model Context Protocol）服务器，让 AI 助手（Claude 等）能够将整理好的技术文章同时保存到 **Apple Notes 备忘录**和**本地 Markdown 文件**。

## 功能特性

- **Markdown 输入** — AI 直接输出 Markdown，服务器自动转换为 Apple Notes 富文本 HTML
- **双写同步** — 同时保存到 `~/Documents/notes/[分类]/[标题].md` 和 Apple Notes
- **自动建文件夹** — 目标文件夹不存在时自动创建，无需手动操作
- **文章元数据** — 自动在每篇笔记末尾追加保存时间、标签、来源
- **Provider 模式** — 架构清晰易扩展，新增目标平台（语雀、飞书等）无需修改现有代码
- **环境变量配置** — 笔记根目录、启用的 Provider 均可通过环境变量灵活配置

## 工具列表

| 工具 | 说明 |
|---|---|
| `save_article` | 将 Markdown 文章保存到所有已启用的 Provider |
| `list_articles` | 列出指定文件夹（或所有文件夹）下的文章 |
| `search_articles` | 全文搜索所有笔记 |
| `get_article` | 通过 ID 读取某篇笔记内容 |
| `list_folders` | 列出 Apple Notes 中的所有文件夹 |

## 架构

```
AI 客户端（Claude Desktop / Claude Code）
        │  stdio（MCP 协议）
        ▼
MCP 服务器（index.ts）
        │
        ▼
save-article.ts  ← 纯编排层，仅 9 行核心逻辑
        │
        ├──▶ LocalMarkdownProvider  →  ~/Documents/notes/[分类]/[标题].md
        │
        └──▶ AppleNotesProvider     →  osascript → Apple Notes App
```

每个 Provider 实现同一个 `NoteProvider` 接口：

```typescript
export interface NoteProvider {
  readonly name: string;
  save(article: Article): Promise<ProviderResult>;
}
```

新增 Provider（如语雀）只需：
1. 创建 `src/providers/yuque.ts`，实现 `NoteProvider` 接口
2. 在 `src/providers/index.ts` 的 `buildProviders()` 中注册
3. 在环境变量中加入所需配置（如 `YUQUE_TOKEN`）

**不需要修改任何现有代码。**

## 环境要求

- macOS（通过 AppleScript 操作 Apple Notes）
- Node.js v18+
- 已登录 iCloud 并开启备忘录同步

## 安装

```bash
git clone https://github.com/fattoliu/apple-notes-mcp.git
cd apple-notes-mcp
npm install
npm run build
```

## 配置

在 Claude Desktop 配置文件（`~/Library/Application Support/Claude/claude_desktop_config.json`）或项目 `.mcp.json` 中添加：

```json
{
  "mcpServers": {
    "apple-notes": {
      "command": "node",
      "args": ["/path/to/apple-notes-mcp/dist/index.js"],
      "env": {
        "NOTES_ROOT": "/Users/你的用户名/Documents/notes",
        "ENABLE_LOCAL_MD": "true",
        "ENABLE_APPLE_NOTES": "true"
      }
    }
  }
}
```

### 环境变量说明

| 变量 | 说明 | 默认值 |
|---|---|---|
| `NOTES_ROOT` | 本地 Markdown 文件的根目录 | `~/Documents/notes` |
| `ENABLE_LOCAL_MD` | 是否启用本地 Markdown 保存 | `true` |
| `ENABLE_APPLE_NOTES` | 是否启用 Apple Notes 保存 | `true` |

## 使用方式

配置完成后，对话结束时告诉 Claude：

> 把刚才关于 TypeScript 泛型的内容整理成技术文章，保存到「TypeScript」分类，标签加 ts 和泛型。

Claude 会调用 `save_article`，自动同时写入本地文件和 Apple Notes。

## macOS 权限

首次运行时，系统会弹出授权提示，点击**允许**即可。

若未弹出提示，请前往：
**系统设置 → 隐私与安全性 → 自动化**，手动授权备忘录访问权限。

## 开源协议

MIT
