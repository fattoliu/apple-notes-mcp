import type { NoteProvider } from "./base.js";
import { LocalMarkdownProvider } from "./local-md.js";
import { AppleNotesProvider } from "./apple-notes.js";

/**
 * 根据环境变量决定启用哪些 Provider。
 *
 * 环境变量：
 *   ENABLE_LOCAL_MD=true/false     （默认 true）
 *   ENABLE_APPLE_NOTES=true/false  （默认 true）
 *
 * 以后新增 Provider 只需在此处注册，其余代码不动。
 */
export function buildProviders(): NoteProvider[] {
  const providers: NoteProvider[] = [];

  if (process.env.ENABLE_LOCAL_MD !== "false") {
    providers.push(new LocalMarkdownProvider());
  }

  if (process.env.ENABLE_APPLE_NOTES !== "false") {
    providers.push(new AppleNotesProvider());
  }

  return providers;
}

export type { NoteProvider } from "./base.js";
export type { Article, ProviderResult } from "./base.js";
