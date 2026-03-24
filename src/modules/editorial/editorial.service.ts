import path from "node:path";
import matter from "gray-matter";
import { AppConfig } from "../../app/config.js";
import { Item } from "../../domain/item.js";
import { ItemRepository } from "../../infra/storage/item-repository.js";
import { writeTextFile } from "../../shared/fs.js";
import { dateStamp, formatLocalDateTime, nowIso, timezoneLabel } from "../../shared/time.js";
import { fileSlug, normalizeContent, toPlainText } from "../../shared/text.js";

export type EditorialArtifactKind = "morning" | "evening" | "knowledge";

export interface EditorialBuildOptions {
  theme?: string;
  date?: string;
}

export interface EditorialArtifactResult {
  kind: EditorialArtifactKind;
  title: string;
  filePath: string;
  themeLabel: string;
  sourceItemIds: string[];
}

interface ThemeBlueprint {
  id: string;
  label: string;
  aliases: string[];
  patterns: RegExp[];
  morningTitle: string;
  eveningTitle: string;
  knowledgeTitle: string;
  thesis: string;
  whyNow: string;
  actionShift: string;
  knowledgeJudgment: string;
  knowledgeImplication: string;
  antiPattern: string;
  morningQuestions: string[];
  eveningQuestions: string[];
  knowledgeRules: string[];
}

interface ThemeCandidate {
  id: string;
  label: string;
  items: Item[];
  score: number;
  blueprint?: ThemeBlueprint;
}

