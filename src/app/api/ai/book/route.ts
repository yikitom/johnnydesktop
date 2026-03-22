import { NextRequest } from 'next/server';

// deep-book-deconstruction: 3 steps, each within Netlify 30s proxy timeout
// Step 1: Metadata (Haiku, tool_use, ~5s)
// Step 2: HTML Part 1 (Haiku, direct text, ~15s) - Sections 1-5
// Step 3: HTML Part 2 (Haiku, direct text, ~15s) - Sections 6-10

const CATEGORIES = ['文学小说', '商业管理', '科技创新', '心理学', '历史人文', '哲学思想', '自我成长', '社会科学', '艺术设计', '科普读物'];

const METADATA_TOOL = {
  name: 'save_metadata',
  description: 'Save book metadata and analysis outline',
  input_schema: {
    type: 'object' as const,
    properties: {
      category: { type: 'string' as const, enum: CATEGORIES },
      author: { type: 'string' as const, description: 'The author name in Chinese (e.g. 丹尼尔·卡尼曼). If unknown, provide best guess.' },
      oneSentenceSummary: { type: 'string' as const, description: 'A sharp, provocative one-sentence hook in Chinese (40-80 chars). Should be bold and opinionated — like a book review headline that makes people want to read more. Avoid generic descriptions.' },
      authorBackground: { type: 'string' as const, description: 'Author background in Chinese (100-200 chars)' },
      coreThesis: { type: 'string' as const, description: 'Core thesis in Chinese (150-300 chars)' },
      chapterOutline: {
        type: 'array' as const,
        items: { type: 'object' as const, properties: { title: { type: 'string' as const }, keyPoint: { type: 'string' as const } }, required: ['title', 'keyPoint'] },
        description: '5-8 chapters',
      },
      keyInsights: {
        type: 'array' as const,
        items: { type: 'object' as const, properties: { title: { type: 'string' as const }, description: { type: 'string' as const } }, required: ['title', 'description'] },
        description: '5-8 insights',
      },
    },
    required: ['category', 'author', 'oneSentenceSummary', 'authorBackground', 'coreThesis', 'chapterOutline', 'keyInsights'],
  },
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function callClaudeWithTool(apiKey: string, model: string, maxTokens: number, system: string, userMessage: string, tool: { name: string; description: string; input_schema: any }) {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({ model, max_tokens: maxTokens, system, tools: [tool], tool_choice: { type: 'tool', name: tool.name }, messages: [{ role: 'user', content: userMessage }] }),
  });
  if (!res.ok) { const e = await res.text(); throw new Error(`API错误(${res.status}): ${e.slice(0, 200)}`); }
  const data = await res.json();
  const toolUse = data.content?.find((b: { type: string }) => b.type === 'tool_use');
  if (!toolUse?.input) throw new Error('AI 未返回有效结果');
  return toolUse.input;
}

async function callClaudeText(apiKey: string, model: string, maxTokens: number, system: string, userMessage: string): Promise<string> {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({ model, max_tokens: maxTokens, system, messages: [{ role: 'user', content: userMessage }] }),
  });
  if (!res.ok) { const e = await res.text(); throw new Error(`API错误(${res.status}): ${e.slice(0, 200)}`); }
  const data = await res.json();
  const textBlock = data.content?.find((b: { type: string }) => b.type === 'text');
  return textBlock?.text || '';
}

const DEEP_SYSTEM = `你正在执行 deep-book-deconstruction 方法论——出版级书籍深度解构分析。
直接输出 HTML section 标签，不要输出任何其他文字或解释。
规则：使用单引号、<section class='card'> 包裹、emoji 图标、靛蓝紫色系、中文、每节至少2段深度内容。`;

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { title, author = '', step = 1 } = body;

  if (!title) return Response.json({ error: 'Title is required' }, { status: 400 });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return Response.json({ error: 'ANTHROPIC_API_KEY 未配置' }, { status: 500 });

  const bookRef = author ? `"${title}" by ${author}` : `"${title}"`;

  try {
    if (step === 1) {
      const result = await callClaudeWithTool(apiKey, 'claude-haiku-4-5-20251001', 2000,
        'You are a world-class book analyst. Provide rich, insightful analysis in Chinese.',
        `Comprehensive metadata analysis for ${bookRef}: category, one-sentence summary, author background, core thesis, chapter outline (5-8), key insights (5-8). All in Chinese.`,
        METADATA_TOOL);
      return Response.json({ step: 1, metadata: result });
    }

    if (step === 2) {
      const { metadata } = body;
      if (!metadata) return Response.json({ error: 'metadata required' }, { status: 400 });

      const html = await callClaudeText(apiKey, 'claude-haiku-4-5-20251001', 3000, DEEP_SYSTEM,
        `deep-book-deconstruction Part 1 for ${bookRef}:
Category: ${metadata.category} | Thesis: ${metadata.coreThesis} | Author: ${metadata.authorBackground}
Chapters: ${(metadata.chapterOutline || []).map((c: { title: string; keyPoint: string }, i: number) => `${i + 1}.${c.title}`).join(', ')}

生成5个HTML sections:
1. 🎯 Hero区(书名/作者/分类徽章/渐变背景)
2. 💬 一句话精华(引用卡片:"${metadata.oneSentenceSummary}")
3. 👤 作者背景(详细传记3段)
4. 🧠 核心论点(思想框架3段)
5. 📖 逐章解构(${(metadata.chapterOutline || []).length}章,每章2段分析)`);

      return Response.json({ step: 2, htmlPart1: html });
    }

    if (step === 3) {
      const { metadata } = body;
      if (!metadata) return Response.json({ error: 'metadata required' }, { status: 400 });

      const html = await callClaudeText(apiKey, 'claude-haiku-4-5-20251001', 3000, DEEP_SYSTEM,
        `deep-book-deconstruction Part 2 for ${bookRef}:
Category: ${metadata.category} | Thesis: ${metadata.coreThesis}
Insights: ${(metadata.keyInsights || []).map((i: { title: string }, n: number) => `${n + 1}.${i.title}`).join(', ')}

生成5个HTML sections:
6. 💡 关键洞见(${(metadata.keyInsights || []).length}个,每个标题+图标+2段深入分析)
7. ⚡ 实践应用(具体可操作建议)
8. 🔍 批判性思考(优势/局限/与其他著作比较)
9. 📚 延伸阅读(3-5本推荐+理由)
10. ⭐ 最终评价(星级/目标读者/影响力)`);

      return Response.json({ step: 3, htmlPart2: html });
    }

    return Response.json({ error: 'Invalid step' }, { status: 400 });
  } catch (error) {
    console.error('API error:', error);
    return Response.json({ error: error instanceof Error ? error.message : '未知错误' }, { status: 502 });
  }
}
