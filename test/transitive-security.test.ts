import { z } from "zod";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { describe, expect, it } from "vitest";

const requirePackage = createRequire(import.meta.url);

const requireRouter = createRequire(requirePackage.resolve("expo-router"));

const requireQuery = createRequire(requireRouter.resolve("query-string"));

type QueryModule = {
  parse(input: string): Record<string, string | string[] | null>;
  stringify(input: Record<string, string | string[]>): string;
};

function isQueryModule(value: unknown): value is QueryModule {
  return (
    typeof value === "object" &&
    value !== null &&
    "parse" in value &&
    typeof value.parse === "function" &&
    "stringify" in value &&
    typeof value.stringify === "function"
  );
}

const query = requireRouter("query-string");

if (!isQueryModule(query))
  throw new Error("Installed query-string does not expose its expected public API");

describe("patched query-string decoder", () => {
  it("loads the patched decoder and decodes Unicode and repeated parameters", () => {
    const decoderPackage = z
      .object({ version: z.string() })
      .parse(
        JSON.parse(
          readFileSync(
            join(dirname(requireQuery.resolve("decode-uri-component")), "package.json"),
            "utf8",
          ),
        ),
      );

    expect(decoderPackage.version).toBe("0.5.0");
    expect(query.parse("name=caf%C3%A9&emoji=%F0%9F%8D%8E&item=milk&item=bread")).toMatchObject({
      name: "café",
      emoji: "🍎",
      item: ["milk", "bread"],
    });
  });

  it("preserves query-string round trips", () => {
    const input = { query: "milk & café", tag: ["fresh fruit", "dairy"] };
    expect(query.parse(query.stringify(input))).toMatchObject(input);
  });

  it("handles long malformed percent-encoded input", () => {
    const malformed = "%E0%A4%A".repeat(1000);
    expect(query.parse(`value=${malformed}`).value).toBeTypeOf("string");
  });
});

it("keeps Xcode project identifiers compatible with the patched UUID library", () => {
  const requireExpo = createRequire(requirePackage.resolve("expo"));
  const requirePlugins = createRequire(requireExpo.resolve("@expo/config-plugins"));
  const requireXcode = createRequire(requirePlugins.resolve("xcode"));
  expect(z.object({ version: z.string() }).parse(requireXcode("uuid/package.json")).version).toBe(
    "11.1.1",
  );

  const xcode = requirePlugins("xcode");

  if (!isXcodeModule(xcode)) throw new Error("Installed xcode project factory is unavailable");

  const project = xcode.project("unused-test-project.pbxproj");
  project.hash = { project: { objects: {} } };
  const ids = Array.from({ length: 100 }, () => project.generateUuid());
  expect(new Set(ids).size).toBe(ids.length);

  for (const id of ids) expect(id).toMatch(/^[A-F\d]{24}$/);
});

type XcodeProject = {
  hash: { project: { objects: Record<string, never> } };
  generateUuid(): string;
};

type XcodeModule = { project(path: string): XcodeProject };

function isXcodeModule(value: unknown): value is XcodeModule {
  return (
    typeof value === "object" &&
    value !== null &&
    "project" in value &&
    typeof value.project === "function"
  );
}
