// AI service - calls the backend API which uses Claude deep-book-deconstruction
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
      throw new Error('Failed to generate book content');
    }

    // Handle streaming response (used to avoid serverless timeout)
    const contentType = res.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      // Direct JSON response (fallback mode)
      return res.json();
    }

    // Streaming response: read the full body and extract the __RESULT__ marker
    const text = await res.text();
    const marker = '__RESULT__';
    const idx = text.lastIndexOf(marker);
    if (idx === -1) {
      throw new Error('Invalid streaming response: no result marker');
    }

    const jsonStr = text.slice(idx + marker.length);
    return JSON.parse(jsonStr);
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
