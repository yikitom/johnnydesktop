// AI service - multi-step book generation
// Step 1: Metadata (Haiku, fast, non-streaming)
// Step 2: Deep content via Anthropic Skills API (Sonnet + deep-book-deconstruction skill, streaming)

const STEP_TIMEOUT_MS = 55 * 1000; // 55 second timeout for step 1

export type GenerationProgress = {
  step: number;
  totalSteps: number;
  message: string;
};

// Step 1: Quick metadata fetch (non-streaming)
async function fetchMetadata(title: string, author: string) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), STEP_TIMEOUT_MS);

  try {
    const res = await fetch('/api/ai/book', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, author, step: 1 }),
      signal: controller.signal,
    });

    if (!res.ok) {
      const errorBody = await res.text().catch(() => '');
      let errorMsg = '元数据生成失败';
      try {
        const errJson = JSON.parse(errorBody);
        if (errJson.error) errorMsg = errJson.error;
      } catch { /* use default */ }
      throw new Error(errorMsg);
    }

    const data = await res.json();
    return data.metadata;
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      throw new Error('元数据生成超时，请重试');
    }
    throw err;
  } finally {
    clearTimeout(timeoutId);
  }
}

// Step 2: Deep content via Skills API (streaming, no timeout - edge function)
async function fetchDeepContent(
  title: string,
  author: string,
  metadata: Record<string, unknown>,
  onChunk?: (text: string) => void,
): Promise<string> {
  const res = await fetch('/api/ai/book/deep', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title, author, metadata }),
  });

  if (!res.ok) {
    const errorBody = await res.text().catch(() => '');
    let errorMsg = '深度解读生成失败';
    try {
      const errJson = JSON.parse(errorBody);
      if (errJson.error) errorMsg = errJson.error;
    } catch { /* use default */ }
    throw new Error(errorMsg);
  }

  // Parse SSE stream and accumulate text content
  const reader = res.body?.getReader();
  if (!reader) throw new Error('无法读取流式响应');

  const decoder = new TextDecoder();
  let accumulated = '';
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });

    // Parse SSE events from buffer
    const lines = buffer.split('\n');
    buffer = lines.pop() || ''; // Keep incomplete line in buffer

    for (const line of lines) {
      if (!line.startsWith('data: ')) continue;
      const data = line.slice(6).trim();
      if (data === '[DONE]') continue;

      try {
        const event = JSON.parse(data);

        // Handle text content deltas
        if (event.type === 'content_block_delta' && event.delta?.type === 'text_delta') {
          const text = event.delta.text || '';
          accumulated += text;
          onChunk?.(text);
        }

        // Handle errors
        if (event.type === 'error') {
          throw new Error(event.error?.message || '流式响应错误');
        }
      } catch (e) {
        // Skip unparseable lines (SSE comments, empty events, etc.)
        if (e instanceof SyntaxError) continue;
        throw e;
      }
    }
  }

  return accumulated;
}

// Extract HTML from Claude's response text
function extractHtml(text: string): string {
  // Try to find a complete HTML document
  const htmlMatch = text.match(/<!DOCTYPE\s+html[\s\S]*<\/html>/i);
  if (htmlMatch) return htmlMatch[0];

  // Fallback: try <html>...</html>
  const htmlTagMatch = text.match(/<html[\s\S]*<\/html>/i);
  if (htmlTagMatch) return htmlTagMatch[0];

  // If no HTML tags found, wrap the text in a basic HTML template
  return text;
}

export async function generateBookContent(
  title: string,
  author: string,
  onProgress?: (progress: GenerationProgress) => void,
): Promise<{
  summary: string;
  content: string;
  htmlContent: string;
  oneSentenceSummary: string;
  category: string;
}> {
  // Step 1: Metadata (fast, Haiku)
  onProgress?.({ step: 1, totalSteps: 2, message: '正在分析书籍结构...' });

  const metadata = await fetchMetadata(title, author);

  if (!metadata?.category || !metadata?.oneSentenceSummary) {
    throw new Error('元数据生成失败，请重试');
  }

  // Step 2: Deep content via Skills API (streaming)
  onProgress?.({ step: 2, totalSteps: 2, message: '正在生成深度解读（使用专业分析技能）...' });

  let charCount = 0;
  const rawText = await fetchDeepContent(title, author, metadata, (chunk) => {
    charCount += chunk.length;
    // Update progress with character count
    if (charCount % 500 < 50) {
      onProgress?.({
        step: 2,
        totalSteps: 2,
        message: `正在生成深度解读... 已生成 ${Math.round(charCount / 1000)}k 字符`,
      });
    }
  });

  const htmlContent = extractHtml(rawText);

  if (!htmlContent || htmlContent.length < 100) {
    throw new Error('深度解读内容生成失败，请重试');
  }

  return {
    summary: metadata.coreThesis || '',
    content: '',
    htmlContent,
    oneSentenceSummary: metadata.oneSentenceSummary,
    category: metadata.category,
  };
}

export async function processDataLab(
  sourceIds: string[],
  applicationId: string,
  prompt?: string
): Promise<string> {
  const res = await fetch('/api/ai/datalab', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sourceIds, applicationId, prompt }),
  });

  if (!res.ok) {
    throw new Error('Failed to process data');
  }

  const data = await res.json();
  return data.result;
}

export async function chatWithData(
  sourceIds: string[],
  message: string,
  history: { role: string; content: string }[]
): Promise<string> {
  const res = await fetch('/api/ai/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sourceIds, message, history }),
  });

  if (!res.ok) {
    throw new Error('Failed to chat');
  }

  const data = await res.json();
  return data.reply;
}
