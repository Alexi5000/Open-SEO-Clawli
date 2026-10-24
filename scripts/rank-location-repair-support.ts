/**
 * DataForSEO access for the rank-location repair: the free per-country
 * location registry (cached on disk) and the sandbox probe that tells us
 * whether a location_name will be accepted by the live SERP endpoints.
 */
import {
  closeSync,
  constants,
  fstatSync,
  mkdirSync,
  openSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";
import { z } from "zod";
import { probeSerpLocation } from "@/server/lib/dataforseo/serp-location-validate";
import { requiredEnv } from "./cli-utils";
import type { SerpRegistryLocation } from "./serp-location-match";

const registryItemSchema = z.object({
  location_code: z.number(),
  location_name: z.string(),
  location_type: z.string().nullable().optional(),
});

const registryResponseSchema = z.object({
  tasks: z.array(
    z.object({
      status_code: z.number(),
      status_message: z.string().optional(),
      result: z.array(z.unknown()).nullable().optional(),
    }),
  ),
});

export async function fetchRegistry(
  iso: string,
  cacheDir: string,
): Promise<SerpRegistryLocation[]> {
  if (!/^[a-z]{2}$/i.test(iso)) throw new Error("Invalid country code");
  mkdirSync(cacheDir, { recursive: true, mode: 0o700 });
  const cachePath = join(cacheDir, `serp-locations-${iso}.json`);
  let descriptor: number | undefined;
  try {
    descriptor = openSync(
      cachePath,
      constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK,
    );
    const stat = fstatSync(descriptor);
    if (!stat.isFile() || stat.size > 10 * 1024 * 1024)
      throw new Error("Invalid registry cache");
    return JSON.parse(
      readFileSync(descriptor, "utf8"),
    ) as SerpRegistryLocation[];
  } catch (error) {
    if (!(error instanceof Error && "code" in error && error.code === "ENOENT"))
      throw error;
  } finally {
    if (descriptor !== undefined) closeSync(descriptor);
  }
  const response = await fetch(
    `https://api.dataforseo.com/v3/serp/google/locations/${encodeURIComponent(iso)}`,
    {
      headers: { Authorization: `Basic ${requiredEnv("DATAFORSEO_API_KEY")}` },
    },
  );
  if (!response.ok) {
    throw new Error(`locations/${iso}: HTTP ${response.status}`);
  }
  const parsed = registryResponseSchema.parse(await response.json());
  const task = parsed.tasks[0];
  if (!task || task.status_code !== 20000) {
    throw new Error(
      `locations/${iso}: ${task?.status_code} ${task?.status_message ?? ""}`,
    );
  }
  const registry = (task.result ?? [])
    .map((item) => registryItemSchema.safeParse(item))
    .flatMap((item) => (item.success ? [item.data] : []))
    .map((item) => ({
      locationCode: item.location_code,
      locationName: item.location_name,
      locationType: item.location_type ?? "",
    }));
  let output: number | undefined;
  try {
    output = openSync(
      cachePath,
      constants.O_WRONLY |
        constants.O_CREAT |
        constants.O_EXCL |
        constants.O_NOFOLLOW,
      0o600,
    );
    writeFileSync(output, JSON.stringify(registry));
  } catch (error) {
    if (!(error instanceof Error && "code" in error && error.code === "EEXIST"))
      throw error;
  } finally {
    if (output !== undefined) closeSync(output);
  }
  return registry;
}

/**
 * Ask the sandbox whether a location_name is accepted. The host is slow to
 * accept connections at times, so transport failures retry a few times
 * before giving up on the whole run.
 */
export async function sandboxAccepts(
  locationName: string,
  languageCode: string,
): Promise<{ ok: boolean; message: string }> {
  for (let attempt = 1; ; attempt++) {
    try {
      const task = await probeSerpLocation(locationName, languageCode, {
        signal: AbortSignal.timeout(30_000),
      });
      return { ok: task.status_code === 20000, message: task.status_message };
    } catch (error) {
      if (attempt >= 4) throw error;
      await new Promise((resolve) => setTimeout(resolve, 2000 * attempt));
    }
  }
}
