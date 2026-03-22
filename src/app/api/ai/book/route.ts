import { NextRequest } from 'next/server';

// Multi-step book generation: 3 steps, each within Netlify timeout
// Step 1: Metadata (Haiku, ~5s) - category, summary, outline
// Step 2: HTML Part 1 (Sonnet, ~25s) - Hero through Key Insights
// Step 3: HTML Part 2 (Sonnet, ~25s) - Applications through Verdict

const CATEGORIES = ['文学小说', '商业管理', '科技创新', '心理学', '历史人文', '哲学思想', '自我成长', '社会科学', '艺术设计', '科普读物'];

const METADATA_TOOL = {
  name: 'save_metadata',
  description: 'Save book metadata and analysis outline',
  input_schema: {
    type: 'object' as const,
    properties: {
      category: {
        type: 'string' as const,
        enum: CATEGORIES,
        description: 'Book category',
      },
      oneSentenceSummary: {
        type: 'string' as const,
        description: 'One powerful sentence capturing the book essence in Chinese (40-80 chars)',
      },
      authorBackground: {
        type: 'string' as const,
        description: 'Author background and credentials in Chinese (100-200 chars)',
      },
      coreThesis: {
        type: 'string' as const,
        description: 'The core thesis/framework of the book in Chinese (150-300 chars)',
      },
      chapterOutline: {
        type: 'array' as const,
        items: {
          type: 'object' as const,
          properties: {
            title: { type: 'string' as const, description: 'Chapter/section title in Chinese' },
            keyPoint: { type: 'string' as const, description: 'Key point of this chapter in Chinese (50-100 chars)' },
          },
          required: ['title', 'keyPoint'],
        },
        description: '5-8 main chapters/sections of the book',
      },
      keyInsights: {
        type: 'array' as const,
        items: {
          type: 'object' as const,
          properties: {
            title: { type: 'string' as const, description: 'Insight title in Chinese' },
            description: { type: 'string' as const, description: 'Detailed explanation in Chinese (100-200 chars)' },
          },
          required: ['title', 'description'],
        },
        description: '5-8 key insights from the book',
      },
    },
    required: ['category', 'oneSentenceSummary', 'authorBackground', 'coreThesis', 'chapterOutline', 'keyInsights'],
  },
};

const HTML_PART1_TOOL = {
  name: 'save_html_part1',
  description: 'Save the first half of the HTML book report',
  input_schema: {
    type: 'object' as const,
    properties: {
      htmlSections: {
        type: 'string' as const,
        description: 'HTML sections: Hero banner, one-sentence quote card, author background card, core thesis card, and chapter-by-chapter deconstruction. Use <section> tags. Rich formatting with icons, colors, detailed paragraphs.',
      },
    },
    required: ['htmlSections'],
  },
};

