/**
 * 轻量级 Markdown 转 Apple Notes HTML 转换器
 * 不依赖第三方库，支持 Apple Notes 的 HTML 子集
 */

/**
 * 转义 HTML 特殊字符（供外部使用）
 */
export function escapeHtmlEntities(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * 转义 HTML 特殊字符（内部使用）
 */
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * 处理行内元素（bold, italic, code, links）
 */
function processInline(text: string): string {
  // 先处理行内代码，避免内部内容被其他规则处理
  // 用占位符替换行内代码
  const codePlaceholders: string[] = [];
  text = text.replace(/`([^`]+)`/g, (_, code) => {
    const placeholder = `\x00CODE${codePlaceholders.length}\x00`;
    codePlaceholders.push(
      `<code style="font-family: monospace; background: #f4f4f4; padding: 2px 4px; border-radius: 3px;">${escapeHtml(code)}</code>`
    );
    return placeholder;
  });

  // 处理链接 [text](url)
  text = text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_, linkText, url) => {
    return `<a href="${escapeHtml(url)}">${escapeHtml(linkText)}</a>`;
  });

  // 处理粗体 **text** 或 __text__
  text = text.replace(/\*\*([^*]+)\*\*/g, (_, content) => `<b>${content}</b>`);
  text = text.replace(/__([^_]+)__/g, (_, content) => `<b>${content}</b>`);

  // 处理斜体 *text* 或 _text_（注意：不能匹配已处理的粗体）
  text = text.replace(/\*([^*]+)\*/g, (_, content) => `<i>${content}</i>`);
  text = text.replace(/_([^_]+)_/g, (_, content) => `<i>${content}</i>`);

  // 恢复代码占位符
  codePlaceholders.forEach((code, i) => {
    text = text.replace(`\x00CODE${i}\x00`, code);
  });

  return text;
}

/**
 * 将 Markdown 转换为 Apple Notes 支持的 HTML
 */
export function markdownToHtml(markdown: string): string {
  const lines = markdown.split("\n");
  const htmlParts: string[] = [];

  let i = 0;
  let inList = false;
  let listType: "ul" | "ol" | null = null;
  let inBlockquote = false;
  let blockquoteLines: string[] = [];

  const flushBlockquote = () => {
    if (inBlockquote && blockquoteLines.length > 0) {
      const content = blockquoteLines
        .map((l) => processInline(l))
        .join("<br>");
      htmlParts.push(
        `<blockquote style="border-left: 4px solid #ccc; padding-left: 12px; color: #666; margin: 8px 0;">${content}</blockquote>`
      );
      blockquoteLines = [];
      inBlockquote = false;
    }
  };

  const flushList = () => {
    if (inList && listType) {
      // 最后一个 </li> 和列表闭合标签在累积时已经处理
      // 实际上我们需要重新设计列表处理逻辑
      inList = false;
      listType = null;
    }
  };

  // 重新设计：先收集所有 token，再生成 HTML
  // 简化处理：逐行处理，维护状态

  const output: string[] = [];
  let currentListType: "ul" | "ol" | null = null;
  let currentListItems: string[] = [];
  let currentBqLines: string[] = [];
  let inCodeBlock = false;
  let codeBlockLang = "";
  let codeBlockLines: string[] = [];

  const flushCurrentList = () => {
    if (currentListItems.length > 0 && currentListType) {
      const tag = currentListType;
      const items = currentListItems
        .map((item) => `<li>${processInline(item)}</li>`)
        .join("\n");
      output.push(`<${tag}>\n${items}\n</${tag}>`);
      currentListItems = [];
      currentListType = null;
    }
  };

  const flushCurrentBq = () => {
    if (currentBqLines.length > 0) {
      const content = currentBqLines.map((l) => processInline(l)).join("<br>");
      output.push(
        `<blockquote style="border-left: 4px solid #ccc; padding-left: 12px; color: #666; margin: 8px 0;">${content}</blockquote>`
      );
      currentBqLines = [];
    }
  };

  const flushCodeBlock = () => {
    if (codeBlockLines.length > 0 || inCodeBlock) {
      const code = escapeHtml(codeBlockLines.join("\n"));
      output.push(
        `<pre style="font-family: monospace; background: #f4f4f4; padding: 12px; border-radius: 4px; overflow-x: auto; margin: 8px 0;"><code>${code}</code></pre>`
      );
      codeBlockLines = [];
      codeBlockLang = "";
      inCodeBlock = false;
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // 代码块开始/结束
    if (line.match(/^```(\w*)/)) {
      if (inCodeBlock) {
        // 结束代码块
        flushCodeBlock();
      } else {
        // 开始代码块：先刷新其他状态
        flushCurrentList();
        flushCurrentBq();
        inCodeBlock = true;
        codeBlockLang = line.match(/^```(\w*)/)![1] || "";
        codeBlockLines = [];
      }
      continue;
    }

    if (inCodeBlock) {
      codeBlockLines.push(line);
      continue;
    }

    // 分割线 --- 或 ***
    if (line.match(/^(-{3,}|\*{3,}|_{3,})\s*$/)) {
      flushCurrentList();
      flushCurrentBq();
      output.push("<hr>");
      continue;
    }

    // 标题 # ## ### etc.
    const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);
    if (headingMatch) {
      flushCurrentList();
      flushCurrentBq();
      const level = headingMatch[1].length;
      const text = processInline(headingMatch[2]);
      output.push(`<h${level}>${text}</h${level}>`);
      continue;
    }

    // 引用块 >
    const bqMatch = line.match(/^>\s?(.*)/);
    if (bqMatch) {
      flushCurrentList();
      currentBqLines.push(bqMatch[1]);
      continue;
    } else if (currentBqLines.length > 0) {
      flushCurrentBq();
    }

    // 无序列表 - item 或 * item
    const ulMatch = line.match(/^[-*]\s+(.+)$/);
    if (ulMatch) {
      if (currentListType === "ol") {
        flushCurrentList();
      }
      currentListType = "ul";
      currentListItems.push(ulMatch[1]);
      continue;
    }

    // 有序列表 1. item
    const olMatch = line.match(/^\d+\.\s+(.+)$/);
    if (olMatch) {
      if (currentListType === "ul") {
        flushCurrentList();
      }
      currentListType = "ol";
      currentListItems.push(olMatch[1]);
      continue;
    }

    // 不是列表项，刷新列表
    if (currentListItems.length > 0) {
      flushCurrentList();
    }

    // 空行
    if (line.trim() === "") {
      // 空行用于分隔段落，不额外输出
      continue;
    }

    // 普通段落
    output.push(`<p>${processInline(line)}</p>`);
  }

  // 刷新剩余状态
  if (inCodeBlock) {
    flushCodeBlock();
  }
  flushCurrentList();
  flushCurrentBq();

  return output.join("\n");
}

/**
 * 生成元数据尾注 HTML
 */
export function generateMetaFooter(options: {
  tags?: string[];
  source?: string;
  savedAt?: Date;
}): string {
  const { tags, source, savedAt = new Date() } = options;

  // 格式化时间
  const timeStr = savedAt
    .toLocaleString("zh-CN", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    })
    .replace(/\//g, "-");

  const metaLines: string[] = [`<b>保存时间：</b>${timeStr}`];

  if (tags && tags.length > 0) {
    metaLines.push(`<b>标签：</b>${tags.join(" · ")}`);
  }

  if (source) {
    metaLines.push(`<b>来源：</b>${escapeHtml(source)}`);
  }

  return `<hr>
<p style="color: #999; font-size: 12px;">
  ${metaLines.join("<br>\n  ")}
</p>`;
}
