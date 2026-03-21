import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const { sourceIds, message } = await req.json();

  const sourceNames: Record<string, string> = {
    xiaohongshu: '小红书',
    tourism: '旅游局数据',
    consultation: '用户咨询',
    search: '用户查询',
    visit: '用户访问',
  };

  const selectedNames = sourceIds.map((id: string) => sourceNames[id] || id).join('、');

  // Simulate AI response based on context
  const reply = `基于您选择的数据源（${selectedNames}），针对您的问题"${message}"，以下是分析结果：

**数据概览**
- 已加载 ${sourceIds.length} 个数据源
- 数据覆盖时间范围：2025年1月 - 2026年3月

**关键发现**
1. 从${selectedNames}的数据中可以看出，用户关注的核心需求集中在个性化体验和性价比两个维度
2. 近期数据趋势显示用户偏好正在向深度体验方向转移
3. 跨数据源交叉分析表明，社交媒体讨论热度与实际转化率之间存在约0.6的相关性

**建议行动**
- 建议进一步细分用户群体，针对不同群体制定差异化策略
- 可以结合更多数据源进行深度分析，以获得更全面的洞察

如需进一步深入分析某个方面，请告诉我。`;

  return NextResponse.json({ reply });
}