const THEME_BLUEPRINTS: ThemeBlueprint[] = [
  {
    id: "ai-native-engineering",
    label: "AI 原生工程工作流",
    aliases: ["ai 工作流", "ai 程序员", "ai 工程师", "agentic engineering", "worktree", "subagent"],
    patterns: [
      /agentic|supervisory engineering|worktree|subagent|compact|completion vs responses|ai coding workflow|上下文|context|ai 原生|ai 程序员|ai 工程师|prompt|workflow|openclaw/i
    ],
    morningTitle: "今天真正值得投入的，不是更多提示词，而是 AI 原生工程的工作方式",
    eveningTitle: "今晚真正沉下来的，不是单点技巧，而是 AI 原生工程的边界感",
    knowledgeTitle: "把 AI 变成稳定工程系统：你真正要重写的是工作方式，不是职位名称",
    thesis: "AI 正在把软件工程的瓶颈从写代码，转向任务拆解、上下文治理、验证闭环和判断责任。",
    whyNow: "最近进入你工作台前景的，不再是某个单点模型能力，而是一整套关于 worktree、上下文、agent、并行协作和工程护栏的材料。它们共同指向一个变化：你已经不再缺“会不会用 AI”，而是开始需要一套真正能长期工作的 AI 原生工程方法。",
    actionShift: "下一步真正该收束的，不是去追逐更花哨的 prompt，而是先把任务所有权、上下文入口、验证标准和交付接口变成稳定习惯。",
    knowledgeJudgment: "所谓 AI 原生工程师，不是更会聊天的人，而是能把模型能力嵌进真实工程系统，并对结果负责的人。",
    knowledgeImplication: "对你来说，这意味着今后沉淀的重点应该从“模型又强了多少”转向“哪些工作方式能持续减少混乱、返工和判断噪音”。",
    antiPattern: "不要把注意力放在单次输出是否惊艳，也不要迷信压缩摘要、自动 compact 或多余流程。真正有复利的是边界清晰、上下文干净、验证前置。",
    morningQuestions: [
      "如果今天只能优化一个环节，应该先改任务拆解、上下文组织，还是验收闭环？",
      "哪些工作仍然在靠人硬撑，而没有被沉淀成 AI 可协作的接口？"
    ],
    eveningQuestions: [
      "今天哪些动作真正减少了工程噪音，哪些只是让系统看起来更忙？",
      "哪些边界已经适合固化成长期工作方式，而不是继续靠临场判断？"
    ],
    knowledgeRules: [
      "一项任务只给一个明确拥有者，一组上下文，一套验证出口。",
      "优先沉淀能减少返工的护栏，而不是沉淀更多操作细节。",
      "把 AI 当作工程系统的一部分设计，而不是当作更便宜的打字员。"
    ]
  },
  {
    id: "message-distribution",
    label: "消息系统与长内容分发",
    aliases: ["消息渲染", "message list", "im", "长内容分发", "ws", "分享卡片"],
    patterns: [
      /message|虚拟列表|virtual ?list|ws |websocket|socket|分享卡片|长内容|消息|渲染|im 纯 web|message rendering|统一入口/i
    ],
    morningTitle: "今天该想清楚的，不是继续补丁，而是消息系统该如何承载长内容",
    eveningTitle: "今晚真正清楚下来的，是消息系统不该再假装和 feed 是同一个问题",
    knowledgeTitle: "长内容不要硬塞进消息气泡：消息系统与知识分发应该分层",
    thesis: "消息系统的问题往往不在单点性能，而在错误的抽象边界：即时对话、长文沉淀、回看路径和分发体验不应该被揉成一层。",
    whyNow: "你连续沉淀了 message list、WS 架构、统一入口、长消息附件化和渲染迁移这些材料，说明当前真正的矛盾并不是某个 bug，而是内容形态和承载容器之间已经错位。",
    actionShift: "因此更值得优先做的，不是继续给旧列表补丁，而是先承认：即时会话负责发起和提醒，完整材料应该进入更适合阅读与回看的容器。",
    knowledgeJudgment: "一套好的消息系统，重点不是让所有内容都能塞进去，而是让用户在最轻的入口里被带到最合适的承载形态。",
    knowledgeImplication: "对你的产品来说，这直接意味着 IM 触发入口可以保留，但长内容默认应该走 markdown 附件、专题文稿或知识页，而不是继续追求气泡里的完整体验。",
    antiPattern: "不要再试图用同一套抽象同时满足 feed、message、跳转恢复和长文阅读。那只会让系统越来越像技术妥协，而不像产品选择。",
    morningQuestions: [
      "今天如果只改一个判断，应该先定义长内容的默认落点，还是继续优化消息列表内核？",
      "哪些体验问题本质是容器选错了，而不是渲染没优化好？"
    ],
    eveningQuestions: [
      "今天新增的复杂度里，有多少是真需求，有多少只是错误抽象带来的补丁？",
      "哪些内容应该继续留在会话里，哪些应该明确升级成附件或知识页？"
    ],
    knowledgeRules: [
      "即时消息负责触发、提醒和方向，不负责承载所有正文。",
      "把长内容迁移到更适合回看与编辑的载体里，再让消息承担入口角色。",
      "当一个组件不断长出补丁时，先检查抽象边界，而不是默认继续优化实现。"
    ]
  },
  {
    id: "knowledge-experience",
    label: "个人知识流与输出体验",
    aliases: ["知识沉淀", "输出体验", "siyuan", "思源", "digest", "专题", "pipeline"],
    patterns: [
      /siyuan|思源|digest|专题|synthesis|沉淀|知识流|pipeline|capture|markdown 附件|信息流|长消息|简介加 markdown 附件|静默录入|统一入口|分享卡片/i
    ],
    morningTitle: "今天该收束的，不是更多流程，而是知识系统到底应该把什么推到前台",
    eveningTitle: "今晚真正该留下来的，是一条更克制的知识系统原则",
    knowledgeTitle: "静默沉淀，强内容输出：个人知识系统真正该优化的不是流程感",
    thesis: "个人知识系统的价值不在于把输入管理得多规整，而在于能否静默吸收碎片，最后只把真正值得阅读的内容推到前台。",
    whyNow: "与你的输入一起增长的，不只是材料数量，还有对模板化晨报、晚报、数据库式知识沉淀和过度结构化的持续不满。这说明真正需要优化的不是同步层，而是系统在用户面前暴露了太多中间过程。",
    actionShift: "下一步最该做的不是继续扩充 task、schedule 和中间产物，而是直接砍掉会破坏阅读体验的结构，把注意力全放到少数成品上。",
    knowledgeJudgment: "好的知识系统应该像一个安静但审美稳定的编辑部，而不是一个不断向你展示后台表结构的工作台。",
    knowledgeImplication: "对这个仓库来说，最关键的调整就是保留 intake 和沉淀能力，但停止把 item、digest、follow-up 这些内部概念暴露给你的日常阅读体验。",
    antiPattern: "不要为了省一点 token，就把所有输出都公式化、制度化、栏目化。省下来的成本不值得用阅读体验去换。",
    morningQuestions: [
      "今天最值得打磨的，是哪个输出真正能让你想读完，而不是哪个流程更完整？",
      "哪些中间产物只是在证明系统很忙，但对你没有任何阅读价值？"
    ],
    eveningQuestions: [
      "今天留下来的内容里，哪些值得沉淀成长期判断，哪些只适合静默归档？",
      "哪些结构仍然在向你暴露后台，而不是在交付作品？"
    ],
    knowledgeRules: [
      "沉淀过程尽量静默，除非它会提高最终成品质量，否则不要打扰你。",
      "最终对你可见的应该是作品，而不是数据库、队列和流程节点。",
      "所有中间结构都必须服从内容质量，而不是反过来塑造内容。"
    ]
  },
  {
    id: "ai-organization",
    label: "AI 时代的组织判断",
    aliases: ["团队规模", "管理层", "调研", "组织", "出海", "岗位"],
    patterns: [
      /团队规模|管理层|调研|组织|岗位|判断力|信任|分工|创业|出海|产品经理|转型/i
    ],
    morningTitle: "今天值得反复想的，不是 AI 会替代谁，而是什么会变成更稀缺的判断力",
    eveningTitle: "今晚该留下来的，不是对岗位的焦虑，而是对组织价值的重新排序",
    knowledgeTitle: "AI 时代真正被放大的，不是执行速度，而是判断力与收敛能力",
    thesis: "AI 把执行成本压低之后，真正稀缺的不是人手本身，而是判断、责任、信任和收敛能力。",
    whyNow: "你最近收集的不少材料都在反复回到同一个核心问题：AI 让人做得更快之后，团队、角色和研究方式到底要怎样重排。这类问题之所以重要，是因为它直接影响你如何设计产品、组织工作和选择自己的角色位置。",
    actionShift: "所以更值得推进的不是对岗位名称的焦虑，而是先判断哪些环节真的在创造价值，哪些只是历史形成的协作摩擦。",
    knowledgeJudgment: "AI 不会简单地把团队压成更小，而是会迫使组织把低密度协调让位给更高密度的判断与责任。",
    knowledgeImplication: "这对你意味着，不论是做产品、做工程还是做个人系统，之后都应该优先强化那些能帮助你做取舍、建立信任和减少噪音的部分。",
    antiPattern: "不要把“更快”误判成“更对”，也不要把“更少的人”误判成“更高级的组织”。",
    morningQuestions: [
      "你今天面对的决策里，真正稀缺的是执行，还是判断？",
      "哪些流程只是让组织看起来完整，实际上只在搬运信息？"
    ],
    eveningQuestions: [
      "今天沉下来的，是哪些关于判断力、责任和信任的观察？",
      "哪些低价值协调动作，已经适合被工具化或直接删除？"
    ],
    knowledgeRules: [
      "先区分价值创造和协作摩擦，再决定组织怎么变小或变快。",
      "AI 提升执行效率后，更该强化判断与验收，而不是弱化它们。",
      "把研究从厚报告转向连续验证，但不要把验证误解成没有思考。"
    ]
  }
];

