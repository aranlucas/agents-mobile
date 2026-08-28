const { getDefaultConfig } = require("expo/metro-config");
const path = require("node:path");

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Node-only packages pulled in by CopilotKit that should never execute in app
// bundles. @segment/analytics-node drags jose's Node build into the bundle;
// on web, static SSR evaluates it against the node:crypto shim below and
// crashes on promisify(crypto.verify).
const STUB_EVERYWHERE = new Set(["@segment/analytics-node"]);
// Node builtins stay real on web (static SSR resolves them to Node itself).
const STUB_NATIVE_ONLY = new Set([
  "node:buffer",
  "node:crypto",
  "node:events",
  "node:stream",
  "node:util",
]);

const innerResolveRequest = config.resolver?.resolveRequest;

config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === "crypto" || moduleName === "node:crypto") {
    return {
      type: "sourceFile",
      filePath: path.resolve(__dirname, "src/shims/node-crypto.ts"),
    };
  }
  if (STUB_EVERYWHERE.has(moduleName)) {
    return { type: "empty" };
  }
  if (platform !== "web" && STUB_NATIVE_ONLY.has(moduleName)) {
    return { type: "empty" };
  }
  if (innerResolveRequest) {
    return innerResolveRequest(context, moduleName, platform);
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
