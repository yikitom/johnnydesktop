import { NextRequest } from 'next/server';

// Use edge runtime to support streaming proxy to client
export const runtime = 'edge';

const DEEP_BOOK_DECONSTRUCTION_PROMPT = `You are a world-class book analyst. Perform a "Deep Book Deconstruction" for the given book.

Respond with a valid JSON object containing exactly these fields:
- "category": One of: ["文学小说", "商业管理", "科技创新", "心理学", "历史人文", "哲学思想", "自我成长", "社会科学", "艺术设计", "科普读物"]
- "oneSentenceSummary": One-sentence summary in Chinese (40-80 chars)
- "summary": Markdown core summary in Chinese (300-500 chars), including author bio, core themes, key insights, target audience
- "htmlContent": A self-contained HTML document with embedded CSS presenting the analysis report

htmlContent structure (be CONCISE, keep HTML compact):
1. Hero Section: title, author, category badge
2. One-Line Summary quote card
3. Author & Background (2-3 sentences)
4. Core Framework (the central thesis)
5. Key Chapters (3-5 most important, brief analysis each)
6. Key Insights (3-5 insights)
7. Practical Applications (3-4 bullet points)
8. Related Reading (3 books)
9. Final Verdict (2-3 sentences)

HTML requirements: indigo/purple gradient theme, card layout, responsive, all CSS in <style> tag, complete HTML document, footer "由 AI 深度解读生成 · JohnnyDesktop". Keep CSS minimal and reuse classes.

CRITICAL: Output ONLY a valid JSON object. No markdown, no code blocks. Keep htmlContent compact - avoid redundant CSS and verbose markup.`;

export async function POST(req: NextRequest) {
  const { title, author = '' } = await req.json();

  if (!title) {
    return Response.json({ error: 'Title is required' }, { status: 400 });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.error('ANTHROPIC_API_KEY is not configured');
    return Response.json(
      { error: 'ANTHROPIC_API_KEY is not configured. Please set it in environment variables.' },
      { status: 500 }
    );
  }

  const userMessage = author
    ? `Please perform a Deep Book Deconstruction for: "${title}" by ${author}`
    : `Please perform a Deep Book Deconstruction for: "${title}"`;

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
        { error: `Anthropic API error (${apiResponse.status}): ${errBody.slice(0, 200)}` },
        { status: 502 }
      );
    }

    // Pipe the Anthropic SSE stream directly to the client.
    // This avoids Netlify Edge Function timeout by keeping data flowing continuously.
    // The client will parse SSE events and accumulate the response.
    return new Response(apiResponse.body, {
      headers: {
        'Content-Type': 'text/event-stream; charset=utf-8',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error) {
    console.error('Claude API error:', error);
    return Response.json(
      { error: `Failed to connect to Claude API: ${error instanceof Error ? error.message : 'Unknown error'}` },
      { status: 502 }
    );
  }
}
