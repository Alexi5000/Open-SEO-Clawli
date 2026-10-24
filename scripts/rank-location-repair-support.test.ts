import {
  mkdtempSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchRegistry } from "./rank-location-repair-support";

describe("registry cache file boundaries", () => {
  const directories: string[] = [];
  afterEach(() => {
    vi.unstubAllGlobals();
    for (const directory of directories.splice(0))
      rmSync(directory, { recursive: true, force: true });
  });
  it("reads an ordinary cache without a provider request", async () => {
    const directory = mkdtempSync(join(tmpdir(), "registry-test-"));
    directories.push(directory);
    const records = [
      { locationCode: 1, locationName: "Example", locationType: "Country" },
    ];
    writeFileSync(
      join(directory, "serp-locations-US.json"),
      JSON.stringify(records),
    );
    const fetcher = vi.fn();
    vi.stubGlobal("fetch", fetcher);
    expect(await fetchRegistry("US", directory)).toEqual(records);
    expect(fetcher).not.toHaveBeenCalled();
  });
  it("rejects symlink caches and traversal country codes", async () => {
    const directory = mkdtempSync(join(tmpdir(), "registry-test-"));
    directories.push(directory);
    const target = join(directory, "protected");
    writeFileSync(target, "private");
    symlinkSync(target, join(directory, "serp-locations-US.json"));
    await expect(fetchRegistry("US", directory)).rejects.toThrow();
    await expect(fetchRegistry("../protected", directory)).rejects.toThrow(
      "Invalid country code",
    );
    expect(readFileSync(target, "utf8")).toBe("private");
  });
});
