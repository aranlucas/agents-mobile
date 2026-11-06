import type { TokenCache } from "@clerk/expo";
import { AccountAgentProvider } from "@/components/app-providers";
import { useState, type ReactNode } from "react";
import { act, create } from "react-test-renderer";
import { expect, it, vi } from "vitest";
import { createRootLayout, createTokenCache, type LayoutBindings } from "@/runtime/root-layout";

it("preserves native secure token storage and leaves web cache to Clerk", async () => {
  const storage = {
    getItemAsync: vi.fn(async (key: string) => `stored-${key}`),
    setItemAsync: vi.fn(async (_key: string, _value: string) => undefined),
  };

  const auth: { publishableKey: string; tokenCache?: TokenCache }[] = [];
  const order: string[] = [];

  function AuthProvider({
    children,
    ...props
  }: {
    children: ReactNode;
    publishableKey: string;
    tokenCache?: TokenCache;
  }) {
    auth.push(props);
    order.push("auth");

    return <>{children}</>;
  }

  function AgentProvider({ children }: { children: ReactNode }) {
    order.push("agent");

    return <>{children}</>;
  }

  function RuntimeProvider({ children }: { children: ReactNode }) {
    order.push("runtime");

    return <>{children}</>;
  }

  function Tabs({ children }: { children?: ReactNode }) {
    order.push("tabs");

    return <>{children}</>;
  }

  Tabs.Screen = () => null;

  const wrap = vi.fn((component: React.ComponentType) => component);

  const bindings: LayoutBindings = {
    providers: {
      AuthProvider,
      AgentProvider,
      RuntimeProvider,
      publishableKey: "fixture-key",
      runtimeUrl: "https://runtime.example.test",
    },
    navigation: {
      Tabs,
      Redirect: () => null,
      icons: { travel: Icon, grocery: Icon, fitness: Icon, wellness: Icon },
    },
    StatusBar: () => null,
    wrap,
  };

  const Native = createRootLayout(bindings, createTokenCache(storage));
  const Web = createRootLayout(bindings);
  expect(wrap).toHaveBeenCalledTimes(2);
  let tree: ReturnType<typeof create>;
  await act(async () => {
    tree = create(
      <>
        <Native />
        <Web />
      </>,
    );
  });
  expect(order.slice(-8)).toEqual([
    "auth",
    "agent",
    "runtime",
    "tabs",
    "auth",
    "agent",
    "runtime",
    "tabs",
  ]);
  expect(auth.at(-2)?.publishableKey).toBe("fixture-key");
  const nativeCache = auth.at(-2)?.tokenCache;
  expect(nativeCache).toBeDefined();
  expect(auth.at(-1)?.tokenCache).toBeUndefined();
  expect(await nativeCache?.getToken("session")).toBe("stored-session");
  await nativeCache?.saveToken("session", "fixture-token");
  expect(storage.getItemAsync).toHaveBeenCalledWith("session");
  expect(storage.setItemAsync).toHaveBeenCalledWith("session", "fixture-token");
  storage.getItemAsync.mockRejectedValueOnce(new Error("Storage unavailable"));
  await expect(nativeCache?.getToken("session")).rejects.toThrow("Storage unavailable");
  await act(async () => {
    tree.unmount();
  });
});

function Icon() {
  return null;
}

// A provider owns conversation history; account transitions must discard it.
it("discards account-owned history and drafts, preserving same-account renders", async () => {
  function Client({ children }: { children: ReactNode }) {
    const [history, setHistory] = useState("");
    return (
      <>
        <button onClick={() => setHistory("private history")}>{history}</button>
        {children}
      </>
    );
  }
  function Draft() {
    const [draft, setDraft] = useState("");
    return <input value={draft} onChange={() => setDraft("private draft")} />;
  }
  const screen = (userId: string | null) => (
    <AccountAgentProvider
      userId={userId}
      Provider={Client}
      runtimeUrl="https://example.test"
      defaultThrottleMs={0}
      useSingleEndpoint={false}
    >
      <Draft />
    </AccountAgentProvider>
  );
  let tree!: ReturnType<typeof create>;
  await act(async () => {
    tree = create(screen("user-a"));
  });
  await act(async () => {
    tree.root.findByType("button").props.onClick();
    tree.root.findByType("input").props.onChange();
  });
  await act(async () => {
    tree.update(screen("user-a"));
  });
  expect(tree.root.findByType("button").props.children).toBe("private history");
  expect(tree.root.findByType("input").props.value).toBe("private draft");
  for (const account of ["user-b", null, "user-a"]) {
    await act(async () => {
      tree.update(screen(account));
    });
    expect(tree.root.findByType("button").props.children).toBe("");
    expect(tree.root.findByType("input").props.value).toBe("");
    await act(async () => {
      tree.root.findByType("button").props.onClick();
      tree.root.findByType("input").props.onChange();
    });
  }
  await act(async () => {
    tree.unmount();
  });
});
