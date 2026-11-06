import type { E2EConfig } from "e2e";
import { mobile } from "@e2e-dev/mobile";

export default {
  tests: "e2e/**/*.e2e.ts",
  targets: [
    {
      name: "android",
      engine: mobile({ platform: "android" }),
      app: { bundleId: "dev.agents.mobile.audit" },
    },
  ],
  workers: 1,
} satisfies E2EConfig;
