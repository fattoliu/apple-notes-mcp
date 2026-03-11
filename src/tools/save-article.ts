import { buildProviders } from "../providers/index.js";
import type { ProviderResult } from "../providers/index.js";

export interface SaveArticleParams {
  title: string;
  content: string;
  category: string;
  tags?: string[];
  source?: string;
}

export interface SaveArticleResult {
  success: boolean;
  results: ProviderResult[];
  message: string;
}

const providers = buildProviders();

/**
 * 将文章同步保存到所有已启用的 Provider（本地 MD、Apple Notes 等）
 */
export async function saveArticle(params: SaveArticleParams): Promise<SaveArticleResult> {
  const article = { ...params, savedAt: new Date() };

  const settled = await Promise.allSettled(providers.map((p) => p.save(article)));

  const results: ProviderResult[] = settled.map((r, i) =>
    r.status === "fulfilled"
      ? r.value
      : { provider: providers[i].name, success: false, message: `异常：${String(r.reason)}` }
  );

  const success = results.some((r) => r.success);
  const message = results.map((r) => `[${r.provider}] ${r.message}`).join("\n");

  return { success, results, message };
}
