// AI service - multi-step book generation for deep analysis
// Step 1: Metadata (Haiku, fast) → Step 2: HTML Part 1 (Sonnet) → Step 3: HTML Part 2 (Sonnet)

const STEP_TIMEOUT_MS = 55 * 1000; // 55 second timeout per step

interface BookMetadata {
  category: string;
  oneSentenceSummary: string;
  authorBackground: string;
  coreThesis: string;
  chapterOutline: { title: string; keyPoint: string }[];
  keyInsights: { title: string; description: string }[];
}

export type GenerationProgress = {
  step: number;
  totalSteps: number;
  message: string;
};

async function fetchStep(
  body: Record<string, unknown>,
  signal?: AbortSignal,
): Promise<Record<string, unknown>> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), STEP_TIMEOUT_MS);

  // Forward external abort signal
  if (signal) {
    signal.addEventListener('abort', () => controller.abort());
  }

  try {
    const res = await fetch('/api/ai/book', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    if (!res.ok) {
      const errorBody = await res.text().catch(() => '');
      let errorMsg = '生成失败';
      try {
        const errJson = JSON.parse(errorBody);
        if (errJson.error) errorMsg = errJson.error;
      } catch {
        // use default
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

function buildFullHtml(
  title: string,
  author: string,
  metadata: BookMetadata,
  htmlPart1: string,
  htmlPart2: string,
): string {
  return `<!DOCTYPE html>
<html lang='zh-CN'>
<head>
<meta charset='UTF-8'>
<meta name='viewport' content='width=device-width, initial-scale=1.0'>
<title>${title} - AI 深度解读</title>
<style>
* { margin: 0; padding: 0; box-sizing: border-box; }
body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', sans-serif;
  background: linear-gradient(135deg, #f5f7ff 0%, #f0e6ff 50%, #e8f4f8 100%);
  color: #1a1a2e;
  line-height: 1.8;
  min-height: 100vh;
}
.container { max-width: 900px; margin: 0 auto; padding: 2rem 1.5rem; }
.report-section {
  background: white;
  border-radius: 16px;
  padding: 2rem 2.5rem;
  margin-bottom: 1.5rem;
  box-shadow: 0 2px 12px rgba(99, 102, 241, 0.06);
  border: 1px solid rgba(99, 102, 241, 0.08);
}
.report-section h2 {
  font-size: 1.4rem;
  color: #312e81;
  margin-bottom: 1.2rem;
  padding-bottom: 0.6rem;
  border-bottom: 2px solid #e0e7ff;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}
.report-section h3 {
  font-size: 1.1rem;
  color: #4338ca;
  margin: 1.2rem 0 0.6rem;
}
.report-section p {
  color: #374151;
  margin-bottom: 0.8rem;
  font-size: 0.95rem;
}
.report-section ul, .report-section ol {
  padding-left: 1.5rem;
  margin-bottom: 1rem;
}
.report-section li {
  color: #374151;
  margin-bottom: 0.4rem;
  font-size: 0.95rem;
}
.report-section blockquote {
  border-left: 4px solid #818cf8;
  padding: 1rem 1.5rem;
  margin: 1rem 0;
  background: linear-gradient(135deg, #eef2ff, #f5f3ff);
  border-radius: 0 12px 12px 0;
  font-style: italic;
  color: #4338ca;
}
.footer {
  text-align: center;
  padding: 2rem;
  color: #9ca3af;
  font-size: 0.85rem;
}
@media (max-width: 640px) {
  .container { padding: 1rem; }
  .report-section { padding: 1.5rem; border-radius: 12px; }
  .report-section h2 { font-size: 1.2rem; }
}
</style>
</head>
<body>
<div class='container'>
${htmlPart1}
${htmlPart2}
<div class='footer'>
  <p>由 AI 深度解读生成 · JohnnyDesktop</p>
  <p style='margin-top:0.3rem;font-size:0.8rem;color:#c4b5fd;'>
    ${metadata.category} · ${author || '佚名'} · ${new Date().toLocaleDateString('zh-CN')}
  </p>
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
  // Step 1: Metadata (fast, Haiku)
  onProgress?.({ step: 1, totalSteps: 3, message: '正在分析书籍结构...' });

  const step1Result = await fetchStep({ title, author, step: 1 });
  const metadata = step1Result.metadata as BookMetadata;

  if (!metadata?.category || !metadata?.oneSentenceSummary) {
    throw new Error('元数据生成失败，请重试');
  }

  // Step 2: HTML Part 1 (Sonnet, deep content)
  onProgress?.({ step: 2, totalSteps: 3, message: '正在生成深度解读（上篇）...' });

  const step2Result = await fetchStep({ title, author, step: 2, metadata });
  const htmlPart1 = (step2Result.htmlPart1 as string) || '';

  if (!htmlPart1) {
    throw new Error('内容生成失败（上篇），请重试');
  }

  // Step 3: HTML Part 2 (Sonnet, deep content)
  onProgress?.({ step: 3, totalSteps: 3, message: '正在生成深度解读（下篇）...' });

  const step3Result = await fetchStep({ title, author, step: 3, metadata });
  const htmlPart2 = (step3Result.htmlPart2 as string) || '';

  if (!htmlPart2) {
    throw new Error('内容生成失败（下篇），请重试');
  }

  // Combine into full HTML document
  const htmlContent = buildFullHtml(title, author, metadata, htmlPart1, htmlPart2);

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
