import { z } from "zod";
import Constants from "expo-constants";
import { Platform } from "react-native";
import {
  getAgentsBaseUrl as getAgentsBaseUrlCore,
  getCopilotKitRuntimeBaseUrl,
  type AgentRuntimeConfig,
} from "./agent-config-core";

const extra = Constants.expoConfig?.extra ?? {};

const config: AgentRuntimeConfig = {
  agentsBaseUrl: z.string().optional().catch(undefined).parse(extra.agentsBaseUrl),
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

export function getAgentsBaseUrl(): string {
  return getAgentsBaseUrlCore(config, Platform.OS);
}

export type { AgentId } from "@agents/types";
