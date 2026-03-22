// AI service - calls the backend API which proxies to Claude API
// 5 minute timeout for long AI generation tasks
const AI_TIMEOUT_MS = 5 * 60 * 1000;

export async function generateBookContent(
  title: string,
  author: string
): Promise<{
  summary: string;
  content: string;
  htmlContent: string;
  oneSentenceSummary: string;
  category: string;
}> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), AI_TIMEOUT_MS);

  try {
    const res = await fetch('/api/ai/book', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, author }),
      signal: controller.signal,
    });

    if (!res.ok) {
      const errorBody = await res.text().catch(() => '');
      let errorMsg = 'Failed to generate book content';
      try {
        const errJson = JSON.parse(errorBody);
        if (errJson.error) errorMsg = errJson.error;
      } catch {
        // use default error message
      }
      throw new Error(errorMsg);
    }

    const contentType = res.headers.get('content-type') || '';

    // Direct JSON response (error or fallback)
    if (contentType.includes('application/json')) {
      return res.json();
    }

    // SSE stream from Anthropic API (proxied through our edge function)
    // Parse SSE events client-side and accumulate the text
    const fullText = await parseSSEStream(res);

    // Parse the accumulated text as JSON
    let responseText = fullText.trim();
    if (responseText.startsWith('```')) {
      responseText = responseText
        .replace(/^```(?:json)?\s*\n?/, '')
        .replace(/\n?```\s*$/, '');
    }

    let result;
    try {
      result = JSON.parse(responseText);
    } catch {
      // Try to extract JSON object from the response
      const jsonMatch = responseText.match(/\{[\s\S]*\}$/);
      if (jsonMatch) {
        result = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('AI 返回的内容格式无效，请重试');
      }
    }

    return {
      summary: result.summary || '',
      content: '',
      oneSentenceSummary: result.oneSentenceSummary || '',
      category: result.category || '文学小说',
      htmlContent: result.htmlContent || '',
    };
  } finally {
    clearTimeout(timeoutId);
  }
}

async function parseSSEStream(res: Response): Promise<string> {
  const reader = res.body!.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let fullText = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });

    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      if (!line.startsWith('data: ')) continue;
      const data = line.slice(6);
      if (data === '[DONE]') continue;

      try {
        const event = JSON.parse(data);
        if (
          event.type === 'content_block_delta' &&
          event.delta?.type === 'text_delta'
        ) {
          fullText += event.delta.text;
        }
        // Check for API errors in the stream
        if (event.type === 'error') {
          throw new Error(`Claude API error: ${event.error?.message || 'Unknown error'}`);
        }
      } catch (e) {
        if (e instanceof Error && e.message.startsWith('Claude API error:')) {
          throw e;
        }
        // Skip unparseable SSE events
      }
    }
  }

  if (!fullText) {
    throw new Error('AI 未返回任何内容，请重试');
  }

  return fullText;
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