const CHINESE_STOPWORDS = [
  "今天", "这个", "这个问题", "工作方式", "对话总结", "研究速记", "笔记", "总结", "关于", "以及", "一个", "这次",
  "如何", "为什么", "什么", "不是", "可以", "应该", "需要", "已经", "真正", "当前", "最近", "后续", "继续",
  "最佳实践", "思考", "问答", "作品", "视频", "分享", "验证", "恢复", "接入", "标题"
];

export class EditorialService {
  constructor(
    private readonly config: AppConfig,
    private readonly itemRepository: ItemRepository
  ) {}

  buildMorningBrief(options: EditorialBuildOptions = {}): EditorialArtifactResult {
    const today = options.date || dateStamp();
    const candidate = this.selectCandidate(options.theme, "morning");
    return this.writeArtifact("morning", today, candidate, renderMorningBrief(candidate, today));
  }

  buildEveningReview(options: EditorialBuildOptions = {}): EditorialArtifactResult {
    const today = options.date || dateStamp();
    const candidate = this.selectCandidate(options.theme, "evening");
    return this.writeArtifact("evening", today, candidate, renderEveningReview(candidate, today));
  }

  buildKnowledgeNote(options: EditorialBuildOptions = {}): EditorialArtifactResult {
    const today = options.date || dateStamp();
    const candidate = this.selectCandidate(options.theme || "知识沉淀", "knowledge");
    return this.writeArtifact("knowledge", today, candidate, renderKnowledgeNote(candidate, today));
  }

