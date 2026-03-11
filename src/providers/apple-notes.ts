import { runAppleScriptFile, escapeAppleScriptString } from "../applescript.js";
import { markdownToHtml, generateMetaFooter, escapeHtmlEntities } from "../markdown.js";
import type { NoteProvider, Article, ProviderResult } from "./base.js";

export class AppleNotesProvider implements NoteProvider {
  readonly name = "Apple Notes";

  async save(article: Article): Promise<ProviderResult> {
    try {
      const contentHtml = markdownToHtml(article.content);
      const metaHtml = generateMetaFooter({
        tags: article.tags,
        source: article.source,
        savedAt: article.savedAt,
      });

      const fullHtml = `<h1>${escapeHtmlEntities(article.title)}</h1>\n${contentHtml}\n${metaHtml}`;
      const escapedHtml = escapeAppleScriptString(fullHtml);
      const escapedCategory = escapeAppleScriptString(article.category);

      const script = `
tell application "Notes"
  set acc to account "iCloud"

  set targetFolder to missing value
  repeat with f in folders of acc
    if name of f is "${escapedCategory}" then
      set targetFolder to f
      exit repeat
    end if
  end repeat

  if targetFolder is missing value then
    set targetFolder to make new folder at acc with properties {name: "${escapedCategory}"}
  end if

  set newNote to make new note at targetFolder with properties {body: "${escapedHtml}"}
  return id of newNote
end tell
`;

      const noteId = await runAppleScriptFile(script);
      return {
        provider: this.name,
        success: true,
        location: noteId,
        message: `已保存至 Apple Notes，ID：${noteId}`,
      };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return { provider: this.name, success: false, message: `保存失败：${msg}` };
    }
  }
}
