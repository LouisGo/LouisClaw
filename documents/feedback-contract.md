# LouisClaw Feedback Contract

> 目的：为 `ai-flow-feedback` 提供一个最小但可执行的落地契约，在正式实现偏好学习前，先保证反馈是显式、可审计、可回溯的。

## 1. 当前定位

`feedback` 不是自动学习黑盒。

在当前阶段，它只是把用户的轻反馈记录成明确事实，供后续人工检查、规则调整、或未来最小代码支持复用。

## 2. 支持的反馈类型

- `useful`
- `not_useful`
- `more_like_this`
- `less_like_this`

## 3. 反馈目标

允许反馈挂到以下对象之一：

- `item_id`
- `digest_id`
- `topic`
- `article_id`
- `artifact_path`

当前原则：

- 能精确挂到具体对象时，优先挂具体对象
- 不能精确定位时，允许先挂到 `topic` 或 `artifact_path`

## 4. 最小记录格式

建议记录为一条独立 Markdown 或 JSON 记录，至少包含：

```yaml
id: feedback_20260314_xxxx
created_at: 2026-03-14T12:00:00+08:00
feedback_type: useful
target_type: item
target_ref: item_20260314_abcd
source_channel: openclaw
note: optional free text
created_by: ai-flow-feedback
```

## 5. 当前推荐存放位置

在还没有专门代码支持前，推荐临时存放在：

- `data/feedback/` 作为独立记录目录

这不要求立即实现复杂逻辑，只要求：

- 路径稳定
- 字段稳定
- 可被后续脚本或人工读取

## 6. skill 行为约束

`ai-flow-feedback` 当前应：

- 明确说明自己是在“记录反馈”，不是“立即学会偏好”
- 优先生成显式记录，而不是把偏好藏进 runtime session
- 如果目标不明确，先要求最小澄清或记录为 topic 级反馈

## 7. 当前不承诺的事情

当前阶段不默认承诺：

- 自动修改分类器参数
- 自动改变 prompt 权重
- 自动回写所有历史条目
- 自动形成稳定偏好模型

## 8. 一句话原则

> 先把反馈变成可审计数据，再谈反馈驱动优化。