  private writeArtifact(kind: EditorialArtifactKind, date: string, candidate: ThemeCandidate, body: string): EditorialArtifactResult {
    const dir = kind === "morning"
      ? this.config.paths.editorialMorning
      : kind === "evening"
        ? this.config.paths.editorialEvening
        : this.config.paths.editorialKnowledge;
    const title = titleFor(kind, candidate);
    const fileName = `${date}-${kind}-${fileSlug(candidate.label, candidate.id)}.md`;
    const filePath = path.join(dir, fileName);

    writeTextFile(filePath, matter.stringify(body, {
      id: `editorial:${kind}:${date}:${candidate.id}`,
      artifact_type: kind,
      title,
      created_at: nowIso(),
      created_by: "louisclaw-editorial",
      theme: candidate.label,
      source_item_ids: candidate.items.map((item) => item.id)
    }));

    return {
      kind,
      title,
      filePath,
      themeLabel: candidate.label,
      sourceItemIds: candidate.items.map((item) => item.id)
    };
  }

  private selectCandidate(themeHint: string | undefined, kind: EditorialArtifactKind): ThemeCandidate {
    const items = this.loadRecentItems();
    if (!items.length) {
      throw new Error("没有可用于生成内容的近期材料");
    }

    const hintedBlueprint = themeHint ? THEME_BLUEPRINTS.find((entry) => matchesHint(entry, themeHint)) : undefined;
    if (hintedBlueprint) {
      const hintedCandidate = buildBlueprintCandidate(hintedBlueprint, items);
      if (hintedCandidate.items.length) {
        return hintedCandidate;
      }
    }

    const scoredCandidates = THEME_BLUEPRINTS
      .map((entry) => buildBlueprintCandidate(entry, items))
      .filter((entry) => entry.items.length)
      .sort(compareCandidates);

    if (scoredCandidates[0]) {
      return scoredCandidates[0];
    }

    return buildFallbackCandidate(items, kind, themeHint);
  }

  private loadRecentItems(): Item[] {
    const maxAgeDays = Math.max(this.config.activeWindow.maxAgeDays, 14);
    const cutoff = Date.now() - maxAgeDays * 24 * 60 * 60 * 1000;

    return this.itemRepository.loadAll()
      .filter((item) => item.decision && item.decision !== "drop")
      .filter((item) => Date.parse(item.capture_time) >= cutoff)
      .sort((left, right) => (right.capture_time || "").localeCompare(left.capture_time || ""));
  }
}

