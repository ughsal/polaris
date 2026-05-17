import { firecrawl } from "@/lib/firecrawl";

const URL_REGEX = /https?:\/\/[^\s)]+/giu;
const MAX_URLS = 2;
const MAX_MARKDOWN_CHARS = 6000;
const SCRAPE_TIMEOUT_MS = 8000;

function withTimeout<T>(promise: Promise<T>, timeoutMs: number) {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  const timeoutPromise = new Promise<T>((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new Error("Firecrawl request timed out."));
    }, timeoutMs);
  });

  return Promise.race<T>([promise, timeoutPromise]).finally(() => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  });
}

export function extractUrls(text: string) {
  const uniqueUrls = new Set((text.match(URL_REGEX) ?? []).map(url => url.trim()));
  return [...uniqueUrls].slice(0, MAX_URLS);
}

async function scrapeUrl(url: string) {
  const result = await withTimeout(
    firecrawl.scrape(url, { formats: ["markdown"] }),
    SCRAPE_TIMEOUT_MS,
  );

  const markdown = typeof result.markdown === "string" ? result.markdown : "";
  return markdown.slice(0, MAX_MARKDOWN_CHARS);
}

export async function getFirecrawlContext(prompt: string) {
  const urls = extractUrls(prompt);

  if (!urls.length) {
    return {
      urls: [],
      context: "",
    };
  }

  if (!process.env.FIRECRAWL_API_KEY) {
    throw new Error("Firecrawl URL context is not configured.");
  }

  const results = await Promise.all(
    urls.map(async url => ({
      url,
      markdown: await scrapeUrl(url),
    })),
  );

  return {
    urls,
    context: results
      .filter(result => result.markdown)
      .map(result => `URL: ${result.url}\n${result.markdown}`)
      .join("\n\n"),
  };
}
