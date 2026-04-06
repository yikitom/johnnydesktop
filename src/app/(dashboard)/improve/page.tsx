'use client';

import { useState, useCallback } from 'react';

interface Step { title: string; body?: string; code?: string; check?: string; }
interface Practice { id: string; title: string; stars: number; desc: string; hours: string; guide: Step[]; }
interface Mod { id: number; title: string; icon: string; color: string; days: string; pri: string; theory: string; practices: Practice[]; links: { t: string; u: string }[]; }

const D: Mod[] = [
  { id:1, title:'n8n 工作流引擎', icon:'⚡', color:'#FF3B30', days:'Day 1-4', pri:'Q1 立即做',
    theory:'n8n 是开源工作流自动化引擎，核心 5 个概念：Workflow（流水线）、Node（工位）、Trigger（开关）、Connection（传送带）、Credential（钥匙）。设置好一次它自己跑。和 Make/Zapier 的区别：免费自托管、可写 JS/Python、灵活度最高。',
    practices:[
      { id:'1-1', title:'Docker 安装 + Hello World', stars:1, hours:'1-2h', desc:'启动 n8n，创建定时获取随机名言的工作流',
        guide:[
          { title:'安装 Docker Desktop', body:'macOS 用 Homebrew，安装后打开 Docker Desktop 等菜单栏出现鲸鱼图标。', code:'brew install --cask docker' },
          { title:'一行命令启动 n8n', body:'Docker 自动下载镜像并运行。', code:'docker run -d --name n8n \\\n  -p 5678:5678 \\\n  -v n8n_data:/home/node/.n8n \\\n  n8nio/n8n' },
          { title:'打开 n8n 并注册', body:'浏览器访问 http://localhost:5678，注册本地管理员账号。' },
          { title:'创建第一个工作流', body:'拖入 Schedule Trigger 和 HTTP Request（URL: https://api.quotable.io/random），连线。' },
          { title:'测试运行', body:'点 Test Workflow，看到随机名言即成功。', check:'n8n 运行 + 工作流执行成功' },
        ]},
      { id:'1-2', title:'Airtable - Claude - Slack', stars:3, hours:'3-5h', desc:'读竞品数据，AI 分析，推送团队频道',
        guide:[
          { title:'准备三把钥匙', body:'Anthropic API Key、Airtable PAT、Slack Webhook URL。' },
          { title:'n8n 中添加凭证', body:'Settings - Credentials，添加三个凭证。' },
          { title:'搭建 5 节点工作流', body:'Schedule Trigger - Airtable - Code(格式化) - HTTP Request(Claude API) - Slack。' },
          { title:'Code Node 示例', code:'const items = $input.all();\nconst records = items.map(i =>\n  "- " + i.json.fields.title + ": " + i.json.fields.price\n).join("\\n");\nreturn [{ json: {\n  model: "claude-sonnet-4-20250514",\n  max_tokens: 1000,\n  messages: [{ role: "user",\n    content: "分析以下数据:\\n" + records }]\n}}];' },
          { title:'测试并激活', body:'确认 Slack 收到分析摘要，开启 Active。', check:'Slack 每天收到分析 + 连续3天无报错' },
        ]},
      { id:'1-3', title:'月度旅游报告全自动管道', stars:5, hours:'5-8h', desc:'定时采集，AI 生成，部署 Netlify，Slack 通知',
        guide:[
          { title:'设计 8 节点架构', body:'Cron - HTTP x6(采集) - Code(清洗) - Claude API(生成) - Claude API(质量自检) - IF(PASS) - GitHub API(推送) - Slack(链接)' },
          { title:'数据采集层', body:'JNTO/KTO/MOTS/香港/澳门/马来，Code Node 统一清洗为 JSON。' },
          { title:'质量自检', body:'Claude 检查完整性，只回答 PASS/FAIL。' },
          { title:'GitHub API 推送', body:'PUT /repos/contents/xxx.html，需先 GET sha。' },
          { title:'错误处理', body:'Error Workflow 发 Slack alert。', check:'端到端 + 自动部署 + 通知 + 质量自检' },
        ]},
    ],
    links:[{ t:'n8n 官方文档', u:'https://docs.n8n.io/' }, { t:'n8n AI 模板库', u:'https://n8n.io/workflows/?categories=AI' }],
  },
  { id:2, title:'Agent Teams 多 Agent 编排', icon:'👥', color:'#FF3B30', days:'Day 5-7', pri:'Q1 立即做',
    theory:'三种模式：Sub-agent（派秘书查数据）- Agent Teams（小组协作，共享任务列表）- Coordinator（项目经理分配追踪）。需要 Claude Code v2.1.32+。',
    practices:[
      { id:'2-1', title:'第一次 3 人 Team 协作', stars:1, hours:'1-2h', desc:'UX + Tech + Business 三角度分析',
        guide:[
          { title:'确认版本', code:'claude --version  # >= v2.1.32' },
          { title:'启用 Agent Teams', code:'export CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1' },
          { title:'创建 Team', body:'启动 claude，创建 3 个 Teammate 分析飞猪国际酒店体验。' },
          { title:'互动', body:'Shift+Down 切换 Teammate，直接发消息。', check:'3 Teammate 产出 + 消息传递 + Lead 综合结论' },
        ]},
      { id:'2-2', title:'Agent Teams 代码重构', stars:3, hours:'3-5h', desc:'多 Agent 并行重构真实项目',
        guide:[
          { title:'选择目标', body:'识别可拆分的重构任务。' },
          { title:'创建分工 Team', body:'Backend + Frontend + QA 协调。' },
          { title:'监控 15-20 分钟', body:'观察 token 消耗和协调。' },
          { title:'Review', body:'git diff 审查一致性。', check:'可 merge 代码 + 理解 token 模式' },
        ]},
      { id:'2-3', title:'自定义 Agent + Conductor', stars:5, hours:'5-8h', desc:'专用 Agent 配置，Conductor 串联',
        guide:[
          { title:'创建目录', code:'mkdir -p .claude/agents' },
          { title:'编写配置', body:'supply-analyst / ux-reviewer / report-generator 三个文件。' },
          { title:'Conductor', body:'/conductor:setup 初始化，创建任务轨道。' },
          { title:'验证', body:'真实场景走完全流程。', check:'三 Agent + Conductor + 完整报告' },
        ]},
    ],
    links:[{ t:'Agent Teams 文档', u:'https://code.claude.com/docs/en/agent-teams' }, { t:'awesome-claude-code', u:'https://github.com/hesreallyhim/awesome-claude-code' }],
  },
  { id:3, title:'Agent 可观测性', icon:'📊', color:'#FF9500', days:'Day 8-11', pri:'Q2 尽快做',
    theory:'Trace = 完整执行链路，Span = 每一步，Score = 质量评分，Cost = token 成本。Langfuse 开源免费（MIT），可自托管。',
    practices:[
      { id:'3-1', title:'部署 Langfuse + 第一条 Trace', stars:1, hours:'1-2h', desc:'Docker 启动 Langfuse',
        guide:[
          { title:'启动', code:'git clone https://github.com/langfuse/langfuse.git\ncd langfuse && docker compose up -d' },
          { title:'注册获取 Keys', body:'http://localhost:3000 注册，创建 Project。' },
          { title:'发送 Trace', code:'pip install langfuse\nfrom langfuse import Langfuse\nlf = Langfuse(host="http://localhost:3000",\n  public_key="pk-xxx", secret_key="sk-xxx")\ntrace = lf.trace(name="hello")\ntrace.span(name="step1", input="hi", output="ok")\nlf.flush()' },
          { title:'查看', check:'Dashboard 中可见 Trace + Span' },
        ]},
      { id:'3-2', title:'n8n 管道接入 Langfuse', stars:3, hours:'3-5h', desc:'成本/延迟全追踪',
        guide:[
          { title:'HTTP Node', body:'Claude API 前后加 HTTP 发 trace。' },
          { title:'指标', body:'prompt、output、tokens、latency、model。' },
          { title:'SLA', body:'P95延迟<10s、成本<$0.05、成功率>95%。', check:'Trace + 图表 + SLA 文档' },
        ]},
      { id:'3-3', title:'LLM-as-Judge 质量评估', stars:5, hours:'5-8h', desc:'Claude 自动打分',
        guide:[
          { title:'评估 Prompt', body:'accuracy/completeness/actionability 1-5分。' },
          { title:'集成 n8n', body:'推送前加评估节点，写入 Score。' },
          { title:'趋势', body:'Analytics 按天聚合。', check:'自动评估 + 检测质量下降' },
        ]},
    ],
    links:[{ t:'Langfuse 文档', u:'https://langfuse.com/docs' }],
  },
  { id:4, title:'RAG 检索增强生成', icon:'🧠', color:'#FF9500', days:'Day 12-14', pri:'Q2 尽快做',
    theory:'RAG 在回答前查你的数据库：问题变向量，找最相似文档，塞进 prompt，基于真实数据回答。',
    practices:[
      { id:'4-1', title:'Chroma + 语义检索', stars:1, hours:'1-2h', desc:'体验语义理解',
        guide:[
          { title:'安装', code:'pip install chromadb' },
          { title:'创建集合', code:'import chromadb\nclient = chromadb.Client()\ncol = client.create_collection("travel")\ncol.add(documents=["东京浅草寺半日游",\n  "京都岚山竹林徒步","大阪环球影城"],\n  ids=["1","2","3"])' },
          { title:'语义检索', code:'r = col.query(query_texts=["寺庙文化"],n_results=2)\nprint(r["documents"])', check:'返回语义相关结果' },
        ]},
      { id:'4-2', title:'Airtable 竞品数据 RAG', stars:3, hours:'3-5h', desc:'501条产品自然语言查询',
        guide:[
          { title:'导出', body:'API 导出全部 501 条。' },
          { title:'批量写入', body:'拼接后索引，每批100条。' },
          { title:'RAG + Claude', body:'问题 - Top5 - prompt - 回答。', check:'自然语言查询，真实数据回答' },
        ]},
      { id:'4-3', title:'个人知识图谱', stars:5, hours:'5-8h', desc:'15+ 本书跨书检索',
        guide:[
          { title:'提取', body:'BeautifulSoup 按章节分段。' },
          { title:'索引', body:'写入 knowledge-graph 集合。' },
          { title:'跨书查询', body:'Claude 综合多书回答。', check:'跨书检索 + 综合分析' },
        ]},
    ],
    links:[{ t:'Chroma 文档', u:'https://docs.trychroma.com/' }],
  },
  { id:5, title:'Claude Code 高级', icon:'⌨️', color:'#007AFF', days:'Day 15-17', pri:'Q3 计划做',
    theory:'CLAUDE.md 控制在200行。分层：全局 - 目录级(.claude/rules/) - Skill 按需。',
    practices:[
      { id:'5-1', title:'CLAUDE.md 审计 + Rules', stars:1, hours:'1-2h', desc:'精简配置 + 分层规则',
        guide:[
          { title:'统计', code:'wc -l CLAUDE.md' },
          { title:'创建 Rules', code:'mkdir -p .claude/rules' },
          { title:'精简', body:'只保留概述+技术栈+10条约束。', check:'< 200行 + rules/ 2个文件' },
        ]},
      { id:'5-2', title:'Hooks 自动化', stars:3, hours:'3-5h', desc:'pre-commit 测试、post-push 部署',
        guide:[
          { title:'创建', code:'mkdir -p .claude/hooks' },
          { title:'配置', body:'commit 前自动 lint + 类型检查。' },
          { title:'验证', body:'故意错误确认拦截。', check:'拦截错误 + 触发后续' },
        ]},
      { id:'5-3', title:'Sub-agent + Memory', stars:5, hours:'5-8h', desc:'并行 + 跨会话持久化',
        guide:[
          { title:'并行', body:'主 Agent 开发，子 Agent 跑测试。' },
          { title:'Memory', body:'MEMORY.md 记录决策。' },
          { title:'验证', body:'退出重进确认记得上下文。', check:'并行 + 跨会话记忆' },
        ]},
    ],
    links:[{ t:'Claude Code 文档', u:'https://code.claude.com/docs' }],
  },
  { id:6, title:'自定义 MCP Server', icon:'🔌', color:'#007AFF', days:'Day 18-21', pri:'Q3 计划做',
    theory:'MCP 三层：Resources（只读）、Tools（可执行）、Prompts（模板）。Python SDK 开发。',
    practices:[
      { id:'6-1', title:'Hello World MCP', stars:1, hours:'1-2h', desc:'最简 Server + Claude 调用',
        guide:[
          { title:'安装', code:'pip install mcp' },
          { title:'编写', body:'定义 greet Tool。' },
          { title:'注册', body:'claude_desktop_config.json 添加。' },
          { title:'验证', check:'Claude 调用自定义 Tool' },
        ]},
      { id:'6-2', title:'Airtable 竞品 MCP', stars:3, hours:'3-5h', desc:'查列表/搜产品/价格趋势',
        guide:[
          { title:'设计 3 Tool', body:'list/search/trend。' },
          { title:'实现', body:'调 Airtable API，缓存本地。' },
          { title:'测试', check:'3 Tool + 自然语言查询' },
        ]},
      { id:'6-3', title:'飞猪后台模拟', stars:5, hours:'5-8h', desc:'SQLite + 报价/房态/订单',
        guide:[
          { title:'数据', body:'三张表，20条数据。' },
          { title:'6 Tool', body:'query/update/check/create/status/cancel。' },
          { title:'自然语言', body:'查房价-降价-订房。', check:'完整后台操作' },
        ]},
    ],
    links:[{ t:'MCP 文档', u:'https://modelcontextprotocol.io/docs' }],
  },
  { id:7, title:'Context Engineering', icon:'🏗️', color:'#AF52DE', days:'Day 22-24', pri:'Q4 持续做',
    theory:'三层：全局(精简) - 项目层 - 按需层(Tool/RAG)。Token 预算管理 200K 窗口。渐进暴露。',
    practices:[
      { id:'7-1', title:'Skill 审计重构', stars:1, hours:'1-2h', desc:'8+ Skill 三层归类',
        guide:[
          { title:'列出', body:'统计数量、字符数。' },
          { title:'分类', body:'全局/项目/按需。' },
          { title:'文档', check:'三层归类 + 策略文档' },
        ]},
      { id:'7-2', title:'Token 预算', stars:3, hours:'3-5h', desc:'三种任务设计预算',
        guide:[
          { title:'测量', body:'三种任务各测一次。' },
          { title:'上限', body:'读书<50K、竞品<30K、报告<80K。' },
          { title:'优化', check:'有预算 + 可追踪' },
        ]},
      { id:'7-3', title:'渐进暴露', stars:5, hours:'5-8h', desc:'摘要 Skill + 按需加载',
        guide:[
          { title:'摘要版', body:'<200字只含触发词。' },
          { title:'Loader Tool', body:'MCP 返回完整 Skill。' },
          { title:'测量', check:'节省 > 30%' },
        ]},
    ],
    links:[{ t:'Context Engineering Kit', u:'https://github.com/hesreallyhim/awesome-claude-code' }],
  },
  { id:8, title:'生产闭环运营', icon:'🔄', color:'#AF52DE', days:'Day 25-27', pri:'Q4 持续做',
    theory:'五要素：持续运行 + 可观测性 + 告警 + 迭代循环 + 成本控制。',
    practices:[
      { id:'8-1', title:'永不停机', stars:1, hours:'2-3h', desc:'重试 + 告警 + 日志',
        guide:[
          { title:'重试', body:'Retry on Fail 3次30秒。' },
          { title:'告警', body:'Error Workflow 发 Slack。' },
          { title:'日志', body:'Airtable 写执行记录。' },
          { title:'验证', check:'7天无干预 + 告警 + 日志' },
        ]},
      { id:'8-2', title:'运维仪表盘', stars:3, hours:'3-5h', desc:'运行/成功率/延迟/成本',
        guide:[
          { title:'数据源', body:'Airtable + Langfuse。' },
          { title:'HTML', body:'Chart.js 4图表。' },
          { title:'刷新', check:'在线 + 实时' },
        ]},
      { id:'8-3', title:'自动迭代', stars:5, hours:'5-8h', desc:'质量下降自动分析修复',
        guide:[
          { title:'检测', body:'连续3次 Score<3 告警。' },
          { title:'分析', body:'Claude 分析原因。' },
          { title:'确认', body:'Slack 确认后自动修复。', check:'全闭环' },
        ]},
    ],
    links:[],
  },
  { id:9, title:'综合实战', icon:'🏆', color:'#34C759', days:'Day 28-30', pri:'综合验收',
    theory:'Module 01-08 全整合。验收：7天运行、质量4/5+、月成本<$50。',
    practices:[
      { id:'9-1', title:'端到端 Agent 系统', stars:5, hours:'8-12h', desc:'飞猪供应链监控 Agent',
        guide:[
          { title:'架构', body:'n8n - MCP - Chroma - Claude - Langfuse - Slack' },
          { title:'逐层搭建', body:'Day28数据 - Day29推理 - Day30运维' },
          { title:'联调', body:'端到端测试5次。' },
          { title:'验收', check:'7天运行 + 质量4/5+ + 月成本<$50' },
        ]},
    ],
    links:[],
  },
];

