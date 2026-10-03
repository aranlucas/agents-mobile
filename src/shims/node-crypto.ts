import { getRandomValues, randomUUID as expoRandomUUID } from "expo-crypto";

export { getRandomValues };

export function randomUUID() {
  return expoRandomUUID();
}

// Preserve an existing platform crypto object and its methods.
if (!globalThis.crypto) {
  Object.defineProperty(globalThis, "crypto", {
    value: { getRandomValues, randomUUID },
    writable: true,
    configurable: true,
  });
} else {
  if (globalThis.crypto.getRandomValues == null)
    Object.assign(globalThis.crypto, { getRandomValues });

  if (globalThis.crypto.randomUUID == null) Object.assign(globalThis.crypto, { randomUUID });
}
