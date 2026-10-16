import assert from "node:assert/strict";
import { describe, it } from "vitest";
import { getCopilotKitRuntimeBaseUrl } from "@/utils/agent-config-core";

describe("getCopilotKitRuntimeBaseUrl", () => {
  it("normalizes the configured runtime", () => {
    assert.equal(
      getCopilotKitRuntimeBaseUrl({}, "ios", {
        EXPO_PUBLIC_COPILOTKIT_RUNTIME_URL: "https://app.example.com/api/copilotkit/",
      }),
      "https://app.example.com/api/copilotkit",
    );
  });

  it("maps localhost to the Android emulator host", () => {
    assert.equal(
      getCopilotKitRuntimeBaseUrl({}, "android", {
        EXPO_PUBLIC_COPILOTKIT_RUNTIME_URL: "http://localhost:3000/api/copilotkit",
      }),
      "http://10.0.2.2:3000/api/copilotkit",
    );
  });
});