const SCHED = [
  {d:'1',m:1,t:'Docker + n8n Hello World',o:'n8n 运行'},{d:'2',m:1,t:'添加凭证 + Airtable',o:'数据流通'},{d:'3',m:1,t:'Claude API + Slack',o:'管道端到端'},{d:'4',m:1,t:'月度报告自动化',o:'自动部署'},
  {d:'5',m:2,t:'Agent Teams 3人协作',o:'Team 记录'},{d:'6',m:2,t:'Agent Teams 重构',o:'可merge PR'},{d:'7',m:2,t:'自定义 Agent',o:'配置'},
  {d:'8',m:3,t:'部署 Langfuse',o:'Dashboard'},{d:'9-10',m:3,t:'n8n 接入 Langfuse',o:'图表'},{d:'11',m:3,t:'LLM-as-Judge',o:'质量趋势'},
  {d:'12',m:4,t:'Chroma + 语义检索',o:'向量库'},{d:'13',m:4,t:'Airtable RAG',o:'查询'},{d:'14',m:4,t:'知识图谱',o:'跨书检索'},
  {d:'15',m:5,t:'CLAUDE.md + Rules',o:'精简'},{d:'16',m:5,t:'Hooks',o:'自动测试'},{d:'17',m:5,t:'Sub-agent + Memory',o:'跨会话'},
  {d:'18',m:6,t:'Hello MCP',o:'调用成功'},{d:'19-20',m:6,t:'Airtable MCP',o:'3 Tool'},{d:'21',m:6,t:'飞猪 MCP',o:'模拟后台'},
  {d:'22',m:7,t:'Skill 重构',o:'三层策略'},{d:'23',m:7,t:'Token 预算',o:'文档'},{d:'24',m:7,t:'渐进暴露',o:'节省率'},
  {d:'25',m:8,t:'永不停机',o:'7天运行'},{d:'26',m:8,t:'仪表盘',o:'HTML'},{d:'27',m:8,t:'自动迭代',o:'自修复'},
  {d:'28-30',m:9,t:'飞猪供应链 Agent',o:'端到端'},
];

