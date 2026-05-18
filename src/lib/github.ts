const GITHUB_HOSTNAMES = new Set(["github.com", "www.github.com"]);

export function parseGitHubRepositoryUrl(value: string) {
  const trimmed = value.trim();

  if (!trimmed) {
    return null;
  }

  try {
    const url = new URL(trimmed);

    if (!GITHUB_HOSTNAMES.has(url.hostname)) {
      return null;
    }

    const [owner, repoSegment] = url.pathname.split("/").filter(Boolean);

    if (!owner || !repoSegment) {
      return null;
    }

    const repo = repoSegment.replace(/\.git$/iu, "").trim();

    if (!repo) {
      return null;
    }

    return {
      owner,
      repo,
    };
  } catch {
    return null;
  }
}

export function sanitizeGitHubRepoName(value: string) {
  const sanitized = value
    .trim()
    .replace(/[^A-Za-z0-9._-]+/gu, "-")
    .replace(/-{2,}/gu, "-")
    .replace(/^[-_.]+|[-_.]+$/gu, "");

  return sanitized || "polaris-export";
}
