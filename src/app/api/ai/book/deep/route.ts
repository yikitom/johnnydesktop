// Edge Runtime - supports long-running streaming with no timeout
// Uses Anthropic Skills API (beta) with deep-book-deconstruction custom skill
export const runtime = 'edge';

const ANTHROPIC_API = 'https://api.anthropic.com';
const BETA_HEADERS = 'skills-2025-10-02';
const SKILL_NAME = 'deep-book-deconstruction';

// Cache skill_id in module scope (persists across requests in the same edge instance)
let cachedSkillId: string | null = null;

function apiHeaders(apiKey: string) {
  return {
    'Content-Type': 'application/json',
    'x-api-key': apiKey,
    'anthropic-version': '2023-06-01',
    'anthropic-beta': BETA_HEADERS,
  };
}

// Find existing skill or create a new one
async function ensureSkill(apiKey: string): Promise<string> {
  // Return cached skill_id if available
  if (cachedSkillId) return cachedSkillId;

  // Check env var first
  const envSkillId = process.env.SKILL_DEEP_BOOK_ID;
  if (envSkillId) {
    cachedSkillId = envSkillId;
    return envSkillId;
  }

  // List existing skills to find ours
  const listRes = await fetch(`${ANTHROPIC_API}/v1/skills?beta=true&source=custom`, {
    headers: apiHeaders(apiKey),
  });

  if (listRes.ok) {
    const listData = await listRes.json();
    const existing = (listData.data || []).find(
      (s: { display_title: string | null }) => s.display_title === SKILL_NAME
    );
    if (existing) {
      cachedSkillId = existing.id;
      return existing.id;
    }
  }

  // Create the skill with SKILL.md
  const skillMd = `---
name: ${SKILL_NAME}
description: >
  Deep Book Deconstruction - A comprehensive methodology for analyzing and
  deconstructing books into detailed, insightful reports. Produces rich HTML
  documents with professional styling covering all aspects of a book's content,
  arguments, and significance. Use this skill when asked to analyze, review,
  or deconstruct any book.
---

# Deep Book Deconstruction

You are a world-class book analyst, literary critic, and knowledge synthesizer.
Your task is to create a comprehensive, publication-quality deconstruction of a book.

## Output Format
Generate a complete, self-contained HTML document with embedded CSS.
Use an indigo/purple gradient theme with modern card-based layout and responsive design.

## Required Sections

### 1. Hero Section
- Book title (large, prominent)
- Author name
- Category badge
- Gradient background

### 2. One-Sentence Essence
- A powerful, elegant quote-card capturing the book's core message
- 40-80 Chinese characters

### 3. Author & Context
- Detailed author biography and credentials
- Historical/intellectual context of the book's creation
- The author's unique perspective and what qualifies them

### 4. Core Thesis & Framework
- The central argument or thesis
- The intellectual framework or model
- How the argument is structured

### 5. Chapter-by-Chapter Deconstruction (5-8 chapters)
- Each chapter gets 2-3 paragraphs of deep analysis
- Key arguments and evidence presented
- Notable examples and case studies
- How each chapter builds on the previous

### 6. Key Insights (5-8 insights)
- Each insight with a clear title and icon
- 2-3 paragraphs exploring the insight deeply
- Real-world implications and applications
- Why this insight matters

### 7. Practical Applications
- Concrete, actionable takeaways
- How to apply the book's ideas in daily life/work
- Specific exercises or practices

### 8. Critical Perspective
- Strengths of the book's approach
- Weaknesses and limitations
- Potential biases or blind spots
- How it compares to other works in the field

### 9. Recommended Reading (3-5 books)
- Related books that complement or contrast
- Brief description of why each is relevant
- How they extend or challenge this book's ideas

### 10. Final Verdict
- Overall assessment with star rating
- Who should read this book
- The lasting impact and significance

## Style Guidelines
- All content in Chinese (中文)
- Intellectually deep and professionally written
- Use emoji icons for visual richness
- CSS in \`<style>\` tag, use single quotes in HTML attributes
- Mobile-responsive design
- Footer: "由 AI 深度解读生成 · JohnnyDesktop"
`;

  // Create FormData with SKILL.md file using Web API FormData (supported in Edge Runtime)
  const formData = new FormData();
  formData.append('display_title', SKILL_NAME);
  const skillFile = new File([skillMd], `${SKILL_NAME}/SKILL.md`, { type: 'text/markdown' });
  formData.append('files[]', skillFile);

  const createRes = await fetch(`${ANTHROPIC_API}/v1/skills?beta=true`, {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-beta': BETA_HEADERS,
      // Don't set Content-Type - FormData sets it with boundary automatically
    },
    body: formData,
  });

  if (!createRes.ok) {
    const err = await createRes.text();
    console.error('Failed to create skill:', createRes.status, err);
    throw new Error(`创建 skill 失败: ${err.slice(0, 200)}`);
  }

  const createData = await createRes.json();
  cachedSkillId = createData.id;
  return createData.id;
}

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
    ? `\n\n已知信息：
- 分类：${metadata.category}
- 核心论点：${metadata.coreThesis}
- 作者背景：${metadata.authorBackground}
- 章节大纲：${(metadata.chapterOutline || []).map((ch: { title: string; keyPoint: string }, i: number) => `${i + 1}. ${ch.title}: ${ch.keyPoint}`).join('\n')}`
    : '';

  try {
    // Ensure the custom skill exists
    const skillId = await ensureSkill(apiKey);

    // Call Anthropic beta Messages API with container + skill (no code_execution)
    // Without code_execution, Claude reads the skill's SKILL.md instructions
    // and outputs text directly (streamable), rather than creating files server-side
    const apiResponse = await fetch(`${ANTHROPIC_API}/v1/messages`, {
      method: 'POST',
      headers: apiHeaders(apiKey),
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 16000,
        stream: true,
        container: {
          skills: [{
            skill_id: skillId,
            type: 'custom',
          }],
        },
        messages: [
          {
            role: 'user',
            content: `请严格按照 deep-book-deconstruction 技能中 SKILL.md 定义的方法论，对 ${bookRef} 进行全面深度解构分析。

直接输出一个完整的、自包含的 HTML 文档（从 <!DOCTYPE html> 开始到 </html> 结束）。
不要输出任何 HTML 文档以外的文字、解释或说明。${metadataContext}`,
          },
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
    return new Response(apiResponse.body, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error) {
    console.error('Skills API error:', error);
    const msg = error instanceof Error ? error.message : '未知错误';
    return Response.json({ error: msg }, { status: 502 });
  }
}
