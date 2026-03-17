export type NewsRegion = "CN" | "US";
export type NewsSourceTier = "official" | "major_media";

export interface TrustedNewsSource {
  host: string;
  label: string;
  region: NewsRegion;
  tier: NewsSourceTier;
  entryUrl?: string;
  rssUrl?: string;
}

const TRUSTED_NEWS_SOURCES: TrustedNewsSource[] = [
  {
    host: "openai.com",
    label: "OpenAI",
    region: "US",
    tier: "official",
    entryUrl: "https://openai.com/news/",
    rssUrl: "https://openai.com/news/rss.xml"
  },
  {
    host: "anthropic.com",
    label: "Anthropic",
    region: "US",
    tier: "official",
    entryUrl: "https://www.anthropic.com/news"
  },
  {
    host: "blog.google",
    label: "Google Blog",
    region: "US",
    tier: "official",
    entryUrl: "https://blog.google/technology/ai/",
    rssUrl: "https://blog.google/technology/ai/rss/"
  },
  {
    host: "deepmind.google",
    label: "Google DeepMind",
    region: "US",
    tier: "official",
    entryUrl: "https://deepmind.google/discover/blog/"
  },
  {
    host: "news.microsoft.com",
    label: "Microsoft News",
    region: "US",
    tier: "official",
    entryUrl: "https://news.microsoft.com/source/topics/ai/"
  },
  {
    host: "nvidia.com",
    label: "NVIDIA",
    region: "US",
    tier: "official",
    entryUrl: "https://nvidianews.nvidia.com/news?c=244315"
  },
  {
    host: "reuters.com",
    label: "Reuters",
    region: "US",
    tier: "major_media",
    entryUrl: "https://www.reuters.com/technology/artificial-intelligence/"
  },
  {
    host: "apnews.com",
    label: "AP",
    region: "US",
    tier: "major_media",
    entryUrl: "https://apnews.com/hub/artificial-intelligence"
  },
  {
    host: "bloomberg.com",
    label: "Bloomberg",
    region: "US",
    tier: "major_media",
    entryUrl: "https://www.bloomberg.com/ai"
  },
  {
    host: "ft.com",
    label: "FT",
    region: "US",
    tier: "major_media",
    entryUrl: "https://www.ft.com/artificial-intelligence"
  },
  {
    host: "techcrunch.com",
    label: "TechCrunch",
    region: "US",
    tier: "major_media",
    entryUrl: "https://techcrunch.com/category/artificial-intelligence/",
    rssUrl: "https://techcrunch.com/category/artificial-intelligence/feed/"
  },

  {
    host: "36kr.com",
    label: "36氪",
    region: "CN",
    tier: "major_media",
    entryUrl: "https://www.36kr.com/information/AI"
  },
  {
    host: "cls.cn",
    label: "财联社",
    region: "CN",
    tier: "major_media",
    entryUrl: "https://www.cls.cn/searchPage?keyword=AI"
  },
  {
    host: "yicai.com",
    label: "第一财经",
    region: "CN",
    tier: "major_media",
    entryUrl: "https://www.yicai.com/search?k=AI"
  }
];

export function listTrustedNewsSources(): TrustedNewsSource[] {
  return [...TRUSTED_NEWS_SOURCES];
}

export function listTrustedNewsCollectionEntries(): TrustedNewsSource[] {
  return TRUSTED_NEWS_SOURCES.filter((entry) => entry.entryUrl || entry.rssUrl);
}

export function findTrustedNewsSource(url: string): TrustedNewsSource | undefined {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.replace(/^www\./, "").toLowerCase();
    return TRUSTED_NEWS_SOURCES.find((entry) => host === entry.host || host.endsWith(`.${entry.host}`));
  } catch {
    return undefined;
  }
}

export function isTrustedNewsUrl(url: string): boolean {
  return Boolean(findTrustedNewsSource(url));
}

export function renderTrustedNewsPolicyMarkdown(): string {
  const grouped = groupByRegionAndTier();

  return [
    "## Trusted Source Allowlist",
    "",
    "### US · official",
    ...grouped.US.official.map(renderSourceLine),
    "",
    "### US · major_media",
    ...grouped.US.major_media.map(renderSourceLine),
    "",
    "### CN · major_media",
    ...grouped.CN.major_media.map(renderSourceLine),
    ""
  ].join("\n");
}

function renderSourceLine(entry: TrustedNewsSource): string {
  const entryLine = entry.entryUrl ? `｜entry: ${entry.entryUrl}` : "";
  const rssLine = entry.rssUrl ? `｜rss: ${entry.rssUrl}` : "";
  return `- ${entry.label}｜${entry.host}${entryLine}${rssLine}`;
}

function groupByRegionAndTier(): Record<NewsRegion, Record<NewsSourceTier, TrustedNewsSource[]>> {
  return TRUSTED_NEWS_SOURCES.reduce<Record<NewsRegion, Record<NewsSourceTier, TrustedNewsSource[]>>>((accumulator, entry) => {
    accumulator[entry.region][entry.tier].push(entry);
    return accumulator;
  }, {
    CN: { official: [], major_media: [] },
    US: { official: [], major_media: [] }
  });
}
