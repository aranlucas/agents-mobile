import { describe, expect, it, vi } from "vitest";
import { createHealthSync, isSyncResponse } from "./health-sync";
import type {
  HealthDataActivity,
  HealthDataActivityPage,
  HealthDataAvailability,
} from "../../modules/health-data";

const NOW = new Date("2026-10-02T00:00:00.000Z");

const activity = (id: string): HealthDataActivity => ({
  id,
  source: "health_connect",
  name: "Run",
  start_date: "2026-10-01T00:00:00.000Z",
});

const permission = (granted: boolean) => ({
  granted,
  grantedPermissions: [],
  requiredPermissions: [],
});

function fixture(pageCount = 1) {
  const data = new Map<string, string>();
  const acknowledged: string[] = [];

  const dependencies = {
    healthData: {
      getAvailabilityAsync: vi.fn(async (): Promise<HealthDataAvailability> => ({
        status: "available",
        providerPackage: "test",
      })),
      getPermissionStatusAsync: vi.fn(async () => permission(true)),
      requestPermissionsAsync: vi.fn(async () => permission(true)),
      readActivitiesAsync: vi.fn(
        async (
          _after: string,
          _before: string,
          token: string | null,
          _size: number,
        ): Promise<HealthDataActivityPage> => {
          const index = Number(token ?? 0);

          return {
            activities: [activity(String(index))],
            nextPageToken: index + 1 < pageCount ? String(index + 1) : undefined,
          };
        },
      ),
    },
    storage: {
      getItemAsync: vi.fn(async (key: string) => data.get(key) ?? null),
      setItemAsync: vi.fn(async (key: string, value: string) => {
        data.set(key, value);
      }),
    },
    getToken: vi.fn(async (): Promise<string | null> => "test-token"),
    postActivities: vi.fn(async (activities: HealthDataActivity[], _token: string) => {
      acknowledged.push(...activities.map((item) => item.id));

      return { accepted: activities.length, synced_at: NOW.toISOString() };
    }),
    now: vi.fn(() => NOW),
  };

  return { dependencies, data, acknowledged, sync: createHealthSync("account-a", dependencies) };
}

