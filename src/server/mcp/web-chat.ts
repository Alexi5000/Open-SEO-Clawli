import { safeHostname } from "@/shared/safe-url";

// The chat app on the web an agent runs in, if any. Client names are
// self-reported; the redirect address is where the authorization code goes.
// Agents on the user's computer redirect to localhost or an app scheme.
export function getWebChat(redirectUris: string[]) {
  const hosts = new Set(redirectUris.map(safeHostname));
  if (hosts.has("claude.ai")) return "claude" as const;
  if (hosts.has("chatgpt.com")) return "chatgpt" as const;
  return null;
}
