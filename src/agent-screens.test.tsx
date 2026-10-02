import type { ComponentType, ReactNode } from "react";
import { createElement } from "react";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { beforeEach, describe, expect, it, vi } from "vitest";

let currentState: Record<string, unknown> = {};
let currentMessages: unknown[] = [];
const providerProps: Array<Record<string, unknown>> = [];
const frontendTools: Array<Record<string, unknown>> = [];

const addMessage = vi.fn();
const runAgent = vi.fn(async () => undefined);
const setHeaders = vi.fn();
const getToken = vi.fn(async () => "session-jwt");
let userId = "user-123";
const httpFetch = vi.fn();
vi.mock("expo/fetch", () => ({ fetch: httpFetch }));

const agent = {
  addMessage,
  get isRunning() {
    return false;
  },
  get messages() {
    return currentMessages;
  },
  runAgent,
  get state() {
    return currentState;
  },
};

const copilotkit = {
  headers: { "x-client-version": "1" },
  renderToolCalls: [] as Array<{
    name: string;
    agentId?: string;
    render: ComponentType<Record<string, unknown>>;
  }>,
  runAgent,
  setHeaders,
  subscribe: (_subscriber: unknown) => ({ unsubscribe: () => undefined }),
};

vi.mock("@/shims/node-crypto", () => ({}));

vi.mock("@clerk/expo", () => ({
  ClerkProvider: ({ children }: { children: ReactNode }) => <>{children}</>,
  useAuth: () => ({ getToken, userId }),
}));

vi.mock("@copilotkit/react-native/headless", () => ({
  ToolCallStatus: { InProgress: "inProgress", Executing: "executing", Complete: "complete" },
  CopilotKitProvider: ({ children, ...props }: { children: ReactNode }) => {
    providerProps.push(props);
    return <>{children}</>;
  },
  useAgent: () => ({ agent }),
  useCopilotKit: () => ({ copilotkit, executingToolCallIds: new Set<string>() }),
  useFrontendTool: (tool: Record<string, unknown>) => {
    frontendTools.push(tool);
    if (typeof tool.name === "string") {
      copilotkit.renderToolCalls.push({
        name: tool.name,
        agentId: tool.agentId as string | undefined,
        render: tool.render as ComponentType<Record<string, unknown>>,
      });
    }
  },
  useRenderToolCall:
    () =>
    ({ toolCall }: { toolCall: { id: string; function: { name: string; arguments: string } } }) => {
      const entry = copilotkit.renderToolCalls.find((rc) => rc.name === toolCall.function.name);
      if (!entry) return null;
      let args: Record<string, unknown> = {};
      try {
        args = JSON.parse(toolCall.function.arguments) as Record<string, unknown>;
      } catch {
        args = {};
      }
      return createElement(entry.render, {
        name: toolCall.function.name,
        toolCallId: toolCall.id,
        args,
        status: "complete",
      });
    },
}));

vi.mock("expo-constants", () => ({
  default: {
    expoConfig: {
      extra: {
        agentsBaseUrl: "https://agents.example.com",
        clerkPublishableKey: "pk_test",
        copilotKitRuntimeUrl: "https://app.example.com/api/copilotkit",
      },
    },
  },
}));

vi.mock("expo-secure-store", () => ({
  getItemAsync: vi.fn(async () => null),
  setItemAsync: vi.fn(async () => undefined),
}));

vi.mock("expo-status-bar", () => ({ StatusBar: () => null }));

vi.mock("@/native-markdown", () => ({
  NativeMarkdown: ({ children }: { children: ReactNode }) => createElement("Text", null, children),
}));

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

vi.mock("expo-router", () => ({
  Redirect: ({ href }: { href: string }) => createElement("Redirect", { href }),
  Tabs,
}));

vi.mock("@sentry/react-native", () => ({
  init: vi.fn(),
  wrap: (component: ComponentType) => component,
}));

vi.mock("lucide-react-native", () => ({
  Dumbbell: Host,
  HeartPulse: Host,
  Plane: Host,
  ShoppingCart: Host,
}));

vi.mock("../modules/health-data", () => ({
  default: {
    getAvailabilityAsync: vi.fn(async () => ({ status: "unavailable", providerPackage: "" })),
    getPermissionStatusAsync: vi.fn(),
    readActivitiesAsync: vi.fn(),
    requestPermissionsAsync: vi.fn(),
  },
}));

async function render(element: React.ReactElement) {
  let tree: ReactTestRenderer;
  await act(async () => {
    tree = create(element, { unstable_isConcurrent: false });
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
    copilotkit.renderToolCalls.length = 0;
    userId = "user-123";
    addMessage.mockClear();
    getToken.mockReset().mockResolvedValue("session-jwt");
    runAgent.mockReset().mockResolvedValue(undefined);
    httpFetch.mockReset();
    setHeaders.mockClear();
  });

  it("mounts native and web providers around the four real tabs", async () => {
    const { default: NativeLayout } = await import("./app/_layout");
    const { default: WebLayout } = await import("./app/_layout.web");

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
    const { default: healthData } = await import("../modules/health-data");
    const store = await import("expo-secure-store");
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
    httpFetch.mockImplementation(async () => ({
      ok: true,
      json: async () => ({ accepted: 1, synced_at: "2026-10-02T00:00:00.000Z" }),
    }));
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
      tree.update(<Screen />);
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
    const { StatusBar } = await import("expo-status-bar");
    const { default: NativeLayout } = await import("./app/_layout");
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
