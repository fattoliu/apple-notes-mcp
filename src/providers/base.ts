/**
 * 文章数据结构（Provider 间共享的标准格式）
 */
export interface Article {
  title: string;
  content: string;   // Markdown 原文
  category: string;
  tags?: string[];
  source?: string;
  savedAt: Date;
}

/**
 * 每个 Provider 的保存结果
 */
export interface ProviderResult {
  provider: string;   // Provider 名称
  success: boolean;
  location?: string;  // 文件路径 / 笔记ID / URL，各 provider 自行表达
  message: string;
}

/**
 * 所有笔记服务商必须实现的接口
 */
export interface NoteProvider {
  readonly name: string;
  save(article: Article): Promise<ProviderResult>;
}
