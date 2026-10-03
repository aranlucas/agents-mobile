import type { useAgent, useCopilotKit } from "@copilotkit/react-native/headless";
import type { Conversation } from "./app-runtime";

type SdkAgent = NonNullable<ReturnType<typeof useAgent>["agent"]>;

type SdkClient = ReturnType<typeof useCopilotKit>["copilotkit"];

/** Keep SDK identity intact when dispatching through its authenticated client. */
export function adaptConversation(
  agent: SdkAgent | undefined,
  client: SdkClient,
): Conversation | undefined {
  if (!agent) return undefined;

  return {
    messages: agent.messages,
    state: agent.state,
    isRunning: agent.isRunning,
    addMessage: (message) => {
      agent.addMessage(message);
    },
    run: async () => {
      await client.runAgent({ agent });
    },
    get headers() {
      return client.headers;
    },
    setHeaders: (headers) => {
      client.setHeaders(headers);
    },
  };
}
