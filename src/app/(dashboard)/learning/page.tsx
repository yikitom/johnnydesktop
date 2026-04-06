'use client';

import { useState, useCallback } from 'react';

interface Step { title: string; body?: string; code?: string; check?: string; }
interface Practice { id: string; title: string; stars: number; desc: string; hours: string; guide: Step[]; }
interface Mod { id: number; title: string; icon: string; color: string; days: string; pri: string; theory: string; practices: Practice[]; links: { t: string; u: string }[]; }

const D: Mod[] = [
  { id:1, title:'n8n 工作流引擎', icon:'⚡', color:'#FF3B30', days:'Day 1-4', pri:'Q1 立即做',
    theory:'n8n 是开源工作流自动化引擎，核心 5 个概念：Workflow（流水线）、Node（工位）、Trigger（开关：定时/Webhook/事件）、Connection（传送带）、Credential（钥匙）。你设置好一次，它自己跑。和 Make/Zapier 的区别：n8n 免费自托管、可写 JS/Python、灵活度最高。',
    practices:[
      { id:'1-1', title:'Docker 安装 + Hello World', stars:1, hours:'1-2h', desc:'启动 n8n，创建定时获取随机名言的工作流',
        guide:[
          { title:'安装 Docker Desktop', body:'macOS 用 Homebrew 最简单，安装后打开 Docker Desktop 等菜单栏出现鲸鱼图标。', code:'brew install --cask docker' },
          { title:'一行命令启动 n8n', body:'Docker 自动下载镜像并运行。-p 是端口映射，-v 是数据持久化。', code:'docker run -d --name n8n \\\n  -p 5678:5678 \\\n  -v n8n_data:/home/node/.n8n \\\n  n8nio/n8n' },
          { title:'打开 n8n 并注册', body:'浏览器访问 http://localhost:5678，注册本地管理员账号。' },
          { title:'创建第一个工作流', body:'点 Create new workflow。拖入 Schedule Trigger（每5分钟）和 HTTP Request（URL: https://api.quotable.io/random），连线。' },
          { title:'测试运行', body:'点右上角 Test Workflow，看到返回随机名言即成功。', check:'n8n 在 localhost:5678 运行 + 工作流手动执行成功' },
        ]},
      { id:'1-2', title:'Airtable \u2192 Claude \u2192 Slack', stars:3, hours:'3-5h', desc:'读竞品数据 \u2192 AI 分析 \u2192 推送团队频道',
        guide:[
          { title:'准备三把钥匙', body:'Anthropic API Key（console.anthropic.com）、Airtable PAT（airtable.com/create/tokens）、Slack Webhook URL。' },
          { title:'n8n 中添加凭证', body:'Settings \u2192 Credentials，添加：Airtable PAT、Header Auth（x-api-key = Anthropic Key）、Slack Webhook。' },
          { title:'搭建 5 节点工作流', body:'Schedule Trigger(每天9点) \u2192 Airtable(读最新5条) \u2192 Code(格式化prompt) \u2192 HTTP Request(POST Claude API) \u2192 Slack(发送结果)。' },
          { title:'Code Node 示例', code:'const items = $input.all();\nconst records = items.map(i =>\n  "- " + i.json.fields.title + ": " + i.json.fields.price\n).join("\\n");\nreturn [{ json: {\n  model: "claude-sonnet-4-20250514",\n  max_tokens: 1000,\n  messages: [{ role: "user",\n    content: "分析以下数据，给出3个洞察:\\n" + records }]\n}}];' },
          { title:'测试并激活', body:'手动执行确认 Slack 收到分析摘要，然后开启 Active 开关。', check:'Slack 频道每天收到 Claude 分析 + 连续3天无报错' },
        ]},
      { id:'1-3', title:'月度旅游报告全自动管道', stars:5, hours:'5-8h', desc:'定时采集 \u2192 AI 生成 \u2192 部署 Netlify \u2192 Slack 通知',
        guide:[
          { title:'设计 8 节点架构', body:'Cron(每月1日) \u2192 HTTP\u00d76(采集6目的地) \u2192 Code(清洗) \u2192 Claude API(生成报告) \u2192 Claude API(质量自检,PASS/FAIL) \u2192 IF(PASS继续) \u2192 GitHub API(推送HTML) \u2192 Slack(推送链接)' },
          { title:'实现数据采集层', body:'每个目的地独立 HTTP Request。数据源：JNTO(日本)、KTO(韩国)、MOTS(泰国)、香港旅发局、澳门统计局、马来旅游局。Code Node 统一清洗为 JSON。' },
          { title:'质量自检节点', body:'Claude API 检查：6个目的地数据完整？有同比增长率？有SVG图表？只回答 PASS 或 FAIL+原因。FAIL 则发告警不部署。' },
          { title:'GitHub API 推送', body:'PUT /repos/yikitom/johnnyweb/contents/xxx.html，需要先 GET 获取 sha，再 PUT 更新。Auth 用 Bearer Token。' },
          { title:'错误处理', body:'每个关键 Node 配 Error Workflow，失败发 Slack #alert。单个数据源失败不阻塞其他。', check:'全管道端到端 + 自动部署 + Slack 通知 + 质量自检' },
        ]},
    ],
    links:[{ t:'n8n 官方文档', u:'https://docs.n8n.io/' }, { t:'n8n AI 模板库', u:'https://n8n.io/workflows/?categories=AI' }, { t:'n8n 社区', u:'https://community.n8n.io/' }],
  },
  { id:2, title:'Agent Teams 多 Agent 编排', icon:'\uD83D\uDC65', color:'#FF3B30', days:'Day 5-7', pri:'Q1 立即做',
    theory:'三种模式：Sub-agent（派秘书查数据回来汇报）\u2192 Agent Teams（项目小组各负责一块，共享任务列表，互相发消息）\u2192 Coordinator（项目经理分配追踪汇总）。需要 Claude Code v2.1.32+，环境变量 CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1 开启。',
    practices:[
      { id:'2-1', title:'第一次 3 人 Team 协作', stars:1, hours:'1-2h', desc:'UX + Tech + Business 三角度分析',
        guide:[
          { title:'确认版本', code:'claude --version\n# 需要 >= v2.1.32' },
          { title:'启用 Agent Teams', code:'export CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1' },
          { title:'创建 Team', body:'进入项目目录，启动 claude，输入：Create an agent team with 3 teammates: UX Analyst, Tech Architect, Business Strategist. 分析飞猪国际酒店预订体验。' },
          { title:'与 Teammate 互动', body:'用 Shift+Down 在 Teammate 间切换，可直接发消息补充或追问。观察 Team Lead 如何协调。', check:'3个 Teammate 各自产出 + 互相消息传递 + Lead 综合结论' },
        ]},
      { id:'2-2', title:'Agent Teams 代码重构', stars:3, hours:'3-5h', desc:'多 Agent 并行重构真实项目',
        guide:[
          { title:'选择重构目标', body:'进入 johnnydesktop 项目，识别可拆分为3部分的重构任务。' },
          { title:'创建专业分工 Team', body:'Backend Dev(API优化) + Frontend Dev(组件重构) + QA(写测试)，通过 shared task list 协调。' },
          { title:'监控 15-20 分钟', body:'观察 token 消耗速度、任务协调模式、是否有冲突。' },
          { title:'Review 产出', body:'查看 git diff，判断改动是否一致、兼容、无新 bug。', check:'产出可 merge 的代码 + 理解 token 消耗模式' },
        ]},
      { id:'2-3', title:'自定义 Agent + Conductor', stars:5, hours:'5-8h', desc:'创建专用 Agent 配置，Conductor 串联',
        guide:[
          { title:'创建 Agent 目录', code:'mkdir -p .claude/agents' },
          { title:'编写 Agent 配置', body:'创建 supply-analyst.md / ux-reviewer.md / report-generator.md，每个定义角色、职责、输出格式。' },
          { title:'编写 Conductor 工作流', body:'用 /conductor:setup 初始化，/conductor:new-track 创建任务轨道，串联三个 Agent。' },
          { title:'端到端验证', body:'用真实场景（日本酒店Q1供应链竞争力）走完全流程。', check:'三个 Agent 配置可用 + Conductor 串联 + 产出完整报告' },
        ]},
    ],
    links:[{ t:'Agent Teams 文档', u:'https://code.claude.com/docs/en/agent-teams' }, { t:'awesome-claude-code', u:'https://github.com/hesreallyhim/awesome-claude-code' }],
  },
  { id:3, title:'Agent 可观测性', icon:'\uD83D\uDCCA', color:'#FF9500', days:'Day 8-11', pri:'Q2 尽快做',
    theory:'Trace = 一次完整执行链路，Span = 每一步，Score = 质量评分（用户反馈或 LLM 自评），Cost = token 成本。Langfuse 是开源免费的可观测性平台（MIT），可自托管，追踪延迟/成本/质量全部可视化。',
    practices:[
      { id:'3-1', title:'部署 Langfuse + 第一条 Trace', stars:1, hours:'1-2h', desc:'Docker 启动 Langfuse，发送 trace',
        guide:[
          { title:'Docker Compose 启动', code:'git clone https://github.com/langfuse/langfuse.git\ncd langfuse\ndocker compose up -d' },
          { title:'注册并获取 Keys', body:'浏览器打开 http://localhost:3000，注册账号，创建 Project，获取 Public Key 和 Secret Key。' },
          { title:'Python 发送 Trace', code:'pip install langfuse\n\nfrom langfuse import Langfuse\nlf = Langfuse(host="http://localhost:3000",\n  public_key="pk-xxx", secret_key="sk-xxx")\ntrace = lf.trace(name="hello-test")\ntrace.span(name="step1", input="hello", output="world")\nlf.flush()' },
          { title:'Dashboard 查看', body:'回到 Langfuse Dashboard，Traces 标签中看到完整层级。', check:'Dashboard 中可见 Trace + Span 详情' },
        ]},
      { id:'3-2', title:'n8n 管道接入 Langfuse', stars:3, hours:'3-5h', desc:'每次 Claude 调用的成本/延迟全部追踪',
        guide:[
          { title:'在 n8n 中添加 HTTP Node', body:'Claude API 调用前后各加一个 HTTP Request，向 Langfuse REST API 发送 trace 数据。' },
          { title:'记录关键指标', body:'input prompt(前200字)、output text(前200字)、tokens、latency_ms、model。' },
          { title:'定义 SLA 文档', body:'基于7天数据设基线：P95延迟<10s、单次成本<$0.05、成功率>95%。', check:'每次执行有 Langfuse Trace + 成本延迟图表 + SLA 文档' },
        ]},
      { id:'3-3', title:'LLM-as-Judge 质量评估', stars:5, hours:'5-8h', desc:'Claude 自动给 Agent 输出打分',
        guide:[
          { title:'设计评估 Prompt', body:'让 Claude 对输出打分：accuracy(1-5)、completeness(1-5)、actionability(1-5)，只输出 JSON。' },
          { title:'集成到 n8n', body:'Slack 推送前加一个 Claude API 评估节点，结果写入 Langfuse Score。总分<10 触发告警。' },
          { title:'质量趋势看板', body:'Langfuse Analytics 按天聚合 Score，观察质量趋势。', check:'自动评估闭环 + 能检测质量下降原因' },
        ]},
    ],
    links:[{ t:'Langfuse 文档', u:'https://langfuse.com/docs' }, { t:'Self-Hosting', u:'https://langfuse.com/docs/deployment/self-host' }],
  },
  { id:4, title:'RAG 检索增强生成', icon:'\uD83E\uDDE0', color:'#FF9500', days:'Day 12-14', pri:'Q2 尽快做',
    theory:'RAG 在 Claude 回答前先去你的数据库"查资料"：问题变向量 \u2192 向量库找最相似文档 \u2192 塞进 prompt \u2192 Claude 基于真实数据回答。核心概念：Embedding（文字\u2192数字向量）、Chroma（向量数据库）、相似度检索、Reranking。',
    practices:[
      { id:'4-1', title:'Chroma + 语义检索', stars:1, hours:'1-2h', desc:'体验"语义理解"而非"关键词匹配"',
        guide:[
          { title:'安装 Chroma', code:'pip install chromadb' },
          { title:'创建集合并添加数据', code:'import chromadb\nclient = chromadb.Client()\ncol = client.create_collection("travel")\ncol.add(\n  documents=["东京浅草寺半日游含和服",\n    "京都岚山竹林徒步", "大阪环球影城门票",\n    "富士山河口湖温泉旅馆"],\n  ids=["1","2","3","4"])' },
          { title:'语义检索测试', code:'r = col.query(\n  query_texts=["寺庙文化体验"],\n  n_results=2)\nprint(r["documents"])\n# 应返回浅草寺相关(语义匹配,非关键词)', check:'语义检索返回正确的语义相关结果' },
        ]},
      { id:'4-2', title:'Airtable 竞品数据 RAG', stars:3, hours:'3-5h', desc:'501条产品索引化，自然语言查询',
        guide:[
          { title:'导出 Airtable 数据', body:'用 Airtable API 导出 tokyo_experiences 全部 501 条记录为 JSON。' },
          { title:'批量写入 Chroma', body:'每条记录拼接(标题+平台+价格+类型)，批量索引。每批100条。' },
          { title:'RAG 查询 + Claude', body:'用户问题 \u2192 Chroma 检索 Top5 \u2192 拼入 prompt \u2192 Claude 回答。', check:'自然语言查询竞品数据，Claude 基于真实数据回答' },
        ]},
      { id:'4-3', title:'个人知识图谱 RAG', stars:5, hours:'5-8h', desc:'15+ 本书做 Embedding，跨书检索',
        guide:[
          { title:'提取书籍文本', body:'BeautifulSoup 解析 HTML，按章节分段(500-1000字)，保留书名元数据。' },
          { title:'索引到 Chroma', body:'全部文本块写入 knowledge-graph 集合，metadata 含书名和章节。' },
          { title:'跨书语义查询', body:'测试"哪些书提到平台生态？"让 Claude 综合多书回答。', check:'跨书语义检索 + Claude 综合多书分析' },
        ]},
    ],
    links:[{ t:'Chroma 文档', u:'https://docs.trychroma.com/' }, { t:'RAG 教程', u:'https://python.langchain.com/docs/tutorials/rag/' }],
  },
  { id:5, title:'Claude Code 高级', icon:'\u2328\uFE0F', color:'#007AFF', days:'Day 15-17', pri:'Q3 计划做',
    theory:'CLAUDE.md 控制在200行以内。分层：全局(CLAUDE.md) \u2192 目录级(.claude/rules/) \u2192 Skill 按需。反模式：过长浪费 token、同会话堆积不相关任务、失败后反复修改(应/clear重来)、不跑测试接受代码。',
    practices:[
      { id:'5-1', title:'CLAUDE.md 审计 + Rules 分层', stars:1, hours:'1-2h', desc:'精简配置 + 目录级规则',
        guide:[
          { title:'统计现有行数', code:'wc -l CLAUDE.md\n# 目标: < 200 行' },
          { title:'创建 Rules 目录', code:'mkdir -p .claude/rules\n# 前端规则\necho "# Frontend\\n- Tailwind CSS\\n- PascalCase 组件" > .claude/rules/frontend.md\n# API 规则\necho "# API\\n- 标准 JSON 返回\\n- HTTP 状态码" > .claude/rules/api.md' },
          { title:'精简主 CLAUDE.md', body:'只保留项目概述(2句)+技术栈+不超过10条全局约束。', check:'CLAUDE.md < 200行 + .claude/rules/ 至少2个文件' },
        ]},
      { id:'5-2', title:'Hooks 自动化', stars:3, hours:'3-5h', desc:'pre-commit 自动测试、post-push 部署',
        guide:[
          { title:'创建 Hooks 目录', code:'mkdir -p .claude/hooks' },
          { title:'配置 pre-commit', body:'每次 commit 前自动 lint + 类型检查，失败则阻止提交。' },
          { title:'验证', body:'做一次故意错误提交确认 Hook 拦截，再做正确提交确认放行。', check:'pre-commit 能拦截错误 + post-push 触发后续' },
        ]},
      { id:'5-3', title:'Sub-agent + Memory', stars:5, hours:'5-8h', desc:'并行工作 + 跨会话持久化',
        guide:[
          { title:'Sub-agent 并行', body:'让主 Agent 继续开发，同时 spawn 子 Agent 跑测试。' },
          { title:'配置 Memory', body:'MEMORY.md 记录项目决策和已知问题，不记录代码模式和 debug 步骤。' },
          { title:'验证持久化', body:'退出重进 Claude Code，确认记得项目上下文。', check:'并行工作 + 退出重进后记得上下文' },
        ]},
    ],
    links:[{ t:'Claude Code 文档', u:'https://code.claude.com/docs' }, { t:'Compound Engineering', u:'https://github.com/hesreallyhim/awesome-claude-code' }],
  },
  { id:6, title:'自定义 MCP Server', icon:'\uD83D\uDD0C', color:'#007AFF', days:'Day 18-21', pri:'Q3 计划做',
    theory:'MCP Server 三层：Resources（只读GET）、Tools（可执行POST）、Prompts（预设模板）。用 Python MCP SDK 开发，注册到 Claude Desktop config.json，Claude 就能操作你的业务系统。',
    practices:[
      { id:'6-1', title:'Hello World MCP Server', stars:1, hours:'1-2h', desc:'最简 Server + Claude 调用',
        guide:[
          { title:'安装 SDK', code:'pip install mcp' },
          { title:'编写 Server', body:'创建 server.py，定义一个 greet Tool：接收 name 参数，返回问候语。' },
          { title:'注册到 Claude Desktop', body:'编辑 claude_desktop_config.json，在 mcpServers 中添加你的 server。' },
          { title:'重启验证', body:'Cmd+Q 退出再打开 Claude，对话中说"用 greet 跟 Johnny 打招呼"。', check:'Claude 成功调用自定义 Tool' },
        ]},
      { id:'6-2', title:'Airtable 竞品 MCP', stars:3, hours:'3-5h', desc:'三个 Tool: 查列表/搜产品/价格趋势',
        guide:[
          { title:'设计 3 个 Tool', body:'list_products(limit,platform)、search_product(query)、price_trend(category)。' },
          { title:'实现 Airtable 读取', body:'MCP Server 内调用 Airtable REST API，缓存到本地。' },
          { title:'端到端测试', body:'Claude 自然语言查询："GYG上最贵的5个产品"。', check:'3 个 Tool 可用 + Claude 自然语言查询' },
        ]},
      { id:'6-3', title:'飞猪后台模拟 MCP', stars:5, hours:'5-8h', desc:'SQLite + 报价/房态/订单操作',
        guide:[
          { title:'数据模型', body:'SQLite 三张表：hotels、rates、orders，预填20条数据。' },
          { title:'6 个业务 Tool', body:'query_hotel / update_rate / check_availability / create_order / get_order_status / cancel_order。' },
          { title:'自然语言管理', body:'测试："查东京希尔顿今晚房价" \u2192 "降10%" \u2192 "帮张三订明天的房"。', check:'Claude 自然语言完成完整酒店后台操作' },
        ]},
    ],
    links:[{ t:'MCP 文档', u:'https://modelcontextprotocol.io/docs' }, { t:'Python SDK', u:'https://github.com/modelcontextprotocol/python-sdk' }],
  },
  { id:7, title:'Context Engineering', icon:'\uD83C\uDFD7\uFE0F', color:'#AF52DE', days:'Day 22-24', pri:'Q4 持续做',
    theory:'三层上下文策略：全局层(每次加载,精简) \u2192 项目层(按项目) \u2192 按需层(Tool/RAG时获取)。Token 预算管理：200K 窗口中 CLAUDE.md + Skill + 对话 + 工具返回都在争空间。渐进暴露：先加载摘要 Skill，需要时才加载完整版。',
    practices:[
      { id:'7-1', title:'Skill 审计与层级重构', stars:1, hours:'1-2h', desc:'8+ Skill 按三层重新归类',
        guide:[
          { title:'列出所有 Skill', body:'统计数量、总字符数、加载频率。' },
          { title:'三层分类', body:'每个标注"每次都需要"(全局)/"特定项目"(项目层)/"偶尔"(按需层)。' },
          { title:'写策略文档', body:'记录每个 Skill 的层级归属和触发条件。', check:'所有 Skill 完成三层归类 + 策略文档' },
        ]},
      { id:'7-2', title:'Token 预算策略', stars:3, hours:'3-5h', desc:'三种高频任务设计预算',
        guide:[
          { title:'测量当前消耗', body:'读书解构/竞品分析/报告生成各记录一次 input+output tokens。' },
          { title:'设定预算上限', body:'读书<50K、竞品<30K、报告<80K。超出则 Skill 需精简。' },
          { title:'优化超预算项', body:'分析 token 来源：System Prompt/用户消息/工具返回，针对最大项优化。', check:'三种任务有预算 + 消耗可追踪' },
        ]},
      { id:'7-3', title:'渐进暴露实现', stars:5, hours:'5-8h', desc:'摘要版 Skill + 按需加载完整版',
        guide:[
          { title:'创建摘要版', body:'以 deep-book-decon 为例，摘要版<200字只含触发词。' },
          { title:'Skill Loader Tool', body:'创建 MCP Tool：输入名称 \u2192 返回完整 Skill 内容。Agent 按需调用。' },
          { title:'测量节省率', body:'对比优化前后 input token，目标节省 30%+。', check:'渐进暴露运行 + token 节省 > 30%' },
        ]},
    ],
    links:[{ t:'Context Engineering Kit', u:'https://github.com/hesreallyhim/awesome-claude-code' }],
  },
  { id:8, title:'生产闭环运营', icon:'\uD83D\uDD04', color:'#AF52DE', days:'Day 25-27', pri:'Q4 持续做',
    theory:'生产级五要素：持续运行(不需手动) + 可观测性(trace/成本/质量) + 告警(异常通知) + 迭代循环(trace\u2192修复\u2192验证) + 成本控制(月度预算上限)。',
    practices:[
      { id:'8-1', title:'永不停机改造', stars:1, hours:'2-3h', desc:'错误重试 + 告警 + 日志',
        guide:[
          { title:'添加重试', body:'n8n 每个关键 Node 配 Retry on Fail：3次，间隔30秒。' },
          { title:'配置告警', body:'Error Workflow：失败发 Slack #alerts，含 Node 名称+错误+时间。' },
          { title:'执行日志', body:'末尾加 Airtable Node，每次写一条：时间/状态/耗时/成本。' },
          { title:'验证 7 天', body:'激活后连续 7 天观察。', check:'7天无干预运行 + 失败有告警 + 有日志' },
        ]},
      { id:'8-2', title:'运维仪表盘', stars:3, hours:'3-5h', desc:'HTML 看板：运行/成功率/延迟/成本',
        guide:[
          { title:'数据源', body:'Airtable execution_log + Langfuse API。' },
          { title:'构建 HTML', body:'Chart.js 渲染4个图表：运行趋势、成功率饼图、P95延迟、月度成本。' },
          { title:'自动刷新', body:'每5分钟刷新 + 显示最后更新时间。', check:'仪表盘在线 + 4图表实时显示' },
        ]},
      { id:'8-3', title:'全自动迭代循环', stars:5, hours:'5-8h', desc:'质量下降 \u2192 AI 分析 \u2192 人工确认 \u2192 修复',
        guide:[
          { title:'质量下降检测', body:'Langfuse 阈值：连续3次 Score<3 触发告警。n8n 定时检查。' },
          { title:'自动分析根因', body:'传入最近5次低分 Trace 的 input/output，Claude 分析原因和建议。' },
          { title:'人工确认闭环', body:'Slack 发送分析+确认/忽略按钮，确认后自动执行修复。', check:'自动检测 \u2192 分析 \u2192 通知 \u2192 确认 \u2192 修复' },
        ]},
    ],
    links:[{ t:'12-Factor Agents', u:'https://dev.to/bredmond1019' }],
  },
  { id:9, title:'综合实战', icon:'\uD83C\uDFC6', color:'#34C759', days:'Day 28-30', pri:'综合验收',
    theory:'Module 01-08 全整合：n8n调度 + Claude推理 + Chroma知识库 + MCP接口 + Langfuse追踪 + Slack输出 + 自动质量评估。验收：连续7天运行、质量4/5+、月成本<$50。',
    practices:[
      { id:'9-1', title:'端到端 Agent 系统', stars:5, hours:'8-12h', desc:'飞猪供应链监控 Agent 综合搭建',
        guide:[
          { title:'架构设计', body:'n8n(08:00触发) \u2192 MCP Server(供应链数据) \u2192 Chroma(历史趋势) \u2192 Claude(Agent Teams分析) \u2192 Langfuse(trace) \u2192 LLM-Judge(质量) \u2192 IF(PASS) \u2192 Slack(日报) \u2192 Airtable(日志)' },
          { title:'逐层搭建', body:'Day28上午:数据层(MCP+Chroma) \u2192 下午:推理层(Claude) \u2192 Day29上午:输出层(Slack+Airtable) \u2192 下午:质量层(Langfuse+Judge) \u2192 Day30:运维层(重试+告警+仪表盘)' },
          { title:'全链路联调', body:'端到端测试至少5次，修复所有问题。' },
          { title:'验收运行', body:'激活后 7 天无干预运行。', check:'7天运行 + Langfuse完整 + 质量4/5+ + 月成本<$50' },
        ]},
    ],
    links:[],
  },
];

