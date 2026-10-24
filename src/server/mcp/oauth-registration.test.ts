import { describe, expect, it } from "vitest";
import { normalizeClientRegistrationRequest } from "@/server/mcp/oauth-registration";

describe("normalizeClientRegistrationRequest", () => {
  it.each([
    ["https://www.perplexity.ai/api/mcp/oauth/callback", "client_secret_post"],
    [
      "https://evil.test/https://www.perplexity.ai/api/mcp/oauth/callback",
      "none",
    ],
    ["https://www.perplexity.ai/api/mcp/oauth/callback.evil", "none"],
  ])("matches the exact callback %s", async (uri, method) => {
    const normalized = await normalizeClientRegistrationRequest(
      new Request("https://app.openseo.so/register", {
        method: "POST",
        body: JSON.stringify({ redirect_uris: [uri] }),
      }),
    );
    expect(await normalized.json()).toMatchObject({
      token_endpoint_auth_method: method,
    });
  });

  it("stops buffering an oversized registration stream", async () => {
    const body = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(new Uint8Array(1024 * 1024 + 1));
      },
    });
    const request = new Request("https://app.openseo.so/register", {
      method: "POST",
      body,
      duplex: "half",
    } as RequestInit);
    expect(await normalizeClientRegistrationRequest(request)).toBe(request);
    await request.body?.cancel();
  });

  it("keeps explicit confidential registration methods", async () => {
    const request = new Request(
      "https://app.openseo.so/api/auth/oauth2/register",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          redirect_uris: ["https://www.perplexity.ai/api/mcp/oauth/callback"],
          token_endpoint_auth_method: "client_secret_post",
        }),
      },
    );

    const normalized = await normalizeClientRegistrationRequest(request);

    await expect(normalized.json()).resolves.toMatchObject({
      token_endpoint_auth_method: "client_secret_post",
    });
  });
});
