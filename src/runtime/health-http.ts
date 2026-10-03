import { z } from "zod";
import type { HealthDataActivity } from "../../modules/health-data";
import { isSyncResponse, type SyncResponse } from "@/utils/health-sync";

export function createPostActivities(baseUrl: string, fetch: typeof globalThis.fetch) {
  return async function postActivities(
    activities: HealthDataActivity[],
    token: string,
  ): Promise<SyncResponse> {
    const response = await fetch(`${baseUrl}/fitness/activities/sync`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ activities }),
    });

    if (!response.ok) {
      const body: unknown = await response.json().catch(() => null);

      const error = z.object({ error: z.string() }).safeParse(body);

      const message = error.success
        ? error.data.error
        : `Fitness sync failed with HTTP ${response.status}.`;

      throw new Error(message);
    }

    const body: unknown = await response.json();

    if (!isSyncResponse(body)) throw new Error("Fitness sync returned an invalid response.");

    return body;
  };
}
