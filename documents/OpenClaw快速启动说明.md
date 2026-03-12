# OpenClaw 快速启动说明

本文档用于在另一台机器上快速复用 LouisClaw 的 OpenClaw 接入结果。

## 0. 当前机器接管边界（重要）

Git 仓库里的 OpenClaw 能力定义与本机 OpenClaw 运行时状态需要分开处理。

- 仓库内可直接复用和修改的内容：`AGENTS.md`、`skills/`、`README.md`、`src/`、模板与说明文档。
- 机器级状态：`~/.openclaw/openclaw.json`、`~/.openclaw/agents/`、`~/.openclaw/logs/`、Gateway service、API key、Gateway token、本地会话历史。

在当前这台机器上的一次实际检查中，发现 OpenClaw 默认 workspace 指向的是：

- `/Users/lou/.openclaw/workspace`

而当前仓库路径是：

- `/Users/lou/Learn/LouisClaw`

这说明当前阻塞点主要不是 Git 仓库内容缺失，而是**本机 OpenClaw 还没有接管到这个仓库**。

因此，下面这些动作都应视为“需要用户确认的接管动作”，不要默认自动执行：

- 修改默认 workspace 绑定
- 改写 `~/.openclaw/openclaw.json`
- 重启或重装 Gateway / LaunchAgent service
- 写入或替换 API key / token

推荐顺序是：

1. 先确认仓库内能力定义已经齐全（skills、CLI、README、启动说明）。
2. 再由用户明确确认是否把 OpenClaw 默认 workspace 切到当前仓库。
3. 如有需要，再由用户确认是否允许重启 gateway/service 做最终生效验证。

## 1. 哪些内容在 Git 仓库里

以下内容已经写入当前仓库，提交后可直接复用：

- OpenClaw workspace 约束文件：`AGENTS.md`
- OpenClaw 技能：
  - `skills/ai-flow/SKILL.md`
  - `skills/ai-flow-intake/SKILL.md`
  - `skills/ai-flow-review/SKILL.md`
- 流水线命令入口：
  - `src/app/cli.ts`
  - `src/modules/pipeline/run.command.ts`
  - `src/modules/pipeline/status.command.ts`
- OpenAI 环境变量兼容：`src/app/config.ts`
- 项目脚本更新：`package.json`
- 使用说明更新：`README.md`

这些内容只要随 Git 提交走，在另一台机器上拉仓库后就还在。

## 2. 哪些内容不在 Git 仓库里

以下内容属于当前机器的本地 OpenClaw 状态，不会随 Git 提交自动复用：

- `~/.openclaw/openclaw.json`
- `~/.openclaw/agents/`
- `~/.openclaw/logs/`
- LaunchAgent / system service
- 你自己的 API key
- Gateway token
- 本地会话历史与运行状态

这些内容是“机器级配置”，需要在新机器重新初始化。

## 3. 新机器快速复用步骤

以下步骤默认新机器已经安装 Node.js 和 npm。

### 3.1 安装 OpenClaw

```bash
npm install -g openclaw@latest
```

### 3.2 拉取仓库并安装项目依赖

```bash
git clone <your-repo-url>
cd LouisClaw
npm install
npm run build
```

### 3.3 初始化 OpenClaw，并把 workspace 指到当前仓库

```bash
openclaw onboard \
  --non-interactive \
  --accept-risk \
  --mode local \
  --workspace "$PWD" \
  --skip-channels \
  --skip-search \
  --skip-ui \
  --skip-health \
  --gateway-auth token \
  --gateway-bind loopback \
  --auth-choice skip
```

这一步会生成本机的 `~/.openclaw/openclaw.json`。

### 3.4 设置默认模型

```bash
openclaw models set openai/gpt-5.4
```

### 3.5 配置 OpenAI API key

推荐二选一：

#### 方式 A：Shell 环境变量

```bash
export OPENAI_API_KEY="your-key"
export OPENAI_MODEL="gpt-5.4"
```

如果你希望每次开终端都生效，把它写到 `~/.zshrc` 或 `~/.bashrc`。

#### 方式 B：项目 `.env`

在仓库根目录新建 `.env`：

```bash
CLASSIFIER_MODE=auto
OPENAI_API_KEY=your-key
OPENAI_MODEL=gpt-5.4
AI_BASE_URL=https://api.openai.com/v1
WORKSPACE_ROOT=.
ENABLE_SIYUAN_EXPORT=false
EXPORT_ROOT=./data/exports
ENABLE_IM_ATTACHMENT_EXPORT=true
```

注意：`.env` 不要提交到 Git。

### 3.6 启动 Gateway 服务

```bash
openclaw gateway install
openclaw gateway start
openclaw status
```

如果只想前台调试，也可以：

```bash
openclaw gateway run
```

### 3.7 打开 Web 调试界面

```bash
openclaw dashboard --no-open
```

命令会输出本机可访问的 Dashboard URL。

## 4. 验证是否接好

先验证项目流水线：

```bash
npm run status
npm run run
```

再验证 OpenClaw：

```bash
openclaw skills
openclaw status
```

你应该能看到这些 workspace skills：

- `ai-flow`
- `ai-flow-intake`
- `ai-flow-review`

## 5. WebChat 里怎么用

在 OpenClaw WebChat 里可以直接自然语言调试，例如：

- “看看今天 LouisClaw 的状态”
- “把这段内容收进 inbox：...”
- “运行一次完整流程并告诉我 digest 结果”
- “帮我检查今天有哪些 follow_up”

## 6. 迁移时最容易漏掉的点

- 没安装全局 `openclaw`
- 没运行 `openclaw onboard ... --workspace "$PWD"`
- 没设置 `OPENAI_API_KEY`
- 改了仓库路径，但 OpenClaw 还指向旧路径
- 启动了 Gateway，但没有重新打开 Dashboard URL

## 7. 路径变更时怎么修复

如果新机器仓库路径和旧机器不同，重新执行：

```bash
openclaw config set agents.defaults.workspace "$PWD"
```

然后重启 Gateway：

```bash
openclaw gateway restart
```

## 8. 最小复用原则

真正需要随 Git 走的是：

- `AGENTS.md`
- `skills/`
- `README.md`
- `src/` 里的 CLI 与流水线代码

真正需要每台机器单独处理的是：

- `~/.openclaw/`
- API key
- Gateway service
- 本地日志与会话

也就是说：

> Git 仓库保存“能力定义”，OpenClaw 本地目录保存“运行时状态”。
