import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { parsePageContent, readPages, readSite } from "@/server/lib/scrape";

vi.mock("@/server/lib/runtime-env", () => ({
  getOptionalEnvValue: async (name: string) =>
    name === "CONTEXT_API_KEY" ? "context-test-key" : undefined,
}));

describe("readSite SSRF guard", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it.each(["169.254.169.254", "localhost:3000"])(
    "blocks %s without fetching it",
    async (host) => {
      const result = await readSite(host);

      expect(result.blocked).toBe(true);
      expect(result.pages).toEqual([]);
      // The blocked host must be rejected before any outbound page fetch.
      expect(fetch).not.toHaveBeenCalled();
    },
  );
});

describe("readPages SSRF guard", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("skips private/metadata URLs without fetching them", async () => {
    const result = await readPages([
      "http://169.254.169.254/latest/meta-data/",
      "http://localhost:3000/admin",
    ]);

    expect(result.blocked).toBe(true);
    expect(result.pages).toEqual([]);
    // Every URL is validated before any outbound fetch.
    expect(fetch).not.toHaveBeenCalled();
  });
});

describe("readSite", () => {
  // Unlisted URLs (sitemaps, DoH lookups) 404; a missing route value throws
  // like a failed TLS handshake.
  function stubSite(routes: Record<string, string | null>) {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => {
        if (!(url in routes)) return new Response(null, { status: 404 });
        const target = routes[url];
        if (target === null) throw new TypeError("fetch failed");
        return target.startsWith("http")
          ? new Response(null, { status: 302, headers: { location: target } })
          : new Response(target);
      }),
    );
  }

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("follows a multi-hop redirect chain to the homepage", async () => {
    stubSite({
      "https://example.com/": "http://www.example.com/",
      "http://www.example.com/": "https://www.example.com/",
      "https://www.example.com/": "Example homepage",
    });

    const result = await readSite("example.com");

    expect(result.pages.map((page) => page.text)).toEqual(["Example homepage"]);
  });

  it("falls back to www when the bare domain can't be read", async () => {
    stubSite({
      "https://example.com/": null,
      "https://www.example.com/": "Example homepage",
    });

    const result = await readSite("example.com");

    expect(result.pages.map((page) => page.url)).toEqual([
      "https://www.example.com/",
    ]);
  });

  it("does not retry an unreadable IP address on www", async () => {
    stubSite({ "https://93.184.216.34/": null });

    const result = await readSite("93.184.216.34");

    expect(result.blocked).toBe(true);
  });
});

describe("readSite with Context usage", () => {
  // The homepage is blocked, /internal redirects to a private host, and other
  // URLs are missing; Context renders pages.
  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: string | URL) => {
        const url = String(input);
        if (url.includes("dns-query"))
          return Response.json({
            Status: 0,
            Answer: [{ type: 1, data: "93.184.216.34" }],
          });
        if (url.startsWith("https://api.context.dev/"))
          return Response.json({
            success: true,
            type: "html",
            html: "<title>Store</title><p>Linen sheets</p>",
            metadata: { finalUrl: "https://store.example.com/" },
            finalDOMState: "loaded",
            key_metadata: { credits_consumed: 1 },
          });
        if (url === "https://store.example.com/")
          return new Response(null, { status: 403 });
        if (url === "https://store.example.com/internal")
          return new Response(null, {
            status: 302,
            headers: { location: "http://169.254.169.254/" },
          });
        return new Response(null, { status: 404 });
      }),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("reads a blocked page through Context and counts its credit", async () => {
    const usage = { cloudflareAttempts: 0, contextCredits: 0 };

    const result = await readSite("store.example.com", 3, usage);

    expect(result.pages).toEqual([
      {
        url: "https://store.example.com/",
        title: "Store",
        text: "Linen sheets",
      },
    ]);
    expect(usage.contextCredits).toBe(1);
  });

  it("does not spend Context credits on a missing page", async () => {
    const usage = { cloudflareAttempts: 0, contextCredits: 0 };

    await readPages(["https://store.example.com/missing"], 1, usage);

    expect(usage.contextCredits).toBe(0);
  });

  it("cancels redirect bodies and never delegates exhausted chains", async () => {
    const cancels: ReturnType<typeof vi.fn>[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: string | URL) => {
        const url = String(input);
        if (url.includes("dns-query"))
          return Response.json({
            Status: 0,
            Answer: [{ type: 1, data: "93.184.216.34" }],
          });
        const cancel = vi.fn();
        cancels.push(cancel);
        return new Response(new ReadableStream({ cancel }), {
          status: 302,
          headers: { location: "/loop" },
        });
      }),
    );
    const usage = { cloudflareAttempts: 0, contextCredits: 0 };
    const result = await readPages(
      ["https://store.example.com/loop"],
      1,
      usage,
    );
    expect(result.pages).toEqual([]);
    expect(cancels).toHaveLength(4);
    for (const cancel of cancels) expect(cancel).toHaveBeenCalledOnce();
    expect(
      vi
        .mocked(fetch)
        .mock.calls.some(([url]) =>
          (url instanceof Request ? url.url : String(url)).includes(
            "api.context.dev",
          ),
        ),
    ).toBe(false);
  });

  it("does not send a redirect to a blocked host to Context", async () => {
    const usage = { cloudflareAttempts: 0, contextCredits: 0 };

    await readPages(["https://store.example.com/internal"], 1, usage);

    expect(usage.contextCredits).toBe(0);
  });
});

describe("HTML content extraction", () => {
  it("parses malformed script closing tags and keeps paragraph boundaries", async () => {
    const result = await parsePageContent(
      "<title>A &amp; B</title><p>First</p><script>secret()</script > <p>Second</p>",
    );
    expect(result).toEqual({ title: "A & B", text: "First Second" });
  });

  it("decodes entities once and omits non-content blocks", async () => {
    const result = await parsePageContent(
      "<p>&amp;lt;literal&amp;gt; &#65; &copy;</p><style>hidden</style><template>hidden</template>",
    );
    expect(result.text).toBe("&lt;literal&gt; A ©");
  });
});
