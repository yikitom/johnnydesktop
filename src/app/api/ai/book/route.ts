import { NextRequest } from 'next/server';

// Use default Node.js runtime (NOT edge) with non-streaming API call.
// Netlify serverless functions have a 26s timeout on Pro, 10s on free.
// We use a concise prompt + limited tokens to fit within the timeout.

const DEEP_BOOK_DECONSTRUCTION_PROMPT = `You are a book analyst. Analyze the given book concisely.

Respond with a JSON object containing:
- "category": One of: ["文学小说", "商业管理", "科技创新", "心理学", "历史人文", "哲学思想", "自我成长", "社会科学", "艺术设计", "科普读物"]
- "oneSentenceSummary": One-sentence summary in Chinese (40-80 chars)
- "summary": Markdown summary in Chinese (200-400 chars): author bio, themes, insights, audience
- "htmlContent": Self-contained HTML with embedded CSS. Keep markup minimal.

htmlContent sections (keep each BRIEF):
1. Hero: title, author, category
2. Author & Background (2 sentences)
3. Core Thesis (1 paragraph)
4. Key Insights (3-4 bullet points)
5. Practical Takeaways (3 bullet points)
6. Who Should Read & Final Verdict (2 sentences)

HTML: indigo/purple gradient, card layout, responsive, <style> tag, footer "由 AI 深度解读生成 · JohnnyDesktop". Minimize CSS - reuse classes, no redundancy.

Output ONLY valid JSON. No markdown blocks. Compact htmlContent.`;

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
    // Non-streaming call - simpler and faster
    const apiResponse = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 3000,
        messages: [
          {
            role: 'user',
            content: `${DEEP_BOOK_DECONSTRUCTION_PROMPT}\n\n${userMessage}`,
          },
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
    let responseText = (data.content?.[0]?.text || '').trim();

    // Strip markdown code blocks if present
    if (responseText.startsWith('```')) {
      responseText = responseText
        .replace(/^```(?:json)?\s*\n?/, '')
        .replace(/\n?```\s*$/, '');
    }

    let result;
    try {
      result = JSON.parse(responseText);
    } catch {
      const jsonMatch = responseText.match(/\{[\s\S]*\}$/);
      if (jsonMatch) {
        result = JSON.parse(jsonMatch[0]);
      } else {
        console.error('Failed to parse response:', responseText.slice(0, 500));
        return Response.json(
          { error: 'AI 返回格式错误，请重试' },
          { status: 502 }
        );
      }
    }

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
