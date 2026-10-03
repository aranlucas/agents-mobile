# Anti-slop provenance

- Source: https://github.com/dmmulroy/anti-slop
- Commit: c44ef22ca116d0ba62a3ff663a0bd13a3f3fa40b
- Source path: skills/install-anti-slop/assets/anti-slop/
- Installed path: tools/oxlint/anti-slop/
- Changes to vendored implementation: none.
- Root LICENSE copied from the same commit; nested Stylistic LICENSE and UPSTREAM.md preserved.
- Generic rules are enabled. Effect rules require a direct Effect dependency.

## Repository integration

- Oxlint and @oxlint/plugins are pinned together to 1.86.0, matching the original resolved Oxlint version. The pnpm 12.6.0 lockfile is regenerated with that exact manager. Vite 8.3.0 is explicitly declared at the version already used by Vitest for the real markdown package's JSX transform.
- All generic rules remain errors. Supported `allowInTypeGuards: true` is enabled for genuine boundary predicates. No Effect plugin is enabled because no direct Effect dependency exists.
- Existing CI runs `pnpm check && pnpm test`; workflow triggers and other checks are preserved. Vendored tooling and existing agent-generated directories are excluded from application tooling; vendored TypeScript is excluded from app typecheck.
- Production state/message assertions are replaced with validated display projections without changing SDK state. Native styles use React Native contracts, and crypto augmentation preserves existing runtime methods.
- Application-owned session, conversation, health I/O, navigation, and root-composition boundaries replace module mocks. Production defaults still use Clerk, CopilotKit, Expo, Sentry, and the Android HealthData resolver. Both entry points use the same tested layout factory, with secure native token caching and Clerk's web default.
- Screen tests retain token refresh, duplicate submission reservation, draft preservation, error recovery, product-tool rendering, and bounded health-sync resume/account isolation assertions. Additional tests exercise the real installed CopilotKit provider/hooks, live updates, product registration/rendering, authenticated dispatch, and token-cache forwarding.
- Markdown uses the installed parser, style utilities, and FitImage implementation. Vite's dependency optimizer converts FitImage's CommonJS package so it consumes the existing React Native Node host adapter; no FitImage module replacement is used. A renderer test exercises image layout/loading lifecycle.
- A pre-existing non-blocking React array-index-key warning remains in streaming markdown block rendering; mechanically replacing that key could remount streaming blocks.
- Physical device login, Health Connect access, and signed release behavior require device validation; offline exports and synthetic tests do not establish those outcomes.