function buildBlueprintCandidate(blueprint: ThemeBlueprint, items: Item[]): ThemeCandidate {
  const scored = items
    .map((item) => ({ item, score: scoreBlueprintItem(item, blueprint) }))
    .filter((entry) => entry.score > 0)
    .sort((left, right) => right.score - left.score || (right.item.capture_time || "").localeCompare(left.item.capture_time || ""))
    .slice(0, 8);

  return {
    id: blueprint.id,
    label: blueprint.label,
    items: scored.map((entry) => entry.item),
    score: scored.reduce((sum, entry) => sum + entry.score, 0),
    blueprint
  };
}

function buildFallbackCandidate(items: Item[], kind: EditorialArtifactKind, themeHint?: string): ThemeCandidate {
  const grouped = new Map<string, Item[]>();
  for (const item of items) {
    const label = item.topic ? topicLabel(item.topic) : extractThemeFromTitles([item]);
    const current = grouped.get(label) || [];
    current.push(item);
    grouped.set(label, current);
  }

  const best = Array.from(grouped.entries())
    .map(([label, group]) => ({
      label,
      items: group.slice(0, 6),
      score: group.reduce((sum, item) => sum + scoreFallbackItem(item), 0)
    }))
    .sort((left, right) => right.score - left.score || right.items.length - left.items.length)[0];

  if (!best) {
    throw new Error("没有可用于生成内容的主题");
  }

  return {
    id: fileSlug(themeHint || best.label || kind, kind),
    label: themeHint || best.label || "近期主题",
    items: best.items,
    score: best.score
  };
}

function scoreBlueprintItem(item: Item, blueprint: ThemeBlueprint): number {
  const titleText = `${item.topic || ""}\n${item.title || ""}\n${item.summary || ""}`.toLowerCase();
  const bodyText = `${item.normalized_content || ""}`.toLowerCase();
  const titleMatches = blueprint.patterns.reduce((sum, pattern) => sum + (pattern.test(titleText) ? 1 : 0), 0);
  const bodyMatches = blueprint.patterns.reduce((sum, pattern) => sum + (pattern.test(bodyText) ? 1 : 0), 0);

  if (titleMatches === 0 && bodyMatches === 0) {
    return 0;
  }

  const ageWeight = ageWeightDays(item.capture_time);
  const decisionWeight = item.decision === "follow_up" ? 5 : item.decision === "digest" ? 3 : 1;
  const scoreWeight = Math.ceil((item.value_score || 50) / 20);
  let score = titleMatches * 8 + Math.min(bodyMatches, 2) * 2 + ageWeight + decisionWeight + scoreWeight;

  if (titleMatches === 0) {
    score -= 5;
  }

  if (blueprint.id === "knowledge-experience" && titleMatches === 0) {
    score -= 6;
  }

  return Math.max(0, score);
}

function scoreFallbackItem(item: Item): number {
  return ageWeightDays(item.capture_time) + (item.decision === "follow_up" ? 4 : 2) + Math.ceil((item.value_score || 50) / 25);
}

function ageWeightDays(captureTime: string | undefined): number {
  if (!captureTime) {
    return 1;
  }

  const diff = Math.max(0, Date.now() - Date.parse(captureTime));
  const days = diff / (24 * 60 * 60 * 1000);
  if (days <= 3) {
    return 4;
  }

  if (days <= 7) {
    return 3;
  }

  if (days <= 14) {
    return 2;
  }

  return 1;
}

function compareCandidates(left: ThemeCandidate, right: ThemeCandidate): number {
  if (right.score !== left.score) {
    return right.score - left.score;
  }

  if (right.items.length !== left.items.length) {
    return right.items.length - left.items.length;
  }

  return (right.items[0]?.capture_time || "").localeCompare(left.items[0]?.capture_time || "");
}

