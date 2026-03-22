import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || '',
});

const DEEP_BOOK_DECONSTRUCTION_PROMPT = `You are a world-class book analyst and literary critic. Your task is to perform a "Deep Book Deconstruction" — a comprehensive, insightful analysis of the given book.

You must respond with a valid JSON object containing exactly these fields:
- "category": A single category string from this list: ["文学小说", "商业管理", "科技创新", "心理学", "历史人文", "哲学思想", "自我成长", "社会科学", "艺术设计", "科普读物"]. Choose the most accurate category based on the book's actual content and genre.
- "oneSentenceSummary": A compelling one-sentence summary in Chinese (40-80 characters)
- "summary": A markdown-formatted core summary in Chinese (300-500 characters), including author bio, core themes, key insights, and target audience
- "htmlContent": A complete, self-contained HTML document (with embedded CSS) that presents the deep book deconstruction report. The HTML must be beautiful, modern, and mobile-responsive.

For the htmlContent, follow this structure for your deep book deconstruction:

1. **Hero Section**: Book title, author, category badge with gradient background
2. **One-Line Summary**: Highlighted quote card
3. **Author & Background**: Who the author is, why they wrote this, historical context
4. **Core Framework**: The book's central thesis and analytical framework
5. **Chapter-by-Chapter Deconstruction** (at least 5-8 key chapters/sections):
   - Each chapter's core argument
   - Key concepts and terminology introduced
   - Supporting evidence and examples used
   - Critical analysis of the argument's strengths/weaknesses
6. **Key Insights & Takeaways**: 5-8 major insights with detailed explanation
7. **Practical Applications**: How readers can apply the book's lessons
8. **Critical Perspective**: Balanced critique — what the book does well and where it falls short
9. **Related Reading**: 3-5 related books that complement or contrast with this work
10. **Final Verdict**: Overall assessment and who should read this book

Design requirements for the HTML:
- Use a professional gradient color scheme (indigo/purple tones)
- Modern card-based layout with subtle shadows
- Responsive design that works on mobile
- Clean typography with proper line-height and spacing
- Use section dividers and visual hierarchy
- All styles must be inline or in a <style> tag (no external CSS)
- The HTML must be a complete document with <!DOCTYPE html>, <html>, <head>, <body>
- Include a footer: "由 AI 深度解读生成 · JohnnyDesktop"

IMPORTANT: Your entire response must be a single valid JSON object. Do not include any text before or after the JSON. Do not use markdown code blocks. The htmlContent value must have all quotes properly escaped.`;

export async function POST(req: NextRequest) {
  const { title, author = '' } = await req.json();

  if (!title) {
    return NextResponse.json(
      { error: 'Title is required' },
      { status: 400 }
    );
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    // Fallback to template when no API key
    return generateFallbackResponse(title, author);
  }

  try {
    const userMessage = author
      ? `Please perform a Deep Book Deconstruction for: "${title}" by ${author}`
      : `Please perform a Deep Book Deconstruction for: "${title}"`;

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 16000,
      messages: [
        {
          role: 'user',
          content: `${DEEP_BOOK_DECONSTRUCTION_PROMPT}\n\n${userMessage}`,
        },
      ],
    });

    const textBlock = message.content.find((b) => b.type === 'text');
    if (!textBlock || textBlock.type !== 'text') {
      throw new Error('No text response from Claude');
    }

    let responseText = textBlock.text.trim();
    // Strip markdown code blocks if present
    if (responseText.startsWith('```')) {
      responseText = responseText.replace(/^```(?:json)?\s*\n?/, '').replace(/\n?```\s*$/, '');
    }

    const result = JSON.parse(responseText);

    return NextResponse.json({
      summary: result.summary || '',
      content: '', // We use htmlContent instead
      oneSentenceSummary: result.oneSentenceSummary || '',
      category: result.category || '文学小说',
      htmlContent: result.htmlContent || '',
    });
  } catch (error) {
    console.error('Claude API error:', error);
    // Fallback to template on error
    return generateFallbackResponse(title, author);
  }
}

