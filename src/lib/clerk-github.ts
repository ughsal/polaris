import { clerkClient } from "@clerk/nextjs/server";

type GithubAccessState = {
  hasGithubAccount: boolean;
  githubToken: string | null;
  githubScopes: string[];
};

function isGithubProvider(provider: string) {
  return provider === "github" || provider === "oauth_github";
}

export async function getGithubAccessState(
  clerk: Awaited<ReturnType<typeof clerkClient>>,
  userId: string,
): Promise<GithubAccessState> {
  const [user, tokenResponse] = await Promise.all([
    clerk.users.getUser(userId),
    clerk.users.getUserOauthAccessToken(userId, "github"),
  ]);

  const githubAccount = user.externalAccounts.find(
    (account: { provider: string }) => isGithubProvider(account.provider),
  );
  const tokenEntry = tokenResponse.data.find(
    (entry: { provider?: string; token?: string | null; scopes?: string[] }) =>
      Boolean(entry.token) && (!entry.provider || isGithubProvider(entry.provider)),
  );

  return {
    hasGithubAccount: Boolean(githubAccount),
    githubToken: tokenEntry?.token ?? null,
    githubScopes: tokenEntry?.scopes ?? [],
  };
}

export function getGithubConnectionErrorMessage(state: GithubAccessState) {
  if (!state.hasGithubAccount) {
    return "GitHub not connected. Open your profile and connect GitHub again.";
  }

  if (!state.githubToken) {
    return "GitHub is linked, but Clerk did not return an access token. Reconnect GitHub and grant repository access.";
  }

  if (!state.githubScopes.includes("repo")) {
    return "GitHub is connected, but repository access was not granted. Reconnect GitHub and approve the repo scope.";
  }

  return null;
}
