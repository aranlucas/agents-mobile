import {
  AppRuntimeProvider,
  ConversationProvider,
  type AppRuntime,
  type Conversation,
  type ConversationValue,
  type ProductTool,
} from "./runtime/app-runtime";
import { NavigationProvider, type Navigation } from "./runtime/navigation";
import { createRootLayout, createTokenCache, type LayoutBindings } from "./runtime/root-layout";
import { createPostActivities } from "./runtime/health-http";
import { createHealthDataAdapter } from "../modules/health-data/src/health-data-adapter";
import type { TripState, GroceryState, FitnessState, WellnessState } from "@agents/types";
import { ToolCallStatus } from "@copilotkit/react-native/headless";

import { productResultsSchema, type ProductResults } from "./components/product-results-tool";
import type { ComponentType, ReactNode } from "react";
import { createElement } from "react";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { beforeEach, describe, expect, it, vi } from "vitest";

let currentState: TripState | GroceryState | FitnessState | WellnessState = {};

let currentMessages: Conversation["messages"] = [];

type ProviderOptions = {
  runtimeUrl?: string;
  useSingleEndpoint?: boolean;
  defaultThrottleMs?: number;
};

const providerProps: ProviderOptions[] = [];

type ProductFrontendTool = ProductTool;

const frontendTools: ProductFrontendTool[] = [];

const toolRenderers: Pick<ProductFrontendTool, "name" | "agentId" | "render">[] = [];

const addMessage = vi.fn();

const runAgent = vi.fn(async () => undefined);

const setHeaders = vi.fn();

const getToken = vi.fn(async () => "session-jwt");

let userId = "user-123";

const httpFetch = vi.fn<typeof globalThis.fetch>();

const store = {
  getItemAsync: vi.fn<(key: string) => Promise<string | null>>(async () => null),
  setItemAsync: vi.fn<(key: string, value: string) => Promise<void>>(async () => undefined),
};

const healthData = createHealthDataAdapter(() => null);

const conversation: Conversation = {
  addMessage,
  get isRunning() {
    return false;
  },
  get messages() {
    return currentMessages;
  },
  get state() {
    return currentState;
  },
  run: runAgent,
  headers: { "x-client-version": "1" },
  setHeaders,
};

function Host({ children }: { children?: ReactNode }) {
  return <>{children}</>;
}

function Tabs({ children }: { children?: ReactNode }) {
  return <>{children}</>;
}

Tabs.Screen = ({
  options,
}: {
  options?: { tabBarIcon?: ComponentType<{ color: string; size: number }> };
}) => (options?.tabBarIcon ? createElement(options.tabBarIcon, { color: "#111", size: 20 }) : null);

const navigation: Navigation = {
  Tabs,
  Redirect: ({ href }) => createElement("Redirect", { href }),
  icons: { travel: Host, grocery: Host, fitness: Host, wellness: Host },
};

const runtime: AppRuntime = {
  session: {
    getToken,
    get userId() {
      return userId;
    },
  },
  health: {
    healthData,
    storage: store,
    now: () => new Date(),
    postActivities: createPostActivities("https://agents.example.com", httpFetch),
  },
  ConversationProvider: ({ children }) => (
    <ConversationProvider value={{ conversation, renderToolCall }}>{children}</ConversationProvider>
  ),
  ProductTool: ({ tool }) => {
    frontendTools.push(tool);
    toolRenderers.push({ name: tool.name, agentId: tool.agentId, render: tool.render });

    return null;
  },
};

const renderToolCall: ConversationValue["renderToolCall"] = ({ toolCall }) => {
  const entry = toolRenderers.find((rc) => rc.name === toolCall.function.name);

  if (!entry?.render) return null;
  let args: Partial<ProductResults> = {};

  try {
    const parsed = productResultsSchema.safeParse(JSON.parse(toolCall.function.arguments));
    args = parsed.success ? parsed.data : {};
  } catch {
    args = {};
  }

  return createElement(entry.render, {
    name: toolCall.function.name,
    toolCallId: toolCall.id,
    args,
    status: ToolCallStatus.Complete,
  });
};

