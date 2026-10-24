import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { discoverUrls } from "@/server/lib/audit/discovery";

const ORIGIN = "https://example.com";

function redirect(location: string, status = 302): Response {
  return new Response(null, { status, headers: { location } });
}

function sitemap(urls: string[]): Response {
  const body = `<?xml version="1.0"?><urlset>${urls
    .map((u) => `<url><loc>${u}</loc></url>`)
    .join("")}</urlset>`;
  return new Response(body, {
    status: 200,
    headers: { "content-type": "application/xml" },
  });
}

function toUrl(input: string | URL | Request): string {
  if (typeof input === "string") return input;
  if (input instanceof URL) return input.href;
  return input.url;
}

function requestedUrls(): string[] {
  return vi.mocked(fetch).mock.calls.map(([input]) => toUrl(input));
}

describe("discoverUrls redirect handling", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
    vi.spyOn(console, "warn").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("uses manual redirects for every discovery request", async () => {
    vi.mocked(fetch).mockImplementation(async (input) => {
      const url = toUrl(input);
      if (url.endsWith("/robots.txt")) {
        return new Response("User-agent: *\nAllow: /\n", { status: 200 });
      }
      return sitemap([`${ORIGIN}/a`]);
    });

    const result = await discoverUrls(ORIGIN);

    expect(result.urls).toEqual([`${ORIGIN}/a`]);
    for (const [, init] of vi.mocked(fetch).mock.calls) {
      expect(init?.redirect).toBe("manual");
    }
  });

  it("does not dispatch a robots.txt redirect to a blocked destination", async () => {
    vi.mocked(fetch).mockImplementation(async (input) => {
      const url = toUrl(input);
      if (url === `${ORIGIN}/robots.txt`) {
        return redirect("http://169.254.169.254/latest/meta-data/");
      }
      return new Response("not found", { status: 404 });
    });

    const result = await discoverUrls(ORIGIN);

    expect(result.robotsText).toBeNull();
    expect(requestedUrls().some((u) => u.includes("169.254.169.254"))).toBe(
      false,
    );
  });

  it("does not dispatch a sitemap redirect to a blocked destination", async () => {
    vi.mocked(fetch).mockImplementation(async (input) => {
      const url = toUrl(input);
      if (url === `${ORIGIN}/robots.txt`) {
        return new Response("", { status: 404 });
      }
      if (url === `${ORIGIN}/sitemap.xml`) {
        return redirect("http://localhost:8080/internal");
      }
      return sitemap([`${ORIGIN}/leak`]);
    });

    const result = await discoverUrls(ORIGIN);

    expect(result.urls).toEqual([]);
    expect(requestedUrls()).toEqual([
      `${ORIGIN}/robots.txt`,
      `${ORIGIN}/sitemap.xml`,
    ]);
  });

  it("rejects a blocked hop in the middle of a permitted redirect chain", async () => {
    vi.mocked(fetch).mockImplementation(async (input) => {
      const url = toUrl(input);
      if (url === `${ORIGIN}/robots.txt`) {
        return redirect("https://cdn.example.net/robots.txt");
      }
      if (url === "https://cdn.example.net/robots.txt") {
        return redirect("http://10.0.0.5/robots.txt");
      }
      return new Response("", { status: 404 });
    });

    const result = await discoverUrls(ORIGIN);

    expect(result.robotsText).toBeNull();
    expect(requestedUrls()).toContain("https://cdn.example.net/robots.txt");
    expect(requestedUrls().some((u) => u.includes("10.0.0.5"))).toBe(false);
  });

  it("follows permitted same-origin sitemap redirects", async () => {
    vi.mocked(fetch).mockImplementation(async (input) => {
      const url = toUrl(input);
      if (url === `${ORIGIN}/robots.txt`) {
        return new Response("", { status: 404 });
      }
      if (url === `${ORIGIN}/sitemap.xml`) {
        return redirect("/sitemap_index.xml", 301);
      }
      if (url === `${ORIGIN}/sitemap_index.xml`) {
        return sitemap([`${ORIGIN}/page`]);
      }
      return new Response("", { status: 404 });
    });

    const result = await discoverUrls(ORIGIN);

    expect(result.urls).toEqual([`${ORIGIN}/page`]);
  });

  it("stops after the maximum number of redirect hops", async () => {
    let hops = 0;
    vi.mocked(fetch).mockImplementation(async (input) => {
      const url = toUrl(input);
      if (url.includes("/robots")) {
        hops += 1;
        return redirect(`${ORIGIN}/robots-${hops}.txt`);
      }
      return new Response("", { status: 404 });
    });

    const result = await discoverUrls(ORIGIN);

    expect(result.robotsText).toBeNull();
    // initial request + 5 permitted redirect hops
    expect(hops).toBe(6);
  });
});
