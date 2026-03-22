// Edge Runtime - supports long-running streaming with no timeout
// Uses Anthropic Skills API (beta) with deep-book-deconstruction skill
export const runtime = 'edge';

export async function POST(req: Request) {
  const { title, author = '', metadata } = await req.json();

  if (!title) {
    return Response.json({ error: 'Title is required' }, { status: 400 });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return Response.json(
      { error: 'ANTHROPIC_API_KEY 未配置' },
      { status: 500 }
    );
  }

  const bookRef = author ? `《${title}》（${author}）` : `《${title}》`;

  // Build context from metadata if available
  const metadataContext = metadata
    ? `\n\n已知信息：
- 分类：${metadata.category}
- 核心论点：${metadata.coreThesis}
- 作者背景：${metadata.authorBackground}
- 章节大纲：${(metadata.chapterOutline || []).map((ch: { title: string; keyPoint: string }, i: number) => `${i + 1}. ${ch.title}: ${ch.keyPoint}`).join('\n')}`
    : '';

  const systemPrompt = `你是一位世界顶级的书籍分析师和文学评论家。请使用 deep-book-deconstruction 技能对书籍进行全面、深入的解构分析。

输出要求：
- 直接输出一个完整的、自包含的 HTML 文档（从 <!DOCTYPE html> 开始）
- 所有 CSS 必须在 <style> 标签内（不使用外部链接）
- 使用靛蓝/紫色渐变主题，现代卡片布局，响应式设计
- HTML 属性尽量使用单引号
- 包含以下完整章节：
  1. 顶部英雄区（书名、作者、分类徽章）
  2. 一句话精华总结（引用卡片样式）
  3. 作者背景与创作语境（详细介绍）
  4. 核心论点与思想框架
  5. 逐章深度解构（5-8章，每章2-3段深入分析）
  6. 关键洞见（5-8个，每个配详细解释）
  7. 实践应用（具体可操作的建议）
  8. 批判性思考（优势与局限性）
  9. 延伸阅读推荐（3-5本相关书籍）
  10. 最终评价与目标读者
- 页脚："由 AI 深度解读生成 · JohnnyDesktop"
- 全部内容使用中文
- 内容要有深度、有洞见、有专业性，不要泛泛而谈

除 HTML 文档外，不要输出任何其他文字。`;

  const userMessage = `请对 ${bookRef} 进行深度解构分析，生成完整的 HTML 报告。${metadataContext}`;

  try {
    // Call Anthropic beta Messages API with container + skills + streaming
    const apiResponse = await fetch('https://api.anthropic.com/v1/messages?beta=true', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-beta': 'skills-2025-10-02',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-5-20250514',
        max_tokens: 16000,
        stream: true,
        container: {
          skills: [{
            skill_id: 'deep-book-deconstruction',
            type: 'anthropic',
          }],
        },
        system: systemPrompt,
        messages: [
          { role: 'user', content: userMessage },
        ],
      }),
    });

    if (!apiResponse.ok) {
      const errBody = await apiResponse.text();
      console.error('Anthropic Skills API error:', apiResponse.status, errBody);
      return Response.json(
        { error: `Skills API 错误 (${apiResponse.status}): ${errBody.slice(0, 300)}` },
        { status: 502 }
      );
    }

    // Proxy the SSE stream directly to the client
    // This keeps the connection alive for the entire generation duration
    return new Response(apiResponse.body, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error) {
    console.error('Skills API error:', error);
    return Response.json(
      { error: `Skills API 连接失败: ${error instanceof Error ? error.message : '未知错误'}` },
      { status: 502 }
    );
  }
}
