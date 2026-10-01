import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { describe, expect, it } from "vitest";

const requirePackage = createRequire(import.meta.url);
const requireRouter = createRequire(requirePackage.resolve("expo-router"));
const requireQuery = createRequire(requireRouter.resolve("query-string"));
const query = requireRouter("query-string") as {
  parse(input: string): Record<string, string | string[] | null>;
  stringify(input: Record<string, string | string[]>): string;
};

describe("patched query-string decoder", () => {
  it("loads the patched decoder and decodes Unicode and repeated parameters", () => {
    const decoderPackage = JSON.parse(
      readFileSync(
        join(dirname(requireQuery.resolve("decode-uri-component")), "package.json"),
        "utf8",
      ),
    ) as { version: string };
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
  expect((requireXcode("uuid/package.json") as { version: string }).version).toBe("11.1.1");
  const xcode = requirePlugins("xcode") as {
    project(path: string): {
      hash: { project: { objects: Record<string, unknown> } };
      generateUuid(): string;
    };
  };
  const project = xcode.project("unused-test-project.pbxproj");
  project.hash = { project: { objects: {} } };
  const ids = Array.from({ length: 100 }, () => project.generateUuid());
  expect(new Set(ids).size).toBe(ids.length);
  for (const id of ids) expect(id).toMatch(/^[A-F\d]{24}$/);
});