const SCHED = [
  {d:'1',m:1,t:'Docker + n8n Hello World',o:'n8n 运行'},{d:'2',m:1,t:'添加凭证 + Airtable 读取',o:'数据流通'},{d:'3',m:1,t:'Claude API + Slack 全链路',o:'管道端到端'},{d:'4',m:1,t:'月度报告自动化',o:'自动部署'},
  {d:'5',m:2,t:'Agent Teams 3人协作',o:'Team 记录'},{d:'6',m:2,t:'Agent Teams 代码重构',o:'可merge PR'},{d:'7',m:2,t:'自定义 Agent + Conductor',o:'Agent 配置'},
  {d:'8',m:3,t:'部署 Langfuse + 第一条 Trace',o:'Dashboard'},{d:'9-10',m:3,t:'n8n 接入 Langfuse',o:'成本/延迟图'},{d:'11',m:3,t:'LLM-as-Judge',o:'质量趋势'},
  {d:'12',m:4,t:'Chroma + 语义检索',o:'向量库'},{d:'13',m:4,t:'Airtable 竞品 RAG',o:'语言查询'},{d:'14',m:4,t:'个人知识图谱',o:'跨书检索'},
  {d:'15',m:5,t:'CLAUDE.md 审计 + Rules',o:'精简配置'},{d:'16',m:5,t:'Hooks 自动化',o:'自动测试'},{d:'17',m:5,t:'Sub-agent + Memory',o:'跨会话'},
  {d:'18',m:6,t:'Hello World MCP',o:'调用成功'},{d:'19-20',m:6,t:'Airtable MCP Server',o:'3 Tool'},{d:'21',m:6,t:'飞猪后台模拟 MCP',o:'模拟后台'},
  {d:'22',m:7,t:'Skill 审计 + 层级重构',o:'三层策略'},{d:'23',m:7,t:'Token 预算策略',o:'预算文档'},{d:'24',m:7,t:'渐进暴露',o:'节省率'},
  {d:'25',m:8,t:'永不停机改造',o:'7天运行'},{d:'26',m:8,t:'运维仪表盘',o:'HTML看板'},{d:'27',m:8,t:'自动迭代循环',o:'自修复'},
  {d:'28-30',m:9,t:'飞猪供应链监控 Agent',o:'端到端'},
];

