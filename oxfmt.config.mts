import base from "@aranlucas/oxforge/format-config";

export default {
  ...base,
  ignorePatterns: [...(base.ignorePatterns ?? []), "pnpm-lock.yaml"],
};
