// AI service - deep-book-deconstruction via 3-step non-streaming API
// Step 1: Metadata (Haiku, ~5s)
// Step 2: HTML Part 1 (Sonnet, ~30s) - Hero, Author, Thesis, Chapters
// Step 3: HTML Part 2 (Sonnet, ~30s) - Insights, Applications, Verdict

const STEP_TIMEOUT_MS = 55 * 1000; // 55s per step

export type GenerationProgress = {
  step: number;
  totalSteps: number;
  message: string;
};

async function fetchStep(
  body: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), STEP_TIMEOUT_MS);

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
      } catch { /* use default */ }
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
.report-section{background:white;border-radius:16px;padding:2rem 2.5rem;margin-bottom:1.5rem;box-shadow:0 2px 12px rgba(99,102,241,0.06);border:1px solid rgba(99,102,241,0.08)}
.report-section h2{font-size:1.4rem;color:#312e81;margin-bottom:1.2rem;padding-bottom:0.6rem;border-bottom:2px solid #e0e7ff}
.report-section h3{font-size:1.1rem;color:#4338ca;margin:1.2rem 0 0.6rem}
.report-section p{color:#374151;margin-bottom:0.8rem;font-size:0.95rem}
.report-section ul,.report-section ol{padding-left:1.5rem;margin-bottom:1rem}
.report-section li{color:#374151;margin-bottom:0.4rem;font-size:0.95rem}
.report-section blockquote{border-left:4px solid #818cf8;padding:1rem 1.5rem;margin:1rem 0;background:linear-gradient(135deg,#eef2ff,#f5f3ff);border-radius:0 12px 12px 0;font-style:italic;color:#4338ca}
.footer{text-align:center;padding:2rem;color:#9ca3af;font-size:0.85rem}
@media(max-width:640px){.container{padding:1rem}.card,.report-section{padding:1.5rem;border-radius:12px}}
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
  // Step 1: Metadata (Haiku, fast)
  onProgress?.({ step: 1, totalSteps: 3, message: '正在分析书籍结构...' });
  const step1 = await fetchStep({ title, author, step: 1 });
  const metadata = step1.metadata as Record<string, unknown>;
  if (!metadata?.category || !metadata?.oneSentenceSummary) {
    throw new Error('元数据生成失败，请重试');
  }

  // Step 2: Deep content Part 1 (Sonnet, sections 1-5)
  onProgress?.({ step: 2, totalSteps: 3, message: '正在深度解读（上篇：结构与论点）...' });
  const step2 = await fetchStep({ title, author, step: 2, metadata });
  const htmlPart1 = (step2.htmlPart1 as string) || '';
  if (!htmlPart1 || htmlPart1.length < 50) {
    throw new Error('深度解读上篇生成失败，请重试');
  }

  // Step 3: Deep content Part 2 (Sonnet, sections 6-10)
  onProgress?.({ step: 3, totalSteps: 3, message: '正在深度解读（下篇：洞见与评价）...' });
  const step3 = await fetchStep({ title, author, step: 3, metadata });
  const htmlPart2 = (step3.htmlPart2 as string) || '';
  if (!htmlPart2 || htmlPart2.length < 50) {
    throw new Error('深度解读下篇生成失败，请重试');
  }

  const htmlContent = buildFullHtml(
    title, author,
    metadata.category as string,
    htmlPart1, htmlPart2,
  );

  return {
    summary: (metadata.coreThesis as string) || '',
    content: '',
    htmlContent,
    oneSentenceSummary: metadata.oneSentenceSummary as string,
    category: metadata.category as string,
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
  return (await res.json()).result;
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
  return (await res.json()).reply;
}
