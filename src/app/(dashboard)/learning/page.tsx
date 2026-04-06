'use client';

import { useState, useEffect, useCallback } from 'react';

/* ═══════════════════════════════════════════════════════════
   DATA: 9 modules + 30-day schedule
   ═══════════════════════════════════════════════════════════ */

interface Practice {
  id: string;
  title: string;
  stars: number;
  desc: string;
  hours: string;
}

interface Module {
  id: number;
  title: string;
  desc: string;
  icon: string;
  color: string;
  days: string;
  priority: string;
  theory: string;
  practices: Practice[];
  resources: { label: string; url: string }[];
}

const MODULES: Module[] = [
  {
    id: 1, title: 'n8n 工作流引擎', icon: '⚡', color: '#FF3B30',
    days: 'Day 1-4', priority: 'Q1 立即做',
    desc: '从"手动触发"到"事件驱动"。安装 n8n → Airtable→Claude→Slack 全链路 → 月度报告全自动管道。',
    theory: 'n8n 是开源的工作流自动化引擎。核心概念只有 5 个：Workflow（流水线）、Node（工位）、Trigger（开关）、Connection（传送带）、Credential（钥匙）。你设置好一次，它自己跑——可以定时每天 9 点、也可以被外部事件触发。和 Make/Zapier 的区别：n8n 免费自托管、可写 JS/Python、灵活度最高。',
    practices: [
      { id: '1-1', title: 'Docker 安装 + Hello World', stars: 1, desc: '启动 n8n，创建定时获取随机名言的工作流', hours: '1-2h' },
      { id: '1-2', title: 'Airtable → Claude → Slack', stars: 3, desc: '读竞品数据 → AI 分析 → 推送团队频道，全链路跑通', hours: '3-5h' },
      { id: '1-3', title: '月度旅游报告全自动管道', stars: 5, desc: '定时采集 → AI 分析 → 生成 HTML → 部署 Netlify → Slack 通知 + 质量自检', hours: '5-8h' },
    ],
    resources: [
      { label: 'n8n 官方文档', url: 'https://docs.n8n.io/' },
      { label: 'n8n AI 模板库', url: 'https://n8n.io/workflows/?categories=AI' },
    ],
  },
  {
    id: 2, title: 'Agent Teams 多 Agent 编排', icon: '👥', color: '#FF3B30',
    days: 'Day 5-7', priority: 'Q1 立即做',
    desc: '从单兵作战到军团协作。启用 Agent Teams，体验多 Teammate 并行、互相审查、共享任务列表。',
    theory: '三种模式：Sub-agent（老板派秘书查数据）→ Agent Teams（项目小组各负责一块，定期同步）→ Coordinator Mode（项目经理分配追踪汇总）。Agent Teams 需要 Claude Code v2.1.32+，通过设置 CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1 开启。',
    practices: [
      { id: '2-1', title: '第一次 3 人 Team 协作', stars: 1, desc: 'UX + Tech + Business 三角度分析飞猪酒店体验', hours: '1-2h' },
      { id: '2-2', title: 'Agent Teams 代码重构', stars: 3, desc: '对真实项目做多 Agent 并行重构，产出可 merge 的 PR', hours: '3-5h' },
      { id: '2-3', title: '自定义 Agent 配置 + Conductor', stars: 5, desc: '在 .claude/agents/ 创建专用 Agent，用 Conductor 串联', hours: '5-8h' },
    ],
    resources: [
      { label: 'Agent Teams 官方文档', url: 'https://code.claude.com/docs/en/agent-teams' },
      { label: 'awesome-claude-code', url: 'https://github.com/hesreallyhim/awesome-claude-code' },
    ],
  },
  {
    id: 3, title: 'Agent 可观测性', icon: '📊', color: '#FF9500',
    days: 'Day 8-11', priority: 'Q2 尽快做',
    desc: '给 Agent 装仪表盘。部署 Langfuse，追踪延迟/成本/质量，定义 SLA，构建 LLM-as-Judge。',
    theory: 'Trace = 一次完整执行链路；Span = 链路中每一步；Score = 质量评分（用户反馈 or LLM 自评）；Cost = token 成本。Langfuse 是开源免费的可观测性平台，MIT 协议，可自托管。你的 Agent 每跑一次，所有细节都会被记录和可视化。',
    practices: [
      { id: '3-1', title: '部署 Langfuse + 第一条 Trace', stars: 1, desc: 'Docker 启动 Langfuse，Python SDK 发送 trace', hours: '1-2h' },
      { id: '3-2', title: 'n8n 管道接入 Langfuse', stars: 3, desc: '每次 Claude 调用的成本、延迟、输入输出全部追踪', hours: '3-5h' },
      { id: '3-3', title: 'LLM-as-Judge 自动质量评估', stars: 5, desc: 'Claude 给 Agent 输出打分，构建 30 天质量趋势图', hours: '5-8h' },
    ],
    resources: [
      { label: 'Langfuse 文档', url: 'https://langfuse.com/docs' },
      { label: 'OpenTelemetry GenAI', url: 'https://opentelemetry.io/blog/2025/ai-agent-observability/' },
    ],
  },
  {
    id: 4, title: 'RAG 检索增强生成', icon: '🧠', color: '#FF9500',
    days: 'Day 12-14', priority: 'Q2 尽快做',
    desc: '让 Claude 读懂你的数据。Chroma 向量库 + Airtable 索引 + 个人知识图谱语义检索。',
    theory: 'RAG 在 Claude 回答前先去你的数据库"查资料"——把问题变成向量 → 在向量库找最相似的文档 → 塞进 prompt → Claude 基于真实数据回答。核心概念：Embedding（文字→数字向量）、向量数据库（Chroma）、相似度检索、Reranking。',
    practices: [
      { id: '4-1', title: 'Chroma 安装 + 语义检索', stars: 1, desc: '本地向量库，体验"语义理解"而非"关键词匹配"', hours: '1-2h' },
      { id: '4-2', title: 'Airtable 竞品数据 RAG', stars: 3, desc: '501 条产品数据索引化，自然语言查询竞品', hours: '3-5h' },
      { id: '4-3', title: '个人知识图谱 RAG', stars: 5, desc: '15+ 本书解构 HTML 做 Embedding，跨书语义检索', hours: '5-8h' },
    ],
    resources: [
      { label: 'Chroma 文档', url: 'https://docs.trychroma.com/' },
      { label: 'RAG 入门教程', url: 'https://python.langchain.com/docs/tutorials/rag/' },
    ],
  },
  {
    id: 5, title: 'Claude Code 高级用法', icon: '⌨️', color: '#007AFF',
    days: 'Day 15-17', priority: 'Q3 计划做',
    desc: '从基础安装到系统级工程。CLAUDE.md 精简 + Hooks 自动化 + Sub-agent + Memory 持久化。',
    theory: 'CLAUDE.md 应控制在 200 行以内。分层：全局规则（CLAUDE.md）→ 目录级（.claude/rules/）→ Skill 按需。反模式：CLAUDE.md 过长（token 浪费）、同会话堆积不相关任务（上下文污染）、失败后反复修改（越改越烂，应 /clear 重来）。',
    practices: [
      { id: '5-1', title: 'CLAUDE.md 审计 + Rules 分层', stars: 1, desc: '为真实项目创建精简配置 + 目录级规则', hours: '1-2h' },
      { id: '5-2', title: 'Hooks 自动化', stars: 3, desc: 'pre-commit 自动测试、post-push 自动部署', hours: '3-5h' },
      { id: '5-3', title: 'Sub-agent 并行 + Memory', stars: 5, desc: '边跑测试边开发，项目知识跨会话持久化', hours: '5-8h' },
    ],
    resources: [
      { label: 'Claude Code 文档', url: 'https://code.claude.com/docs' },
      { label: 'Compound Engineering Plugin', url: 'https://github.com/hesreallyhim/awesome-claude-code' },
    ],
  },
  {
    id: 6, title: '自定义 MCP Server', icon: '🔌', color: '#007AFF',
    days: 'Day 18-21', priority: 'Q3 计划做',
    desc: '从"用别人的 MCP"到"造自己的"。Python SDK → Airtable 接口 → 飞猪后台模拟。',
    theory: 'MCP Server 三层：Resources（只读数据 GET）、Tools（可执行操作 POST）、Prompts（预设模板）。用 Python MCP SDK 开发，在 Claude Desktop config.json 注册，Claude 就能直接操作你的业务系统。',
    practices: [
      { id: '6-1', title: 'Hello World MCP Server', stars: 1, desc: '最简 MCP Server，Claude 成功调用自定义 Tool', hours: '1-2h' },
      { id: '6-2', title: 'Airtable 竞品 MCP Server', stars: 3, desc: '三个 Tool：查列表/搜产品/价格趋势', hours: '3-5h' },
      { id: '6-3', title: '飞猪后台模拟 MCP', stars: 5, desc: 'SQLite 存储 + 报价/房态/订单三大操作', hours: '5-8h' },
    ],
    resources: [
      { label: 'MCP 官方文档', url: 'https://modelcontextprotocol.io/docs' },
      { label: 'Python MCP SDK', url: 'https://github.com/modelcontextprotocol/python-sdk' },
    ],
  },
  {
    id: 7, title: 'Context Engineering', icon: '🏗️', color: '#AF52DE',
    days: 'Day 22-24', priority: 'Q4 持续做',
    desc: '从 Prompt Engineering 到系统级上下文设计。Skill 层级重构、Token 预算、渐进暴露。',
    theory: '三层上下文策略：全局层（每次加载，必须精简）→ 项目层（按项目加载）→ 按需层（Tool 调用/RAG 检索时才获取）。Token 预算管理：Claude 的 200K 窗口里，CLAUDE.md + Skill + 对话 + 工具返回都在争夺空间。',
    practices: [
      { id: '7-1', title: 'Skill 体系审计与层级重构', stars: 1, desc: '8+ Skill 文件按全局/项目/按需三层重新归类', hours: '1-2h' },
      { id: '7-2', title: 'Token 预算策略', stars: 3, desc: '为三种高频任务设计预算，测量并优化', hours: '3-5h' },
      { id: '7-3', title: '渐进暴露实现', stars: 5, desc: 'Agent 先加载摘要 Skill，需要时才加载完整版', hours: '5-8h' },
    ],
    resources: [
      { label: 'Context Engineering Kit', url: 'https://github.com/hesreallyhim/awesome-claude-code' },
    ],
  },
  {
    id: 8, title: '生产闭环运营', icon: '🔄', color: '#AF52DE',
    days: 'Day 25-27', priority: 'Q4 持续做',
    desc: '从"做完就完"到"持续运转"。永不停机 + 运维仪表盘 + 全自动迭代循环。',
    theory: '生产级五要素：持续运行（不需手动启动）、可观测性（每次有 trace/成本/质量）、告警（异常自动通知）、迭代循环（trace→识别→修复→验证）、成本控制（月度预算上限）。',
    practices: [
      { id: '8-1', title: '管道"永不停机"改造', stars: 1, desc: '错误重试 + 失败告警 + 执行日志，连续 7 天运行', hours: '2-3h' },
      { id: '8-2', title: '运维仪表盘', stars: 3, desc: 'HTML 仪表盘：运行次数/成功率/延迟/成本/质量', hours: '3-5h' },
      { id: '8-3', title: '全自动迭代循环', stars: 5, desc: '质量下降 → AI 分析原因 → 生成修复 → 人工确认 → 自动应用', hours: '5-8h' },
    ],
    resources: [
      { label: '12-Factor Agents', url: 'https://dev.to/bredmond1019' },
    ],
  },
  {
    id: 9, title: '综合实战', icon: '🏆', color: '#34C759',
    days: 'Day 28-30', priority: '综合验收',
    desc: '飞猪供应链监控 Agent 端到端：数据采集→RAG→Agent Teams→日报→Langfuse→自动迭代。',
    theory: '将 Module 01-08 全部整合：n8n 调度 + Claude 推理 + Chroma 知识库 + 自定义 MCP + Langfuse 追踪 + Slack 输出 + 自动质量评估。验收标准：连续 7 天运行、质量 4/5+、月成本 <$50。',
    practices: [
      { id: '9-1', title: '端到端 Agent 系统搭建与验收', stars: 5, desc: '从零构建持续运行的飞猪供应链监控 Agent，全栈集成', hours: '8-12h' },
    ],
    resources: [],
  },
];

