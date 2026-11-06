# Untangle decision log

## Scope and evidence

Run in the bound `refactor/untangle-codebase-20261106` worktree only. Initial
working tree was clean. Read the exact requested skill from
https://raw.githubusercontent.com/caldoai/skills/main/skills/untangle-codebase/SKILL.md
before inspection. Both optional additions (comments and tests) are selected.

Inventory before implementation: all 38 source files, generated Go contracts,
13 test suites and host stubs, Expo/Metro/Vitest/pnpm configuration, package
scripts, hooks, CI workflows, README and roadmap. The app has four file-based
routes, a shared conversation screen, injected SDK/auth/navigation boundaries,
a grocery tool, and a deliberately local markdown renderer. No new dependencies
or repository scripts are needed: existing React, Zod and markdown-it cover the
work; parsing/rendering adapters are repository-specific glue.

## Design decisions (recorded before source edits)

1. Make the mobile agent order the source of tab identity and titles; render icons
   through one adapter. Hidden links: `AGENT_ORDER`, `Navigation.icons`' handwritten
   union, four tab declarations and four identical icon functions must change
   together. Keep Expo's explicit route files and SDK icon bindings, since they
   implement distinct platform contracts rather than duplicated policies.
2. Put the grocery payload schema in a feature contract module. Needless link:
   `app-runtime.tsx` currently imports `ProductResults` from the card implementation.
   Runtime ports should depend on payload contracts, not UI. Remove the unrelated
   `AgentId` reexport from runtime configuration and import identity from `types`.
3. Model list markers from the nearest enclosing list. The renderer searches any
   bullet ancestor first, incorrectly overriding ordered children. Preserve source
   numbering in both top-level and nested ordered lists. The initial task-plugin
   depth proposal was rejected during review and reverted: treating later
   paragraphs as task markers lacks a justified GFM requirement.
4. Remove implementation-restating comments after the structural changes; retain
   external SDK, platform, security, generated-contract and streaming constraints.
5. Review tests last. Preserve behavioral coverage, including installed SDK and
   markdown integration, auth failures, draft preservation, secure cache and hooks.
   Do not remove tests solely because they exercise adapter boundaries.

## Retained special cases and non-changes

- Android localhost mapping and native/web safe-area and token-cache differences
  reflect actual platforms. Native bootstrap ordering protects secure randomness.
- SDK discovery/transport/tool adapters isolate native I/O and enable real SDK
  contract tests; their injection is justified, not speculative extension points.
- Zod's tolerant display projections and raw partial tool JSON support streaming.
  Send reservation and uncertain-outcome recovery prevent duplicate external work.
- Metro's Node dependency exclusions and Vitest's package transforms are needed
  by installed dependencies. Keep pinned security overrides and hook integration.
- Generated contracts remain untouched; summary projections deliberately validate
  only displayed fields. Keep the local renderer with mobile tests.
- Markdown fence handling, URL safety, Unicode widths, numbering and layout bounds
  implement real rendering requirements. Avoid a new parser or broad directory move.
- PR creation and merge are authorized after checks and review requirements pass.
  No deployment or unrelated roadmap work is included.

## Validation

Baseline: `pnpm check && pnpm test` started before edits; dependency provisioning
was required in the fresh worktree. Results and introduced failures recorded below.

Resume: PR creation and merge are now authorized, subject to passing checks and
repository review requirements. The original baseline attempt was contaminated
by concurrent edits; the pristine retry was blocked by the untracked new schema's
formatting. Neither is claimed as a passing baseline. Introduced failures so far:
stale schema imports in tests (updated to contract owner) and missing blank lines
in the new nested-task test (corrected). Existing index-key warning is retained
because streaming blocks need positional identity. Test cleanup retains existing
behavioral contracts; no test was found that warranted deletion.

Reviewer rejected the task-depth change: a later paragraph is not independently
justified as a GFM task item. Reverted that speculative change and its test;
retain the nearest-list rendering fix. Reviewer found no other worthwhile
structural issues. Tab icon callbacks now have stable module-level identities.

Final test cleanup: Expo CLI subprocess tests timed out on the loaded host.
Use Expo's existing `expo/config` API to evaluate the actual project config;
preserve both environment injection and platform-output assertions, restore env
after each test, and reset platform before each evaluation. This removes process
startup/package-manager overhead without reproducing configuration logic.

## CI handoff

Latest user instruction supersedes local validation: tests run only in CI.
Process inspection after restart found no surviving local test/build commands
owned by this thread. No passing final local suite is claimed. Before this
instruction, source checks passed with the existing positional markdown-key
warning; the last observed suite had 49 passing tests and two Expo CLI timeouts.
The subsequent API-based test cleanup still requires CI validation.

The existing pull-request CI runs `pnpm check` then `pnpm test`, including real
SDK, local markdown, configuration, auth, provider and hook regression coverage.
No workflow changes or new dependencies are needed. Native device testing is
outside this structural change; no device verification is claimed.

Final static review approved the complete diff with no actionable issues. It
confirmed Expo config re-evaluation, environment isolation, retained top-level
and nested numbering coverage, and no further worthwhile structural changes.