function generateFallbackResponse(title: string, author: string) {
  const category = classifyBookFallback(title, author);
  const oneSentenceSummary = author
    ? `《${title}》是${author}的经典之作，深刻探讨了人类认知与社会发展的核心命题。`
    : `《${title}》深刻探讨了人类认知与社会发展的核心命题，为读者提供了全新的思考视角。`;

  const summary = `## 核心要点\n\n**作者简介**\n${author ? `${author}是该领域的重要思想家和作家。` : '本书作者在该领域具有深厚的研究和实践经验。'}\n\n**核心主题**\n《${title}》围绕深度洞察、实践指导、思维升级三个核心主题展开。\n\n**适读人群**\n适合所有希望提升认知水平、拓宽视野的读者。`;

  const htmlContent = generateFallbackHtml(title, author, category);

  return NextResponse.json({
    summary,
    content: '',
    oneSentenceSummary,
    category,
    htmlContent,
  });
}

function classifyBookFallback(title: string, author: string): string {
  const text = `${title} ${author}`.toLowerCase();
  if (/管理|商业|经济|营销|创业|投资|金融/.test(text)) return '商业管理';
  if (/心理|情绪|认知|思维|快与慢/.test(text)) return '心理学';
  if (/历史|文明|古代|朝代/.test(text)) return '历史人文';
  if (/哲学|道德|伦理|存在/.test(text)) return '哲学思想';
  if (/科技|编程|AI|人工智能|算法|数据/.test(text)) return '科技创新';
  if (/成长|习惯|效率|自律/.test(text)) return '自我成长';
  if (/社会|政治|法律|教育/.test(text)) return '社会科学';
  if (/艺术|设计|美学|音乐|绘画/.test(text)) return '艺术设计';
  if (/科学|物理|化学|生物|宇宙/.test(text)) return '科普读物';
  return '文学小说';
}

function generateFallbackHtml(title: string, author: string, category: string): string {
  const authorLine = author ? `<span class="author">作者：${author}</span>` : '';
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>《${title}》深度解读</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', sans-serif; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); min-height: 100vh; padding: 2rem; color: #1a1a2e; }
    .container { max-width: 900px; margin: 0 auto; background: #fff; border-radius: 24px; box-shadow: 0 20px 60px rgba(0,0,0,0.15); overflow: hidden; }
    .hero { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 3rem 2.5rem; color: white; text-align: center; }
    .hero h1 { font-size: 2.2rem; font-weight: 800; margin-bottom: 0.5rem; }
    .hero .meta { display: flex; align-items: center; justify-content: center; gap: 1rem; font-size: 0.95rem; opacity: 0.85; margin-top: 0.75rem; }
    .hero .tag { background: rgba(255,255,255,0.2); padding: 0.25rem 0.75rem; border-radius: 999px; font-size: 0.85rem; }
    .content { padding: 2.5rem; }
    .notice { background: #fef3c7; border: 1px solid #fcd34d; border-radius: 12px; padding: 1.25rem; margin-bottom: 2rem; text-align: center; color: #92400e; }
    .section { margin-bottom: 2rem; }
    .section h2 { font-size: 1.3rem; font-weight: 700; color: #1e1b4b; margin-bottom: 1rem; border-bottom: 3px solid #818cf8; display: inline-block; padding-bottom: 0.4rem; }
    .section p { font-size: 0.95rem; line-height: 1.8; color: #374151; margin-bottom: 0.75rem; }
    .footer { text-align: center; padding: 1.5rem; background: #f9fafb; border-top: 1px solid #e5e7eb; color: #9ca3af; font-size: 0.8rem; }
    @media (max-width: 640px) { body { padding: 1rem; } .hero { padding: 2rem 1.5rem; } .content { padding: 1.5rem; } }
  </style>
</head>
<body>
  <div class="container">
    <div class="hero">
      <h1>《${title}》</h1>
      <div class="meta">${authorLine}<span class="tag">${category}</span></div>
    </div>
    <div class="content">
      <div class="notice">⚠️ 当前为模板内容。配置 ANTHROPIC_API_KEY 后，将使用 AI 生成深度书籍解读报告。</div>
      <div class="section">
        <h2>关于本书</h2>
        <p>《${title}》${author ? `由${author}所著，` : ''}是一部值得深入阅读的作品。本报告将在 AI 服务配置完成后，提供完整的深度解读内容。</p>
      </div>
    </div>
    <div class="footer">由 AI 深度解读生成 · JohnnyDesktop</div>
  </div>
</body>
</html>`;
}
