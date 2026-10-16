import { z } from "zod";
import { createRequire } from "node:module";
import { expect, it } from "vitest";

const requirePackage = createRequire(import.meta.url);

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
