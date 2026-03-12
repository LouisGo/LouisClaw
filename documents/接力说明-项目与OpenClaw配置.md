# 接力说明（项目代码 + OpenClaw 本机配置）

> 生成时间：2026-03-12
> 用途：在另一台机器上快速接力，避免“项目已同步但 OpenClaw 本机状态缺失”导致断档。

---

## 1）项目侧（可通过 Git 同步）

以下内容属于仓库代码与文档，`git pull` 后可直接获得。

### 已完成能力

1. **统一任务层（Standard Tasks）**
   - 已有稳定 task id：
     - `pull_markdown_sources`
     - `status_overview`
     - `process_inbox`
     - `build_digest`
     - `daily_pipeline`
     - `export_siyuan`
   - 统一入口：`npm run task -- run <task-id>`

2. **统一调度层（Standard Schedules）**
   - 已有稳定 schedule id：
     - `hourly_pull_markdown_sources`
     - `hourly_process_inbox`
     - `daily_pipeline_evening`
   - 统一入口：`npm run schedule -- install <schedule-id> ...`

3. **输入边界与处理边界已分离**
   - `data/landing/`：外部输入落点
   - `data/inbox/`：内部标准处理队列
   - `process_inbox`：统一执行 `landing -> inbox -> process`

4. **markdown pull 适配器（最小可用）**
   - 支持从配置的本地 markdown 文件拉取新增内容并写入 `landing`
   - v1 策略：
     - 首次运行只 seed state，不导入历史
     - 后续仅导入 append 新增后缀
     - rewrite 覆写仅更新 state，不导入

5. **mock 输入源契约已落地**
   - 目录：`mock-sources/markdown/`
   - 文件：
     - `inbox.md`
     - `quick-notes.md`
     - `reading-notes.md`
   - 用于接力阶段快速验证闭环。

### 当前建议的流程顺序（代码侧）

1. `pull_markdown_sources`
2. `process_inbox`
3. `daily_pipeline`（低频）

---

## 2）OpenClaw 侧（不可通过 Git 同步）

以下内容是 **机器本地状态**，在新机器需要重新配置。

### 当前机器的关键状态（供参考）

1. **workspace 绑定**
   - `agents.defaults.workspace = /Users/lou/Learn/LouisClaw`

2. **模型与 provider**
   - 默认模型：`openai/gpt-5.4`
   - `models.mode = merge`
   - `openai` provider：
     - `baseUrl = https://fast.vpsairobot.com/v1`
     - `api = openai-completions`
     - `apiKey = ${OPENAI_API_KEY}`
   - alias：`medium -> openai/gpt-5.4`

3. **工具权限与通道**
   - `tools.profile = coding`
   - TypeX 已关闭（channels 为空，插件安装记录仍存在但 disabled）

4. **已安装 cron（本机）**
   - `hourly_pull_markdown_sources`：`0 * * * *`（Asia/Shanghai）
   - `hourly_process_inbox`：`5 * * * *`（Asia/Shanghai）
   - `daily_pipeline_evening`：`10 21 * * *`（Asia/Shanghai）

> 注意：OpenClaw 的 token、cron state、gateway runtime 都在 `~/.openclaw/`，不会随 Git 同步。

---

## 3）新机器接力步骤（推荐顺序）

### A. 项目代码与依赖

```bash
git clone <repo>
cd LouisClaw
npm install
npm run build
```

### B. 项目本地环境变量（项目根目录 `.env`）

最小建议：

```bash
OPENAI_API_KEY=你的第三方平台API_KEY
OPENAI_MODEL=gpt-5.4
MARKDOWN_PULL_SOURCES=[{"path":"./mock-sources/markdown/inbox.md","source":"markdown_pull","device":"local","title":"Mock Inbox"},{"path":"./mock-sources/markdown/quick-notes.md","source":"markdown_pull","device":"local","title":"Mock Quick Notes"},{"path":"./mock-sources/markdown/reading-notes.md","source":"markdown_pull","device":"local","title":"Mock Reading Notes"}]
```

### C. OpenClaw 本机绑定与模型

```bash
openclaw config set agents.defaults.workspace "/你的路径/LouisClaw"
openclaw gateway restart
openclaw models set openai/gpt-5.4
```

如果你使用第三方 OpenAI 兼容网关，需要在 `~/.openclaw/openclaw.json` 里保证：

- `models.mode = merge`
- `models.providers.openai.baseUrl` 为你的网关 `/v1`
- `models.providers.openai.api = openai-completions`
- `models.providers.openai.apiKey = ${OPENAI_API_KEY}`

### D. 安装调度（在项目目录执行）

```bash
npm run schedule -- install hourly_pull_markdown_sources --enable
npm run schedule -- install hourly_process_inbox --enable
npm run schedule -- install daily_pipeline_evening --enable
```

### E. 验证接力成功

```bash
npm run task -- list
npm run schedule -- list
npm run task -- run pull_markdown_sources
npm run task -- run process_inbox
npm run status
openclaw cron list --all --json
```

---

## 4）接下来待完成的重点任务

1. **替换 mock 源为真实输入源路径**
   - 先替换 1~2 个真实 markdown 文件（例如：inbox.md、速记.md）
   - 保持“路径稳定 + append-only 优先”

2. **补可观测性（优先级高）**
   - 在 `status` 里补最近 pull/process/daily 的运行摘要
   - 明确最近失败原因（尤其调度失败）

3. **再逐步接入真实外部来源**
   - SiYuan 同步目录文件
   - IM 适配器（最终仍落到 `landing` 契约）

---

## 5）边界说明（防止误操作）

- Git 只同步项目代码与文档，不同步 `~/.openclaw/`。
- 不要把密钥写入仓库文件（`.env` 已被 `.gitignore` 忽略）。
- OpenClaw Dashboard 旧会话可忽略，验证请新建会话。
- 若 Web 不响应，优先检查：
  - gateway token 是否有效
  - model/provider 是否可用
  - `openclaw cron list --all --json` 与 `openclaw logs --plain`。
