import { z } from "zod";
import Constants from "expo-constants";
import { Platform } from "react-native";
import { getCopilotKitRuntimeBaseUrl, type AgentRuntimeConfig } from "./agent-config-core";

const extra = Constants.expoConfig?.extra ?? {};

const config: AgentRuntimeConfig = {
  copilotKitRuntimeUrl: z.string().optional().catch(undefined).parse(extra.copilotKitRuntimeUrl),
};

/** Returns the CopilotKit runtime base URL for use with CopilotKitProvider. */
export function getCopilotKitRuntimeUrl(): string {
  const runtimeUrl = getCopilotKitRuntimeBaseUrl(config, Platform.OS);

  if (!runtimeUrl) {
    throw new Error("EXPO_PUBLIC_COPILOTKIT_RUNTIME_URL is required");
  }

  return runtimeUrl;
}

export type { AgentId } from "@/types";
