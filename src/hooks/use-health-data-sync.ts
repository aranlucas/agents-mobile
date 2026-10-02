import { useAuth } from "@clerk/expo";
import { fetch } from "expo/fetch";
import * as SecureStore from "expo-secure-store";
import { useCallback, useEffect, useRef, useState } from "react";
import HealthData, { type HealthDataActivity } from "../../modules/health-data";
import { getAgentsBaseUrl } from "@/utils/agent-config";
import {
  createHealthSync,
  isSyncResponse,
  type HealthSyncState,
  type SyncResponse,
} from "@/utils/health-sync";

const initialState: HealthSyncState = { phase: "checking", accepted: 0, canResume: false };
const signedOutState: HealthSyncState = {
  ...initialState,
  phase: "error",
  error: "Sign in before syncing fitness data.",
};

export function useHealthDataSync() {
  const { getToken, userId } = useAuth();
  const [state, setState] = useState({ userId, status: initialState });
  const syncRef = useRef<(() => Promise<void>) | undefined>(undefined);

  useEffect(() => {
    if (!userId) {
      syncRef.current = undefined;
      return undefined;
    }
    let active = true;
    let started = false;
    const workflow = createHealthSync(userId, {
      healthData: HealthData,
      storage: SecureStore,
      now: () => new Date(),
      getToken: async () => {
        if (!active) throw new Error("Account changed.");
        const token = await getToken();
        if (!active) throw new Error("Account changed.");
        return token;
      },
      postActivities,
    });
    syncRef.current = async () => {
      if (!active) return;
      started = true;
      setState((current) => ({
        userId,
        status: { ...current.status, phase: "syncing", error: undefined },
      }));
      const status = await workflow.sync();
      if (active) setState({ userId, status });
    };
    void workflow.inspect().then((status) => {
      if (active && !started) setState({ userId, status });
    });
    return () => {
      active = false;
    };
  }, [userId, getToken]);

  const sync = useCallback(async () => {
    await syncRef.current?.();
  }, []);
  const status = !userId ? signedOutState : state.userId === userId ? state.status : initialState;
  return { ...status, sync };
}

async function postActivities(
  activities: HealthDataActivity[],
  token: string,
): Promise<SyncResponse> {
  const response = await fetch(`${getAgentsBaseUrl()}/fitness/activities/sync`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ activities }),
  });
  if (!response.ok) {
    const body: unknown = await response.json().catch(() => null);
    const message =
      typeof body === "object" && body !== null && "error" in body && typeof body.error === "string"
        ? body.error
        : `Fitness sync failed with HTTP ${response.status}.`;
    throw new Error(message);
  }
  const body: unknown = await response.json();
  if (!isSyncResponse(body)) throw new Error("Fitness sync returned an invalid response.");
  return body;
}
