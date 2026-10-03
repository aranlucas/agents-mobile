import type { HealthDataActivity, HealthDataAvailability } from "../../modules/health-data";
import type HealthData from "../../modules/health-data";

const INITIAL_SYNC_DAYS = 30;

const PAGE_SIZE = 100;

const MAX_PAGES = 5;

export type SyncResponse = { accepted: number; synced_at: string };

export type HealthSyncState = {
  phase:
    | "checking"
    | "unavailable"
    | "permission_required"
    | "ready"
    | "syncing"
    | "partial"
    | "synced"
    | "error";
  accepted: number;
  availability?: HealthDataAvailability;
  lastSyncedAt?: string;
  error?: string;
  canResume: boolean;
};

type Checkpoint = {
  after: string;
  before: string;
  pageToken: string | null;
  accepted: number;
};

type Progress = { lastSyncedAt?: string; pending?: Checkpoint };

type Dependencies = {
  healthData: typeof HealthData;
  storage: {
    getItemAsync(key: string): Promise<string | null>;
    setItemAsync(key: string, value: string): Promise<void>;
  };
  getToken: () => Promise<string | null>;
  postActivities: (activities: HealthDataActivity[], token: string) => Promise<SyncResponse>;
  now: () => Date;
};

/** Owns the bounded window, acknowledgement checkpoints, and single active run. */
export function createHealthSync(accountId: string, dependencies: Dependencies) {
  const { healthData, storage, getToken, postActivities, now } = dependencies;

  // SecureStore keys only allow alphanumerics, '.', '-' and '_'. Encode without collisions.
  const accountKey = Array.from(accountId, (character) =>
    character.codePointAt(0)!.toString(16),
  ).join("-");

  const key = `fitness.health-connect.progress.v1.${accountKey}`;
  let inFlight: Promise<HealthSyncState> | undefined;

  async function readProgress(): Promise<Progress> {
    const stored = await storage.getItemAsync(key);

    if (!stored) return {};
    const progress: unknown = JSON.parse(stored);

    if (!isProgress(progress)) throw new Error("Saved fitness sync progress is invalid.");

    return progress;
  }

  async function inspect(): Promise<HealthSyncState> {
    try {
      const progress = await readProgress();
      const availability = await healthData.getAvailabilityAsync();
      const state = stateFromProgress(progress, availability);

      if (availability.status !== "available") return { ...state, phase: "unavailable" };
      const permission = await healthData.getPermissionStatusAsync();

      return { ...state, phase: permission.granted ? state.phase : "permission_required" };
    } catch (cause) {
      return failed(cause);
    }
  }

  async function run(): Promise<HealthSyncState> {
    let progress: Progress = {};
    let availability: HealthDataAvailability | undefined;

    try {
      progress = await readProgress();
      availability = await healthData.getAvailabilityAsync();

      if (availability.status !== "available") {
        return { ...stateFromProgress(progress, availability), phase: "unavailable" };
      }

      let permission = await healthData.getPermissionStatusAsync();

      if (!permission.granted) permission = await healthData.requestPermissionsAsync();

      if (!permission.granted) {
        return { ...stateFromProgress(progress, availability), phase: "permission_required" };
      }

      // Establish auth before starting a new window. Refresh before every write so
      // the production adapter can also reject an account change during a native read.
      await requireToken();

      if (!progress.pending) {
        const before = now();
        const after = new Date(before.getTime() - INITIAL_SYNC_DAYS * 24 * 60 * 60 * 1000);

        const started: Progress = {
          ...progress,
          pending: {
            after: after.toISOString(),
            before: before.toISOString(),
            pageToken: null,
            accepted: 0,
          },
        };

        await storage.setItemAsync(key, JSON.stringify(started));
        progress = started;
      }

      for (let index = 0; index < MAX_PAGES; index += 1) {
        const checkpoint = progress.pending!;

        // Page tokens are sequential, and must be saved only after acknowledgement.
        // oxlint-disable-next-line eslint/no-await-in-loop
        const page = await healthData.readActivitiesAsync(
          checkpoint.after,
          checkpoint.before,
          checkpoint.pageToken,
          PAGE_SIZE,
        );

        // oxlint-disable-next-line eslint/no-await-in-loop
        const token = await requireToken();
        // oxlint-disable-next-line eslint/no-await-in-loop
        const response = await postActivities(page.activities, token);

        if (!isSyncResponse(response))
          throw new Error("Fitness sync returned an invalid response.");
        const accepted = checkpoint.accepted + response.accepted;
        const nextPageToken = page.nextPageToken === "" ? null : (page.nextPageToken ?? null);

        const next: Progress = nextPageToken
          ? { ...progress, pending: { ...checkpoint, accepted, pageToken: nextPageToken } }
          : { lastSyncedAt: response.synced_at };

        // Completion and removal of the pending window are one atomic storage write.
        // oxlint-disable-next-line eslint/no-await-in-loop
        await storage.setItemAsync(key, JSON.stringify(next));
        progress = next;

        if (!nextPageToken) {
          return { ...stateFromProgress(progress, availability), accepted, phase: "synced" };
        }
      }

      return { ...stateFromProgress(progress, availability), phase: "partial" };
    } catch (cause) {
      return {
        ...stateFromProgress(progress, availability),
        ...failed(cause),
        accepted: progress.pending?.accepted ?? 0,
        canResume: Boolean(progress.pending),
      };
    }
  }

  async function requireToken() {
    let token: string | null;

    try {
      token = await getToken();
    } catch {
      throw new Error("Your session changed or you are offline. Sign in and try again.");
    }

    if (!token) throw new Error("Sign in before syncing fitness data.");

    return token;
  }

  return {
    inspect,
    sync(): Promise<HealthSyncState> {
      inFlight ??= run().finally(() => {
        inFlight = undefined;
      });

      return inFlight;
    },
  };
}

function stateFromProgress(
  progress: Progress,
  availability?: HealthDataAvailability,
): HealthSyncState {
  return {
    phase: progress.pending ? "partial" : "ready",
    accepted: progress.pending?.accepted ?? 0,
    lastSyncedAt: progress.lastSyncedAt,
    canResume: Boolean(progress.pending),
    availability,
  };
}

function failed(cause: unknown): HealthSyncState {
  return {
    phase: "error",
    accepted: 0,
    canResume: false,
    error: cause instanceof Error ? cause.message : "Fitness sync failed.",
  };
}

function isDate(value: unknown): value is string {
  return typeof value === "string" && Number.isFinite(Date.parse(value));
}

function isProgress(value: unknown): value is Progress {
  if (typeof value !== "object" || value === null) return false;

  if ("lastSyncedAt" in value && !isDate(value.lastSyncedAt)) return false;

  if (!("pending" in value)) return true;
  const pending = value.pending;

  return (
    typeof pending === "object" &&
    pending !== null &&
    "after" in pending &&
    isDate(pending.after) &&
    "before" in pending &&
    isDate(pending.before) &&
    pending.after < pending.before &&
    "pageToken" in pending &&
    (pending.pageToken === null || typeof pending.pageToken === "string") &&
    "accepted" in pending &&
    typeof pending.accepted === "number" &&
    Number.isSafeInteger(pending.accepted) &&
    pending.accepted >= 0
  );
}

export function isSyncResponse(value: unknown): value is SyncResponse {
  return (
    typeof value === "object" &&
    value !== null &&
    "accepted" in value &&
    typeof value.accepted === "number" &&
    Number.isSafeInteger(value.accepted) &&
    value.accepted >= 0 &&
    "synced_at" in value &&
    isDate(value.synced_at)
  );
}