function matchesHint(blueprint: ThemeBlueprint, hint: string): boolean {
  const lowered = hint.trim().toLowerCase();
  if (!lowered) {
    return false;
  }

  if (blueprint.id.includes(lowered) || blueprint.label.toLowerCase().includes(lowered)) {
    return true;
  }

  return blueprint.aliases.some((entry) => entry.toLowerCase().includes(lowered) || lowered.includes(entry.toLowerCase()));
}

function renderMorningBrief(candidate: ThemeCandidate, date: string): string {
  const title = titleFor("morning", candidate);
  const blueprint = candidate.blueprint;
  const sourceLine = buildSourceNarrative(candidate.items);
  const excerpts = buildExcerpts(candidate.items, 3);
  const readingMap = buildReadingMap(candidate.items, 3);
  const questions = blueprint?.morningQuestions || [
    "如果今天只能推进一件事，哪条线索最值得把注意力投进去？",
    "哪些信息已经足够形成判断，哪些还只是噪音？"
  ];

  return [
    `# ${title}`,
    "",
    `> 生成时间：${formatLocalDateTime(new Date())} (${timezoneLabel()})`,
    "",
    `${blueprint?.whyNow || `${candidate.label} 这条线最近持续出现，已经不是零散输入，而是一条值得前置到今天日程里的主线。`}`,
    "",
    `${blueprint?.thesis || `${candidate.label} 当前最值得你投入的，不是继续囤积材料，而是把已有信号收束成清晰判断。`}`,
    "",
    `${sourceLine}`,
    "",
    `${blueprint?.actionShift || "今天的重点应该是把已有线索变成可执行判断，而不是继续扩大输入面。"}`,
    "",
    "## 今天先从这里开始",
    ...readingMap.map((line, index) => `${index + 1}. ${line}`),
    "",
    "## 我建议你今天带着这两个问题读",
    ...questions.map((line) => `- ${line}`),
    "",
    "## 这批材料已经给出的关键信号",
    ...excerpts.map((line) => `- ${line}`),
    "",
    `> 日期键：${date}`,
    ""
  ].join("\n");
}

function renderEveningReview(candidate: ThemeCandidate, date: string): string {
  const title = titleFor("evening", candidate);
  const blueprint = candidate.blueprint;
  const excerpts = buildExcerpts(candidate.items, 4);
  const settled = buildSettledJudgment(candidate);
  const unresolved = buildUnresolvedQuestion(candidate);
  const questions = blueprint?.eveningQuestions || [
    "今天留下来的判断里，哪一条值得升级成长期原则？",
    "哪些动作看起来热闹，但其实没有提高最终作品质量？"
  ];

  return [
    `# ${title}`,
    "",
    `> 生成时间：${formatLocalDateTime(new Date())} (${timezoneLabel()})`,
    "",
    `${blueprint?.thesis || `${candidate.label} 并没有在今天结束，但它已经给出了足够清楚的方向。`}`,
    "",
    `${settled}`,
    "",
    `${blueprint?.antiPattern || "今晚更值得留下的，不是更多条目，而是一个能减少明天噪音的判断。"}`
    ,
    "",
    "## 今晚真正值得留下来的判断",
    `- ${blueprint?.knowledgeJudgment || `${candidate.label} 已经值得被看作一条长期主线，而不是临时收集。`}`,
    `- ${blueprint?.knowledgeImplication || "后续系统设计应该优先服务这条主线，而不是继续扩张流程和栏目。"}`
    ,
    "",
    "## 今天沉下来的证据",
    ...excerpts.map((line) => `- ${line}`),
    "",
    "## 明天继续之前，先记住这两件事",
    `- ${unresolved}`,
    ...questions.map((line) => `- ${line}`),
    "",
    `> 日期键：${date}`,
    ""
  ].join("\n");
}

