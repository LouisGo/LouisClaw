# IM BOT 接入准备清单

> 目的：在不直接碰生产 IM 配置的前提下，确认 LouisClaw 已进入“可以对接真实 IM BOT”的准备状态，并明确真正接入时只需要补哪些外部信息。

## 1. 当前已经就绪的部分

当前仓库已经具备这些能力：

- 统一输入契约：所有输入最终都可以落到 `landing -> inbox -> items`
- 轻处理链路：`process_inbox`
- 每日摘要链路：`build_digest`
- 长文草稿链路：`data/exports/synthesis/`
- SiYuan 发布链路：`export_siyuan`
- IM 友好的本地导出目录：`data/exports/`
- OpenClaw skill 边界：`capture / triage / synthesis / publish / feedback`

这意味着：

> 真正的 IM BOT 接入，不需要重做主流程，只需要增加一个“把 IM 消息适配成标准输入”的外层适配器。

## 2. 当前还没有直接接上的部分

当前还没有正式完成：

- 真实 IM channel 配置
- 真实 webhook / bot token / app secret
- IM 消息类型到 `IntakeInput` 的适配实现
- IM 结果通知的正式投递实现

这些都属于“通道接入层”，不是主流程骨架缺失。

## 3. 接入时的边界

真实 IM BOT 接入时，继续遵守这些边界：

- IM 负责：低摩擦输入、轻提醒、轻反馈
- repo 负责：标准化落盘、处理、导出、状态
- SiYuan 负责：长期沉淀与查看
- OpenClaw 负责：路由、编排、综合生成

默认产品原则：

- 大多数 IM 输入都是 `silent capture`
- 没有明确要求时，不立即生成长回复
- 长文默认不直接回 IM，而是写入 `SiYuan` 或本地导出，再发标题提醒

## 4. IM 适配器最小契约

真实 IM BOT 只需要把消息适配成这些字段：

```yaml
source: im
device: mobile
capture_time: <ISO timestamp>
content_type: text | link | image | mixed | video_link
raw_content: <cleaned message body>
url: <optional extracted url>
title: <optional short title>
```

然后统一进入现有入口：

- 推荐：写成 landing record 进入 `data/landing/`
- 或直接复用 `npm run add -- ...` 对应的内部契约

## 5. 真正接入前你需要提供的外部信息

当要对接真实 IM BOT 时，只需要再补这些：

- IM 平台类型
  - 例如：Telegram / 企业微信 / 微信桥 / Discord / Slack / 自建 IM
- 接入方式
  - webhook / polling / 本地桥接 / Android 转发
- 可用凭据
  - bot token / app secret / webhook secret / chat id / channel id
- 希望的默认行为
  - 只收不回
  - 收到后确认一句
  - 完成 digest 后推标题
  - 完成长文后推标题

## 6. 推荐的第一阶段接法

为了最小风险，第一阶段建议只做：

1. IM 输入 -> landing
2. 不自动长回复
3. 只允许标题级通知
4. 附件继续从 `data/exports/` 取，不进 `SiYuan`

这能先验证真实输入质量，而不把通知、交互、长文推送一起做复杂。

## 7. 当前是否已到“可接入前状态”

结论：**是的，已经到了。**

原因：

- 主流程已经稳定
- 产物边界已经明确
- Markdown 导出可读性已开始收敛
- `SiYuan` 发布链路已具备
- skill 分工已具备

当前缺的不是产品骨架，而是：

- 真实 IM 通道配置
- 一个很薄的适配器层

## 8. 下一次真正开始 IM 接入时的建议顺序

1. 先确定 IM 平台和接入方式
2. 只做消息 -> landing 的薄适配
3. 用真实消息跑 `process_inbox` 和 `build_digest`
4. 最后再补标题通知和轻反馈
