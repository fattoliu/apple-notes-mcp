import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

import { saveArticle } from "./tools/save-article.js";
import { listArticles } from "./tools/list-articles.js";
import { searchArticles } from "./tools/search-articles.js";
import { getArticle } from "./tools/get-article.js";
import { listFolders } from "./tools/list-folders.js";

const server = new Server(
  {
    name: "apple-notes-mcp",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// 注册工具列表
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "save_article",
        description:
          "将 AI 整理的技术文章（Markdown 格式）保存到 Apple Notes 备忘录。自动转换 Markdown 为 HTML，在指定文件夹下创建笔记（文件夹不存在时自动创建），并在文章末尾追加保存时间、标签、来源等元数据。",
        inputSchema: {
          type: "object",
          properties: {
            title: {
              type: "string",
              description: "文章标题",
            },
            content: {
              type: "string",
              description:
                "文章内容，Markdown 格式。支持标题（#-######）、粗体、斜体、行内代码、代码块、列表、引用块、链接、分割线等。",
            },
            category: {
              type: "string",
              description:
                "保存到的分类名称，同时作为本地目录名和 Apple Notes 文件夹名。如果不存在会自动创建。",
            },
            tags: {
              type: "array",
              items: { type: "string" },
              description: "文章标签列表，如 [\"TypeScript\", \"Node.js\"]",
            },
            source: {
              type: "string",
              description: '文章来源说明，如"Claude 对话整理"',
            },
          },
          required: ["title", "content", "category"],
        },
      },
      {
        name: "list_articles",
        description:
          "列出 Apple Notes 中指定文件夹下的所有文章，返回文章标题、ID 和修改时间。不指定文件夹则列出所有文章。",
        inputSchema: {
          type: "object",
          properties: {
            category: {
              type: "string",
              description:
                "文件夹名称。不指定则列出所有文件夹中的所有文章。",
            },
          },
          required: [],
        },
      },
      {
        name: "search_articles",
        description:
          "在 Apple Notes 中搜索文章，支持按标题和内容关键词搜索，返回匹配的文章标题、ID 和所在文件夹。",
        inputSchema: {
          type: "object",
          properties: {
            query: {
              type: "string",
              description: "搜索关键词，会在文章标题和正文中匹配",
            },
          },
          required: ["query"],
        },
      },
      {
        name: "get_article",
        description:
          "读取 Apple Notes 中指定 ID 的笔记内容，返回文章标题和 HTML 内容。",
        inputSchema: {
          type: "object",
          properties: {
            note_id: {
              type: "string",
              description:
                '笔记 ID，格式为 Core Data 路径，如 "x-coredata://UUID/ICNote/p1234"',
            },
          },
          required: ["note_id"],
        },
      },
      {
        name: "list_folders",
        description:
          "列出 Apple Notes iCloud 账户下的所有文件夹，返回文件夹名称和 ID 列表。",
        inputSchema: {
          type: "object",
          properties: {},
          required: [],
        },
      },
    ],
  };
});

// 处理工具调用
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case "save_article": {
        if (!args || typeof args.title !== "string" || typeof args.content !== "string" || typeof args.category !== "string") {
          throw new Error("save_article 需要 title、content、category 参数");
        }
        const result = await saveArticle({
          title: args.title,
          content: args.content,
          category: args.category,
          tags: Array.isArray(args.tags) ? args.tags as string[] : undefined,
          source: typeof args.source === "string" ? args.source : undefined,
        });
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case "list_articles": {
        const category =
          args && typeof args.category === "string" ? args.category : undefined;
        const result = await listArticles(category);
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case "search_articles": {
        if (!args || typeof args.query !== "string") {
          throw new Error("search_articles 需要 query 参数");
        }
        const result = await searchArticles(args.query);
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case "get_article": {
        if (!args || typeof args.note_id !== "string") {
          throw new Error("get_article 需要 note_id 参数");
        }
        const result = await getArticle(args.note_id);
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case "list_folders": {
        const result = await listFolders();
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      default:
        throw new Error(`未知工具: ${name}`);
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({ success: false, message }, null, 2),
        },
      ],
      isError: true,
    };
  }
});

// 启动服务器
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Apple Notes MCP 服务器已启动");
}

main().catch((error) => {
  console.error("服务器启动失败:", error);
  process.exit(1);
});
