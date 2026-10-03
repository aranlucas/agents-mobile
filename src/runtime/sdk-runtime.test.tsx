import { useEffect } from "react";
import { CopilotKitProvider, useCopilotKit } from "@copilotkit/react-native/headless";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { afterEach, expect, it, vi } from "vitest";
import {
  AppRuntimeProvider,
  useConversation,
  type AppRuntime,
  type ConversationValue,
} from "./app-runtime";
import { SdkConversationProvider, SdkProductTool } from "./sdk-runtime";
import { GroceryProductResultsTool } from "@/components/product-results-tool";
import { createHealthDataAdapter } from "../../modules/health-data/src/health-data-adapter";
import { runWithCurrentClerkToken } from "@/utils/copilotkit-auth";

const toolCall = {
  id: "products",
  type: "function" as const,
  function: {
    name: "show_product_results",
    arguments: JSON.stringify({ products: [{ upc: "123", name: "Milk", price: 5 }] }),
  },
};

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

it("uses the installed SDK for discovery, live conversation updates, authenticated dispatch, and product rendering", async () => {
  // React Native exposes window; the SDK deliberately skips runtime discovery in SSR.
  vi.stubGlobal("window", globalThis);
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);

  const requests = vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
    if (new Request(input).url !== "https://runtime.example.test/info")
      throw new Error(`Unexpected SDK request: ${new Request(input).url}`);

    return Response.json({ agents: { grocery: { description: "Grocery" } } });
  });

  let client: ReturnType<typeof useCopilotKit>["copilotkit"] | undefined;
  let value: ConversationValue | undefined;

  function CaptureClient() {
    const current = useCopilotKit().copilotkit;
    useEffect(() => {
      client = current;
    }, [current]);

    return null;
  }

  function Probe() {
    const current = useConversation();
    useEffect(() => {
      value = current;
    }, [current]);

    return <>{current.renderToolCall({ toolCall })}</>;
  }

  const runtime: AppRuntime = {
    session: { userId: "fixture-user", getToken: async () => "fixture-token" },
    health: {
      healthData: createHealthDataAdapter(() => null),
      storage: { getItemAsync: async () => null, setItemAsync: async () => undefined },
      now: () => new Date(0),
      postActivities: async () => {
        throw new Error("Unexpected health request");
      },
    },
    ConversationProvider: SdkConversationProvider,
    ProductTool: SdkProductTool,
  };

  let tree: ReactTestRenderer | undefined;
  await act(async () => {
    tree = create(
      <CopilotKitProvider
        runtimeUrl="https://runtime.example.test"
        useSingleEndpoint={false}
        defaultThrottleMs={0}
      >
        <CaptureClient />
        <AppRuntimeProvider value={runtime}>
          <GroceryProductResultsTool />
          <SdkConversationProvider agentId="grocery">
            <Probe />
          </SdkConversationProvider>
        </AppRuntimeProvider>
      </CopilotKitProvider>,
    );
  });
  await act(async () => {
    await vi.waitFor(() => expect(client?.getAgent("grocery")).toBeDefined());
  });
  expect(requests).toHaveBeenCalled();

  if (!client || !tree) throw new Error("SDK provider did not mount");
  const agent = client.getAgent("grocery");

  if (!agent) throw new Error("SDK discovery did not provide the grocery agent");
  await act(async () => {
    agent.setState({ status: "ready" });
    agent.setMessages([{ id: "assistant", role: "assistant", toolCalls: [toolCall] }]);
  });
  expect(value?.conversation?.state).toEqual({ status: "ready" });
  expect(value?.conversation?.messages).toEqual(agent.messages);
  expect(JSON.stringify(tree.toJSON())).toContain("Milk");
  const dispatch = vi.spyOn(client, "runAgent").mockResolvedValue(undefined);
  const conversation = value?.conversation;

  if (!conversation) throw new Error("SDK conversation is missing");
  await runWithCurrentClerkToken({
    copilotkit: conversation,
    ...runtime.session,
    run: async () => {
      conversation.addMessage({ id: "question", role: "user", content: "Find milk" });
      await conversation.run();
    },
  });
  expect(client.headers).toMatchObject({
    Authorization: "Bearer fixture-token",
    "x-clerk-user-id": "fixture-user",
  });
  expect(agent.messages.at(-1)).toMatchObject({ id: "question", content: "Find milk" });
  expect(dispatch).toHaveBeenCalledWith({ agent });
  await act(async () => {
    tree?.unmount();
  });
});
