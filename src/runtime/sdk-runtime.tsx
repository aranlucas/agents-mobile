import {
  useAgent,
  useCopilotKit,
  useFrontendTool,
  useRenderToolCall,
} from "@copilotkit/react-native/headless";
import type { ReactNode } from "react";
import type { AgentId } from "@/utils/agent-config";
import { ConversationProvider, type ProductTool } from "./app-runtime";
import { adaptConversation } from "./sdk-conversation";

export function SdkConversationProvider({
  agentId,
  children,
}: {
  agentId: AgentId;
  children: ReactNode;
}) {
  const { agent } = useAgent({ agentId });
  const { copilotkit } = useCopilotKit();

  const renderToolCall = useRenderToolCall();

  return (
    <ConversationProvider
      value={{ conversation: adaptConversation(agent, copilotkit), renderToolCall }}
    >
      {children}
    </ConversationProvider>
  );
}

export function SdkProductTool({ tool }: { tool: ProductTool }) {
  useFrontendTool(tool, []);

  return null;
}
