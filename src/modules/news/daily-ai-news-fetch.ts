export async function fetchNewsText(url: string): Promise<string> {
  const response = await fetch(url, {
    headers: {
      "User-Agent": "LouisClaw/0.1 (+https://openclaw.ai)",
      Accept: "text/html,application/xhtml+xml,application/xml,text/xml,application/rss+xml,application/atom+xml;q=0.9,*/*;q=0.8"
    },
    redirect: "follow"
  });

  if (!response.ok) {
    throw new Error(`Fetch failed: ${response.status} ${response.statusText} (${url})`);
  }

  return response.text();
}