const SCHEDULE = [
  { day: '1', mod: 1, topic: '安装 Docker + n8n，Hello World 工作流', out: 'n8n 运行中' },
  { day: '2', mod: 1, topic: '添加凭证，Airtable 读取 Node', out: '数据流通' },
  { day: '3', mod: 1, topic: 'Claude API + Slack 推送全链路', out: '管道端到端' },
  { day: '4', mod: 1, topic: '月度旅游报告自动化改造', out: '自动部署管道' },
  { day: '5', mod: 2, topic: '启用 Agent Teams + 3 人协作', out: 'Team 运行记录' },
  { day: '6', mod: 2, topic: 'Agent Teams 代码重构实战', out: '可 merge 的 PR' },
  { day: '7', mod: 2, topic: '自定义 Agent 配置 + Conductor', out: 'Agent 配置文件' },
  { day: '8', mod: 3, topic: '部署 Langfuse + 第一条 Trace', out: 'Dashboard 可见' },
  { day: '9-10', mod: 3, topic: 'n8n 管道接入 Langfuse 追踪', out: '成本/延迟图表' },
  { day: '11', mod: 3, topic: 'LLM-as-Judge 质量自动评估', out: '质量趋势图' },
  { day: '12', mod: 4, topic: '安装 Chroma + 第一次语义检索', out: '向量库运行' },
  { day: '13', mod: 4, topic: 'Airtable 竞品数据 RAG 索引', out: '自然语言查询' },
  { day: '14', mod: 4, topic: '个人知识图谱 RAG', out: '跨书语义检索' },
  { day: '15', mod: 5, topic: 'CLAUDE.md 审计 + Rules 分层', out: '精简配置文件' },
  { day: '16', mod: 5, topic: 'Hooks 自动化（pre-commit/post-push）', out: '自动测试/部署' },
  { day: '17', mod: 5, topic: 'Sub-agent 并行 + Memory 持久化', out: '跨会话记忆' },
  { day: '18', mod: 6, topic: 'Hello World MCP Server', out: 'Claude 调用成功' },
  { day: '19-20', mod: 6, topic: 'Airtable 竞品数据 MCP Server', out: '3 个 Tool 可用' },
  { day: '21', mod: 6, topic: '飞猪后台模拟 MCP Server', out: '模拟后台运行' },
  { day: '22', mod: 7, topic: 'Skill 体系审计与层级重构', out: '三层策略' },
  { day: '23', mod: 7, topic: 'Token 预算策略设计', out: '预算文档' },
  { day: '24', mod: 7, topic: '渐进暴露实现 + 效果测量', out: 'token 节省率' },
  { day: '25', mod: 8, topic: '管道"永不停机"改造', out: '7 天无干预运行' },
  { day: '26', mod: 8, topic: '运维仪表盘构建', out: 'HTML 仪表盘' },
  { day: '27', mod: 8, topic: '全自动迭代循环', out: '质量自修复' },
  { day: '28-30', mod: 9, topic: '飞猪供应链监控 Agent 综合实战', out: '端到端系统' },
];

