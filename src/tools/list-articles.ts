import { runAppleScriptFile, escapeAppleScriptString } from "../applescript.js";

export interface ArticleInfo {
  id: string;
  title: string;
  modified_at: string;
}

export interface ListArticlesResult {
  success: boolean;
  articles?: ArticleInfo[];
  message: string;
}

/**
 * 列出指定文件夹下的所有文章
 */
export async function listArticles(
  category?: string
): Promise<ListArticlesResult> {
  let script: string;

  if (category) {
    const escapedCategory = escapeAppleScriptString(category);
    script = `
tell application "Notes"
  set acc to account "iCloud"
  set result to ""

  -- 查找目标文件夹
  set targetFolder to missing value
  repeat with f in folders of acc
    if name of f is "${escapedCategory}" then
      set targetFolder to f
      exit repeat
    end if
  end repeat

  if targetFolder is missing value then
    return "ERROR:文件夹「${escapedCategory}」不存在"
  end if

  -- 列出文件夹中的笔记
  repeat with n in notes of targetFolder
    set noteId to id of n
    set noteName to name of n
    set noteDate to modification date of n
    set result to result & noteId & "|||" & noteName & "|||" & (noteDate as string) & "\\n"
  end repeat

  return result
end tell
`;
  } else {
    script = `
tell application "Notes"
  set acc to account "iCloud"
  set result to ""

  -- 列出所有文件夹中的笔记
  repeat with f in folders of acc
    repeat with n in notes of f
      set noteId to id of n
      set noteName to name of n
      set noteDate to modification date of n
      set folderName to name of f
      set result to result & noteId & "|||" & noteName & "|||" & (noteDate as string) & "|||" & folderName & "\\n"
    end repeat
  end repeat

  return result
end tell
`;
  }

  try {
    const output = await runAppleScriptFile(script);

    if (output.startsWith("ERROR:")) {
      return {
        success: false,
        message: output.slice(6),
      };
    }

    const articles: ArticleInfo[] = [];
    const lines = output.split("\n").filter((l) => l.trim());

    for (const line of lines) {
      const parts = line.split("|||");
      if (parts.length >= 3) {
        articles.push({
          id: parts[0].trim(),
          title: parts[1].trim(),
          modified_at: parts[2].trim(),
        });
      }
    }

    return {
      success: true,
      articles,
      message: `共找到 ${articles.length} 篇文章`,
    };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      success: false,
      message: `获取文章列表失败: ${message}`,
    };
  }
}