describe("bounded health sync", () => {
  it("returns partial at page five and resumes page six in the exact original window after recreation", async () => {
    const f = fixture(6);
    expect(await f.sync.sync()).toMatchObject({
      phase: "partial",
      accepted: 5,
      canResume: true,
      lastSyncedAt: undefined,
    });
    expect(f.acknowledged).toEqual(["0", "1", "2", "3", "4"]);
    const resumed = createHealthSync("account-a", f.dependencies);
    expect(await resumed.inspect()).toMatchObject({ phase: "partial", accepted: 5 });
    f.dependencies.now.mockReturnValue(new Date("2026-10-03T00:00:00.000Z"));
    expect(await resumed.sync()).toMatchObject({
      phase: "synced",
      accepted: 6,
      canResume: false,
      lastSyncedAt: NOW.toISOString(),
    });
    expect(f.acknowledged).toEqual(["0", "1", "2", "3", "4", "5"]);
    expect(f.dependencies.healthData.readActivitiesAsync).toHaveBeenLastCalledWith(
      "2026-09-02T00:00:00.000Z",
      NOW.toISOString(),
      "5",
      100,
    );
    expect(await resumed.inspect()).toMatchObject({
      phase: "ready",
      canResume: false,
      lastSyncedAt: NOW.toISOString(),
    });
  });

  it("keeps the last acknowledged cursor on a later failed write", async () => {
    const f = fixture(4);
    const post = f.dependencies.postActivities.getMockImplementation()!;
    f.dependencies.postActivities.mockImplementation(async (activities, token) => {
      if (activities[0]?.id === "2") throw new Error("Gateway unavailable");

      return post(activities, token);
    });
    expect(await f.sync.sync()).toMatchObject({
      phase: "error",
      error: "Gateway unavailable",
      accepted: 2,
      canResume: true,
      lastSyncedAt: undefined,
    });
    f.dependencies.postActivities.mockImplementation(post);
    expect(await createHealthSync("account-a", f.dependencies).sync()).toMatchObject({
      phase: "synced",
      accepted: 4,
    });
    expect(f.acknowledged).toEqual(["0", "1", "2", "3"]);
    expect(f.dependencies.healthData.readActivitiesAsync.mock.calls.map((call) => call[2])).toEqual(
      [null, "1", "2", "2", "3"],
    );
  });

  it("does not claim completion when writing the terminal checkpoint fails", async () => {
    const f = fixture();
    const save = f.dependencies.storage.setItemAsync.getMockImplementation()!;
    f.dependencies.storage.setItemAsync.mockImplementation(async (key, value) => {
      if (!JSON.parse(value).pending) throw new Error("Storage full");
      await save(key, value);
    });
    expect(await f.sync.sync()).toMatchObject({
      phase: "error",
      error: "Storage full",
      canResume: true,
      lastSyncedAt: undefined,
    });
    expect(await f.sync.inspect()).toMatchObject({ phase: "partial", lastSyncedAt: undefined });
  });

  it("coalesces overlapping calls before any async permission or auth work completes", async () => {
    const f = fixture();
    let resolve!: (token: string) => void;
    f.dependencies.getToken.mockReturnValueOnce(
      new Promise((done) => {
        resolve = done;
      }),
    );
    const first = f.sync.sync();
    const second = f.sync.sync();
    expect(first).toBe(second);
    await vi.waitFor(() => expect(f.dependencies.getToken).toHaveBeenCalledOnce());
    resolve("test-token");
    await expect(first).resolves.toMatchObject({ phase: "synced" });
    expect(f.dependencies.postActivities).toHaveBeenCalledOnce();
  });

  it("keeps pending windows and completion separate for different accounts", async () => {
    const f = fixture(6);
    await f.sync.sync();
    const other = createHealthSync("account-b", f.dependencies);
    expect(await other.inspect()).toMatchObject({
      phase: "ready",
      accepted: 0,
      canResume: false,
      lastSyncedAt: undefined,
    });
    f.dependencies.now.mockReturnValue(new Date("2026-10-03T00:00:00.000Z"));
    await other.sync();
    expect(f.dependencies.healthData.readActivitiesAsync.mock.calls[5]?.slice(0, 3)).toEqual([
      "2026-09-03T00:00:00.000Z",
      "2026-10-03T00:00:00.000Z",
      null,
    ]);
    expect(f.data.size).toBe(2);
    expect(await f.sync.sync()).toMatchObject({ phase: "synced", accepted: 6 });
    expect(await other.inspect()).toMatchObject({
      phase: "partial",
      accepted: 5,
      lastSyncedAt: undefined,
    });
  });

  it("does not reuse the legacy unscoped completion timestamp", async () => {
    const f = fixture();
    f.data.set("fitness.health-connect.last-sync", NOW.toISOString());
    expect(await f.sync.inspect()).toMatchObject({ phase: "ready", lastSyncedAt: undefined });
  });

  it("retains the previous completion timestamp while a newer window is partial", async () => {
    const f = fixture(6);
    f.dependencies.healthData.readActivitiesAsync.mockResolvedValueOnce({ activities: [] });
    await f.sync.sync();
    f.dependencies.now.mockReturnValue(new Date("2026-10-03T00:00:00.000Z"));
    expect(await f.sync.sync()).toMatchObject({
      phase: "partial",
      lastSyncedAt: NOW.toISOString(),
    });
  });

  it("returns unavailable without permission, native reads, or HTTP writes", async () => {
    const f = fixture();
    f.dependencies.healthData.getAvailabilityAsync.mockResolvedValue({
      status: "unavailable",
      providerPackage: "",
    });
    expect(await f.sync.sync()).toMatchObject({ phase: "unavailable" });
    expect(f.dependencies.healthData.getPermissionStatusAsync).not.toHaveBeenCalled();
    expect(f.dependencies.healthData.readActivitiesAsync).not.toHaveBeenCalled();
    expect(f.dependencies.postActivities).not.toHaveBeenCalled();
  });

  it("returns denied permission without native reads or HTTP writes", async () => {
    const f = fixture();
    f.dependencies.healthData.getPermissionStatusAsync.mockResolvedValue(permission(false));
    f.dependencies.healthData.requestPermissionsAsync.mockResolvedValue(permission(false));
    expect(await f.sync.sync()).toMatchObject({ phase: "permission_required" });
    expect(f.dependencies.healthData.readActivitiesAsync).not.toHaveBeenCalled();
    expect(f.dependencies.postActivities).not.toHaveBeenCalled();
    expect(f.data.size).toBe(0);
  });

  it("fails missing auth without starting a window or transmitting health data", async () => {
    const f = fixture();
    f.dependencies.getToken.mockResolvedValue(null);
    expect(await f.sync.sync()).toMatchObject({
      phase: "error",
      error: "Sign in before syncing fitness data.",
    });
    expect(f.dependencies.postActivities).not.toHaveBeenCalled();
    expect(f.data.size).toBe(0);
  });

  it("rechecks auth after the native read, retaining progress if the account changed", async () => {
    const f = fixture();
    f.dependencies.getToken
      .mockResolvedValueOnce("test-token")
      .mockRejectedValue(new Error("Account changed"));
    expect(await f.sync.sync()).toMatchObject({ phase: "error", canResume: true });
    expect(f.dependencies.healthData.readActivitiesAsync).toHaveBeenCalledOnce();
    expect(f.dependencies.postActivities).not.toHaveBeenCalled();
  });

  it("leaves corrupt saved progress untouched rather than silently skipping it", async () => {
    const f = fixture(6);
    await f.sync.sync();
    const key = [...f.data.keys()][0];
    f.data.set(key, "bad-json");
    f.dependencies.postActivities.mockClear();
    expect(await f.sync.sync()).toMatchObject({ phase: "error" });
    expect(f.dependencies.postActivities).not.toHaveBeenCalled();
    expect(f.data.get(key)).toBe("bad-json");
  });

  it.each([NaN, Infinity, -1, 1.5])("rejects invalid accepted count %s", (accepted) => {
    expect(isSyncResponse({ accepted, synced_at: NOW.toISOString() })).toBe(false);
  });
  it("rejects invalid completion timestamps", () => {
    expect(isSyncResponse({ accepted: 1, synced_at: "invalid" })).toBe(false);
  });
});