const WEEKS = [
  { num: 1, title: '跑通第一个闭环', days: 'Day 1-7', color: '#FF3B30', range: [0, 7] },
  { num: 2, title: '可观测 + 知识管理', days: 'Day 8-14', color: '#FF9500', range: [7, 14] },
  { num: 3, title: '工程能力深化', days: 'Day 15-21', color: '#007AFF', range: [14, 21] },
  { num: 4, title: '系统级融合', days: 'Day 22-30', color: '#34C759', range: [21, 27] },
];

/* ═══════════════════════════════════════════════════════════
   COMPONENT
   ═══════════════════════════════════════════════════════════ */

export default function LearningPage() {
  const [expandedMod, setExpandedMod] = useState<number | null>(null);
  const [completed, setCompleted] = useState<Set<string>>(new Set());
  const [tab, setTab] = useState<'modules' | 'schedule'>('modules');

  // Load progress from a simple in-memory approach (would use API/Airtable in production)
  const togglePractice = useCallback((id: string) => {
    setCompleted(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const totalPractices = MODULES.reduce((sum, m) => sum + m.practices.length, 0);
  const completedCount = completed.size;
  const pct = totalPractices > 0 ? Math.round((completedCount / totalPractices) * 100) : 0;

  const Stars = ({ n }: { n: number }) => (
    <span className="text-xs">
      {Array.from({ length: 5 }, (_, i) => (
        <span key={i} className={i < n ? 'text-amber-400' : 'text-gray-300'}>★</span>
      ))}
    </span>
  );

  return (
    <div className="min-h-screen bg-[#f5f5fa]">
      {/* Hero */}
      <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white px-8 py-10">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-xs font-semibold tracking-wider uppercase px-3 py-1 rounded-full bg-white/10">30-Day System</span>
          </div>
          <h1 className="text-3xl font-bold mb-2">Johnny AI Learning</h1>
          <p className="text-white/60 text-base max-w-xl">9 模块 · {totalPractices} 个递进实践 · 1 个综合实战<br/>从 Top 5% 到 Top 1% 的 AI 使用者</p>

          {/* Stats */}
          <div className="flex gap-6 mt-8">
            <div className="bg-white/10 rounded-2xl px-5 py-4 min-w-[120px]">
              <div className="text-2xl font-bold">{completedCount}/{totalPractices}</div>
              <div className="text-xs text-white/50 mt-1">实践完成</div>
            </div>
            <div className="bg-white/10 rounded-2xl px-5 py-4 min-w-[120px]">
              <div className="text-2xl font-bold">{pct}%</div>
              <div className="text-xs text-white/50 mt-1">总进度</div>
            </div>
            <div className="bg-white/10 rounded-2xl px-5 py-4 min-w-[120px]">
              <div className="text-2xl font-bold">30</div>
              <div className="text-xs text-white/50 mt-1">天计划</div>
            </div>
          </div>

          {/* Progress bar */}
          <div className="mt-6 bg-white/10 rounded-full h-2 overflow-hidden">
            <div className="h-full bg-gradient-to-r from-blue-400 to-emerald-400 rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-8 py-8">
        {/* Tab switcher */}
        <div className="flex gap-2 mb-8">
          <button
            onClick={() => setTab('modules')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${tab === 'modules' ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
          >
            📦 9 大模块
          </button>
          <button
            onClick={() => setTab('schedule')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${tab === 'schedule' ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
          >
            📅 30 天课表
          </button>
        </div>

        {/* ═══ MODULES TAB ═══ */}
        {tab === 'modules' && (
          <div className="space-y-3">
            {MODULES.map((mod) => {
              const isExpanded = expandedMod === mod.id;
              const modCompleted = mod.practices.filter(p => completed.has(p.id)).length;
              const modTotal = mod.practices.length;

              return (
                <div key={mod.id} className="bg-white rounded-2xl shadow-sm overflow-hidden">
                  {/* Header */}
                  <button
                    onClick={() => setExpandedMod(isExpanded ? null : mod.id)}
                    className="w-full flex items-center gap-4 px-5 py-4 text-left hover:bg-gray-50 transition-colors"
                  >
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center text-lg shrink-0"
                      style={{ background: `${mod.color}15`, }}
                    >
                      {mod.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold text-gray-400">0{mod.id}</span>
                        <span className="text-sm font-semibold text-gray-900">{mod.title}</span>
                      </div>
                      <div className="text-xs text-gray-400 mt-0.5">{mod.days} · {mod.priority}</div>
                    </div>
                    {/* Progress mini */}
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-xs text-gray-400">{modCompleted}/{modTotal}</span>
                      <div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full rounded-full transition-all" style={{ width: `${modTotal > 0 ? (modCompleted / modTotal) * 100 : 0}%`, background: mod.color }} />
                      </div>
                      <svg className={`w-4 h-4 text-gray-300 transition-transform ${isExpanded ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                    </div>
                  </button>

                  {/* Expanded content */}
                  {isExpanded && (
                    <div className="px-5 pb-5 border-t border-gray-100">
                      {/* Theory */}
                      <div className="mt-4 p-4 bg-gray-50 rounded-xl">
                        <div className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold mb-2">📖 基础理论</div>
                        <p className="text-sm text-gray-600 leading-relaxed">{mod.theory}</p>
                      </div>

                      {/* Practices */}
                      <div className="mt-4 space-y-2">
                        <div className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold mb-2">🛠️ 实践练习</div>
                        {mod.practices.map((p) => (
                          <div
                            key={p.id}
                            className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${completed.has(p.id) ? 'bg-emerald-50 border-emerald-200' : 'bg-white border-gray-100 hover:border-gray-200'}`}
                          >
                            <button
                              onClick={(e) => { e.stopPropagation(); togglePractice(p.id); }}
                              className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${completed.has(p.id) ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-gray-300'}`}
                            >
                              {completed.has(p.id) && <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                            </button>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className={`text-sm font-medium ${completed.has(p.id) ? 'text-emerald-700 line-through' : 'text-gray-800'}`}>{p.title}</span>
                                <Stars n={p.stars} />
                              </div>
                              <p className="text-xs text-gray-400 mt-0.5">{p.desc}</p>
                            </div>
                            <span className="text-[10px] text-gray-300 shrink-0">{p.hours}</span>
                          </div>
                        ))}
                      </div>

                      {/* Resources */}
                      {mod.resources.length > 0 && (
                        <div className="mt-4 flex flex-wrap gap-2">
                          {mod.resources.map((r, i) => (
                            <a key={i} href={r.url} target="_blank" rel="noopener noreferrer"
                              className="text-xs text-blue-500 hover:text-blue-700 bg-blue-50 px-3 py-1.5 rounded-lg transition-colors"
                            >
                              {r.label} ↗
                            </a>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* ═══ SCHEDULE TAB ═══ */}
        {tab === 'schedule' && (
          <div className="space-y-4">
            {WEEKS.map((week) => (
              <div key={week.num} className="bg-white rounded-2xl shadow-sm overflow-hidden">
                <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
                  <div className="flex items-center gap-3">
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold text-white" style={{ background: week.color }}>
                      W{week.num}
                    </div>
                    <span className="text-sm font-semibold text-gray-900">{week.title}</span>
                  </div>
                  <span className="text-xs text-gray-400">{week.days}</span>
                </div>
                <div className="divide-y divide-gray-50">
                  {SCHEDULE.slice(week.range[0], week.range[1]).map((item, i) => {
                    const mod = MODULES.find(m => m.id === item.mod)!;
                    return (
                      <div key={i} className="flex items-center gap-3 px-5 py-2.5 text-sm">
                        <span className="text-xs font-mono text-gray-300 w-12 shrink-0">D{item.day}</span>
                        <span className="text-xs font-semibold w-8 shrink-0" style={{ color: mod.color }}>0{mod.id}</span>
                        <span className="text-gray-600 flex-1">{item.topic}</span>
                        <span className="text-[10px] text-gray-300 shrink-0">{item.out}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* How to start */}
        <div className="mt-10 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-6 border border-blue-100">
          <h3 className="text-base font-semibold text-gray-900 mb-3">🚀 如何开始</h3>
          <div className="space-y-2 text-sm text-gray-600">
            <p><strong>Step 1：</strong>下载 johnny-ai-learning 项目包，解压到本地工作目录</p>
            <p><strong>Step 2：</strong>终端执行 <code className="bg-white/80 px-2 py-0.5 rounded text-xs">cd johnny-ai-learning && claude</code></p>
            <p><strong>Step 3：</strong>对 Claude Code 说 <code className="bg-white/80 px-2 py-0.5 rounded text-xs">开始模块 01</code>，按指引操作</p>
            <p><strong>Step 4：</strong>完成后点击上方 ✓ 标记进度，每周回顾</p>
          </div>
        </div>

        <div className="text-center text-xs text-gray-300 mt-12 pb-8">
          Johnny AI Learning v1.0 · 9 模块 · {totalPractices} 实践 · 30 天
        </div>
      </div>
    </div>
  );
}