function RuntimeProvider({ children }: { children: ReactNode }) {
  return <AppRuntimeProvider value={runtime}>{children}</AppRuntimeProvider>;
}

function Harness({ children }: { children: ReactNode }) {
  return (
    <RuntimeProvider>
      <NavigationProvider value={navigation}>{children}</NavigationProvider>
    </RuntimeProvider>
  );
}

const StatusBar = () => null;

const bindings: LayoutBindings = {
  navigation,
  StatusBar,
  wrap: (component) => component,
  providers: {
    AuthProvider: Host,
    AgentProvider: ({ children, ...props }) => {
      providerProps.push(props);

      return <>{children}</>;
    },
    RuntimeProvider,
    publishableKey: "pk_test",
    runtimeUrl: "https://app.example.com/api/copilotkit",
  },
};

const NativeLayout = createRootLayout(bindings, createTokenCache(store));

const WebLayout = createRootLayout(bindings);

async function render(element: React.ReactElement) {
  let tree: ReactTestRenderer;
  await act(async () => {
    tree = create(<Harness>{element}</Harness>, { unstable_isConcurrent: false });
  });

  return tree!;
}

describe("mobile real feature surface", () => {
  beforeEach(() => {
    currentState = {};
    currentMessages = [
      { id: "user-1", role: "user", content: "Hello" },
      { id: "assistant-1", role: "assistant", content: "Ready" },
    ];
    providerProps.length = 0;
    frontendTools.length = 0;
    toolRenderers.length = 0;
    userId = "user-123";
    addMessage.mockClear();
    getToken.mockReset().mockResolvedValue("session-jwt");
    runAgent.mockReset().mockResolvedValue(undefined);
    httpFetch.mockReset().mockRejectedValue(new Error("Unexpected HTTP request in unit test"));
    setHeaders.mockClear();
  });

  it("mounts native and web providers around the four real tabs", async () => {
    const native = await render(<NativeLayout />);
    const web = await render(<WebLayout />);

    expect(native.root.findAllByType(Tabs.Screen)).toHaveLength(5);
    expect(web.root.findAllByType(Tabs.Screen)).toHaveLength(5);
    expect(providerProps).toEqual([
      expect.objectContaining({
        runtimeUrl: "https://app.example.com/api/copilotkit",
        useSingleEndpoint: false,
        defaultThrottleMs: 0,
      }),
      expect.objectContaining({
        runtimeUrl: "https://app.example.com/api/copilotkit",
        useSingleEndpoint: false,
        defaultThrottleMs: 0,
      }),
    ]);

    await act(async () => {
      native.unmount();
      web.unmount();
    });
  });

  it.each([
    ["travel", () => import("./app/travel"), { destination: "Kyoto", status: "ready" }],
    ["grocery", () => import("./app/grocery"), { meal_plan: "Dinner", status: "ready" }],
    ["fitness", () => import("./app/fitness"), { training_plan: "Run", status: "ready" }],
    ["wellness", () => import("./app/wellness"), { weekly_plan: "Week", status: "ready" }],
  ])("renders and sends from the %s agent", async (_name, load, state) => {
    currentState = state;
    const { default: Screen } = await load();
    const tree = await render(<Screen />);
    const input = tree.root.findByType("TextInput");

    await act(async () => {
      input.props.onChangeText("Build my plan");
    });
    await act(async () => {
      await input.props.onSubmitEditing();
    });

    expect(getToken).toHaveBeenCalled();
    expect(setHeaders).toHaveBeenCalledWith({
      "x-client-version": "1",
      Authorization: "Bearer session-jwt",
      "x-clerk-user-id": "user-123",
    });
    expect(addMessage).toHaveBeenCalledWith(
      expect.objectContaining({ content: "Build my plan", role: "user" }),
    );
    expect(runAgent).toHaveBeenCalled();

    await act(async () => {
      tree.unmount();
    });
  });

  it("reserves submission while auth is pending and preserves a newer draft", async () => {
    let resolve!: (token: string) => void;
    getToken.mockReturnValueOnce(
      new Promise((done) => {
        resolve = done;
      }),
    );
    const { default: Screen } = await import("./app/travel");
    const tree = await render(<Screen />);
    const input = tree.root.findByType("TextInput");
    await act(async () => {
      input.props.onChangeText("First message");
    });
    let first!: Promise<void>;
    await act(async () => {
      first = input.props.onSubmitEditing();
      await input.props.onSubmitEditing();
    });
    expect(getToken).toHaveBeenCalledOnce();
    expect(runAgent).not.toHaveBeenCalled();
    expect(tree.root.findByType("Pressable").props.disabled).toBe(true);
    await act(async () => {
      input.props.onChangeText("Next draft");
    });
    await act(async () => {
      resolve("session-jwt");
      await first;
    });
    expect(addMessage).toHaveBeenCalledOnce();
    expect(runAgent).toHaveBeenCalledOnce();
    expect(input.props.value).toBe("Next draft");
    await act(async () => {
      tree.unmount();
    });
  });

  it("keeps an unsent draft and displays recovery when token refresh rejects", async () => {
    getToken.mockRejectedValueOnce(new Error("Offline"));
    const { default: Screen } = await import("./app/travel");
    const tree = await render(<Screen />);
    const input = tree.root.findByType("TextInput");
    await act(async () => {
      input.props.onChangeText("Keep this draft");
    });
    await act(async () => {
      await input.props.onSubmitEditing();
    });
    expect(input.props.value).toBe("Keep this draft");
    expect(addMessage).not.toHaveBeenCalled();
    expect(runAgent).not.toHaveBeenCalled();
    expect(JSON.stringify(tree.toJSON())).toContain("Your message was not sent.");
    await act(async () => {
      await input.props.onSubmitEditing();
    });
    expect(addMessage).toHaveBeenCalledOnce();
    expect(runAgent).toHaveBeenCalledOnce();
    expect(JSON.stringify(tree.toJSON())).not.toContain("Your message was not sent.");
    await act(async () => {
      tree.unmount();
    });
  });

  it("shows an uncertain run outcome without re-adding or replaying the message", async () => {
    runAgent.mockRejectedValueOnce(new Error("Connection dropped"));
    const { default: Screen } = await import("./app/travel");
    const tree = await render(<Screen />);
    const input = tree.root.findByType("TextInput");
    await act(async () => {
      input.props.onChangeText("A single request");
    });
    await act(async () => {
      await input.props.onSubmitEditing();
    });
    const originalMessage = addMessage.mock.calls[0]?.[0];
    expect(originalMessage).toMatchObject({ content: "A single request" });
    expect(input.props.value).toBe("");
    expect(JSON.stringify(tree.toJSON())).toContain("reply could not be confirmed");
    await act(async () => {
      await input.props.onSubmitEditing();
    });
    expect(addMessage).toHaveBeenCalledOnce();
    expect(runAgent).toHaveBeenCalledOnce();
    expect(addMessage.mock.calls[0]?.[0]).toBe(originalMessage);
    await act(async () => {
      tree.unmount();
    });
  });

  it("shows partial health sync, resumes page six, and isolates another account", async () => {
    const saved = new Map<string, string>();
    vi.mocked(store.getItemAsync).mockImplementation(async (key) => saved.get(key) ?? null);
    vi.mocked(store.setItemAsync).mockImplementation(async (key, value) => {
      saved.set(key, value);
    });
    vi.spyOn(healthData, "getAvailabilityAsync").mockResolvedValue({
      status: "available",
      providerPackage: "test",
    });
    vi.spyOn(healthData, "getPermissionStatusAsync").mockResolvedValue({
      granted: true,
      grantedPermissions: [],
      requiredPermissions: [],
    });
    vi.spyOn(healthData, "readActivitiesAsync").mockImplementation(
      async (_after, _before, token) => {
        const index = Number(token ?? 0);

        return { activities: [], nextPageToken: index < 5 ? String(index + 1) : undefined };
      },
    );
    httpFetch.mockImplementation(async () =>
      Response.json({ accepted: 1, synced_at: "2026-10-02T00:00:00.000Z" }),
    );
    const { default: Screen } = await import("./app/fitness");
    const tree = await render(<Screen />);
    const syncButton = () => tree.root.findAllByType("Pressable")[0];
    await act(async () => {
      syncButton().props.onPress();
    });
    expect(JSON.stringify(tree.toJSON())).toContain(
      "5 workouts synced so far. More workouts remain.",
    );
    expect(JSON.stringify(tree.toJSON())).toContain("Continue sync");
    await act(async () => {
      syncButton().props.onPress();
    });
    expect(JSON.stringify(tree.toJSON())).toContain("6 workouts synced");
    expect(httpFetch).toHaveBeenCalledTimes(6);
    await act(async () => {
      userId = "another-user";
      tree.update(
        <Harness>
          <Screen />
        </Harness>,
      );
    });
    expect(JSON.stringify(tree.toJSON())).toContain("Ready to sync the last 30 days");
    expect(JSON.stringify(tree.toJSON())).not.toContain("6 workouts synced");
    await act(async () => {
      tree.unmount();
    });
    vi.spyOn(healthData, "getAvailabilityAsync").mockResolvedValue({
      status: "unavailable",
      providerPackage: "",
    });
    vi.mocked(store.getItemAsync).mockResolvedValue(null);
  });

  it("redirects the root route to travel", async () => {
    const { default: Index } = await import("./app/index");
    const tree = await render(<Index />);

    expect(tree.root.findByType("Redirect").props.href).toBe("/travel");
    await act(async () => {
      tree.unmount();
    });
  });

  it("declares Kroger product results as a grocery frontend tool", async () => {
    const { default: GroceryScreen } = await import("./app/grocery");
    const tree = await render(<GroceryScreen />);

    expect(frontendTools).toEqual([
      expect.objectContaining({
        name: "show_product_results",
        agentId: "grocery",
        handler: expect.any(Function),
        render: expect.any(Function),
      }),
    ]);

    await act(async () => {
      tree.unmount();
    });
  });

  it("renders a grocery frontend tool call inline from the streamed assistant message", async () => {
    currentMessages = [
      {
        id: "assistant-products",
        role: "assistant",
        toolCalls: [
          {
            id: "call-products",
            type: "function",
            function: {
              name: "show_product_results",
              arguments: JSON.stringify({
                products: [{ upc: "0009396651300", name: "Organic Whole Milk", price: 5.49 }],
              }),
            },
          },
        ],
      },
    ];
    const { default: GroceryScreen } = await import("./app/grocery");
    const tree = await render(<GroceryScreen />);

    expect(
      tree.root
        .findAllByType("Text")
        .some((node) => String(node.props.children).includes("Organic Whole Milk")),
    ).toBe(true);

    await act(async () => {
      tree.unmount();
    });
  });

  it("insets agent chrome and the fitness health card below the status bar", async () => {
    const { default: TravelScreen } = await import("./app/travel");
    const { default: FitnessScreen } = await import("./app/fitness");

    const native = await render(<NativeLayout />);
    const travel = await render(<TravelScreen />);
    const fitness = await render(<FitnessScreen />);

    expect(native.root.findAllByType(StatusBar)).toHaveLength(1);

    const travelSafe = travel.root.findAllByType("SafeAreaView");
    expect(travelSafe).toHaveLength(1);
    expect(travelSafe[0]?.props.edges).toEqual(["top"]);

    expect(fitness.root.findAllByType("SafeAreaView").map((node) => node.props.edges)).toEqual([
      ["top"],
      [],
    ]);

    await act(async () => {
      native.unmount();
      travel.unmount();
      fitness.unmount();
    });
  });
});
