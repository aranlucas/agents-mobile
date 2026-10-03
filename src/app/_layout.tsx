// oxlint-disable-next-line import/no-unassigned-import
import "@/shims/node-crypto";
// Installs the Hermes globals CopilotKit needs (streams, encoding, ...). The
// crypto shim above runs first so the secure expo-crypto RNG wins the
// first-writer race against the package's Math.random fallback.
// oxlint-disable-next-line import/no-unassigned-import
import "@copilotkit/react-native/polyfills";
import * as SecureStore from "expo-secure-store";
import { createRootLayout, createTokenCache } from "@/runtime/root-layout";
import { productionBindings } from "@/runtime/production";

export default createRootLayout(productionBindings, createTokenCache(SecureStore));
