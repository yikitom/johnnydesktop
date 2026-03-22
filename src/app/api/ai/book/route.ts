import { NextRequest } from 'next/server';

// Non-streaming serverless function using Claude tool_use for reliable JSON output

const BOOK_ANALYSIS_TOOL = {
  name: 'save_book_analysis',
  description: 'Save the book analysis result',
  input_schema: {
    type: 'object' as const,
    properties: {
      category: {
        type: 'string' as const,
        enum: ['文学小说', '商业管理', '科技创新', '心理学', '历史人文', '哲学思想', '自我成长', '社会科学', '艺术设计', '科普读物'],
        description: 'Book category',
      },
      oneSentenceSummary: {
        type: 'string' as const,
        description: 'One-sentence summary in Chinese (40-80 chars)',
      },
      summary: {
        type: 'string' as const,
        description: 'Markdown summary in Chinese (200-400 chars): author bio, themes, insights, audience',
      },
      htmlContent: {
        type: 'string' as const,
        description: 'Complete self-contained HTML document with embedded CSS for the book analysis report',
      },
    },
    required: ['category', 'oneSentenceSummary', 'summary', 'htmlContent'],
  },
};

const SYSTEM_PROMPT = `You are a book analyst. When given a book title and author, analyze it and call the save_book_analysis tool with your results.

For htmlContent, create a complete HTML document with:
- Indigo/purple gradient theme, card layout, responsive design
- All CSS in a <style> tag, use single quotes in HTML attributes where possible
- Sections: Hero (title/author/category), Author Background (2 sentences), Core Thesis, Key Insights (3-4 points), Practical Takeaways (3 points), Final Verdict
- Footer: "由 AI 深度解读生成 · JohnnyDesktop"
- Keep HTML compact and minimal`;

export async function POST(req: NextRequest) {
  const { title, author = '' } = await req.json();

  if (!title) {
    return Response.json({ error: 'Title is required' }, { status: 400 });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return Response.json(
      { error: 'ANTHROPIC_API_KEY 未配置，请在 Netlify 环境变量中设置。' },
      { status: 500 }
    );
  }

  const userMessage = author
    ? `Analyze: "${title}" by ${author}`
    : `Analyze: "${title}"`;

  try {
    const apiResponse = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 4000,
        system: SYSTEM_PROMPT,
        tools: [BOOK_ANALYSIS_TOOL],
        tool_choice: { type: 'tool', name: 'save_book_analysis' },
        messages: [
          { role: 'user', content: userMessage },
        ],
      }),
    });

    if (!apiResponse.ok) {
      const errBody = await apiResponse.text();
      console.error('Anthropic API error:', apiResponse.status, errBody);
      return Response.json(
        { error: `Claude API 错误 (${apiResponse.status}): ${errBody.slice(0, 200)}` },
        { status: 502 }
      );
    }

    const data = await apiResponse.json();

    // Extract tool_use result - guaranteed valid JSON by the API
    const toolUse = data.content?.find(
      (block: { type: string }) => block.type === 'tool_use'
    );

    if (!toolUse?.input) {
      console.error('No tool_use in response:', JSON.stringify(data.content));
      return Response.json(
        { error: 'AI 未返回有效结果，请重试' },
        { status: 502 }
      );
    }

    const result = toolUse.input;

    return Response.json({
      summary: result.summary || '',
      content: '',
      oneSentenceSummary: result.oneSentenceSummary || '',
      category: result.category || '文学小说',
      htmlContent: result.htmlContent || '',
    });
  } catch (error) {
    console.error('Claude API error:', error);
    return Response.json(
      { error: `Claude API 连接失败: ${error instanceof Error ? error.message : '未知错误'}` },
      { status: 502 }
    );
  }
}
