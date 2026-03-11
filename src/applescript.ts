import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

/**
 * 执行 AppleScript 脚本，返回输出结果
 */
export async function runAppleScript(script: string): Promise<string> {
  try {
    const { stdout, stderr } = await execAsync(`osascript -e '${script}'`, {
      maxBuffer: 10 * 1024 * 1024, // 10MB buffer
      timeout: 30000, // 30 秒超时
    });

    if (stderr && stderr.trim()) {
      // 有些 AppleScript 会把警告输出到 stderr，不一定是错误
      // 只有在 stdout 为空时才把 stderr 当作错误
      if (!stdout || !stdout.trim()) {
        throw new Error(`AppleScript 执行失败: ${stderr.trim()}`);
      }
    }

    return stdout.trim();
  } catch (error: unknown) {
    if (error instanceof Error) {
      const message = error.message;
      if (message.includes("iCloud")) {
        throw new Error(
          "无法访问 iCloud 账户，请确保已登录 iCloud 并启用备忘录同步"
        );
      }
      throw error;
    }
    throw new Error(`AppleScript 执行失败: ${String(error)}`);
  }
}

/**
 * 转义字符串，使其可以安全地嵌入 AppleScript 中
 * AppleScript 使用双引号字符串，需要转义双引号和反斜杠
 */
export function escapeAppleScriptString(str: string): string {
  return str
    .replace(/\\/g, "\\\\") // 先转义反斜杠
    .replace(/"/g, '\\"') // 转义双引号
    .replace(/\r\n/g, "\n") // 统一换行符
    .replace(/\r/g, "\n"); // 统一换行符
}

/**
 * 用 here-doc 风格执行多行 AppleScript，避免单引号转义问题
 */
export async function runAppleScriptFile(script: string): Promise<string> {
  const { writeFile, unlink } = await import("fs/promises");
  const { join } = await import("path");
  const { tmpdir } = await import("os");

  const tmpFile = join(tmpdir(), `applescript_${Date.now()}_${Math.random().toString(36).slice(2)}.scpt`);

  try {
    await writeFile(tmpFile, script, "utf8");
    const { stdout, stderr } = await execAsync(`osascript "${tmpFile}"`, {
      maxBuffer: 10 * 1024 * 1024,
      timeout: 30000,
    });

    if (stderr && stderr.trim()) {
      if (!stdout || !stdout.trim()) {
        throw new Error(`AppleScript 执行失败: ${stderr.trim()}`);
      }
    }

    return stdout.trim();
  } catch (error: unknown) {
    if (error instanceof Error) {
      const message = error.message;
      if (message.includes("iCloud")) {
        throw new Error(
          "无法访问 iCloud 账户，请确保已登录 iCloud 并启用备忘录同步"
        );
      }
      throw error;
    }
    throw new Error(`AppleScript 执行失败: ${String(error)}`);
  } finally {
    try {
      await unlink(tmpFile);
    } catch {
      // 忽略清理失败
    }
  }
}
