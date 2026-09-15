# Repository instructions

- Use `pnpm`; run `pnpm check && pnpm test` sequentially when validating changes.
- Keep validation worker limits conservative so local Expo and TypeScript checks leave the computer responsive.
- The Health Connect module is Android-only and requires a development client or native build.
- The markdown renderer is intentionally local to this app at `src/native-markdown`; keep it tested with the mobile app rather than restoring a workspace dependency.
