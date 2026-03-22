// Edge Runtime - supports long-running streaming with no timeout
// Embeds the deep-book-deconstruction skill methodology directly in the system prompt
// (Skills API container requires code_execution which causes idle SSE gaps on Netlify)
export const runtime = 'edge';

const DEEP_BOOK_DECONSTRUCTION_PROMPT = `你是一位世界顶级的书籍分析师、文学评论家和知识综合者。
你的任务是按照 deep-book-deconstruction 方法论，创建一份出版级质量的书籍全面解构分析报告。

## 输出格式
生成一个完整的、自包含的 HTML 文档，所有 CSS 嵌入在 <style> 标签中。
使用靛蓝/紫色渐变主题，现代卡片布局，响应式设计。

## 必须包含的章节

### 1. 英雄区 (Hero Section)
- 书名（大号、突出显示）
- 作者姓名
- 分类徽章
- 渐变背景

### 2. 一句话精华
- 优雅的引用卡片样式，捕捉全书核心信息
- 40-80个中文字符

### 3. 作者与创作背景
- 详细的作者传记和资历
- 书籍创作的历史/思想背景
- 作者独特的视角及其资格

### 4. 核心论点与思想框架
- 中心论点或核心主张
- 思想框架或理论模型
- 论证的结构方式

### 5. 逐章深度解构（5-8 章）
- 每章包含 2-3 段深度分析
- 关键论点和证据
- 值得注意的例子和案例研究
- 各章之间的逻辑递进关系

### 6. 关键洞见（5-8 个洞见）
- 每个洞见配清晰标题和图标
- 2-3 段深入探讨
- 现实世界的影响和应用
- 为什么这个洞见很重要

### 7. 实践应用
- 具体、可操作的要点
- 如何在日常生活/工作中应用书中理念
- 具体的练习或实践方法

### 8. 批判性思考
- 本书方法论的优势
- 弱点和局限性
- 潜在的偏见或盲点
- 与该领域其他著作的比较

### 9. 延伸阅读推荐（3-5 本书）
- 相关的互补或对比书籍
- 简要说明每本书的相关性
- 它们如何扩展或挑战本书的观点

### 10. 最终评价
- 总体评估与星级评分
- 谁应该阅读这本书
- 持久的影响力和意义

## 样式指南
- 全部内容使用中文
- 内容要有思想深度、专业性，不要泛泛而谈
- 使用 emoji 图标增加视觉丰富度（📚 💡 🎯 📖 ✨ 🔑 🌟 🧠 💭 📝 等）
- CSS 在 <style> 标签中，HTML 属性使用单引号
- 移动端响应式设计
- 使用靛蓝/紫色渐变色系（#1e1b4b, #312e81, #4338ca, #6366f1, #818cf8, #c4b5fd）
- 现代卡片布局，微妙阴影效果
- 页脚："由 AI 深度解读生成 · JohnnyDesktop"

## 关键要求
- 直接输出 HTML 文档，从 <!DOCTYPE html> 开始到 </html> 结束
- 不要输出任何 HTML 以外的文字、解释或 markdown
- 每个章节都要有实质性的深度内容，不要敷衍
- 总内容量应该在 8000-15000 中文字符`;

export async function POST(req: Request) {
  const { title, author = '', metadata } = await req.json();

  if (!title) {
    return Response.json({ error: 'Title is required' }, { status: 400 });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return Response.json({ error: 'ANTHROPIC_API_KEY 未配置' }, { status: 500 });
  }

  const bookRef = author ? `《${title}》（${author}）` : `《${title}》`;

  // Build context from metadata if available
  const metadataContext = metadata
    ? `\n\n已知分析信息：
- 分类：${metadata.category}
- 核心论点：${metadata.coreThesis}
- 作者背景：${metadata.authorBackground}
- 章节大纲：${(metadata.chapterOutline || []).map((ch: { title: string; keyPoint: string }, i: number) => `${i + 1}. ${ch.title}: ${ch.keyPoint}`).join('\n')}
- 关键洞见：${(metadata.keyInsights || []).map((ins: { title: string; description: string }, i: number) => `${i + 1}. ${ins.title}: ${ins.description}`).join('\n')}`
    : '';

  try {
    // Regular Messages API with streaming (no container/skills/code_execution)
    // The deep-book-deconstruction methodology is embedded in the system prompt
    const apiResponse = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 16000,
        stream: true,
        system: DEEP_BOOK_DECONSTRUCTION_PROMPT,
        messages: [
          {
            role: 'user',
            content: `请对 ${bookRef} 进行全面深度解构分析，严格按照所有 10 个章节要求生成完整的 HTML 报告。${metadataContext}`,
          },
        ],
      }),
    });

    if (!apiResponse.ok) {
      const errBody = await apiResponse.text();
      console.error('Anthropic API error:', apiResponse.status, errBody);
      return Response.json(
        { error: `API 错误 (${apiResponse.status}): ${errBody.slice(0, 300)}` },
        { status: 502 }
      );
    }

    // Proxy the SSE stream directly to the client
    return new Response(apiResponse.body, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error) {
    console.error('API error:', error);
    const msg = error instanceof Error ? error.message : '未知错误';
    return Response.json({ error: msg }, { status: 502 });
  }
}