const HTML_PART2_TOOL = {
  name: 'save_html_part2',
  description: 'Save the second half of the HTML book report',
  input_schema: {
    type: 'object' as const,
    properties: {
      htmlSections: {
        type: 'string' as const,
        description: 'HTML sections: Key insights with detailed explanations, practical applications/takeaways, critical perspective (strengths & limitations), recommended related books (3-5), and final verdict with target audience. Use <section> tags.',
      },
    },
    required: ['htmlSections'],
  },
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function callClaude(apiKey: string, model: string, maxTokens: number, system: string, userMessage: string, tool: { name: string; description: string; input_schema: any }) {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model,
      max_tokens: maxTokens,
      system,
      tools: [tool],
      tool_choice: { type: 'tool', name: tool.name },
      messages: [{ role: 'user', content: userMessage }],
    }),
  });

  if (!res.ok) {
    const errBody = await res.text();
    console.error(`Anthropic API error (${model}):`, res.status, errBody);
    throw new Error(`Claude API 错误 (${res.status}): ${errBody.slice(0, 200)}`);
  }

  const data = await res.json();
  const toolUse = data.content?.find((block: { type: string }) => block.type === 'tool_use');
  if (!toolUse?.input) {
    throw new Error('AI 未返回有效结果');
  }
  return toolUse.input;
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { title, author = '', step = 1 } = body;

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

  const bookRef = author ? `"${title}" by ${author}` : `"${title}"`;

  try {
    if (step === 1) {
      // Step 1: Metadata with Haiku (fast, ~5-10s)
      const result = await callClaude(
        apiKey,
        'claude-haiku-4-5-20251001',
        2000,
        `You are a world-class book analyst with deep expertise. Analyze the given book thoroughly. Provide rich, detailed, insightful analysis in Chinese. Your outline should cover the book's actual structure and content faithfully.`,
        `Provide a comprehensive metadata analysis for ${bookRef}. Include the book category, a powerful one-sentence summary, detailed author background, core thesis, chapter outline (5-8 chapters), and key insights (5-8 insights). All content in Chinese.`,
        METADATA_TOOL,
      );

      return Response.json({ step: 1, metadata: result });
    }

    if (step === 2) {
      // Step 2: HTML Part 1 with Sonnet (deep content, ~20-30s)
      const { metadata } = body;
      if (!metadata) {
        return Response.json({ error: 'metadata is required for step 2' }, { status: 400 });
      }

      const result = await callClaude(
        apiKey,
        'claude-haiku-4-5-20251001',
        4000,
        `You are executing the deep-book-deconstruction methodology — a comprehensive, publication-quality book analysis framework.

HTML RULES:
- Use single quotes in HTML attributes
- Each section uses <section class='card'> wrapper
- Use semantic HTML: h2, h3, p, ul, li, blockquote
- Include emoji icons (📚 💡 🎯 📖 ✨ 🔑 🧠 💭 📝)
- Write detailed, insightful paragraphs (2-3 per section minimum)
- All content in Chinese, intellectually deep and professional
- Indigo/purple color scheme (#312e81, #4338ca, #6366f1, #818cf8)`,
        `Execute deep-book-deconstruction Part 1 for ${bookRef}.

Book metadata:
- Category: ${metadata.category}
- Core Thesis: ${metadata.coreThesis}
- Author Background: ${metadata.authorBackground}

Chapter outline:
${(metadata.chapterOutline || []).map((ch: { title: string; keyPoint: string }, i: number) => `${i + 1}. ${ch.title}: ${ch.keyPoint}`).join('\n')}

Generate these sections as HTML:
1. HERO BANNER - Large title, author name, category badge, gradient background section
2. ONE-SENTENCE QUOTE - Elegant quote card: "${metadata.oneSentenceSummary}"
3. AUTHOR BACKGROUND - Detailed card about the author (expand on: ${metadata.authorBackground})
4. CORE THESIS - In-depth explanation of the book's central argument and framework
5. CHAPTER-BY-CHAPTER DECONSTRUCTION - Detailed analysis of each chapter with key arguments, examples, and implications (2-3 paragraphs per chapter)

Make it visually stunning and intellectually rich.`,
        HTML_PART1_TOOL,
      );

      return Response.json({ step: 2, htmlPart1: result.htmlSections });
    }

    if (step === 3) {
      // Step 3: HTML Part 2 with Sonnet (deep content, ~20-30s)
      const { metadata } = body;
      if (!metadata) {
        return Response.json({ error: 'metadata is required for step 3' }, { status: 400 });
      }

      const result = await callClaude(
        apiKey,
        'claude-haiku-4-5-20251001',
        4000,
        `You are executing the deep-book-deconstruction methodology — a comprehensive, publication-quality book analysis framework.

HTML RULES:
- Use single quotes in HTML attributes
- Each section uses <section class='card'> wrapper
- Use semantic HTML: h2, h3, p, ul, li, blockquote
- Include emoji icons (📚 💡 🎯 🔑 🌟 🧠 ⚡ 📖)
- Write detailed, insightful paragraphs (2-3 per section minimum)
- All content in Chinese, intellectually deep and professional
- Indigo/purple color scheme (#312e81, #4338ca, #6366f1, #818cf8)`,
        `Execute deep-book-deconstruction Part 2 for ${bookRef}.

Book metadata:
- Category: ${metadata.category}
- Core Thesis: ${metadata.coreThesis}

Key insights from analysis:
${(metadata.keyInsights || []).map((ins: { title: string; description: string }, i: number) => `${i + 1}. ${ins.title}: ${ins.description}`).join('\n')}

Generate these sections as HTML:
1. KEY INSIGHTS (关键洞见) - 5-8 detailed insight cards, each with a title, icon, and 2-3 paragraph explanation exploring the insight deeply
2. PRACTICAL APPLICATIONS (实践应用) - Actionable takeaways readers can apply in daily life/work (detailed, specific advice)
3. CRITICAL PERSPECTIVE (批判性思考) - Balanced analysis of the book's strengths, weaknesses, and limitations
4. RECOMMENDED READING (延伸阅读) - 3-5 related books with brief descriptions of why they complement this book
5. FINAL VERDICT (最终评价) - Overall assessment, star rating, and who should read this book

Make it visually stunning and intellectually rich.`,
        HTML_PART2_TOOL,
      );

      return Response.json({ step: 3, htmlPart2: result.htmlSections });
    }

    return Response.json({ error: 'Invalid step (must be 1, 2, or 3)' }, { status: 400 });
  } catch (error) {
    console.error('Claude API error:', error);
    const msg = error instanceof Error ? error.message : '未知错误';
    return Response.json({ error: msg }, { status: 502 });
  }
}
