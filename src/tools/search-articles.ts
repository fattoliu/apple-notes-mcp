import { runAppleScriptFile, escapeAppleScriptString } from "../applescript.js";

export interface SearchResult {
  id: string;
  title: string;
  folder: string;
}

export interface SearchArticlesResult {
  success: boolean;
  results?: SearchResult[];
  message: string;
}

/**
 * 在 Apple Notes 中搜索文章
 */
export async function searchArticles(
  query: string
): Promise<SearchArticlesResult> {
  const escapedQuery = escapeAppleScriptString(query.toLowerCase());

  const script = `
tell application "Notes"
  set acc to account "iCloud"
  set result to ""
  set queryStr to "${escapedQuery}"

  repeat with f in folders of acc
    set folderName to name of f
    repeat with n in notes of f
      set noteName to name of n
      set noteBody to body of n
      -- 转为小写进行不区分大小写的搜索
      if (noteName contains queryStr) or (noteBody contains queryStr) then
        set noteId to id of n
        set result to result & noteId & "|||" & noteName & "|||" & folderName & "\\n"
      end if
    end repeat
  end repeat

  return result
end tell
`;

  try {
    const output = await runAppleScriptFile(script);
    const results: SearchResult[] = [];
    const lines = output.split("\n").filter((l) => l.trim());

    for (const line of lines) {
      const parts = line.split("|||");
      if (parts.length >= 3) {
        results.push({
          id: parts[0].trim(),
          title: parts[1].trim(),
          folder: parts[2].trim(),
        });
      }
    }

    return {
      success: true,
      results,
      message:
        results.length > 0
          ? `找到 ${results.length} 篇匹配「${query}」的文章`
          : `没有找到匹配「${query}」的文章`,
    };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      success: false,
      message: `搜索失败: ${message}`,
    };
  }
}
