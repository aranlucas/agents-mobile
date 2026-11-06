# Correctness and reliability audit — 2026-11-06

## Baseline and inventory

Started with clean isolated worktree at remote default `666871bb96ab46c8b124b29d4647f23947350d46` (merged untangle pass). Preserve public ports and intended anonymous operation. Tests/builds run in CI only.

- Expo Router routes: travel, grocery, fitness, wellness; each uses AgentScreen and shared authenticated SDK client. Root redirects to travel.
- Clerk session → refreshed token → CopilotKit headers → add user message → run. Submission reserves synchronously across token refresh, keeps newer drafts, and reports ambiguous transport failure without automatic replay.
- SDK messages/state are untrusted streamed input. Zod projects summaries and validates product tool payloads. Product cards make availability/price claims; markdown handles streaming, lists, tables, code and external links.
- Native token persistence uses expo-secure-store, web delegates to Clerk. No local conversation database or write transactions; remote gateway owns authorization, persistence, booking/purchase actions and provider retries. This client cannot establish server tenant isolation.
- Native polyfills/crypto shim, environment/Android localhost mapping, Sentry initialization, native/web layout bindings, dependency lifecycle hooks and both CI workflows are in scope. Existing meaningful Vitest suites and Android release build remain gates.

## Findings before implementation

1. **Confirmed, medium: fabricated pickup availability.** `src/components/product-results-tool.tsx` labels optional `pickup: undefined` as “Pickup available”. Valid gateway tool data omitting that fact therefore promises availability it never supplied. Expected unknown availability for omitted field; true and false retain existing labels. Regression must render all three schema-valid cases.
2. **Confirmed, medium: document-wide markdown references lost.** `src/native-markdown/blocks.ts` splits paragraphs and later reference definitions into separate MarkdownIt parses. Trigger: `[Docs][guide]\n\n[guide]: https://example.com`. Expected clickable resolved link per MarkdownIt/CommonMark, actual literal reference text. Preserve document context when reference definitions exist, including definitions nested in block quotes/lists. Rendered target regression protects behavior rather than implementation structure.
3. **Confirmed, high: account-owned client and drafts persist across identity changes.** `src/runtime/production.tsx` subscribes to Clerk only below the long-lived AgentProvider. Published SDK 1.83.0 `CopilotKitProvider.tsx` constructs its core client in a useRef once; configuration effects do not reset agent history on account changes. Expected fresh client/screens on user A → B or sign-out; actual old messages, state and draft remain. Key the provider and descendants on Clerk userId. Same-account token refresh must preserve state.
4. **Confirmed, high: stale async send after account boundary closes.** `AgentScreenContent.onSend` awaits getToken and then mutates headers, appends and runs without checking liveness. When the account subtree closes during refresh, the old closure can still dispatch. Guard immediately after token resolution and before transport mutation; unmount-during-refresh regression asserts no headers/message/run.

## Rejected hypotheses and boundaries

- Null-token run is explicitly supported by existing auth regression; no invented mandatory sign-in requirement.
- SDK run errors intentionally avoid automatic retry because backend acceptance is ambiguous. Retrying blindly risks duplicate side effects.
- Existing same-screen submission ref prevents rapid double-send before SDK isRunning changes; draft comparison protects text typed during refresh.
- Malformed summaries/tool payloads already fail safely through Zod. No demonstrated serialization crash found in those paths.
- Remote authorization, transactions and idempotency require gateway audit; absence of client implementations is not a client defect.

## Validation plan and framework applicability

Use CI `pnpm check` then `pnpm test`, plus existing Android build. Demonstrate regressions against baseline in a CI reproduction job with new assertions. Independent reviewer challenges findings and fixes.

Read current published e2e quickstart, mobile and GitHub Actions/CI docs plus pinned upstream Expo example. Registry confirms `e2e@0.23.0` (tester-army/e2e) and `@e2e-dev/mobile@0.12.6`, Node ^22.22.3 or >=24.8. Native Android engine applies. Add deterministic native journey using existing runtime ports with controlled CI fixture; no provider credentials/model calls. Fixture journey covers draft preservation, failure recovery, successful response and tab navigation. It does not establish production Clerk/gateway interoperability. Keep fixture build distinct from production artifact.

## Implementation and review

Implemented the four findings. Markdown uses a conservative `]:` context check rather than a competing markdown parser: reference-looking documents stay in one MarkdownIt parse (code false positives only forgo memoization). Existing dependencies provide all runtime behavior; new exact dev dependencies are the user-requested official e2e runner/engine. No new custom executable scripts.

The native fixture replaces only production runtime bindings through an explicit Metro `AUDIT_E2E=1` opt-in; fixture APK uses `dev.agents.mobile.audit`, while the original release artifact build remains unchanged. It uses actual routes, screen state, summary rendering and markdown, with controlled auth failure and in-memory response adapter. No test credentials, external production services, AI model, or global config are used. This is UI/application-port coverage, not server or real Clerk integration.

Independent review confirmed the four findings and rejected anonymous-auth behavior as a bug. Final implementation review found no further concrete runtime defects and verified the published e2e APIs and fixture isolation. It identified a coverage boundary: the account regression tests provider/state reset through the extracted boundary, while production Clerk wiring is statically reviewed, not exercised with real Clerk. Baseline failure proof covers pickup truthfulness, reference targets and abandoned sends; it does not claim a baseline Clerk integration reproduction. The abandoned-send regression also asserts no header mutation.

PR: https://github.com/aranlucas/agents-mobile/pull/69. CI pending (production APK, native journey, check/test and baseline proofs). No local tests/builds run. Hooks were disabled for commit/push to avoid local dependency mutation/validation; installation used --ignore-scripts after inspecting lifecycle scripts.

### CI follow-up

At `f22d223`, [baseline regression proof](https://github.com/aranlucas/agents-mobile/actions/runs/42300145870/job/128175503200) passed: the new behavior assertions fail against the defective implementations. The main CI job stopped on blank-line lint errors before running tests. Corrected those formatting errors without changing behavior or assertions; full check/test and native build/journey results remain pending.
