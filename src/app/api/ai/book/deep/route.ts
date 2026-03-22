// Edge Runtime for streaming support
// Uses deep-book-deconstruction methodology in two parts to avoid connection drops
export const runtime = 'edge';

const STYLE_GUIDE = `## 样式指南
- 全部内容使用中文，内容要有思想深度和专业性
- 使用 emoji 图标增加视觉丰富度
- 靛蓝/紫色渐变色系（#1e1b4b, #312e81, #4338ca, #6366f1, #818cf8, #c4b5fd）
- 现代卡片布局，微妙阴影
- 每个 section 使用 <section class='card'> 包裹`;

const PART1_PROMPT = `你是世界顶级书籍分析师，执行 deep-book-deconstruction 方法论。
生成 HTML 片段（不包含 <!DOCTYPE>、<html>、<head>、<body> 标签，只输出 <section> 内容）。

生成以下 5 个章节的 HTML：

### 1. 英雄区 (Hero Section)
书名大号显示、作者、分类徽章、渐变背景 section

### 2. 一句话精华
优雅引用卡片，40-80字捕捉全书核心

### 3. 作者与创作背景
详细作者传记、资历、创作语境（至少3段）

### 4. 核心论点与思想框架
中心论点、理论模型、论证结构（至少3段）

### 5. 逐章深度解构（5-8 章）
每章 2-3 段深度分析，含关键论点、案例、逻辑递进

${STYLE_GUIDE}

直接输出 HTML section 标签，不要输出任何其他文字。`;

const PART2_PROMPT = `你是世界顶级书籍分析师，执行 deep-book-deconstruction 方法论。
生成 HTML 片段（只输出 <section> 内容，不包含文档级标签）。

生成以下 5 个章节的 HTML：

### 6. 关键洞见（5-8 个）
每个洞见：标题 + 图标 + 2-3段深入探讨 + 现实意义

### 7. 实践应用
具体可操作建议，如何应用到日常生活和工作

### 8. 批判性思考
优势、弱点、局限性、偏见、与其他著作比较

### 9. 延伸阅读推荐（3-5 本）
相关书籍 + 为什么推荐 + 如何补充本书

### 10. 最终评价
总体评估、星级评分、目标读者、持久影响力

${STYLE_GUIDE}

直接输出 HTML section 标签，不要输出任何其他文字。`;

export async function POST(req: Request) {
  const { title, author = '', metadata, part = 1 } = await req.json();

  if (!title) {
    return Response.json({ error: 'Title is required' }, { status: 400 });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return Response.json({ error: 'ANTHROPIC_API_KEY 未配置' }, { status: 500 });
  }

  const bookRef = author ? `《${title}》（${author}）` : `《${title}》`;

  const metadataContext = metadata
    ? `\n已知信息：分类：${metadata.category}，核心论点：${metadata.coreThesis}，作者：${metadata.authorBackground}
章节：${(metadata.chapterOutline || []).map((ch: { title: string; keyPoint: string }, i: number) => `${i + 1}.${ch.title}`).join('、')}
洞见：${(metadata.keyInsights || []).map((ins: { title: string }, i: number) => `${i + 1}.${ins.title}`).join('、')}`
    : '';

  const systemPrompt = part === 1 ? PART1_PROMPT : PART2_PROMPT;

  try {
    const apiResponse = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 5000,
        stream: true,
        system: systemPrompt,
        messages: [
          {
            role: 'user',
            content: `对 ${bookRef} 执行 deep-book-deconstruction 分析，生成第${part === 1 ? '上' : '下'}半部分的 HTML sections。${metadataContext}`,
          },
        ],
      }),
    });

    if (!apiResponse.ok) {
      const errBody = await apiResponse.text();
      console.error('API error:', apiResponse.status, errBody);
      return Response.json(
        { error: `API 错误 (${apiResponse.status}): ${errBody.slice(0, 300)}` },
        { status: 502 }
      );
    }

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
