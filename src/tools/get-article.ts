import { runAppleScriptFile, escapeAppleScriptString } from "../applescript.js";

export interface GetArticleResult {
  success: boolean;
  title?: string;
  content?: string;
  message: string;
}

/**
 * 读取指定 ID 的笔记内容
 * note_id 格式：x-coredata://UUID/ICNote/p1234
 */
export async function getArticle(noteId: string): Promise<GetArticleResult> {
  const escapedId = escapeAppleScriptString(noteId);

  const script = `
tell application "Notes"
  set acc to account "iCloud"

  -- 遍历所有文件夹查找指定 ID 的笔记
  repeat with f in folders of acc
    repeat with n in notes of f
      if id of n is "${escapedId}" then
        set noteName to name of n
        set noteBody to body of n
        return noteName & "|||CONTENT|||" & noteBody
      end if
    end repeat
  end repeat

  return "ERROR:找不到 ID 为「${escapedId}」的笔记"
end tell
`;

  try {
    const output = await runAppleScriptFile(script);

    if (output.startsWith("ERROR:")) {
      return {
        success: false,
        message: output.slice(6),
      };
    }

    const separatorIndex = output.indexOf("|||CONTENT|||");
    if (separatorIndex === -1) {
      return {
        success: false,
        message: "解析笔记内容失败",
      };
    }

    const title = output.slice(0, separatorIndex);
    const content = output.slice(separatorIndex + "|||CONTENT|||".length);

    return {
      success: true,
      title,
      content,
      message: `成功读取文章《${title}》`,
    };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      success: false,
      message: `读取文章失败: ${message}`,
    };
  }
}