function renderKnowledgeNote(candidate: ThemeCandidate, date: string): string {
  const title = titleFor("knowledge", candidate);
  const blueprint = candidate.blueprint;
  const readingMap = buildReadingMap(candidate.items, 4);
  const excerpts = buildExcerpts(candidate.items, 4);
  const principles = blueprint?.knowledgeRules || [
    "优先沉淀能持续改善判断质量的原则。",
    "减少暴露给用户的中间结构，只保留成品输出。",
    "让系统服务阅读体验，而不是让阅读体验适配系统结构。"
  ];

  return [
    `# ${title}`,
    "",
    `> 生成时间：${formatLocalDateTime(new Date())} (${timezoneLabel()})`,
    "",
    `${blueprint?.knowledgeJudgment || `${candidate.label} 已经不适合作为临时想法堆放，它更适合被写成一条长期原则。`}`,
    "",
    `${blueprint?.thesis || `${candidate.label} 的核心价值，不在于把信息收得更齐，而在于把判断写得更稳。`}`,
    "",
    `${blueprint?.knowledgeImplication || "因此，后续相关改动都应该优先服务最终成品质量，而不是继续制造中间结构。"}`
    ,
    "",
    "## 这件事为什么会反复出现",
    `${blueprint?.whyNow || `${candidate.label} 反复出现，说明它已经不是一条偶然线索，而是你当前系统里真正的矛盾所在。`}`,
    "",
    "## 代表材料",
    ...readingMap.map((line) => `- ${line}`),
    "",
    "## 应该保留的设计原则",
    ...principles.map((line) => `- ${line}`),
    "",
    "## 暂时不要做什么",
    `- ${blueprint?.antiPattern || "不要为了管理方便而牺牲最终阅读体验。"}`
    ,
    "",
    "## 支撑这条判断的现场证据",
    ...excerpts.map((line) => `- ${line}`),
    "",
    `> 日期键：${date}`,
    ""
  ].join("\n");
}

function titleFor(kind: EditorialArtifactKind, candidate: ThemeCandidate): string {
  if (candidate.blueprint) {
    if (kind === "morning") {
      return candidate.blueprint.morningTitle;
    }

    if (kind === "evening") {
      return candidate.blueprint.eveningTitle;
    }

    return candidate.blueprint.knowledgeTitle;
  }

  if (kind === "morning") {
    return `今天最值得投入的主题：${candidate.label}`;
  }

  if (kind === "evening") {
    return `今晚该留下来的主线：${candidate.label}`;
  }

  return `${candidate.label}：一条值得长期保留的判断`;
}

function buildSourceNarrative(items: Item[]): string {
  const picked = items.slice(0, 3).map(displayTitle);
  if (!picked.length) {
    return "今天可用的材料还不多，但已经足够形成第一轮判断。";
  }

  if (picked.length === 1) {
    return `这条判断目前主要由「${picked[0]}」带出来，但它已经足够说明问题开始聚焦。`;
  }

  return `这次最值得读的，不是一条孤立材料，而是「${picked[0]}」「${picked[1]}」${picked[2] ? `以及「${picked[2]}」` : ""} 之间开始互相指向同一个问题。`;
}

function buildReadingMap(items: Item[], maxItems: number): string[] {
  return items.slice(0, maxItems).map((item) => {
    const title = displayTitle(item);
    const sentence = extractKeySentence(item);
    return `先看「${title}」：${sentence}`;
  });
}

function buildExcerpts(items: Item[], maxItems: number): string[] {
  return items.slice(0, maxItems).map((item) => {
    const title = displayTitle(item);
    return `「${title}」里最值得记住的一句是：${extractKeySentence(item)}`;
  });
}

function buildSettledJudgment(candidate: ThemeCandidate): string {
  const topTitles = candidate.items.slice(0, 2).map((item) => item.title || item.summary || item.id);
  if (topTitles.length >= 2) {
    return `如果把今天最有价值的收获说得更直接一点，那就是：${candidate.label} 不再只是${topTitles[0]}和${topTitles[1]}这种看起来彼此分散的材料，它们其实已经共同暴露出同一个系统性问题。`;
  }

  return `${candidate.label} 今天已经从一条零散线索，变成了一条可以继续写成长期判断的主线。`;
}

