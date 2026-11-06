import { z } from "zod";
import assert from "node:assert/strict";
import { getConfig } from "expo/config";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, it, vi } from "vitest";

const projectDir = join(dirname(fileURLToPath(import.meta.url)), "..");

function readExpoConfig(extraEnv: Record<string, string>) {
  vi.stubEnv("EAS_BUILD_PLATFORM", "");

  for (const [key, value] of Object.entries(extraEnv)) vi.stubEnv(key, value);

  const { exp } = getConfig(projectDir);

  return z
    .object({
      extra: z
        .object({
          clerkPublishableKey: z.string().optional(),
          copilotKitRuntimeUrl: z.string().optional(),
        })
        .optional(),
      web: z.object({ output: z.string().optional() }).optional(),
    })
    .parse(exp);
}

afterEach(() => vi.unstubAllEnvs());

describe("Expo app config", () => {
  it("embeds Clerk and CopilotKit runtime values from EAS environment variables", () => {
    const config = readExpoConfig({
      EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY: "pk_test_eas",
      EXPO_PUBLIC_COPILOTKIT_RUNTIME_URL: "https://app.example.com/api/copilotkit",
    });

    assert.equal(config.extra?.clerkPublishableKey, "pk_test_eas");
    assert.equal(config.extra?.copilotKitRuntimeUrl, "https://app.example.com/api/copilotkit");
  });

  it("keeps server web output off Android EAS builds", () => {
    const androidConfig = readExpoConfig({ EAS_BUILD_PLATFORM: "android" });
    const webConfig = readExpoConfig({});

    assert.equal(androidConfig.web?.output, "static");
    assert.equal(webConfig.web?.output, "server");
  });
});
