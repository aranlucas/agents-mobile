// Minimal `react-native` stub for running unit tests under Node. The host
// component names keep react-test-renderer traversal simple.

type StyleObject = Record<string, unknown>;

export const View = "View";
export const Text = "Text";
export const TextInput = "TextInput";
export const Pressable = "Pressable";
export const ScrollView = "ScrollView";
export const Image = "Image";
export const ActivityIndicator = "ActivityIndicator";
export const KeyboardAvoidingView = "KeyboardAvoidingView";

export const StyleSheet = {
  create<T extends Record<string, StyleObject>>(styles: T): T {
    return styles;
  },
  flatten(style?: StyleObject | StyleObject[] | null): StyleObject | undefined {
    if (!style) return undefined;
    if (Array.isArray(style)) {
      return Object.assign({}, ...style.filter(Boolean));
    }
    return style;
  },
};

export const Platform = {
  OS: "ios" as const,
  select<T>(spec: { ios?: T; android?: T; default?: T }): T | undefined {
    return spec.ios ?? spec.default;
  },
};

export const PixelRatio = {
  getFontScale: () => 1,
};

export const Animated = {
  Text: "Animated.Text",
  Value: class {
    constructor(readonly value: number) {}
  },
  loop(animation: { start(): void; stop(): void }) {
    return animation;
  },
  sequence(_animations: unknown[]) {
    return { start() {}, stop() {} };
  },
  timing(_value: unknown, _config: unknown) {
    return { start() {}, stop() {} };
  },
};

export function useColorScheme() {
  return "light";
}

export type ViewStyle = Record<string, unknown>;
export type ColorValue = string;
