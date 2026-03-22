import { NextRequest, NextResponse } from 'next/server';

// Categories for auto-classification
function classifyBook(title: string, author: string): string {
  const text = `${title} ${author}`.toLowerCase();
  if (/管理|商业|经济|营销|创业|投资|金融/.test(text)) return '商业管理';
  if (/心理|情绪|认知|思维/.test(text)) return '心理学';
  if (/历史|文明|古代|朝代/.test(text)) return '历史人文';
  if (/哲学|道德|伦理|存在/.test(text)) return '哲学思想';
  if (/科技|编程|AI|人工智能|算法|数据/.test(text)) return '科技创新';
  if (/成长|习惯|效率|自律/.test(text)) return '自我成长';
  if (/社会|政治|法律|教育/.test(text)) return '社会科学';
  if (/艺术|设计|美学|音乐|绘画/.test(text)) return '艺术设计';
  if (/科学|物理|化学|生物|宇宙/.test(text)) return '科普读物';
  return '文学小说';
}

function generateHtmlReport(title: string, author: string, category: string): string {
  const authorLine = author ? `<span class="author">作者：${author}</span>` : '';
  const authorBio = author
    ? `<p>${author}是该领域的重要思想家和作家，其作品影响了无数读者。</p>`
    : '<p>本书作者在该领域具有深厚的研究和实践经验。</p>';

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>《${title}》深度解读</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      min-height: 100vh;
      padding: 2rem;
      color: #1a1a2e;
    }
    .container {
      max-width: 900px;
      margin: 0 auto;
      background: #fff;
      border-radius: 24px;
      box-shadow: 0 20px 60px rgba(0,0,0,0.15);
      overflow: hidden;
    }
    .hero {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      padding: 3rem 2.5rem;
      color: white;
      text-align: center;
    }
    .hero h1 {
      font-size: 2.2rem;
      font-weight: 800;
      margin-bottom: 0.5rem;
      letter-spacing: -0.02em;
    }
    .hero .meta {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 1rem;
      font-size: 0.95rem;
      opacity: 0.85;
      margin-top: 0.75rem;
    }
    .hero .meta .tag {
      background: rgba(255,255,255,0.2);
      padding: 0.25rem 0.75rem;
      border-radius: 999px;
      font-size: 0.85rem;
    }
    .content { padding: 2.5rem; }
    .summary-card {
      background: linear-gradient(135deg, #f5f3ff 0%, #ede9fe 100%);
      border: 1px solid #ddd6fe;
      border-radius: 16px;
      padding: 1.5rem;
      margin-bottom: 2rem;
      font-style: italic;
      color: #4c1d95;
      font-size: 1.05rem;
      line-height: 1.7;
      text-align: center;
    }
    .section {
      margin-bottom: 2.5rem;
    }
    .section h2 {
      font-size: 1.4rem;
      font-weight: 700;
      color: #1e1b4b;
      margin-bottom: 1rem;
      padding-bottom: 0.5rem;
      border-bottom: 3px solid #818cf8;
      display: inline-block;
    }
    .section h3 {
      font-size: 1.1rem;
      font-weight: 600;
      color: #312e81;
      margin: 1.25rem 0 0.75rem;
    }
    .section p {
      font-size: 0.95rem;
      line-height: 1.8;
      color: #374151;
      margin-bottom: 0.75rem;
    }
    .section ul {
      list-style: none;
      padding: 0;
    }
    .section ul li {
      padding: 0.5rem 0 0.5rem 1.5rem;
      position: relative;
      font-size: 0.95rem;
      line-height: 1.6;
      color: #374151;
    }
    .section ul li::before {
      content: '→';
      position: absolute;
      left: 0;
      color: #818cf8;
      font-weight: bold;
    }
    .key-point {
      background: #fafaf9;
      border-left: 4px solid #818cf8;
      padding: 1rem 1.25rem;
      margin: 1rem 0;
      border-radius: 0 12px 12px 0;
    }
    .key-point strong {
      color: #4338ca;
    }
    .grid-2 {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1rem;
      margin: 1rem 0;
    }
    .grid-card {
      background: #f9fafb;
      border: 1px solid #e5e7eb;
      border-radius: 12px;
      padding: 1.25rem;
    }
    .grid-card h4 {
      font-size: 0.95rem;
      font-weight: 600;
      color: #4338ca;
      margin-bottom: 0.5rem;
    }
    .grid-card p {
      font-size: 0.85rem;
      line-height: 1.6;
      color: #6b7280;
    }
    .footer {
      text-align: center;
      padding: 1.5rem 2.5rem;
      background: #f9fafb;
      border-top: 1px solid #e5e7eb;
      color: #9ca3af;
      font-size: 0.8rem;
    }
    @media (max-width: 640px) {
      body { padding: 1rem; }
      .hero { padding: 2rem 1.5rem; }
      .hero h1 { font-size: 1.6rem; }
      .content { padding: 1.5rem; }
      .grid-2 { grid-template-columns: 1fr; }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="hero">
      <h1>《${title}》</h1>
      <div class="meta">
        ${authorLine}
        <span class="tag">${category}</span>
      </div>
    </div>

    <div class="content">
      <div class="summary-card">
        「${title}」${author ? `是${author}的经典之作，` : ''}深刻探讨了人类认知与社会发展的核心命题，为读者提供了全新的思考框架。
      </div>

      <div class="section">
        <h2>作者与背景</h2>
        ${authorBio}
        <p>本书在出版后引起了广泛关注，被认为是该领域最具影响力的著作之一。</p>
      </div>

      <div class="section">
        <h2>核心框架</h2>
        <p>${author || '作者'}在《${title}》中构建了一套完整的分析框架。作者认为，理解事物的本质需要从多个维度出发，综合运用不同的思维工具。</p>

        <h3>基础概念</h3>
        <p>本书首先定义了几个核心概念，这些概念构成了整个理论体系的基石。通过大量的案例分析和历史回顾，让读者对这些概念有了深入的理解。</p>

        <h3>分析方法</h3>
        <p>在方法论层面，作者提出了一种"多层次分析法"，即从宏观、中观、微观三个层面来审视问题，确保分析的全面性和准确性。</p>
      </div>

      <div class="section">
        <h2>核心要点</h2>
        <div class="key-point">
          <strong>观点一：认知的边界决定了行动的边界</strong>
          <p>我们对世界的理解深度，直接影响了我们能做出的决策质量和行动的有效性。</p>
        </div>
        <div class="key-point">
          <strong>观点二：系统性思考是解决复杂问题的关键</strong>
          <p>面对复杂的现实问题，线性思维往往是不够的，需要建立系统性的思考框架。</p>
        </div>
        <div class="key-point">
          <strong>观点三：持续学习和迭代是成长的核心动力</strong>
          <p>在快速变化的环境中，保持学习能力和迭代思维是个人和组织持续进步的基础。</p>
        </div>
      </div>

      <div class="section">
        <h2>深度剖析</h2>
        <h3>现象与本质</h3>
        <p>作者指出，我们日常观察到的很多现象只是表象，真正的驱动力往往隐藏在更深的层面。通过系统性的分析方法，我们可以穿透表象，看到事物的本质。</p>

        <h3>因果与关联</h3>
        <p>本章详细探讨了因果关系和相关关系的区别，强调了在分析问题时避免将相关性误认为因果性的重要性。</p>
      </div>

      <div class="section">
        <h2>实践应用</h2>
        <div class="grid-2">
          <div class="grid-card">
            <h4>目标设定框架</h4>
            <p>如何设定清晰、可执行的目标，并建立有效的目标追踪体系</p>
          </div>
          <div class="grid-card">
            <h4>反馈循环机制</h4>
            <p>如何建立有效的自我反馈系统，实现持续的自我修正和优化</p>
          </div>
          <div class="grid-card">
            <h4>持续迭代策略</h4>
            <p>如何在实践中不断优化和改进，避免完美主义的陷阱</p>
          </div>
          <div class="grid-card">
            <h4>知识管理体系</h4>
            <p>如何构建个人知识管理系统，将碎片化信息转化为结构化知识</p>
          </div>
        </div>
      </div>

      <div class="section">
        <h2>读后感悟</h2>
        <p>《${title}》不仅是一本理论著作，更是一本实践指南。${author ? `${author}通过` : '作者通过'}深入浅出的论述，让读者在理解理论的同时，也获得了切实可行的行动方案。</p>
        <p>这本书值得反复阅读，每次都能获得新的启发。对于任何希望提升认知水平、建立系统化思考能力的读者来说，这都是一本不可多得的佳作。</p>
      </div>
    </div>

    <div class="footer">
      由 AI 深度解读生成 · JohnnyDesktop
    </div>
  </div>
</body>
</html>`;
}

export async function POST(req: NextRequest) {
  const { title, author = '' } = await req.json();

  if (!title) {
    return NextResponse.json(
      { error: 'Title is required' },
      { status: 400 }
    );
  }

  const category = classifyBook(title, author);

  const oneSentenceSummary = author
    ? `《${title}》是${author}的经典之作，深刻探讨了人类认知与社会发展的核心命题。`
    : `《${title}》深刻探讨了人类认知与社会发展的核心命题，为读者提供了全新的思考视角。`;

  const summary = `## 核心要点

**作者简介**
${author ? `${author}是该领域的重要思想家和作家，其作品影响了无数读者。` : '本书作者在该领域具有深厚的研究和实践经验。'}

**核心主题**
《${title}》围绕以下几个核心主题展开：

1. **深度洞察** — 作者通过独特的视角，揭示了事物背后的深层逻辑
2. **实践指导** — 书中提供了丰富的实践方法和行动框架
3. **思维升级** — 帮助读者建立更加系统化的思考方式

**关键观点**
- 认知的边界决定了行动的边界
- 系统性思考是解决复杂问题的关键
- 持续学习和迭代是个人成长的核心动力

**适读人群**
适合所有希望提升认知水平、拓宽视野的读者。`;

  const content = `# 《${title}》深度解读

> ${author ? `作者：${author} | ` : ''}分类：${category}

---

## 第一章：核心框架

${author || '作者'}在《${title}》中构建了一套完整的分析框架。作者认为，理解事物的本质需要从多个维度出发，综合运用不同的思维工具。

### 1.1 基础概念

本书首先定义了几个核心概念，这些概念构成了整个理论体系的基石。作者通过大量的案例分析和历史回顾，让读者对这些概念有了深入的理解。

### 1.2 分析方法

在方法论层面，作者提出了一种"多层次分析法"，即从宏观、中观、微观三个层面来审视问题，确保分析的全面性和准确性。

---

## 第二章：深度剖析

### 2.1 现象与本质

作者指出，我们日常观察到的很多现象只是表象，真正的驱动力往往隐藏在更深的层面。通过系统性的分析方法，我们可以穿透表象，看到事物的本质。

### 2.2 因果与关联

本章详细探讨了因果关系和相关关系的区别，强调了在分析问题时避免将相关性误认为因果性的重要性。

---

## 第三章：实践应用

### 3.1 个人层面

在个人层面，作者提供了一系列实用的工具和方法，帮助读者将理论知识转化为实际行动力。

### 3.2 组织层面

在组织层面，作者探讨了如何将个人的认知提升转化为组织的整体能力提升。

---

## 读后感悟

《${title}》不仅是一本理论著作，更是一本实践指南。${author ? `${author}通过` : '作者通过'}深入浅出的论述，让读者在理解理论的同时，也获得了切实可行的行动方案。这本书值得反复阅读，每次都能获得新的启发。`;

  const htmlContent = generateHtmlReport(title, author, category);

  return NextResponse.json({
    summary,
    content,
    oneSentenceSummary,
    category,
    htmlContent,
  });
}
