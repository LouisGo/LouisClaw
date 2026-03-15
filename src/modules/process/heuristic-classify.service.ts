import { Item } from "../../domain/item.js";
import { hasActionSignal, inferSummary } from "../../shared/text.js";

type TopicName = "ai" | "engineering" | "video" | "general";

type TopicSignal = {
  pattern: RegExp;
  score: number;
};

const TOPIC_SIGNALS: Record<Exclude<TopicName, "general">, TopicSignal[]> = {
  ai: [
    { pattern: /\bllm\b/i, score: 6 },
    { pattern: /\bagent(s)?\b/i, score: 5 },
    { pattern: /\bai\b/i, score: 4 },
    { pattern: /artificial intelligence/i, score: 6 },
    { pattern: /模型|大模型|智能体|推理|prompt|embedding|rag/i, score: 5 },
    { pattern: /openai|anthropic|gemini|claude|gpt/i, score: 5 }
  ],
  engineering: [
    { pattern: /typescript|javascript|tsx|react|vue|node\.?js|frontend|backend/i, score: 5 },
    { pattern: /render(ing)?|renderer|manifest|registry|transformer|layout|context menu/i, score: 5 },
    { pattern: /pipeline|workflow|contract|schema|normalize(d)?|intake|capture|router|routing/i, score: 4 },
    { pattern: /domain|sdk|api|component|test|hook|selector|module|architecture/i, score: 4 },
    { pattern: /代码|工程|前端|后端|渲染|维护指南|测试|组件|架构|工作流|契约|统一入口|归一化|落盘/i, score: 5 }
  ],
  video: [
    { pattern: /\bvideo\b|视频|字幕|播客|访谈|clip|transcript/i, score: 5 },
    { pattern: /youtube|bilibili|抖音|tiktok/i, score: 2 }
  ]
};

function detectTopic(item: Item): string {
  if (item.content_type === "video_link") {
    return "video";
  }

  if (item.content_type === "code") {
    return "engineering";
  }

  const title = item.title || "";
  const body = item.normalized_content;
  const titleScores = scoreTopics(title);
  const bodyScores = scoreTopics(body);
  const engineeringScore = titleScores.engineering * 2 + bodyScores.engineering;
  const aiScore = titleScores.ai * 2 + bodyScores.ai;
  const videoScore = titleScores.video * 2 + bodyScores.video;
  const platformIntakeContext = hasPlatformIntakeContext(`${title} ${body}`);

  if (engineeringScore >= 5 && engineeringScore >= aiScore) {
    return "engineering";
  }

  if (aiScore >= 5) {
    return "ai";
  }

  if (platformIntakeContext && videoScore > 0) {
    return "general";
  }

  if (videoScore >= 5) {
    return "video";
  }

  return "general";
}

function scoreTopics(text: string): Record<Exclude<TopicName, "general">, number> {
  return {
    ai: scoreSignals(text, TOPIC_SIGNALS.ai),
    engineering: scoreSignals(text, TOPIC_SIGNALS.engineering),
    video: scoreSignals(text, TOPIC_SIGNALS.video)
  };
}

function scoreSignals(text: string, signals: TopicSignal[]): number {
  return signals.reduce((total, signal) => total + (signal.pattern.test(text) ? signal.score : 0), 0);
}

function hasPlatformIntakeContext(text: string): boolean {
  return /分享|分享卡片|share card|分享链接|link|链接|平台|入口|统一入口|信息流|pipeline|workflow|intake|capture|归一化|markdown|snippet/i.test(text);
}

export class HeuristicClassifyService {
  run(item: Item): Item {
    if (item.decision === "drop") {
      return item;
    }

    const topic = detectTopic(item);
    const signalText = `${item.title || ""} ${item.normalized_content}`;
    const hasActionCue = hasActionSignal(signalText);
    const longEnough = item.normalized_content.length >= 80;
    const mediumEnough = item.normalized_content.length >= 40;
    const hasStructureCue = /(^|\n)#{1,6}\s|(^|\n)\s*[-*+]\s|```|https?:\/\//i.test(item.raw_content);
    const hasSpecificTopic = topic !== "general";
    const worthDigest = longEnough
      || (Boolean(item.url) && mediumEnough)
      || (hasSpecificTopic && mediumEnough)
      || hasStructureCue;
    const valueScore = hasActionCue
      ? 90
      : worthDigest
        ? hasSpecificTopic
          ? 82
          : 74
        : 52;
    const summary = item.title && item.title.length <= 48
      ? item.title
      : inferSummary(item.raw_content, 120, item.title || item.summary);

    return {
      ...item,
      topic,
      tags: [topic, item.content_type],
      summary,
      value_score: valueScore,
      decision: hasActionCue ? "follow_up" : worthDigest ? "digest" : "archive",
      reason: hasActionCue
        ? "Contains action or follow-up signals"
        : worthDigest
          ? "Likely worth reviewing later"
          : "Useful enough to keep but not urgent",
      status: "processed"
    };
  }
}
