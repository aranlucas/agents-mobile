#!/usr/bin/env node

// Aligns dependencies with the installed Expo SDK after each local install.
// `expo install --fix` reinstalls through pnpm, so a guard env var stops the
// nested postinstall from recursing. CI and EAS builds are skipped because they
// must install exactly what the lockfile says.

import { spawnSync } from "node:child_process";

const GUARD = "EXPO_POSTINSTALL_FIX_RUNNING";

if (process.env[GUARD] || process.env.CI || process.env.EAS_BUILD) {
  process.exit(0);
}

const result = spawnSync("pnpm", ["exec", "expo", "install", "--fix"], {
  env: { ...process.env, [GUARD]: "1" },
  shell: process.platform === "win32",
  stdio: "inherit",
});

// Never fail the install (e.g. offline): report and let the developer rerun.
if (result.error || result.status !== 0) {
  console.warn("expo install --fix did not complete; run `pnpm exec expo install --fix` manually.");
}
