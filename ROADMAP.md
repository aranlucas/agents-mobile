# Agents Mobile feature roadmap

Proposed 2026-10-26; sequence, not delivery dates. The goal is to start a task, leave the app, and return to the same result without losing control of the work. Keep this app a concise multi-workflow entry point rather than rebuilding the dedicated grocery app inside a tab.

## Prioritized releases

| Order | Feature                                | Release acceptance                                                                                                                                                           |
| ----- | -------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Now   | Resume after interruption              | Show active/completed/interrupted runs; restore the selected conversation and result on foreground/reconnect without duplicate runs, lost drafts or another account's state. |
| Next  | Edit a compact result summary          | Show unresolved decisions and a route to the supporting conversation. One edit updates the shared gateway result and the user can continue the task.                         |
| Next  | Progress, usage limits and stop/resume | Expose gateway run state and work limits. Stopping has an acknowledged outcome; uncertain external actions stay visible and are not silently retried.                        |
| Later | Hand off to a specialist product       | Transfer the saved result to grocery/travel/training with identity and selection intact, without credentials in links or duplicate records.                                  |

## Measure before expanding

Observe five phone sessions: time to find the latest useful result, reconnect recovery, repeated requests and next-week return. Proposed gate: all interruption cases resume the intended task and four users can edit a result without developer help.

These are unvalidated pilot gates. Collect the baseline before implementation using voluntary feedback and aggregate operational events without private content, credentials or account identifiers. If users do not return to the first workflow, revisit it before adding later milestones.

## Dependencies and limits

Keep Clerk session semantics until a deliberate migration is chosen. Gateway run/result identity comes before cross-app handoff. Native-device verification is required for a future app release.
