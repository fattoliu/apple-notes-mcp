[中文](./README.zh.md) | English

# Apple Notes MCP

A TypeScript MCP (Model Context Protocol) server that lets AI assistants (Claude, etc.) save well-organized technical articles to **Apple Notes** and **local Markdown files** simultaneously.

## Features

- **Markdown input** — AI writes Markdown, the server converts it to Apple Notes rich HTML automatically
- **Dual write** — saves to both `~/Documents/notes/[category]/[title].md` and Apple Notes at the same time
- **Auto folder creation** — if the target folder doesn't exist, it's created on the fly
- **Article metadata** — automatically appends save time, tags, and source to each note
- **Provider pattern** — clean extensible architecture; adding new targets (Yuque, Feishu, etc.) requires zero changes to existing code
- **Configurable via env vars** — notes root dir and enabled providers are all configurable

## Tools

| Tool | Description |
|---|---|
| `save_article` | Save a Markdown article to all enabled providers |
| `list_articles` | List articles in a folder (or all folders) |
| `search_articles` | Full-text search across all notes |
| `get_article` | Read a note by ID |
| `list_folders` | List all Apple Notes folders |

## Architecture

```
AI Client (Claude Desktop / Claude Code)
        │  stdio (MCP protocol)
        ▼
MCP Server (index.ts)
        │
        ▼
save-article.ts  ← orchestration only, 9 lines
        │
        ├──▶ LocalMarkdownProvider  →  ~/Documents/notes/[category]/[title].md
        │
        └──▶ AppleNotesProvider     →  osascript → Apple Notes App
```

Each provider implements the `NoteProvider` interface:

```typescript
export interface NoteProvider {
  readonly name: string;
  save(article: Article): Promise<ProviderResult>;
}
```

Adding a new provider (e.g. Yuque) only requires:
1. Create `src/providers/yuque.ts` implementing `NoteProvider`
2. Register it in `src/providers/index.ts`
3. Add any required env vars (e.g. `YUQUE_TOKEN`)

No existing code needs to change.

## Requirements

- macOS (Apple Notes via AppleScript)
- Node.js v18+
- iCloud account with Notes sync enabled

## Installation

```bash
git clone https://github.com/fattoliu/apple-notes-mcp.git
cd apple-notes-mcp
npm install
npm run build
```

## Configuration

Add to your Claude Desktop config (`~/Library/Application Support/Claude/claude_desktop_config.json`) or project `.mcp.json`:

```json
{
  "mcpServers": {
    "apple-notes": {
      "command": "node",
      "args": ["/path/to/apple-notes-mcp/dist/index.js"],
      "env": {
        "NOTES_ROOT": "/Users/yourname/Documents/notes",
        "ENABLE_LOCAL_MD": "true",
        "ENABLE_APPLE_NOTES": "true"
      }
    }
  }
}
```

### Environment Variables

| Variable | Description | Default |
|---|---|---|
| `NOTES_ROOT` | Root directory for local Markdown files | `~/Documents/notes` |
| `ENABLE_LOCAL_MD` | Enable local Markdown saving | `true` |
| `ENABLE_APPLE_NOTES` | Enable Apple Notes saving | `true` |

## Usage

After setup, just tell Claude:

> Summarize our conversation about X into a technical article, save it to the "TypeScript" category with tags ts and generics.

Claude will call `save_article` and both targets are written automatically.

## macOS Permissions

On first run, macOS will prompt you to allow access to Notes. Click **Allow**.

If the prompt doesn't appear, go to:
**System Settings → Privacy & Security → Automation** and grant access manually.

## License

MIT
