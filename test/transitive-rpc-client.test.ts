import { createRequire } from "node:module";
import { describe, expect, it } from "vitest";

type RpcRequest = { jsonrpc: string; id: string; method: string; params: unknown[] };
type RpcCallback = (error: Error | null, response?: unknown) => void;
type RpcClient = {
  request(method: string, params: unknown[]): RpcRequest;
  request(method: string, params: unknown[], callback: RpcCallback): RpcRequest;
  request(batch: RpcRequest[], callback: RpcCallback): RpcRequest[];
};
type RpcClientConstructor = new (
  transport: (request: string, callback: (error: Error | null, response: string) => void) => void,
) => RpcClient;

function createInstalledRpcClient() {
  // Follow the real dependency path without importing native Clerk components.
  let requireDependency = createRequire(import.meta.url);
  for (const dependency of [
    "@clerk/expo",
    "@clerk/clerk-js",
    "@solana/wallet-adapter-base",
    "@solana/web3.js",
  ]) {
    requireDependency = createRequire(requireDependency.resolve(dependency));
  }
  expect((requireDependency("jayson/package.json") as { version: string }).version).toBe("5.0.0");
  const Client = requireDependency("jayson/lib/client/browser") as RpcClientConstructor;
  return new Client((payload, callback) => {
    const request = JSON.parse(payload) as RpcRequest | RpcRequest[];
    const respond = (item: RpcRequest) => ({ jsonrpc: "2.0", id: item.id, result: item.method });
    callback(
      null,
      JSON.stringify(Array.isArray(request) ? request.map(respond) : respond(request)),
    );
  });
}

describe("Solana's installed JSON-RPC browser client", () => {
  it("generates UUIDs and completes the callback request used by Solana", async () => {
    const client = createInstalledRpcClient();
    const response = await new Promise<unknown>((resolve, reject) => {
      client.request("getHealth", [], (error, result) => {
        if (error) reject(error);
        else resolve(result);
      });
    });
    expect(response).toMatchObject({ jsonrpc: "2.0", result: "getHealth" });
    expect(client.request("getHealth", []).id).toMatch(
      /^[\da-f]{8}-[\da-f]{4}-4[\da-f]{3}-[89ab][\da-f]{3}-[\da-f]{12}$/i,
    );
  });

  it("preserves the batch request interface used by Solana", async () => {
    const client = createInstalledRpcClient();
    const batch = [client.request("getHealth", []), client.request("getVersion", [])];
    const response = await new Promise<unknown>((resolve, reject) => {
      client.request(batch, (error, result) => {
        if (error) reject(error);
        else resolve(result);
      });
    });
    expect(response).toEqual(
      batch.map((request) => ({ jsonrpc: "2.0", id: request.id, result: request.method })),
    );
  });
});
