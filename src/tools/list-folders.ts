import { runAppleScriptFile } from "../applescript.js";

export interface FolderInfo {
  id: string;
  name: string;
}

export interface ListFoldersResult {
  success: boolean;
  folders?: FolderInfo[];
  message: string;
}

/**
 * 列出 Apple Notes iCloud 账户下的所有文件夹
 */
export async function listFolders(): Promise<ListFoldersResult> {
  const script = `
tell application "Notes"
  set acc to account "iCloud"
  set result to ""

  repeat with f in folders of acc
    set folderId to id of f
    set folderName to name of f
    set result to result & folderId & "|||" & folderName & "\\n"
  end repeat

  return result
end tell
`;

  try {
    const output = await runAppleScriptFile(script);
    const folders: FolderInfo[] = [];
    const lines = output.split("\n").filter((l) => l.trim());

    for (const line of lines) {
      const parts = line.split("|||");
      if (parts.length >= 2) {
        folders.push({
          id: parts[0].trim(),
          name: parts[1].trim(),
        });
      }
    }

    return {
      success: true,
      folders,
      message: `共 ${folders.length} 个文件夹`,
    };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      success: false,
      message: `获取文件夹列表失败: ${message}`,
    };
  }
}
