import { mkdir, writeFile } from "fs/promises";
import { join } from "path";
import { homedir } from "os";
import type { NoteProvider, Article, ProviderResult } from "./base.js";

function toSafeFilename(title: string): string {
  return title
    .replace(/[/\\:*?"<>|]/g, "-")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 100);
}

function generateFrontMatter(article: Article): string {
  const dateStr = article.savedAt.toISOString().slice(0, 10);
  const lines = [
    "---",
    `title: "${article.title.replace(/"/g, '\\"')}"`,
    `date: ${dateStr}`,
  ];
  if (article.tags && article.tags.length > 0) {
    lines.push(`tags: [${article.tags.map((t) => `"${t}"`).join(", ")}]`);
  }
  if (article.source) {
    lines.push(`source: "${article.source.replace(/"/g, '\\"')}"`);
  }
  lines.push("---", "");
  return lines.join("\n");
}

export class LocalMarkdownProvider implements NoteProvider {
  readonly name = "本地 Markdown";

  private readonly notesRoot: string;

  constructor(notesRoot?: string) {
    this.notesRoot = notesRoot ?? process.env.NOTES_ROOT ?? join(homedir(), "Documents", "notes");
  }

  async save(article: Article): Promise<ProviderResult> {
    try {
      const dir = join(this.notesRoot, article.category);
      await mkdir(dir, { recursive: true });

      const filename = `${toSafeFilename(article.title)}.md`;
      const filepath = join(dir, filename);

      const fullContent = generateFrontMatter(article) + article.content;
      await writeFile(filepath, fullContent, "utf8");

      return {
        provider: this.name,
        success: true,
        location: filepath,
        message: `已保存至 ${filepath}`,
      };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return { provider: this.name, success: false, message: `保存失败：${msg}` };
    }
  }
}