const WKS = [{n:1,t:'跑通闭环',ds:'Day 1-7',c:'#FF3B30',r:[0,7]},{n:2,t:'可观测+知识',ds:'Day 8-14',c:'#FF9500',r:[7,14]},{n:3,t:'工程深化',ds:'Day 15-21',c:'#007AFF',r:[14,21]},{n:4,t:'系统融合',ds:'Day 22-30',c:'#34C759',r:[21,27]}];

export default function ImprovePage() {
  const [exMod, setExMod] = useState<number|null>(null);
  const [exPrac, setExPrac] = useState<string|null>(null);
  const [done, setDone] = useState<Set<string>>(new Set());
  const [tab, setTab] = useState<'mod'|'sch'>('mod');
  const toggle = useCallback((id:string) => { setDone(p => { const n=new Set(p); n.has(id)?n.delete(id):n.add(id); return n; }); }, []);
  const total = D.reduce((s,m) => s+m.practices.length, 0);
  const cnt = done.size;
  const pct = total>0 ? Math.round((cnt/total)*100) : 0;

  return (
    <div className="min-h-screen bg-white">
      {/* Hero */}
      <div className="bg-[#f5f5fa] border-b border-gray-200 px-10 py-12">
        <div className="max-w-[1200px] mx-auto">
          <p className="text-sm font-semibold text-indigo-500 tracking-wide uppercase mb-3">30-Day Improvement Plan</p>
          <h1 className="text-[36px] font-bold text-gray-900 tracking-tight">Johnny AI Learning</h1>
          <p className="text-[17px] text-gray-500 mt-2">9 模块 · {total} 实践 · 每个含分步执行指南</p>
          <div className="flex gap-5 mt-10">
            <div className="bg-white border border-gray-200 rounded-2xl px-6 py-5 min-w-[140px]">
              <div className="text-[28px] font-bold text-gray-900">{cnt}/{total}</div>
              <div className="text-[13px] text-gray-400 mt-1">实践完成</div>
            </div>
            <div className="bg-white border border-gray-200 rounded-2xl px-6 py-5 min-w-[140px]">
              <div className="text-[28px] font-bold text-gray-900">{pct}%</div>
              <div className="text-[13px] text-gray-400 mt-1">总进度</div>
            </div>
            <div className="flex-1 flex items-end pb-2">
              <div className="w-full bg-gray-200 rounded-full h-2.5">
                <div className="h-full bg-indigo-500 rounded-full transition-all duration-500" style={{width:`${pct}%`}} />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-[1200px] mx-auto px-10 py-10">
        <div className="flex gap-3 mb-10 border-b border-gray-200 pb-4">
          <button onClick={()=>setTab('mod')} className={`px-5 py-2.5 rounded-full text-[15px] font-medium transition-all ${tab==='mod'?'bg-gray-900 text-white':'text-gray-500 hover:bg-gray-100'}`}>📦 9 大模块</button>
          <button onClick={()=>setTab('sch')} className={`px-5 py-2.5 rounded-full text-[15px] font-medium transition-all ${tab==='sch'?'bg-gray-900 text-white':'text-gray-500 hover:bg-gray-100'}`}>📅 30 天课表</button>
        </div>

        {tab==='mod' && <div className="space-y-4">{D.map(mod => {
          const open = exMod===mod.id;
          const mD = mod.practices.filter(p=>done.has(p.id)).length;
          return (
            <div key={mod.id} className="border border-gray-200 rounded-2xl overflow-hidden">
              <button onClick={()=>setExMod(open?null:mod.id)} className="w-full flex items-center gap-5 px-6 py-5 text-left hover:bg-gray-50">
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-xl shrink-0 border border-gray-100" style={{background:`${mod.color}10`}}>{mod.icon}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2"><span className="text-xs font-bold text-gray-400">0{mod.id}</span><span className="text-[17px] font-semibold text-gray-900">{mod.title}</span></div>
                  <div className="text-[14px] text-gray-400 mt-1">{mod.days} · {mod.pri}</div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-[14px] text-gray-400 font-medium">{mD}/{mod.practices.length}</span>
                  <div className="w-20 h-2 bg-gray-100 rounded-full overflow-hidden"><div className="h-full rounded-full transition-all" style={{width:`${mod.practices.length>0?(mD/mod.practices.length)*100:0}%`,background:mod.color}} /></div>
                  <svg className={`w-5 h-5 text-gray-300 transition-transform ${open?'rotate-180':''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                </div>
              </button>
              {open && <div className="px-6 pb-6 border-t border-gray-100">
                <div className="mt-5 p-5 bg-[#f5f5fa] rounded-2xl">
                  <div className="text-xs uppercase tracking-wider text-gray-400 font-semibold mb-3">📖 基础理论</div>
                  <p className="text-[15px] text-gray-700 leading-[1.8]">{mod.theory}</p>
                </div>
                <div className="mt-6 space-y-4">
                  <div className="text-xs uppercase tracking-wider text-gray-400 font-semibold">🛠️ 实践练习</div>
                  {mod.practices.map(p => {
                    const gOpen = exPrac===p.id;
                    return (
                      <div key={p.id} className={`rounded-2xl border transition-all ${done.has(p.id)?'bg-emerald-50 border-emerald-200':'border-gray-200 hover:border-indigo-300'}`}>
                        <div className="p-5">
                          <div className="flex items-start gap-4">
                            <button onClick={e=>{e.stopPropagation();toggle(p.id);}} className={`w-7 h-7 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 ${done.has(p.id)?'bg-emerald-500 border-emerald-500 text-white':'border-gray-300'}`}>
                              {done.has(p.id) && <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                            </button>
                            <div className="flex-1">
                              <div className="flex items-center gap-3 flex-wrap">
                                <span className={`text-[16px] font-semibold ${done.has(p.id)?'text-emerald-700 line-through':'text-gray-900'}`}>{p.title}</span>
                                <span className="text-[14px]">{Array.from({length:5},(_,i)=><span key={i} className={i<p.stars?'text-amber-400':'text-gray-200'}>★</span>)}</span>
                                <span className="text-[13px] text-gray-400 ml-auto">{p.hours}</span>
                              </div>
                              <p className="text-[14px] text-gray-500 mt-1.5 leading-relaxed">{p.desc}</p>
                              <button onClick={()=>setExPrac(gOpen?null:p.id)} className={`mt-4 inline-flex items-center gap-2 text-[14px] font-semibold px-4 py-2 rounded-xl transition-all ${gOpen?'bg-indigo-500 text-white':'bg-indigo-50 text-indigo-600 hover:bg-indigo-100'}`}>
                                {gOpen ? '收起指南 ▾' : '📋 查看执行指南 ▸'}
                                <span className={`text-[12px] ${gOpen?'text-indigo-200':'text-indigo-400'}`}>{p.guide.length} 步</span>
                              </button>
                            </div>
                          </div>
                        </div>
                        {gOpen && <div className="px-5 pb-6 pt-3 mx-5 mb-5 bg-indigo-50 rounded-2xl border border-indigo-100">
                          <div className="space-y-6">
                            {p.guide.map((s,si) => (
                              <div key={si} className="relative pl-10">
                                <div className="absolute left-0 top-0.5 w-7 h-7 rounded-full bg-indigo-500 text-white flex items-center justify-center text-[13px] font-bold">{si+1}</div>
                                <div className="text-[16px] font-semibold text-gray-900 mb-1.5">{s.title}</div>
                                {s.body && <p className="text-[14px] text-gray-600 leading-[1.8] whitespace-pre-line">{s.body}</p>}
                                {s.code && <pre className="mt-3 p-4 bg-gray-900 text-green-300 rounded-xl text-[13px] overflow-x-auto leading-[1.7] font-mono"><code>{s.code}</code></pre>}
                                {s.check && <div className="mt-3 p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-[14px] text-emerald-700 flex items-start gap-2"><span>✅</span><span><strong>完成标准：</strong>{s.check}</span></div>}
                              </div>
                            ))}
                          </div>
                        </div>}
                      </div>
                    );
                  })}
                </div>
                {mod.links.length>0 && <div className="mt-5 flex flex-wrap gap-2">{mod.links.map((l,i) => <a key={i} href={l.u} target="_blank" rel="noopener noreferrer" className="text-[14px] text-indigo-500 bg-indigo-50 px-4 py-2 rounded-xl hover:bg-indigo-100 font-medium">{l.t} ↗</a>)}</div>}
              </div>}
            </div>
          );
        })}</div>}

        {tab==='sch' && <div className="space-y-5">{WKS.map(w => (
          <div key={w.n} className="border border-gray-200 rounded-2xl overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-[#f5f5fa]">
              <div className="flex items-center gap-4"><div className="w-8 h-8 rounded-lg flex items-center justify-center text-[13px] font-bold text-white" style={{background:w.c}}>W{w.n}</div><span className="text-[16px] font-semibold text-gray-900">{w.t}</span></div>
              <span className="text-[13px] text-gray-400">{w.ds}</span>
            </div>
            <div className="divide-y divide-gray-100">{SCHED.slice(w.r[0],w.r[1]).map((s,i) => {
              const mod = D.find(m=>m.id===s.m)!;
              return <div key={i} className="flex items-center gap-4 px-6 py-3.5 text-[15px]"><span className="text-[13px] font-mono text-gray-400 w-14 shrink-0">D{s.d}</span><span className="text-[13px] font-bold w-10 shrink-0" style={{color:mod.color}}>0{mod.id}</span><span className="text-gray-700 flex-1">{s.t}</span><span className="text-[13px] text-gray-400 shrink-0">{s.o}</span></div>;
            })}</div>
          </div>
        ))}</div>}

        <div className="text-center text-[14px] text-gray-300 mt-16 pb-10">Johnny AI Learning v2.0</div>
      </div>
    </div>
  );
}
