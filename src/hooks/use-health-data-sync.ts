import { useAppRuntime } from "@/runtime/app-runtime";
import { useCallback, useEffect, useRef, useState } from "react";

import { createHealthSync, type HealthSyncState } from "@/utils/health-sync";

const initialState: HealthSyncState = { phase: "checking", accepted: 0, canResume: false };

const signedOutState: HealthSyncState = {
  ...initialState,
  phase: "error",
  error: "Sign in before syncing fitness data.",
};

export function useHealthDataSync() {
  const { session, health } = useAppRuntime();
  const { getToken, userId } = session;
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
      ...health,
      getToken: async () => {
        if (!active) throw new Error("Account changed.");
        const token = await getToken();

        if (!active) throw new Error("Account changed.");

        return token;
      },
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
  }, [userId, getToken, health]);

  const sync = useCallback(async () => {
    await syncRef.current?.();
  }, []);

  const status = !userId ? signedOutState : state.userId === userId ? state.status : initialState;

  return { ...status, sync };
}
