# Open-SEO-Clawli

> Fork of [OpenSEO](https://github.com/every-app/open-seo) maintained for [Clawli.ai](https://clawli.ai)

## Why this fork exists

**What it does.** Open-SEO-Clawli is a fork of OpenSEO, an open source SEO tool (keyword research, rank tracking, competitor insights, backlinks, site audits, AI visibility) that runs on Cloudflare Workers or in Docker, fetches data from DataForSEO with your own API key, and exposes an MCP server so agents such as Claude Code can use the SEO data directly. The fork carries the upstream product plus TechTide maintenance commits: dependency and build hardening, a scraper fix, a private security-reporting policy, and a vendored patched `braces` build.

**Who it serves.** TechTide AI operators who self-host OpenSEO for Clawli.ai and LinkedIn content work, and anyone who wants upstream OpenSEO together with the security patches listed under [Upstream](#upstream) and [Security](#security) without waiting for an upstream release.

**Why Alex forked it.** Alex Cinovoj, Founder & CTO of TechTide AI, forked [every-app/open-seo](https://github.com/every-app/open-seo) on 2026-07-20 (GitHub API `created_at`). The first fork-only commit (`a28af1f8`, 2026-07-20: "docs: add Clawli.ai fork purpose and upstream credit") records the purpose: the fork is used for the Clawli.ai project, a LinkedIn CRM dashboard, and LinkedIn SEO workflows, and may diverge from upstream as OpenSEO is adapted for those uses. Two unmerged branches from the same week show the direction: `feat/mcp-rank-tracking-write` (`b2f97a39`, 2026-07-23: "feat(mcp): add/remove rank tracking keywords") lets an agent manage rank-tracking keywords through the MCP, and `fix/rank-tracking-empty-check-now` (`f3683ba7`, 2026-07-23) adds a Check Now button to the empty rank-tracking state. The 2026-10-18 to 2026-10-20 commits (#1 to #5) are maintenance: dependency graph updates, explicit source-map upload configuration, patched esbuild, HTML scraping fix, and a private vulnerability-reporting policy.

**Real-world use case (2025-2026 evidence).** **Proposed use case.** A TechTide operator self-hosts this fork on Cloudflare Workers with their own DataForSEO key, connects Claude Code to the fork's MCP server, and asks the agent to add the Clawli.ai landing pages' target keywords to rank tracking and report weekly position changes next to competitor pages. Upstream OpenSEO is actively released (v0.1.14 on 2026-10-19)[^1]; the MCP server implements the Model Context Protocol, whose current specification revision is dated 2025-11-25[^2]; and the Cloudflare Workers runtime the app deploys to publishes changelog entries through 2026-09-28[^3]. The repository has upstream unit tests and CI builds, but no deployment configuration, fixtures, or logs that show this fork running in production, so the scenario remains proposed.

## Upstream

| Item                        | Value                                                                                                                                                                                                            |
| --------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Upstream                    | [every-app/open-seo](https://github.com/every-app/open-seo) (OpenSEO) by [every-app](https://github.com/every-app) / [Ben Senescu](https://x.com/bensenescu); hosted product at [openseo.so](https://openseo.so) |
| Upstream license            | MIT, Copyright (c) 2026 Ben Senescu. [`LICENSE`](./LICENSE) is unchanged and this fork is not relicensed.                                                                                                        |
| Fork created                | 2026-07-20 (GitHub API `created_at`)                                                                                                                                                                             |
| Position vs upstream `main` | 7 commits ahead, 433 commits behind as of 2026-10-21 (`gh api repos/Alexi5000/Open-SEO-Clawli/compare/every-app:main...Alexi5000:main`)                                                                          |

**What changed in this fork.** 7 fork-only commits touching 44 files (GitHub compare, 2026-10-21):

- `a28af1f8` (2026-07-20): README fork purpose and upstream credit.
- `8c981992` (2026-07-23): merge of upstream `main` into the fork.
- `79fcf97f` (2026-10-18, #1): application and documentation dependency graph updates (`package.json`, `pnpm-lock.yaml`, `web/`, `badseo/`), plus a vendored patched `braces` 3.0.3 under `vendor/braces` applied through a pnpm override and checked by `scripts/verify-braces.cjs` before every build.
- `7027cfbf` (2026-10-18, #2): the source-map upload workflow requires explicit PostHog configuration.
- `3a05bb36` (2026-10-18, #3): patched esbuild pinned across the application and landing builds.
- `bd3cdf3c` (2026-10-19, #4): scraped HTML parsed with an HTML parser instead of regular expressions; the release-notes script isolates its temporary files.
- `e8f870be` (2026-10-20, #5): `SECURITY.md` with private vulnerability reporting; a broken screenshot removed.

Thank you to the OpenSEO maintainers and contributors for releasing this as open source. For the original product, docs, and community, see [every-app/open-seo](https://github.com/every-app/open-seo) and [openseo.so](https://openseo.so).

---

# OpenSEO

> Open source alternative to Semrush and Ahrefs

OpenSEO is an SEO tool for _the people_. If tools like Semrush or Ahrefs are too expensive or bloated, OpenSEO is a pay-as-you-go alternative that you actually control.

> All-in-one SEO tool for you and your AI agent.

Connect with any agent like Claude Code, OpenClaw or Hermes. We have pre-built skills, but you can build your own to tailor OpenSEO to your needs.

## Hosted Version

Try OpenSEO for free on our website. If you want to support the project, a hosted subscription is $10/month.

[openseo.so](https://openseo.so)

## Why use OpenSEO?

- Best in class MCP and AI Skills.
- Modern, simple UI.
  - Focused workflows instead of a bloated, complex SEO suite.
- No subscriptions.
  - Bring your own DataForSEO API key and pay only for what you use.
- Fork and vibe code your own custom tool.

## Main SEO Workflows

- Keyword research
- Rank tracking
- Competitor Insights
- Backlinks
- Site Audits
- AI Visibility

## OpenSEO MCP & Agent Skills

OpenSEO exposes an MCP server so AI agents like Claude Code, OpenClaw, and Hermes can use your SEO data directly. Agent Skills are reusable workflows that guide your agent through SEO tasks using the MCP.

- [Set up OpenSEO MCP](https://openseo.so/docs/mcp)
- [Set up OpenSEO Agent Skills](https://openseo.so/docs/skills/setup)

## Self-Hosting

OpenSEO supports two self-hosting paths. Both use email and password accounts: the first visitor creates the admin account, teammates join from invitation links, and MCP clients (Claude, ChatGPT, Codex, Cursor) sign in with the same accounts.

- **Docker** - On your own server or computer, with a prebuilt image that is ready in seconds. Works with Compose-based platforms such as Coolify, Portainer and Dokploy. See [`docs/SELF_HOSTING_DOCKER.md`](./docs/SELF_HOSTING_DOCKER.md).
  - Running the older single-container image? It keeps getting updates; [move to the new setup](./docs/SELF_HOSTING_DOCKER.md#move-from-the-old-docker-image) when you are ready, data included.
- **Cloudflare** - No server to run: one deploy command puts OpenSEO on your own Cloudflare account (works on the free plan). See [`docs/SELF_HOSTING_CLOUDFLARE.md`](./docs/SELF_HOSTING_CLOUDFLARE.md).

For security-conscious setups, two advanced options replace the accounts with your own network controls:

- **Cloudflare Access** in front of the Cloudflare deploy, so Cloudflare checks every request before it reaches OpenSEO. See [`docs/SELF_HOSTING_CLOUDFLARE.md`](./docs/SELF_HOSTING_CLOUDFLARE.md).
- **No sign-in on Docker**, behind Tailscale, a private network or your own authenticating proxy. See [Without sign-in](./docs/SELF_HOSTING_DOCKER.md#without-sign-in-advanced).

Either way, you need a DataForSEO API key to get SEO data. See [`docs/DATAFORSEO_API_KEY.md`](./docs/DATAFORSEO_API_KEY.md).

## Costs

OpenSEO needs a [DataForSEO](https://dataforseo.com/?aff=255379) API key so that you can get SEO data. You pay them directly when self hosting.

See [openseo.so/pricing](https://openseo.so/pricing)

When you self host, your costs will be slightly lower than the estimates on our website. The way the hosted service makes money is by charging 28% extra for every request we make to DataForSEO.

## Local Development

See [`docs/LOCAL_DEVELOPMENT.md`](./docs/LOCAL_DEVELOPMENT.md).

## Contributing

Contributions are very welcome. See [`docs/CONTRIBUTING.md`](./docs/CONTRIBUTING.md).

## Community

Join Discord to chat: [Discord](https://discord.gg/c9uGs3cFXr)

Follow along for updates:

- Follow on X: https://x.com/bensenescu
- Sign up for the mailing list on our website: [openseo.so](https://openseo.so)

## Security

For suspected vulnerabilities in this fork, follow [SECURITY.md](SECURITY.md) and use the private GitHub reporting channel. Do not post credentials, customer data, or unresolved exploit details in public issues.

GitHub withdrew the `sprintf-js` advisory [GHSA-hp3w-g68c-fv3c](https://github.com/advisories/GHSA-hp3w-g68c-fv3c) on 2026-10-22 at 19:21:04 UTC because applications are responsible for handling exceptions appropriately.[^4] Dependabot alert #115 was classified as inaccurate on 2026-10-23 using that official withdrawal. This is an advisory classification, not a new dependency patch.

The existing runtime mitigation remains: `vite-plugin-lean-worker-bundle.ts` aliases `just-bash` to `src/server/lib/just-bash-stub.ts`, excluding `just-bash` and its `sprintf-js` dependency from the built worker. The dependency remains in the lockfile for the disabled workspace bash tool.

GitHub reports 0 open Dependabot alerts and 0 open code-scanning alerts as of 2026-10-23. These repository dashboard counts do not establish production security or complete vulnerability coverage.

[^1]: every-app/open-seo, release v0.1.14, published 2026-10-19. https://github.com/every-app/open-seo/releases/tag/v0.1.14

[^2]: Model Context Protocol, "Specification", revision 2025-11-25. https://modelcontextprotocol.io/specification/2025-11-25

[^3]: Cloudflare, "Workers Changelog", entries through 2026-09-28 (accessed 2026-10-21). https://developers.cloudflare.com/workers/platform/changelog/

[^4]: GitHub Advisory Database, GHSA-hp3w-g68c-fv3c, withdrawn 2026-10-22; verified 2026-10-23. https://github.com/advisories/GHSA-hp3w-g68c-fv3c
