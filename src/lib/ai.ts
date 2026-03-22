// AI service - deep-book-deconstruction methodology
// Step 1: Metadata (Haiku, fast)
// Step 2: Deep HTML Part 1 (Sonnet, streaming) - Sections 1-5
// Step 3: Deep HTML Part 2 (Sonnet, streaming) - Sections 6-10

const STEP_TIMEOUT_MS = 55 * 1000; // 55s for metadata step

export type GenerationProgress = {
  step: number;
  totalSteps: number;
  message: string;
};

// Step 1: Quick metadata (non-streaming)
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

// Stream deep content from Edge Function
async function streamDeepContent(
  title: string,
  author: string,
  metadata: Record<string, unknown>,
  part: number,
): Promise<string> {
  const res = await fetch('/api/ai/book/deep', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title, author, metadata, part }),
  });

  if (!res.ok) {
    const errorBody = await res.text().catch(() => '');
    let errorMsg = `深度解读第${part}部分生成失败`;
    try {
      const errJson = JSON.parse(errorBody);
      if (errJson.error) errorMsg = errJson.error;
    } catch { /* use default */ }
    throw new Error(errorMsg);
  }

  const reader = res.body?.getReader();
  if (!reader) throw new Error('无法读取流式响应');

  const decoder = new TextDecoder();
  let accumulated = '';
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      if (!line.startsWith('data: ')) continue;
      const data = line.slice(6).trim();
      if (data === '[DONE]') continue;

      try {
        const event = JSON.parse(data);
        if (event.type === 'content_block_delta' && event.delta?.type === 'text_delta') {
          accumulated += event.delta.text || '';
        }
        if (event.type === 'error') {
          throw new Error(event.error?.message || '流式响应错误');
        }
      } catch (e) {
        if (e instanceof SyntaxError) continue;
        throw e;
      }
    }
  }

  return accumulated;
}

function buildFullHtml(title: string, author: string, category: string, part1: string, part2: string): string {
  return `<!DOCTYPE html>
<html lang='zh-CN'>
<head>
<meta charset='UTF-8'>
<meta name='viewport' content='width=device-width, initial-scale=1.0'>
<title>${title} - AI 深度解读</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI','PingFang SC','Hiragino Sans GB','Microsoft YaHei',sans-serif;background:linear-gradient(135deg,#f5f7ff 0%,#f0e6ff 50%,#e8f4f8 100%);color:#1a1a2e;line-height:1.8;min-height:100vh}
.container{max-width:900px;margin:0 auto;padding:2rem 1.5rem}
.card{background:white;border-radius:16px;padding:2rem 2.5rem;margin-bottom:1.5rem;box-shadow:0 2px 12px rgba(99,102,241,0.06);border:1px solid rgba(99,102,241,0.08)}
.card h2{font-size:1.4rem;color:#312e81;margin-bottom:1.2rem;padding-bottom:0.6rem;border-bottom:2px solid #e0e7ff;display:flex;align-items:center;gap:0.5rem}
.card h3{font-size:1.1rem;color:#4338ca;margin:1.2rem 0 0.6rem}
.card p{color:#374151;margin-bottom:0.8rem;font-size:0.95rem}
.card ul,.card ol{padding-left:1.5rem;margin-bottom:1rem}
.card li{color:#374151;margin-bottom:0.4rem;font-size:0.95rem}
.card blockquote{border-left:4px solid #818cf8;padding:1rem 1.5rem;margin:1rem 0;background:linear-gradient(135deg,#eef2ff,#f5f3ff);border-radius:0 12px 12px 0;font-style:italic;color:#4338ca}
.footer{text-align:center;padding:2rem;color:#9ca3af;font-size:0.85rem}
@media(max-width:640px){.container{padding:1rem}.card{padding:1.5rem;border-radius:12px}.card h2{font-size:1.2rem}}
</style>
</head>
<body>
<div class='container'>
${part1}
${part2}
<div class='footer'>
<p>由 AI 深度解读生成 · JohnnyDesktop</p>
<p style='margin-top:0.3rem;font-size:0.8rem;color:#c4b5fd'>${category} · ${author || '佚名'} · ${new Date().toLocaleDateString('zh-CN')}</p>
</div>
</div>
</body>
</html>`;
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
  // Step 1: Metadata
  onProgress?.({ step: 1, totalSteps: 3, message: '正在分析书籍结构...' });
  const metadata = await fetchMetadata(title, author);
  if (!metadata?.category || !metadata?.oneSentenceSummary) {
    throw new Error('元数据生成失败，请重试');
  }

  // Step 2: Deep content Part 1 (sections 1-5)
  onProgress?.({ step: 2, totalSteps: 3, message: '正在深度解读（上篇：结构与论点）...' });
  const part1 = await streamDeepContent(title, author, metadata, 1);
  if (!part1 || part1.length < 100) {
    throw new Error('深度解读上篇生成失败，请重试');
  }

  // Step 3: Deep content Part 2 (sections 6-10)
  onProgress?.({ step: 3, totalSteps: 3, message: '正在深度解读（下篇：洞见与评价）...' });
  const part2 = await streamDeepContent(title, author, metadata, 2);
  if (!part2 || part2.length < 100) {
    throw new Error('深度解读下篇生成失败，请重试');
  }

  const htmlContent = buildFullHtml(title, author, metadata.category, part1, part2);

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
  if (!res.ok) throw new Error('Failed to process data');
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
  if (!res.ok) throw new Error('Failed to chat');
  const data = await res.json();
  return data.reply;
}