function buildUnresolvedQuestion(candidate: ThemeCandidate): string {
  if (candidate.blueprint?.actionShift) {
    return candidate.blueprint.actionShift;
  }

  return `${candidate.label} 还没有最终定型，但已经足够提醒你：下次继续时先收束方向，再扩展材料。`;
}

function extractKeySentence(item: Item): string {
  const title = displayTitle(item);
  const sentences = splitSentences(item.raw_content)
    .map((entry) => normalizeContent(toPlainText(entry)))
    .filter(Boolean)
    .filter((entry) => entry !== title)
    .filter((entry) => !/^来源[:：]/.test(entry))
    .filter((entry) => !/^时间[:：]/.test(entry))
    .filter((entry) => !/^目的[:：]/.test(entry))
    .filter((entry) => !/^用户问题[:：]/.test(entry))
    .sort((left, right) => sentenceScore(right) - sentenceScore(left));

  const selected = sentences.find((entry) => entry.length >= 20) || sentences[0] || title;
  return compactSentence(selected, 110);
}

function splitSentences(value: string): string[] {
  return value
    .replace(/\r/g, "\n")
    .split(/(?<=[。！？!?;；])\s+|\n+/)
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function sentenceScore(value: string): number {
  let score = 0;
  if (/结论|核心|关键|真正|不是|应该|值得|瓶颈|边界|判断|工作方式|系统|产品|沉淀|输出/i.test(value)) {
    score += 4;
  }

  if (/^-/.test(value) || /^\d+\./.test(value)) {
    score += 1;
  }

  if (value.length >= 28 && value.length <= 110) {
    score += 2;
  }

  return score;
}

function compactSentence(value: string, maxLength: number): string {
  const normalized = normalizeContent(value);
  if (normalized.length <= maxLength) {
    return normalized;
  }

  return `${normalized.slice(0, Math.max(0, maxLength - 1)).trimEnd()}…`;
}

function topicLabel(topic: string): string {
  const labels: Record<string, string> = {
    ai: "AI 观察",
    engineering: "工程实践",
    video: "视频线索",
    general: "近期主题"
  };

  return labels[topic] || topic;
}

function displayTitle(item: Item): string {
  const rawTitle = normalizeContent(item.title || item.summary || "");
  if (rawTitle && rawTitle.toLowerCase() !== "inbox" && rawTitle !== "iNBox") {
    return rawTitle;
  }

  const derived = splitSentences(item.raw_content)
    .map((entry) => normalizeContent(toPlainText(entry)))
    .find((entry) => entry.length >= 12);

  if (derived) {
    return compactSentence(derived, 42);
  }

  return item.id;
}

function extractThemeFromTitles(items: Item[]): string {
  const counts = new Map<string, number>();

  for (const item of items) {
    const text = `${item.title || ""} ${item.summary || ""}`;
    for (const token of tokenizeThemeWords(text)) {
      counts.set(token, (counts.get(token) || 0) + 1);
    }
  }

  const [top] = Array.from(counts.entries()).sort((left, right) => right[1] - left[1]);
  return top ? `${top}相关主题` : "近期主题";
}

function tokenizeThemeWords(value: string): string[] {
  const normalized = value.replace(/[|｜/]/g, " ");
  const rawTokens = normalized.match(/[\p{Script=Han}]{2,8}|[a-zA-Z][a-zA-Z0-9_-]{2,20}/gu) || [];

  return rawTokens
    .map((entry) => entry.trim())
    .filter(Boolean)
    .filter((entry) => !CHINESE_STOPWORDS.includes(entry))
    .filter((entry) => entry.toLowerCase() !== "item");
}
