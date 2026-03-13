import { Item } from "../../domain/item.js";

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
    { pattern: /domain|sdk|api|component|test|hook|selector|module|architecture/i, score: 4 },
    { pattern: /代码|工程|前端|后端|渲染|维护指南|测试|组件|架构/i, score: 5 }
  ],
  video: [
    { pattern: /\bvideo\b|youtube|bilibili|字幕|播客|访谈/i, score: 5 }
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

  if (engineeringScore >= 5 && engineeringScore >= aiScore) {
    return "engineering";
  }

  if (aiScore >= 5) {
    return "ai";
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

export class HeuristicClassifyService {
  run(item: Item): Item {
    if (item.decision === "drop") {
      return item;
    }

    const topic = detectTopic(item);
    const hasActionCue = /todo|follow up|待办|行动|研究|看看|试试/i.test(item.normalized_content);
    const longEnough = item.normalized_content.length >= 40 || Boolean(item.url);

    return {
      ...item,
      topic,
      tags: [topic, item.content_type],
      summary: item.title || item.normalized_content.slice(0, 120),
      value_score: hasActionCue ? 85 : longEnough ? 70 : 45,
      decision: hasActionCue ? "follow_up" : longEnough ? "digest" : "archive",
      reason: hasActionCue
        ? "Contains action or follow-up signals"
        : longEnough
          ? "Likely worth reviewing later"
          : "Useful enough to keep but not urgent",
      status: "processed"
    };
  }
}
