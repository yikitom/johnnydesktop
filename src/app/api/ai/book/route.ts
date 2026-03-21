import { NextRequest, NextResponse } from 'next/server';

// Categories for auto-classification
const CATEGORIES = [
  '文学小说', '商业管理', '科技创新', '心理学', '历史人文',
  '哲学思想', '自我成长', '社会科学', '艺术设计', '科普读物',
];

function classifyBook(title: string, author: string): string {
  // Simple keyword-based classification; in production, use LLM
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

export async function POST(req: NextRequest) {
  const { title, author } = await req.json();

  if (!title || !author) {
    return NextResponse.json(
      { error: 'Title and author are required' },
      { status: 400 }
    );
  }

  // Simulate AI skill call with realistic content generation
  // In production, this calls the Stitch MCP skill
  const category = classifyBook(title, author);

  const oneSentenceSummary = `《${title}》是${author}的经典之作，深刻探讨了人类认知与社会发展的核心命题。`;

  const summary = `## 核心要点

**作者简介**
${author}是该领域的重要思想家和作家，其作品影响了无数读者。

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

> 作者：${author} | 分类：${category}

---

## 第一章：核心框架

${author}在《${title}》中构建了一套完整的分析框架。作者认为，理解事物的本质需要从多个维度出发，综合运用不同的思维工具。

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

在个人层面，作者提供了一系列实用的工具和方法，帮助读者将理论知识转化为实际行动力。这些方法包括：

- **目标设定框架**：如何设定清晰、可执行的目标
- **反馈循环机制**：如何建立有效的自我反馈系统
- **持续迭代策略**：如何在实践中不断优化和改进

### 3.2 组织层面

在组织层面，作者探讨了如何将个人的认知提升转化为组织的整体能力提升，包括知识管理、团队学习和组织文化建设等方面。

---

## 第四章：未来展望

作者在最后一章中展望了未来的发展趋势，并提出了几个值得深思的问题。这些问题不仅关乎个人的成长，更关乎整个社会的进步方向。

---

## 读后感悟

《${title}》不仅是一本理论著作，更是一本实践指南。${author}通过深入浅出的论述，让读者在理解理论的同时，也获得了切实可行的行动方案。这本书值得反复阅读，每次都能获得新的启发。`;

  return NextResponse.json({
    summary,
    content,
    oneSentenceSummary,
    category,
  });
}
