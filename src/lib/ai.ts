// AI service - calls the backend API which uses Claude for book analysis
const AI_TIMEOUT_MS = 60 * 1000; // 60 second timeout

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
      let errorMsg = '生成失败';
      try {
        const errJson = JSON.parse(errorBody);
        if (errJson.error) errorMsg = errJson.error;
      } catch {
        // use default error message
      }
      throw new Error(errorMsg);
    }

    return res.json();
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      throw new Error('生成超时，请重试');
    }
    throw err;
  } finally {
    clearTimeout(timeoutId);
  }
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
