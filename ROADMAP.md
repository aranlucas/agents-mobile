# Agents Mobile feature roadmap

Updated 2026-10-26. Proposed sequence, not delivery dates. Success targets below are unvalidated pilot gates, not adoption or revenue results.

## User and current baseline

A mobile user wants to start a useful job, leave the app, and return to the same result without losing control of the work.

The Expo app already presents travel, grocery, fitness and wellness workflows through the Go gateway, with Clerk sign-in and refreshed session tokens. A dedicated Grocery Agent app also exists; this app should remain the concise multi-workflow entry point.

Planning source: [README](README.md) at `5a6bc988aa71`. This is a focused planning pass, not a new comprehensive code audit or live-service validation.

## Prioritized releases

| Order | Feature                                        | Useful scope                                                                                                                            | Release acceptance                                                                                                  |
| ----- | ---------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| Now   | Resume the exact task after an interruption    | Show active/completed/interrupted runs and recover the selected conversation and result on foreground/reconnect.                        | Backgrounding or network loss does not create a duplicate run, lose a draft or display another account’s state.     |
| Next  | Review a result without reading the whole chat | Present the existing plan/list as a compact editable summary with unresolved decisions and a route back to the supporting conversation. | The user can make one change, see it reflected in the shared gateway result and continue the task.                  |
| Next  | Visible progress, stop and usage               | Expose the gateway’s run state, work limit and stop/resume controls in the mobile journey.                                              | Stopping has an acknowledged outcome; uncertain external actions remain visible and are not silently retried.       |
| Later | Go deeper in a specialist product              | Hand off a saved result to the dedicated grocery/travel/training surface when it offers a better workflow.                              | The handoff preserves identity and the selected result without passing credentials in links or duplicating records. |

## Measure before expanding

Observe five phone sessions: time to find the latest useful result, reconnect recovery, repeated requests and next-week return. Proposed gate: all interruption cases resume the intended task and four users can edit a result without developer help.

Collect the baseline before implementation. Use voluntary feedback and aggregate operational events without private content, credentials or account identifiers. If users do not return to the first workflow, revisit it before adding the later milestones.

## Dependencies and limits

Keep Clerk session semantics until a deliberate migration is chosen. Gateway run/result identity comes before cross-app handoff. Do not rebuild the dedicated grocery app inside another tab. Native-device verification is required for a future app release; this document does not claim it occurred.

Use existing libraries and native test commands. Attach reliability work to the feature acceptance it enables. Update this file with shipped user outcomes and observed pilot results; refactors or passing tests alone do not demonstrate product value.
