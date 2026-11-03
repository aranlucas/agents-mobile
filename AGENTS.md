# Repository instructions

- Use `pnpm`; run `pnpm check && pnpm test` sequentially when validating changes.
- The markdown renderer is intentionally local to this app at `src/native-markdown`; keep it tested with the mobile app rather than restoring a workspace dependency.

## Scripts: native first

Before adding a script file or a package script that runs one, use the first option that works:

1. An existing tool's flag or subcommand.
2. Declarative configuration.
3. A maintained plugin for that tool.
4. A one-line package.json script that calls a native command.
5. A Vitest test, for assertions.
6. A custom script for repository-specific behavior: its first comment names the native option that could not cover it and why. Cover it in Vitest and quote that comment in the PR.

## Code: libraries first

Prefer existing dependencies, then actively maintained, widely adopted, typed libraries that fit this stack. Reserve custom code for domain logic and uncovered glue. In the PR, justify new dependencies or name the library rejected when writing an equivalent yourself.

- Runtime validation → zod for agent configuration and tool payloads.
- Secure token storage → expo-secure-store.
- Authentication → @clerk/expo.

## Tests

- Before adding a test, identify the specific behavior, a credible mistake it should catch, and an independently justified expected result.
- Prefer small, fast, reliable tests whose failures identify the broken behavior. Use integration/E2E tests for interactions isolated tests cannot establish.
- Do not reproduce implementation logic in assertions or mocks.
- Protect contracts, not incidental internal structure.
- Distinguish temporary development scaffolding from checks worth maintaining.
- Never delete or weaken a failing test just to make the suite pass.
