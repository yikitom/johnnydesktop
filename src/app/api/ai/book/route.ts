import { NextRequest } from 'next/server';

// Use edge runtime to support streaming proxy to client
export const runtime = 'edge';

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
        max_tokens: 12000,
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