const WKS = [{n:1,t:'跑通闭环',ds:'Day 1-7',c:'#FF3B30',r:[0,7]},{n:2,t:'可观测+知识',ds:'Day 8-14',c:'#FF9500',r:[7,14]},{n:3,t:'工程深化',ds:'Day 15-21',c:'#007AFF',r:[14,21]},{n:4,t:'系统融合',ds:'Day 22-30',c:'#34C759',r:[21,27]}];

export default function LearningPage() {
  const [exMod, setExMod] = useState<number|null>(null);
  const [exPrac, setExPrac] = useState<string|null>(null);
  const [done, setDone] = useState<Set<string>>(new Set());
  const [tab, setTab] = useState<'mod'|'sch'>('mod');
  const toggle = useCallback((id:string) => { setDone(p => { const n=new Set(p); n.has(id)?n.delete(id):n.add(id); return n; }); }, []);
  const total = D.reduce((s,m) => s+m.practices.length, 0);
  const cnt = done.size;
  const pct = total>0 ? Math.round((cnt/total)*100) : 0;

  return (
    <div className="min-h-screen bg-[#f5f5fa]">
      <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white px-8 py-10">
        <div className="max-w-4xl mx-auto">
          <span className="text-xs font-semibold tracking-wider uppercase px-3 py-1 rounded-full bg-white/10">30-Day System</span>
          <h1 className="text-3xl font-bold mt-4 mb-2">Johnny AI Learning</h1>
          <p className="text-white/60 text-base">9 模块 · {total} 实践 · 每个含分步执行指南</p>
          <div className="flex gap-6 mt-8">
            <div className="bg-white/10 rounded-2xl px-5 py-4"><div className="text-2xl font-bold">{cnt}/{total}</div><div className="text-xs text-white/50 mt-1">完成</div></div>
            <div className="bg-white/10 rounded-2xl px-5 py-4"><div className="text-2xl font-bold">{pct}%</div><div className="text-xs text-white/50 mt-1">进度</div></div>
          </div>
          <div className="mt-6 bg-white/10 rounded-full h-2 overflow-hidden">
            <div className="h-full bg-gradient-to-r from-blue-400 to-emerald-400 rounded-full transition-all duration-500" style={{width:`${pct}%`}} />
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-8 py-8">
        <div className="flex gap-2 mb-8">
          <button onClick={()=>setTab('mod')} className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${tab==='mod'?'bg-white shadow text-gray-900':'text-gray-500'}`}>📦 9 大模块</button>
          <button onClick={()=>setTab('sch')} className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${tab==='sch'?'bg-white shadow text-gray-900':'text-gray-500'}`}>📅 30 天课表</button>
        </div>

        {tab==='mod' && <div className="space-y-3">{D.map(mod => {
          const open = exMod===mod.id;
          const mD = mod.practices.filter(p=>done.has(p.id)).length;
          return (
            <div key={mod.id} className="bg-white rounded-2xl shadow-sm overflow-hidden">
              <button onClick={()=>setExMod(open?null:mod.id)} className="w-full flex items-center gap-4 px-5 py-4 text-left hover:bg-gray-50">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg shrink-0" style={{background:`${mod.color}15`}}>{mod.icon}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2"><span className="text-[10px] font-bold text-gray-400">0{mod.id}</span><span className="text-sm font-semibold text-gray-900">{mod.title}</span></div>
                  <div className="text-xs text-gray-400 mt-0.5">{mod.days} · {mod.pri}</div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-xs text-gray-400">{mD}/{mod.practices.length}</span>
                  <div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden"><div className="h-full rounded-full transition-all" style={{width:`${mod.practices.length>0?(mD/mod.practices.length)*100:0}%`,background:mod.color}} /></div>
                  <svg className={`w-4 h-4 text-gray-300 transition-transform ${open?'rotate-180':''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                </div>
              </button>
              {open && <div className="px-5 pb-5 border-t border-gray-100">
                <div className="mt-4 p-4 bg-gray-50 rounded-xl">
                  <div className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold mb-2">📖 基础理论</div>
                  <p className="text-sm text-gray-600 leading-relaxed">{mod.theory}</p>
                </div>
                <div className="mt-4 space-y-3">
                  <div className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold">🛠️ 实践练习</div>
                  {mod.practices.map(p => {
                    const gOpen = exPrac===p.id;
                    return (
                      <div key={p.id} className={`rounded-xl border transition-all ${done.has(p.id)?'bg-emerald-50 border-emerald-200':'bg-white border-gray-100 hover:border-blue-200 hover:shadow'}`}>
                        <div className="p-4">
                          <div className="flex items-start gap-3">
                            <button onClick={e=>{e.stopPropagation();toggle(p.id);}} className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 ${done.has(p.id)?'bg-emerald-500 border-emerald-500 text-white':'border-gray-300'}`}>
                              {done.has(p.id) && <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                            </button>
                            <div className="flex-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className={`text-sm font-semibold ${done.has(p.id)?'text-emerald-700 line-through':'text-gray-800'}`}>{p.title}</span>
                                <span className="text-xs">{Array.from({length:5},(_,i)=><span key={i} className={i<p.stars?'text-amber-400':'text-gray-300'}>★</span>)}</span>
                                <span className="text-[10px] text-gray-300 ml-auto">{p.hours}</span>
                              </div>
                              <p className="text-xs text-gray-400 mt-1">{p.desc}</p>
                              <button onClick={()=>setExPrac(gOpen?null:p.id)} className={`mt-3 inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg transition-all ${gOpen?'bg-blue-500 text-white shadow-md':'bg-blue-50 text-blue-600 hover:bg-blue-100'}`}>
                                {gOpen ? '收起指南 ▾' : '📋 查看执行指南 ▸'}
                                <span className={`text-[10px] ${gOpen?'text-blue-200':'text-blue-400'}`}>{p.guide.length} 步</span>
                              </button>
                            </div>
                          </div>
                        </div>
                        {gOpen && <div className="px-4 pb-5 pt-2 mx-4 mb-4 bg-blue-50 rounded-xl border border-blue-100">
                          <div className="space-y-5">
                            {p.guide.map((s,si) => (
                              <div key={si} className="relative pl-8">
                                <div className="absolute left-0 top-0.5 w-6 h-6 rounded-full bg-blue-500 text-white flex items-center justify-center text-xs font-bold">{si+1}</div>
                                <div className="text-sm font-semibold text-gray-900 mb-1">{s.title}</div>
                                {s.body && <p className="text-[13px] text-gray-600 leading-relaxed whitespace-pre-line">{s.body}</p>}
                                {s.code && <pre className="mt-2 p-3 bg-gray-900 text-green-300 rounded-lg text-xs overflow-x-auto leading-relaxed font-mono"><code>{s.code}</code></pre>}
                                {s.check && <div className="mt-2 p-2.5 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-700 flex items-start gap-2"><span>✅</span><span><strong>完成标准：</strong>{s.check}</span></div>}
                              </div>
                            ))}
                          </div>
                        </div>}
                      </div>
                    );
                  })}
                </div>
                {mod.links.length>0 && <div className="mt-4 flex flex-wrap gap-2">{mod.links.map((l,i) => <a key={i} href={l.u} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-500 bg-blue-50 px-3 py-1.5 rounded-lg hover:bg-blue-100">{l.t} ↗</a>)}</div>}
              </div>}
            </div>
          );
        })}</div>}

        {tab==='sch' && <div className="space-y-4">{WKS.map(w => (
          <div key={w.n} className="bg-white rounded-2xl shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
              <div className="flex items-center gap-3"><div className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold text-white" style={{background:w.c}}>W{w.n}</div><span className="text-sm font-semibold">{w.t}</span></div>
              <span className="text-xs text-gray-400">{w.ds}</span>
            </div>
            <div className="divide-y divide-gray-50">{SCHED.slice(w.r[0],w.r[1]).map((s,i) => {
              const mod = D.find(m=>m.id===s.m)!;
              return <div key={i} className="flex items-center gap-3 px-5 py-2.5 text-sm"><span className="text-xs font-mono text-gray-300 w-12 shrink-0">D{s.d}</span><span className="text-xs font-semibold w-8 shrink-0" style={{color:mod.color}}>0{mod.id}</span><span className="text-gray-600 flex-1">{s.t}</span><span className="text-[10px] text-gray-300 shrink-0">{s.o}</span></div>;
            })}</div>
          </div>
        ))}</div>}

        <div className="text-center text-xs text-gray-300 mt-12 pb-8">Johnny AI Learning v2.0</div>
      </div>
    </div>
  );
}
