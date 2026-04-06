'use client';

import { useState, useCallback } from 'react';

interface Step {
  title: string;
  body?: string;
  code?: string;
  check?: string;
}

interface Practice {
  id: string;
  title: string;
  stars: number;
  desc: string;
  hours: string;
  guide: Step[];
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

const M: Module[] = [
{
  id:1, title:'n8n 工作流引擎', icon:'⚡', color:'#FF3B30',
  days:'Day 1-4', priority:'Q1 立即做',
  desc:'从"手动触发"到"事件驱动"',
  theory:'n8n 是开源工作流自动化引擎。核心 5 个概念：Workflow（流水线）、Node（工位）、Trigger（开关：定时/Webhook/事件）、Connection（传送带）、Credential（钥匙）。和 Make/Zapier 的区别：免费自托管、可写 JS/Python、灵活度最高。你设置好一次流程，它自己按时跑。',
  practices:[
    { id:'1-1', title:'Docker 安装 + Hello World', stars:1, hours:'1-2h',
      desc:'在本地启动 n8n，创建第一个自动化工作流',
      guide:[
        { title:'安装 Docker Desktop', body:'如果还没装 Docker，先安装。macOS 用 Homebrew 最简单。安装后打开 Docker Desktop 等它启动完成（菜单栏出现鲸鱼图标）。', code:'brew install --cask docker' },
        { title:'一行命令启动 n8n', body:'Docker 会自动下载 n8n 镜像并运行。-p 5678:5678 是端口映射，-v 是数据持久化（重启不丢数据）。', code:'docker run -d --name n8n \\\n  -p 5678:5678 \\\n  -v n8n_data:/home/node/.n8n \\\n  n8nio/n8n' },
        { title:'打开 n8n 并注册', body:'浏览器访问 http://localhost:5678，注册一个本地管理员账号（邮箱密码随便填，这是本地的）。进入后你会看到一个空白的工作流编辑器。' },
        { title:'创建第一个工作流', body:'点 "Create new workflow"。从左侧拖入 "Schedule Trigger" → 设置每 5 分钟执行一次。再拖入 "HTTP Request" Node → URL 填 https://api.quotable.io/random。把两个 Node 连起来（从 Trigger 的右边拖线到 HTTP 的左边）。' },
        { title:'测试运行', body:'点右上角 "Test Workflow" 按钮。如果看到返回了一条随机英文名言，说明全链路跑通了。', check:'n8n 在 localhost:5678 运行 + 工作流手动执行成功返回数据' },
      ]},
    { id:'1-2', title:'Airtable → Claude → Slack 全链路', stars:3, hours:'3-5h',
      desc:'从 Airtable 读数据 → Claude API 分析 → Slack 推送结果',
      guide:[
        { title:'准备三把钥匙', body:'你需要三个凭证：① Anthropic API Key（去 console.anthropic.com 创建）② Airtable PAT（去 airtable.com/create/tokens 创建，权限选 data.records:read）③ Slack Webhook URL（在 Slack 的 App 设置里创建 Incoming Webhook，选一个频道）。' },
        { title:'在 n8n 中添加凭证', body:'进入 n8n → Settings → Credentials。添加三个凭证：Airtable（PAT Token）、Header Auth（Name 填 x-api-key，Value 填 Anthropic Key）、Slack Webhook。' },
        { title:'搭建 5 节点工作流', body:'创建新 Workflow，按顺序添加：\n① Schedule Trigger（每天 9:00）\n② Airtable Node（读取 ai-zxc-db 中 tokyo_experiences 表最新 5 条）\n③ Code Node（把数据格式化为 Claude prompt）\n④ HTTP Request（POST 到 api.anthropic.com/v1/messages）\n⑤ Slack Node（发送分析结果）', code:'// Code Node 示例（格式化 prompt）\nconst items = $input.all();\nconst records = items.map(i => \n  `- ${i.json.fields.title}: ¥${i.json.fields.price}`\n).join("\\n");\n\nreturn [{\n  json: {\n    model: "claude-sonnet-4-20250514",\n    max_tokens: 1000,\n    messages: [{\n      role: "user",\n      content: `分析以下产品数据，给出3个关键洞察：\\n${records}`\n    }]\n  }\n}];' },
        { title:'配置 HTTP Request Node', body:'Method: POST\nURL: https://api.anthropic.com/v1/messages\nAuthentication: Header Auth（选前面创建的凭证）\nHeaders 额外添加: anthropic-version = 2023-06-01, content-type = application/json\nBody: 选 JSON，内容用 Expression 引用前一个 Code Node 的输出。' },
        { title:'测试 → 激活', body:'手动执行确认全链路通畅——Slack 频道收到分析摘要。然后开启右上角 "Active" 开关，让它每天自动运行。连续观察 3 天确认无报错。', check:'Slack 频道每天收到 Claude 分析摘要 + 连续 3 天无报错' },
      ]},
    { id:'1-3', title:'月度旅游报告全自动管道', stars:5, hours:'5-8h',
      desc:'定时采集 → AI 生成报告 → 部署 Netlify → Slack 通知 + 质量自检',
      guide:[
        { title:'设计 8 节点工作流架构', body:'这是最复杂的工作流：\n① Cron Trigger（每月 1 日 08:00）\n② HTTP Request ×6（采集日/韩/泰/港/澳/马来数据源）\n③ Code Node（数据清洗 + 结构化为 JSON）\n④ Claude API（System Prompt 用你的 tourism-monthly-report Skill + 清洗后的数据）\n⑤ Code Node（把 Claude 输出包装为完整 HTML 页面）\n⑥ Claude API 质量自检（"这份报告包含所有 6 个目的地数据吗？回答 PASS/FAIL"）\n⑦ IF Node（PASS → 继续，FAIL → 发告警到 Slack 然后停止）\n⑧ GitHub API（PUT /repos/yikitom/johnnyweb/contents/ 推送 HTML）\n⑨ Wait 60s → Slack 推送报告链接' },
        { title:'实现数据采集层', body:'每个目的地用独立的 HTTP Request Node。数据源：JNTO（日本）、KTO（韩国）、MOTS（泰国）、香港旅发局、澳门统计暨普查局、马来西亚旅游局。用 Code Node 统一清洗为 JSON 格式：{ destination, period, total_arrivals, china_arrivals, yoy_growth }。' },
        { title:'实现质量自检节点', body:'在 HTML 生成后、GitHub 推送前，增加一个 Claude API 调用。System Prompt 写清楚检查项：6 个目的地数据完整性、同比/环比数据、SVG 图表数量。只有返回 PASS 才继续部署。', code:'// 质量自检 prompt\n{\n  "role": "user",\n  "content": "审查以下 HTML 报告：\\n1. 是否包含6个目的地？\\n2. 是否有同比增长率？\\n3. 是否有SVG图表？\\n只回答 PASS 或 FAIL+原因"\n}' },
        { title:'配置 GitHub API 推送', body:'HTTP Request Node：\nMethod: PUT\nURL: https://api.github.com/repos/yikitom/johnnyweb/contents/tourism-report-latest.html\nAuth: Bearer Token（你的 GitHub PAT）\nBody: { message: "auto: monthly report", content: base64编码的HTML, sha: 上次文件的sha }。\n注意需要先 GET 获取当前文件的 sha。' },
        { title:'错误处理 + 告警', body:'为每个关键 Node 配置 Error Workflow：失败时发 Slack 消息到专门的 #alert 频道，包含错误信息和失败的 Node 名称。确保整个管道是"自愈"的——单个数据源失败不应该阻塞其他目的地。', check:'全管道端到端运行 + 报告自动部署到 Netlify + Slack 收到链接 + 有质量自检' },
      ]},
  ],
  resources:[
    { label:'n8n 官方文档', url:'https://docs.n8n.io/' },
    { label:'n8n AI 模板库', url:'https://n8n.io/workflows/?categories=AI' },
    { label:'n8n 社区论坛', url:'https://community.n8n.io/' },
  ],
},
{
  id:2, title:'Agent Teams 多 Agent 编排', icon:'👥', color:'#FF3B30',
  days:'Day 5-7', priority:'Q1 立即做',
  desc:'从单兵作战到军团协作',
  theory:'三种模式：Sub-agent（老板派秘书查数据回来汇报）→ Agent Teams（项目小组各负责一块，共享任务列表，能互相发消息挑战对方发现）→ Coordinator Mode（项目经理分配追踪汇总）。Agent Teams 需要 Claude Code v2.1.32+，通过环境变量开启。',
  practices:[
    { id:'2-1', title:'第一次 3 人 Team 协作', stars:1, hours:'1-2h',
      desc:'用 Agent Teams 从三个角度分析一个产品问题',
      guide:[
        { title:'确认 Claude Code 版本', body:'在终端执行 claude --version，确认版本 ≥ v2.1.32。如果版本太低，先更新。', code:'claude --version\n# 如果需要更新\nnpm update -g @anthropic-ai/claude-code' },
        { title:'启用 Agent Teams', body:'设置环境变量开启实验性功能。可以加到 ~/.zshrc 中让它永久生效。', code:'export CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1' },
        { title:'启动 Claude Code 并创建 Team', body:'进入任意项目目录，启动 Claude Code，然后输入以下 prompt 创建你的第一个 Agent Team。', code:'cd ~/johnnydesktop && claude\n\n# 在 Claude Code 中输入：\nCreate an agent team with 3 teammates:\n- UX Analyst: analyze user journey pain points\n- Tech Architect: evaluate technical challenges\n- Business Strategist: assess competitive positioning\n\nHave them analyze the Fliggy international\nhotel booking experience and share findings.' },
        { title:'与 Teammate 互动', body:'Team 创建后，使用 Shift+Down 在 Teammate 之间切换。你可以直接给某个 Teammate 发消息补充信息或追问。观察 Team Lead 如何协调任务分配和结果汇总。', check:'3 个 Teammate 各自产出分析 + 能看到互相的消息传递 + Team Lead 综合结论' },
      ]},
    { id:'2-2', title:'Agent Teams 代码重构', stars:3, hours:'3-5h',
      desc:'对真实项目做多 Agent 并行重构',
      guide:[
        { title:'选择重构目标', body:'进入 johnnydesktop 或 johnnyweb 项目。识别一个可以拆分为 3 个独立部分的重构任务，比如"优化部署流程"或"重构组件库"。' },
        { title:'创建专业分工 Team', body:'每个 Teammate 负责独立的代码区域，避免冲突。', code:'Create an agent team to refactor this project:\n- Backend Dev: optimize API routes and data fetching\n- Frontend Dev: improve component structure and CSS\n- QA Engineer: write tests for critical paths\n\nCoordinate via shared task list.\nEach teammate reviews others\' work before finalizing.' },
        { title:'监控执行过程', body:'让 Team 运行 15-20 分钟。观察 token 消耗速度（Agent Teams 消耗显著高于单会话）。注意 Teammate 之间的任务协调模式——谁先完成、谁在等待、有没有冲突。' },
        { title:'Review 最终产出', body:'Team 完成后查看 git diff，审查所有改动。关键判断：改动是否内在一致？三个 Teammate 的工作是否互相兼容？有没有引入新的 bug？', check:'产出可 merge 的代码变更 + 理解 Agent Teams 的 token 消耗模式' },
      ]},
    { id:'2-3', title:'自定义 Agent + Conductor 工作流', stars:5, hours:'5-8h',
      desc:'创建专用 Agent 配置文件，用 Conductor 串联端到端任务',
      guide:[
        { title:'创建 Agent 配置目录', body:'在项目中建立标准的 Agent 配置结构。', code:'mkdir -p .claude/agents\n# 创建三个 Agent 配置文件\ntouch .claude/agents/supply-analyst.md\ntouch .claude/agents/ux-reviewer.md\ntouch .claude/agents/report-generator.md' },
        { title:'编写 Agent 配置文件', body:'每个 Agent 需要明确的角色定义、职责边界和输出格式。', code:'# .claude/agents/supply-analyst.md 示例\n---\nname: supply-analyst\ndescription: 供应链数据分析专家\ntools: Read, Bash, Grep, Glob\n---\n# 供应链分析师\n## 角色：你是飞猪国际酒店供应链分析专家\n## 职责：\n- 分析报价覆盖率和竞争力\n- 识别 Beat/Meet/Lose 趋势\n- 生成供应链健康度评分\n## 输出格式：结构化 JSON + 关键洞察摘要' },
        { title:'编写 Conductor 工作流', body:'Conductor 负责串联三个 Agent，定义执行顺序和数据传递。用 /conductor:setup 初始化，然后 /conductor:new-track 创建任务轨道。' },
        { title:'端到端验证', body:'用一个真实的飞猪国际酒店场景（如"分析日本酒店 Q1 供应链竞争力"），从供应链分析 → UX 审查 → 报告生成，走完全流程。验证三个 Agent 的产出是否互相引用、逻辑连贯。', check:'三个 Agent 配置可用 + Conductor 串联完成 + 产出完整业务分析' },
      ]},
  ],
  resources:[
    { label:'Agent Teams 官方文档', url:'https://code.claude.com/docs/en/agent-teams' },
    { label:'awesome-claude-code', url:'https://github.com/hesreallyhim/awesome-claude-code' },
    { label:'Multi-Agent 指南', url:'https://shipyard.build/blog/claude-code-multi-agent/' },
  ],
},
{
  id:3, title:'Agent 可观测性', icon:'📊', color:'#FF9500',
  days:'Day 8-11', priority:'Q2 尽快做',
  desc:'给 Agent 装仪表盘',
  theory:'Trace = 一次完整执行链路，Span = 链路中每一步，Score = 质量评分（用户反馈 or LLM 自评），Cost = token 成本。Langfuse 是开源免费的可观测性平台（MIT 协议），可自托管。你的 Agent 每跑一次，延迟、成本、质量全部被记录和可视化。',
  practices:[
    { id:'3-1', title:'部署 Langfuse + 第一条 Trace', stars:1, hours:'1-2h',
      desc:'Docker 启动 Langfuse，Python SDK 发送 trace',
      guide:[
        { title:'Docker Compose 启动 Langfuse', body:'克隆 Langfuse 仓库并用 Docker Compose 启动。包含 PostgreSQL 和 Langfuse 服务端。', code:'git clone https://github.com/langfuse/langfuse.git\ncd langfuse\ndocker compose up -d\n# 等待 30 秒启动完成' },
        { title:'注册并获取 API Keys', body:'浏览器打开 http://localhost:3000，注册账号。创建一个新 Project（如 "johnny-agents"）。在 Project Settings → API Keys 中创建一对 Public Key 和 Secret Key，复制保存。' },
        { title:'安装 Python SDK 并发送 Trace', body:'用 pip 安装 Langfuse SDK，然后写一个最简测试脚本。', code:'pip install langfuse\n\n# test_trace.py\nfrom langfuse import Langfuse\n\nlf = Langfuse(\n  host="http://localhost:3000",\n  public_key="pk-lf-xxx",  # 替换\n  secret_key="sk-lf-xxx"   # 替换\n)\n\ntrace = lf.trace(name="hello-test", user_id="johnny")\nspan1 = trace.span(name="parse-input", input="你好世界")\nspan1.end(output="parsed: greeting")\nspan2 = trace.span(name="call-llm", input="greeting prompt")\nspan2.end(output="response text", metadata={"model":"claude-sonnet","tokens":150})\ntrace.score(name="quality", value=0.9)\nlf.flush()\nprint("Trace sent!")' },
        { title:'在 Dashboard 中查看', body:'回到 Langfuse Dashboard，点击 Traces 标签。你应该能看到刚才发送的 trace，点进去可以看到两个 span 的详情、输入输出和评分。', check:'Langfuse Dashboard 中可见完整的 Trace + Span 层级结构' },
      ]},
    { id:'3-2', title:'给 n8n 管道接入追踪', stars:3, hours:'3-5h',
      desc:'每次 Claude API 调用的成本、延迟、输入输出全部追踪',
      guide:[
        { title:'在 n8n 中添加 Langfuse HTTP 节点', body:'在 Module 01 的 Airtable→Claude→Slack 工作流中，在 Claude API 调用前后各添加一个 HTTP Request Node，向 Langfuse 发送 trace 和 span 数据。使用 Langfuse 的 REST API：POST /api/public/ingestion。' },
        { title:'记录关键指标', body:'每次 Claude 调用时记录：input prompt（前 200 字）、output text（前 200 字）、input_tokens、output_tokens、latency_ms、model 名称。这些数据在 Langfuse 中自动聚合为图表。', code:'// n8n Code Node: 构建 Langfuse trace payload\nconst startTime = new Date();\n// ... Claude API 调用 ...\nconst endTime = new Date();\nconst latencyMs = endTime - startTime;\n\nreturn [{\n  json: {\n    batch: [{\n      id: crypto.randomUUID(),\n      type: "trace-create",\n      body: {\n        name: "n8n-daily-analysis",\n        userId: "n8n-automation",\n        metadata: { latencyMs, tokens: response.usage }\n      }\n    }]\n  }\n}];' },
        { title:'定义 SLA 文档', body:'基于前 7 天的数据，设定基线 SLA：P95 延迟 < 10s、单次成本 < $0.05、成功率 > 95%。写入项目文档，作为后续优化的基准。', check:'n8n 管道每次执行有 Langfuse Trace + 仪表盘显示成本和延迟趋势' },
      ]},
    { id:'3-3', title:'LLM-as-Judge 自动质量评估', stars:5, hours:'5-8h',
      desc:'让 Claude 自动给 Agent 输出打分，构建质量趋势',
      guide:[
        { title:'设计评估 Prompt', body:'创建一个标准化的评估 prompt，让 Claude 对 Agent 输出打分。评分维度：准确性（1-5）、完整性（1-5）、可操作性（1-5）。' , code:'# 评估 System Prompt\n"你是一个 AI 输出质量审查员。对以下 Agent 输出进行评分：\n- accuracy (1-5): 数据是否准确\n- completeness (1-5): 是否覆盖所有关键点\n- actionability (1-5): 建议是否可执行\n只输出 JSON: {accuracy:N, completeness:N, actionability:N, reason:...}"'},
        { title:'在 n8n 中集成评估节点', body:'在 Slack 推送之前，增加一个 Claude API 调用做质量评估。把评估结果写入 Langfuse 的 Score。如果总分 < 10（满分 15），触发告警而不是直接推送。' },
        { title:'构建质量趋势看板', body:'使用 Langfuse 的 Analytics 功能，按天/周聚合 Score 数据，观察质量趋势。如果发现某天质量骤降，可以点进 Trace 详情查看具体原因。', check:'自动质量评估闭环运行 + 能检测并定位质量下降的原因' },
      ]},
  ],
  resources:[
    { label:'Langfuse 文档', url:'https://langfuse.com/docs' },
    { label:'Self-Hosting', url:'https://langfuse.com/docs/deployment/self-host' },
  ],
},
{
  id:4, title:'RAG 检索增强生成', icon:'🧠', color:'#FF9500',
  days:'Day 12-14', priority:'Q2 尽快做',
  desc:'让 Claude 读懂你的数据',
  theory:'RAG 在 Claude 回答前先去你的数据库"查资料"——把问题变成向量 → 在向量库找最相似的文档 → 塞进 prompt → Claude 基于真实数据回答。核心概念：Embedding（文字→数字向量）、向量数据库（Chroma）、相似度检索、Reranking、Context Window 管理。',
  practices:[
    { id:'4-1', title:'Chroma 安装 + 语义检索', stars:1, hours:'1-2h',
      desc:'本地向量库，体验"语义理解"而非"关键词匹配"',
      guide:[
        { title:'安装 Chroma', code:'pip install chromadb --break-system-packages' },
        { title:'创建集合并添加文档', body:'用 Python 创建你的第一个向量集合，添加几条旅游产品数据。注意：你不需要手动做 Embedding，Chroma 默认用内置模型自动处理。', code:'import chromadb\nclient = chromadb.Client()\ncol = client.create_collection("travel-products")\n\ncol.add(\n  documents=[\n    "东京浅草寺半日游，含和服体验，专业摄影",\n    "京都岚山竹林徒步，含抹茶体验",\n    "大阪环球影城一日门票",\n    "富士山河口湖温泉旅馆一晚",\n    "北海道小樽运河游船+寿司午餐"\n  ],\n  ids=["t1","t2","t3","t4","t5"]\n)' },
        { title:'体验语义检索', body:'用自然语言查询，观察返回结果。重点感受："寺庙文化"能匹配到"浅草寺"，而不是简单的关键词匹配。', code:'# 试几个不同的查询\nfor q in ["寺庙文化体验","刺激的主题乐园","安静的自然风光"]:\n  r = col.query(query_texts=[q], n_results=2)\n  print(f"\\n查询: {q}")\n  for doc in r["documents"][0]:\n    print(f"  → {doc}")', check:'语义检索能返回语义相关（而非关键词匹配）的正确结果' },
      ]},
    { id:'4-2', title:'Airtable 竞品数据 RAG 索引', stars:3, hours:'3-5h',
      desc:'501 条产品数据索引化，自然语言查询竞品',
      guide:[
        { title:'从 Airtable 导出数据', body:'用 Airtable API 导出 tokyo_experiences 表的全部 501 条记录，保存为 JSON。', code:'import requests\nAT_TOKEN = "patXXX"  # 你的 Airtable PAT\nBASE_ID = "appBn4rAsuq14VeDf"\nTABLE = "tokyo_experiences"\n\nrecords = []\noffset = None\nwhile True:\n  url = f"https://api.airtable.com/v0/{BASE_ID}/{TABLE}"\n  params = {"pageSize": 100}\n  if offset: params["offset"] = offset\n  r = requests.get(url, headers={"Authorization":f"Bearer {AT_TOKEN}"}, params=params)\n  data = r.json()\n  records.extend(data["records"])\n  offset = data.get("offset")\n  if not offset: break\nprint(f"Total: {len(records)} records")' },
        { title:'批量写入 Chroma', body:'将每条记录拼接为文本（标题+平台+价格+类型），批量索引到 Chroma。', code:'col = client.create_collection("tokyo-experiences")\ndocs, ids = [], []\nfor r in records:\n  f = r["fields"]\n  text = f"{f.get(\'title\',\'\')} | {f.get(\'platform\',\'\')} | ¥{f.get(\'price\',\'N/A\')} | {f.get(\'category\',\'\')}"\n  docs.append(text)\n  ids.append(r["id"])\n\n# Chroma 限制每批最多 5000 条\nfor i in range(0, len(docs), 100):\n  col.add(documents=docs[i:i+100], ids=ids[i:i+100])\nprint(f"Indexed {len(docs)} products")' },
        { title:'构建 RAG 查询 + Claude 分析', body:'用户输入自然语言问题 → Chroma 检索 Top 5 → 拼入 Claude prompt → Claude 基于真实数据回答。', code:'import anthropic\nclient_ai = anthropic.Anthropic()\n\ndef rag_query(question):\n  results = col.query(query_texts=[question], n_results=5)\n  context = "\\n".join(results["documents"][0])\n  resp = client_ai.messages.create(\n    model="claude-sonnet-4-20250514",\n    max_tokens=1000,\n    messages=[{"role":"user",\n      "content":f"基于以下竞品数据回答问题。\\n\\n数据：\\n{context}\\n\\n问题：{question}"}]\n  )\n  return resp.content[0].text\n\nprint(rag_query("GYG 和 Klook 的价格差异趋势是什么？"))', check:'自然语言查询 501 条竞品数据，Claude 基于检索结果回答' },
      ]},
    { id:'4-3', title:'个人知识图谱 RAG', stars:5, hours:'5-8h',
      desc:'15+ 本书解构 HTML 做 Embedding，跨书语义检索',
      guide:[
        { title:'提取书籍文本', body:'遍历你的 15+ 本书解构 HTML 文件，用 BeautifulSoup 提取纯文本，按章节分段（每段 500-1000 字），保留书名和章节元数据。', code:'from bs4 import BeautifulSoup\nimport glob\n\nchunks = []\nfor f in glob.glob("~/johnnyweb/*.html"):\n  soup = BeautifulSoup(open(f), "html.parser")\n  title = soup.title.string if soup.title else f\n  sections = soup.find_all(["section","div"], class_=True)\n  for i, sec in enumerate(sections):\n    text = sec.get_text(strip=True)[:1000]\n    if len(text) > 100:\n      chunks.append({"text":text,"book":title,"section":i})\nprint(f"Total chunks: {len(chunks)}")' },
        { title:'索引到 Chroma', body:'把所有文本块写入一个名为 knowledge-graph 的集合，metadata 中保留书名和章节信息，方便过滤和溯源。' },
        { title:'跨书语义查询', body:'测试"哪些书提到了类似平台生态的概念？"这类跨领域问题。Claude 综合多本书的相关段落给出分析。', check:'跨书语义检索返回正确结果 + Claude 综合多书给出有洞察力的分析' },
      ]},
  ],
  resources:[
    { label:'Chroma 文档', url:'https://docs.trychroma.com/' },
    { label:'RAG 教程', url:'https://python.langchain.com/docs/tutorials/rag/' },
  ],
},
{
  id:5, title:'Claude Code 高级用法', icon:'⌨️', color:'#007AFF',
  days:'Day 15-17', priority:'Q3 计划做',
  desc:'CLAUDE.md 精简 + Hooks + Sub-agent + Memory',
  theory:'CLAUDE.md 应控制在 200 行以内（每行必须有理由）。分层：全局规则→目录级规则(.claude/rules/)→Skill 按需加载。反模式：过长 CLAUDE.md 浪费 token、同会话堆积不相关任务导致上下文污染、失败后反复修改越改越烂（应该 /clear 重来）、不跑测试直接接受代码。',
  practices:[
    { id:'5-1', title:'CLAUDE.md 审计 + Rules 分层', stars:1, hours:'1-2h',
      desc:'为真实项目创建精简配置 + 目录级规则',
      guide:[
        { title:'审计现有 CLAUDE.md', body:'打开 johnnydesktop 的 CLAUDE.md，统计行数。超过 200 行的内容需要被拆分到 .claude/rules/ 或 Skill 文件中。', code:'wc -l CLAUDE.md\n# 目标：< 200 行，每一行有存在的理由' },
        { title:'创建 Rules 目录', body:'把特定于某些目录/文件类型的规则迁移出去。', code:'mkdir -p .claude/rules\n\n# 示例：前端组件规则\necho "# Frontend Rules\n- 使用 Tailwind CSS，不写内联样式\n- 组件文件名用 PascalCase\n- 每个组件必须有 TypeScript props 类型定义\n" > .claude/rules/frontend.md\n\n# 示例：API 路由规则\necho "# API Rules\n- 所有 API 返回标准 JSON 格式\n- 错误码使用 HTTP 标准状态码\n- 敏感数据不写入日志\n" > .claude/rules/api.md' },
        { title:'精简主 CLAUDE.md', body:'主 CLAUDE.md 只保留：项目概述（2-3 句）、技术栈声明、全局行为约束（不超过 10 条）。其他内容全部迁移。', check:'CLAUDE.md < 200 行 + .claude/rules/ 至少 2 个规则文件' },
      ]},
    { id:'5-2', title:'Hooks 自动化', stars:3, hours:'3-5h',
      desc:'pre-commit 自动测试、post-push 自动部署',
      guide:[
        { title:'创建 Hooks 目录', code:'mkdir -p .claude/hooks' },
        { title:'配置 pre-commit Hook', body:'每次 git commit 前自动运行 linter 和类型检查。', code:'# .claude/hooks/pre-commit.sh\n#!/bin/bash\necho "Running pre-commit checks..."\nnpx tsc --noEmit 2>&1 | tail -5\nnpx eslint src/ --max-warnings 0 2>&1 | tail -5\nif [ $? -ne 0 ]; then\n  echo "❌ Pre-commit checks failed"\n  exit 1\nfi\necho "✅ All checks passed"' },
        { title:'配置 post-push Hook', body:'git push 后自动触发部署通知。可以调用 Slack Webhook 发送部署状态。' },
        { title:'验证 Hook 运行', body:'做一次故意的错误提交，确认 Hook 能拦截。再做一次正确提交，确认 Hook 放行并触发后续流程。', check:'pre-commit 能拦截错误 + post-push 自动触发后续操作' },
      ]},
    { id:'5-3', title:'Sub-agent 并行 + Memory', stars:5, hours:'5-8h',
      desc:'边跑测试边开发 + 项目知识跨会话持久化',
      guide:[
        { title:'体验 Sub-agent 并行', body:'在 Claude Code 中让主 Agent 继续开发功能，同时 spawn 一个 Sub-agent 在后台跑测试。', code:'# 在 Claude Code 中输入：\nSpawn a sub-agent to run the full test suite\nand report any failures.\nWhile it runs, continue implementing the\nnew learning progress API endpoint.' },
        { title:'配置 Memory 系统', body:'Claude Code 有文件式 Memory 系统（MEMORY.md），跨会话持久化项目知识。配置哪些信息该记住，哪些不该。', code:'# MEMORY.md 示例内容（Claude 自动维护）\n## Project Decisions\n- API routes use /api/v1 prefix\n- Auth via NextAuth with Google OAuth\n\n## Known Issues\n- Airtable rate limit: max 5 req/s\n\n## DO NOT REMEMBER\n- Specific debugging steps (use git log)\n- Code patterns (read the code)' },
        { title:'验证跨会话持久化', body:'退出 Claude Code，重新进入，确认它记得上次的项目决策和已知问题。', check:'Sub-agent 并行工作 + 退出重进后 Claude 记得项目上下文' },
      ]},
  ],
  resources:[
    { label:'Claude Code 文档', url:'https://code.claude.com/docs' },
    { label:'Compound Engineering', url:'https://github.com/hesreallyhim/awesome-claude-code' },
  ],
},
{
  id:6, title:'自定义 MCP Server', icon:'🔌', color:'#007AFF',
  days:'Day 18-21', priority:'Q3 计划做',
  desc:'从"用别人的 MCP"到"造自己的"',
  theory:'MCP Server 三层结构：Resources（只读数据 GET）→ Tools（可执行操作 POST）→ Prompts（预设模板）。用 Python MCP SDK 开发，注册到 Claude Desktop 的 config.json，Claude 就能通过自然语言操作你的业务系统。',
  practices:[
    { id:'6-1', title:'Hello World MCP Server', stars:1, hours:'1-2h',
      desc:'最简 MCP Server + Claude 成功调用',
      guide:[
        { title:'安装 MCP SDK', code:'pip install mcp --break-system-packages' },
        { title:'编写最简 Server', body:'创建一个只有一个 Tool 的 MCP Server：接收名字，返回问候。', code:'# ~/mcp-hello/server.py\nfrom mcp.server import Server\nfrom mcp.types import Tool, TextContent\nimport asyncio\nfrom mcp.server.stdio import stdio_server\n\napp = Server("hello-mcp")\n\n@app.list_tools()\nasync def list_tools():\n  return [Tool(\n    name="greet",\n    description="用中文打招呼",\n    inputSchema={\n      "type":"object",\n      "properties":{"name":{"type":"string","description":"姓名"}},\n      "required":["name"]\n    }\n  )]\n\n@app.call_tool()\nasync def call_tool(name, arguments):\n  return [TextContent(type="text", text=f"你好 {arguments[\'name\']}！我是你的自定义 MCP Server。")]\n\nasyncio.run(stdio_server(app))' },
        { title:'注册到 Claude Desktop', body:'编辑 Claude Desktop 的配置文件，添加你的 MCP Server。', code:'// ~/Library/Application Support/Claude/claude_desktop_config.json\n// 在 mcpServers 中添加：\n"hello-mcp": {\n  "command": "python3",\n  "args": ["/Users/你的用户名/mcp-hello/server.py"]\n}' },
        { title:'重启 Claude Desktop 验证', body:'Cmd+Q 完全退出 Claude Desktop 再重新打开。在 Chat 中输入"用 greet 工具跟 Johnny 打招呼"，看 Claude 是否调用了你的自定义 Tool。', check:'Claude 成功调用自定义 MCP Server 的 greet Tool' },
      ]},
    { id:'6-2', title:'Airtable 竞品数据 MCP Server', stars:3, hours:'3-5h',
      desc:'三个 Tool：查列表/搜产品/价格趋势',
      guide:[
        { title:'设计 3 个 Tool 接口', body:'① list_products(limit, platform) → 返回产品列表\n② search_product(query) → 语义搜索产品\n③ price_trend(category) → 某类产品的价格趋势分析' },
        { title:'实现 Airtable 数据读取', body:'在 MCP Server 中直接调用 Airtable REST API 读取 tokyo_experiences 表数据。缓存到本地避免每次调用都请求 API。' },
        { title:'注册 + 端到端测试', body:'在 Claude Desktop 中注册，然后用自然语言测试："帮我查一下 GYG 上最贵的 5 个产品" → Claude 调用 list_products → 返回结构化数据。', check:'3 个 Tool 全部可用，Claude 能用自然语言查询竞品数据' },
      ]},
    { id:'6-3', title:'飞猪后台模拟 MCP Server', stars:5, hours:'5-8h',
      desc:'SQLite 存储 + 报价/房态/订单操作',
      guide:[
        { title:'设计模拟数据模型', body:'用 SQLite 创建三张表：hotels（酒店信息）、rates（报价信息）、orders（订单信息）。预填充 20 条测试数据。' },
        { title:'实现 6 个业务 Tool', body:'query_hotel / update_rate / check_availability / create_order / get_order_status / cancel_order。每个 Tool 对应真实的商家后台操作。' },
        { title:'用自然语言"管理"后台', body:'测试场景："查一下东京希尔顿的今晚房价" → "把标准间价格降 10%" → "帮张三预订明天的房间"。Claude 自动调用对应 Tool 完成操作链。', check:'Claude 能用自然语言完成完整的酒店后台操作流程' },
      ]},
  ],
  resources:[
    { label:'MCP 文档', url:'https://modelcontextprotocol.io/docs' },
    { label:'Python SDK', url:'https://github.com/modelcontextprotocol/python-sdk' },
    { label:'MCP Server 示例', url:'https://github.com/modelcontextprotocol/servers' },
  ],
},
{
  id:7, title:'Context Engineering', icon:'🏗️', color:'#AF52DE',
  days:'Day 22-24', priority:'Q4 持续做',
  desc:'从 Prompt Engineering 到系统级上下文设计',
  theory:'三层上下文策略：全局层（每次加载，必须精简）→ 项目层（按项目加载）→ 按需层（Tool 调用/RAG 检索时才获取）。Token 预算管理：Claude 的 200K 窗口里，CLAUDE.md + Skill + 对话 + 工具返回都在争夺空间。渐进暴露：Agent 先加载摘要版 Skill，只在需要时 Tool 调用加载完整版。',
  practices:[
    { id:'7-1', title:'Skill 体系审计与层级重构', stars:1, hours:'1-2h',
      desc:'8+ Skill 文件按全局/项目/按需三层重新归类',
      guide:[
        { title:'列出所有现有 Skill', body:'统计你当前的 Skill 文件数量、总字符数、加载频率。', code:'ls -la /mnt/skills/user/\nfor f in /mnt/skills/user/*/SKILL.md; do\n  echo "$(wc -c < $f) chars: $f"\ndone' },
        { title:'分类归档', body:'把每个 Skill 标注为"每次对话都需要"（全局）、"特定项目需要"（项目层）、"偶尔需要"（按需层）。大多数 Skill 应该是按需层——只在被明确触发时才加载。' },
        { title:'创建层级文档', body:'写一份 context-strategy.md，记录每个 Skill 的层级归属和触发条件，作为后续优化的基准。', check:'所有 Skill 完成三层归类 + 策略文档完成' },
      ]},
    { id:'7-2', title:'Token 预算策略', stars:3, hours:'3-5h',
      desc:'为三种高频任务设计预算，测量并优化',
      guide:[
        { title:'测量当前 Token 消耗', body:'对你的三种高频任务（读书解构/竞品分析/报告生成），分别记录一次完整交互的 input tokens 和 output tokens。用 Langfuse（Module 03）追踪。' },
        { title:'设定预算上限', body:'根据测量结果，为每种任务设定 input token 预算。例如：读书解构 < 50K input tokens、竞品分析 < 30K、报告生成 < 80K。超出预算说明 Skill 或 prompt 需要精简。' },
        { title:'优化超预算任务', body:'对超出预算的任务，逐项分析 token 消耗来源：System Prompt 占多少？用户消息占多少？工具返回占多少？针对最大占比项做优化。', check:'三种任务有明确的 token 预算 + 消耗数据可追踪' },
      ]},
    { id:'7-3', title:'渐进暴露实现', stars:5, hours:'5-8h',
      desc:'Agent 先加载摘要 Skill，需要时才加载完整版',
      guide:[
        { title:'为一个 Skill 创建摘要版', body:'以 deep-book-decon 为例：摘要版只包含触发词和一句话描述（< 200 字）。完整版保留所有细节（原文件）。Agent 默认加载摘要版，通过 Tool 调用获取完整版。' },
        { title:'实现 Skill Loader Tool', body:'创建一个 MCP Tool 或 Bash 工具：输入 Skill 名称 → 返回完整 Skill 内容。这样 Agent 只在真正需要时才加载完整 Skill。' },
        { title:'测量 token 节省率', body:'对比优化前后的 input token 消耗，计算节省率。目标：常规对话 token 消耗降低 30%+。', check:'渐进暴露机制运行 + token 节省率 > 30%' },
      ]},
  ],
  resources:[
    { label:'Context Engineering Kit', url:'https://github.com/hesreallyhim/awesome-claude-code' },
  ],
},
{
  id:8, title:'生产闭环运营', icon:'🔄', color:'#AF52DE',
  days:'Day 25-27', priority:'Q4 持续做',
  desc:'从"做完就完"到"持续运转+自动迭代"',
  theory:'生产级五要素：① 持续运行（定时/事件驱动，不需手动启动）② 可观测性（每次有 trace/成本/质量，Module 03）③ 告警（异常自动通知）④ 迭代循环（trace→识别问题→修复→验证→部署）⑤ 成本控制（月度预算上限，超出暂停）。',
  practices:[
    { id:'8-1', title:'管道"永不停机"改造', stars:1, hours:'2-3h',
      desc:'错误重试 + 失败告警 + 执行日志',
      guide:[
        { title:'添加错误重试', body:'在 n8n 中给每个关键 Node 配置 Retry on Fail：最多 3 次，间隔 30 秒。特别是 HTTP Request（Claude API 可能超时）和 Airtable（可能限流）。' },
        { title:'配置失败告警', body:'创建一个 Error Workflow：任何 Node 失败时，自动发 Slack 消息到 #alerts 频道，包含失败 Node 名称、错误信息、时间戳。', code:'// Error Workflow 的 Slack 消息模板\n{\n  "text": "🚨 管道失败告警",\n  "blocks": [{\n    "type": "section",\n    "text": {\n      "type": "mrkdwn",\n      "text": "*Node:* {{$node.name}}\\n*Error:* {{$json.error.message}}\\n*Time:* {{$now.format(\'YYYY-MM-DD HH:mm\')}}"\n    }\n  }]\n}' },
        { title:'添加执行日志', body:'在工作流末尾添加一个 Airtable Node，每次运行写一条记录到 execution_log 表：时间、状态（success/fail）、耗时、成本。' },
        { title:'验证 7 天无干预', body:'激活工作流，连续观察 7 天。每天检查 Slack 有没有告警、Airtable 日志是否连续。', check:'连续 7 天无人干预运行 + 失败时有 Slack 告警 + 有执行日志' },
      ]},
    { id:'8-2', title:'运维仪表盘', stars:3, hours:'3-5h',
      desc:'HTML 仪表盘：运行次数/成功率/延迟/成本/质量',
      guide:[
        { title:'设计仪表盘数据源', body:'数据来自两个地方：Airtable execution_log 表（运行次数/成功率）和 Langfuse API（延迟/成本/质量评分）。' },
        { title:'构建 HTML 仪表盘', body:'用 Chart.js + fetch API 从 Airtable 和 Langfuse 拉取数据，渲染 4 个图表：运行次数趋势、成功率饼图、P95 延迟折线、月度成本柱状图。部署到 johnnyweb.netlify.app。' },
        { title:'添加自动刷新', body:'仪表盘每 5 分钟自动刷新数据。添加"最后更新时间"显示和手动刷新按钮。', check:'仪表盘在线可访问 + 4 个图表实时显示 Agent 运行数据' },
      ]},
    { id:'8-3', title:'全自动迭代循环', stars:5, hours:'5-8h',
      desc:'质量下降 → AI 分析原因 → 生成修复建议 → 人工确认 → 应用',
      guide:[
        { title:'质量下降检测', body:'在 Langfuse 中设定阈值：连续 3 次 Score < 3/5 时触发告警。n8n 定时检查 Langfuse Score API。' },
        { title:'自动分析根因', body:'检测到质量下降后，自动调用 Claude API，传入最近 5 次低分 Trace 的 input/output，让 Claude 分析"为什么质量下降了？可能的原因是什么？建议修改什么？"' },
        { title:'人工确认闭环', body:'分析结果发送到 Slack，附带"确认修复 ✅ / 忽略 ❌"按钮。确认后 n8n 自动执行修复动作（如更新 Skill prompt、调整参数）。', check:'质量下降 → 自动分析 → Slack 通知 → 人工确认 → 自动应用修复' },
      ]},
  ],
  resources:[
    { label:'12-Factor Agents', url:'https://dev.to/bredmond1019' },
  ],
},
{
  id:9, title:'综合实战', icon:'🏆', color:'#34C759',
  days:'Day 28-30', priority:'综合验收',
  desc:'飞猪供应链监控 Agent 端到端',
  theory:'将 Module 01-08 全部整合：n8n 调度 + Claude 推理 + Chroma 知识库 + 自定义 MCP + Langfuse 追踪 + Slack 输出 + 自动质量评估。验收标准：连续 7 天运行、质量 4/5+、月成本 <$50。',
  practices:[
    { id:'9-1', title:'端到端 Agent 系统搭建与验收', stars:5, hours:'8-12h',
      desc:'从零构建持续运行的飞猪供应链监控 Agent',
      guide:[
        { title:'架构设计', body:'画出完整的系统架构图：\nn8n（定时 08:00 触发）\n  → 自定义 MCP Server（读取供应链数据）\n  → Chroma RAG（查询历史趋势）\n  → Claude API（Agent Teams：分析师+策略师+报告员）\n  → Langfuse（trace 追踪）\n  → Claude API（LLM-as-Judge 质量评估）\n  → IF Node（PASS→继续/FAIL→告警）\n  → Slack（推送日报）\n  → Airtable（记录执行日志）' },
        { title:'逐层搭建', body:'按以下顺序搭建，每层跑通后再加下一层：\n① 数据层：MCP Server + Chroma（Day 28 上午）\n② 推理层：Claude API + Agent Teams prompt（Day 28 下午）\n③ 输出层：Slack + Airtable（Day 29 上午）\n④ 质量层：Langfuse + LLM-as-Judge（Day 29 下午）\n⑤ 运维层：错误重试 + 告警 + 仪表盘（Day 30）' },
        { title:'全链路联调', body:'端到端测试至少 5 次：检查数据完整性、分析质量、推送格式、trace 记录、成本核算。修复所有发现的问题。' },
        { title:'验收 7 天运行', body:'激活管道，开始 7 天无干预运行。每天查看 Langfuse 仪表盘和 Slack 推送，记录问题。', check:'连续 7 天运行 + Langfuse 有完整数据 + 质量 4/5+ + 月成本预估 <$50' },
      ]},
  ],
  resources:[],
},
];

const SCHEDULE = [
  {day:'1',mod:1,topic:'安装 Docker + n8n，Hello World',out:'n8n 运行中'},
  {day:'2',mod:1,topic:'添加凭证，Airtable 读取',out:'数据流通'},
  {day:'3',mod:1,topic:'Claude API + Slack 全链路',out:'管道端到端'},
  {day:'4',mod:1,topic:'月度报告自动化改造',out:'自动部署'},
  {day:'5',mod:2,topic:'启用 Agent Teams + 3 人协作',out:'Team 记录'},
  {day:'6',mod:2,topic:'Agent Teams 代码重构',out:'可 merge PR'},
  {day:'7',mod:2,topic:'自定义 Agent + Conductor',out:'Agent 配置'},
  {day:'8',mod:3,topic:'部署 Langfuse + 第一条 Trace',out:'Dashboard'},
  {day:'9-10',mod:3,topic:'n8n 管道接入 Langfuse',out:'成本/延迟图'},
  {day:'11',mod:3,topic:'LLM-as-Judge 质量评估',out:'质量趋势'},
  {day:'12',mod:4,topic:'Chroma + 语义检索',out:'向量库运行'},
  {day:'13',mod:4,topic:'Airtable 竞品 RAG',out:'语言查询'},
  {day:'14',mod:4,topic:'个人知识图谱 RAG',out:'跨书检索'},
  {day:'15',mod:5,topic:'CLAUDE.md 审计 + Rules',out:'精简配置'},
  {day:'16',mod:5,topic:'Hooks 自动化',out:'自动测试'},
  {day:'17',mod:5,topic:'Sub-agent + Memory',out:'跨会话'},
  {day:'18',mod:6,topic:'Hello World MCP Server',out:'调用成功'},
  {day:'19-20',mod:6,topic:'Airtable MCP Server',out:'3 Tool'},
  {day:'21',mod:6,topic:'飞猪后台模拟 MCP',out:'模拟后台'},
  {day:'22',mod:7,topic:'Skill 审计与层级重构',out:'三层策略'},
  {day:'23',mod:7,topic:'Token 预算策略',out:'预算文档'},
  {day:'24',mod:7,topic:'渐进暴露实现',out:'节省率'},
  {day:'25',mod:8,topic:'"永不停机"改造',out:'7天运行'},
  {day:'26',mod:8,topic:'运维仪表盘',out:'HTML 看板'},
  {day:'27',mod:8,topic:'全自动迭代循环',out:'自修复'},
  {day:'28-30',mod:9,topic:'飞猪供应链监控 Agent 综合实战',out:'端到端'},
];

const WEEKS = [
  {num:1,title:'跑通第一个闭环',days:'Day 1-7',color:'#FF3B30',range:[0,7]},
  {num:2,title:'可观测+知识管理',days:'Day 8-14',color:'#FF9500',range:[7,14]},
  {num:3,title:'工程能力深化',days:'Day 15-21',color:'#007AFF',range:[14,21]},
  {num:4,title:'系统级融合',days:'Day 22-30',color:'#34C759',range:[21,27]},
];

export default function LearningPage() {
  const [expandedMod, setExpandedMod] = useState<number|null>(null);
  const [expandedPractice, setExpandedPractice] = useState<string|null>(null);
  const [completed, setCompleted] = useState<Set<string>>(new Set());
  const [tab, setTab] = useState<'modules'|'schedule'>('modules');

  const togglePractice = useCallback((id: string) => {
    setCompleted(prev => { const n = new Set(prev); n.has(id)?n.delete(id):n.add(id); return n; });
  }, []);

  const total = M.reduce((s,m) => s+m.practices.length, 0);
  const done = completed.size;
  const pct = total>0 ? Math.round((done/total)*100) : 0;

  const Stars = ({n}:{n:number}) => (
    <span className="text-xs">{Array.from({length:5},(_,i)=><span key={i} className={i<n?'text-amber-400':'text-gray-300'}>★</span>)}</span>
  );

  return (
    <div className="min-h-screen bg-[#f5f5fa]">
      {/* Hero */}
      <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white px-8 py-10">
        <div className="max-w-4xl mx-auto">
          <span className="text-xs font-semibold tracking-wider uppercase px-3 py-1 rounded-full bg-white/10">30-Day System</span>
          <h1 className="text-3xl font-bold mt-4 mb-2">Johnny AI Learning</h1>
          <p className="text-white/60 text-base max-w-xl">9 模块 · {total} 个递进实践 · 每个实践含分步执行指南</p>
          <div className="flex gap-6 mt-8">
            <div className="bg-white/10 rounded-2xl px-5 py-4 min-w-[120px]">
              <div className="text-2xl font-bold">{done}/{total}</div>
              <div className="text-xs text-white/50 mt-1">实践完成</div>
            </div>
            <div className="bg-white/10 rounded-2xl px-5 py-4 min-w-[120px]">
              <div className="text-2xl font-bold">{pct}%</div>
              <div className="text-xs text-white/50 mt-1">总进度</div>
            </div>
          </div>
          <div className="mt-6 bg-white/10 rounded-full h-2 overflow-hidden">
            <div className="h-full bg-gradient-to-r from-blue-400 to-emerald-400 rounded-full transition-all duration-500" style={{width:`${pct}%`}} />
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-8 py-8">
        {/* Tabs */}
        <div className="flex gap-2 mb-8">
          <button onClick={()=>setTab('modules')} className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${tab==='modules'?'bg-white shadow text-gray-900':'text-gray-500 hover:text-gray-700'}`}>📦 9 大模块</button>
          <button onClick={()=>setTab('schedule')} className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${tab==='schedule'?'bg-white shadow text-gray-900':'text-gray-500 hover:text-gray-700'}`}>📅 30 天课表</button>
        </div>

        {/* ═══ MODULES ═══ */}
        {tab==='modules' && (
          <div className="space-y-3">
            {M.map(mod => {
              const isExp = expandedMod===mod.id;
              const mDone = mod.practices.filter(p=>completed.has(p.id)).length;
              const mTotal = mod.practices.length;
              return (
                <div key={mod.id} className="bg-white rounded-2xl shadow-sm overflow-hidden">
                  <button onClick={()=>setExpandedMod(isExp?null:mod.id)} className="w-full flex items-center gap-4 px-5 py-4 text-left hover:bg-gray-50 transition-colors">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg shrink-0" style={{background:`${mod.color}15`}}>{mod.icon}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold text-gray-400">0{mod.id}</span>
                        <span className="text-sm font-semibold text-gray-900">{mod.title}</span>
                      </div>
                      <div className="text-xs text-gray-400 mt-0.5">{mod.days} · {mod.priority}</div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-xs text-gray-400">{mDone}/{mTotal}</span>
                      <div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden"><div className="h-full rounded-full transition-all" style={{width:`${mTotal>0?(mDone/mTotal)*100:0}%`,background:mod.color}} /></div>
                      <svg className={`w-4 h-4 text-gray-300 transition-transform ${isExp?'rotate-180':''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                    </div>
                  </button>

                  {isExp && (
                    <div className="px-5 pb-5 border-t border-gray-100">
                      {/* Theory */}
                      <div className="mt-4 p-4 bg-gray-50 rounded-xl">
                        <div className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold mb-2">📖 基础理论</div>
                        <p className="text-sm text-gray-600 leading-relaxed">{mod.theory}</p>
                      </div>

                      {/* Practices */}
                      <div className="mt-4 space-y-3">
                        <div className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold mb-1">🛠️ 实践练习（点击展开执行指南）</div>
                        {mod.practices.map(p => {
                          const isGuideOpen = expandedPractice===p.id;
                          return (
                            <div key={p.id} className={`rounded-xl border transition-all ${completed.has(p.id)?'bg-emerald-50 border-emerald-200':'bg-white border-gray-100 hover:border-blue-200 hover:shadow-md'}`}>
                              {/* Practice header */}
                              <div className="flex items-start gap-3 p-4 cursor-pointer" onClick={()=>setExpandedPractice(isGuideOpen?null:p.id)}>
                                <button onClick={e=>{e.stopPropagation();togglePractice(p.id);}} className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 transition-all mt-0.5 ${completed.has(p.id)?'bg-emerald-500 border-emerald-500 text-white':'border-gray-300 hover:border-gray-400'}`}>
                                  {completed.has(p.id) && <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                                </button>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className={`text-sm font-semibold ${completed.has(p.id)?'text-emerald-700 line-through':'text-gray-800'}`}>{p.title}</span>
                                    <Stars n={p.stars} />
                                    <span className="text-[10px] text-gray-300 ml-auto">{p.hours}</span>
                                  </div>
                                  <p className="text-xs text-gray-400 mt-1">{p.desc}</p>
                                  <div className={`mt-2 inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-md transition-all ${isGuideOpen ? 'bg-blue-100 text-blue-700' : 'bg-blue-50 text-blue-500 hover:bg-blue-100'}`}>
                                    {isGuideOpen ? '收起指南 ▾' : '查看执行指南 ▸'}
                                    <span className="text-[10px] text-blue-300 ml-1">{p.guide.length} 步</span>
                                  </div>
                                </div>
                              </div>

                              {/* Guide steps */}
                              {isGuideOpen && (
                                <div className="px-4 pb-5 pt-2 border-t border-blue-100 bg-gradient-to-b from-blue-50/50 to-transparent">
                                  <div className="ml-9 space-y-5">
                                    {p.guide.map((step,si) => (
                                      <div key={si} className="relative pl-7">
                                        <div className="absolute left-0 top-0.5 w-5 h-5 rounded-full bg-blue-500 text-white flex items-center justify-center text-[10px] font-bold">{si+1}</div>
                                        <div className="text-sm font-semibold text-gray-900 mb-1">{step.title}</div>
                                        {step.body && <p className="text-[13px] text-gray-500 leading-relaxed whitespace-pre-line">{step.body}</p>}
                                        {step.code && (
                                          <pre className="mt-2 p-3 bg-gray-900 text-green-300 rounded-lg text-xs overflow-x-auto leading-relaxed font-mono"><code>{step.code}</code></pre>
                                        )}
                                        {step.check && (
                                          <div className="mt-2 p-2.5 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-700 flex items-start gap-2">
                                            <span className="mt-0.5">✅</span><span><strong>完成标准：</strong>{step.check}</span>
                                          </div>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>

                      {/* Resources */}
                      {mod.resources.length>0 && (
                        <div className="mt-4 flex flex-wrap gap-2">
                          {mod.resources.map((r,i) => (
                            <a key={i} href={r.url} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-500 hover:text-blue-700 bg-blue-50 px-3 py-1.5 rounded-lg transition-colors">{r.label} ↗</a>
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

        {/* ═══ SCHEDULE ═══ */}
        {tab==='schedule' && (
          <div className="space-y-4">
            {WEEKS.map(week => (
              <div key={week.num} className="bg-white rounded-2xl shadow-sm overflow-hidden">
                <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
                  <div className="flex items-center gap-3">
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold text-white" style={{background:week.color}}>W{week.num}</div>
                    <span className="text-sm font-semibold text-gray-900">{week.title}</span>
                  </div>
                  <span className="text-xs text-gray-400">{week.days}</span>
                </div>
                <div className="divide-y divide-gray-50">
                  {SCHEDULE.slice(week.range[0],week.range[1]).map((item,i) => {
                    const mod = M.find(m=>m.id===item.mod)!;
                    return (
                      <div key={i} className="flex items-center gap-3 px-5 py-2.5 text-sm">
                        <span className="text-xs font-mono text-gray-300 w-12 shrink-0">D{item.day}</span>
                        <span className="text-xs font-semibold w-8 shrink-0" style={{color:mod.color}}>0{mod.id}</span>
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

        <div className="text-center text-xs text-gray-300 mt-12 pb-8">Johnny AI Learning v1.1 · 含完整分步执行指南</div>
      </div>
    </div>
  );
}
