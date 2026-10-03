import { createElement } from "react";
import type { ImageProps, TextStyle, ViewStyle as NativeViewStyle } from "react-native";
// Minimal `react-native` stub for running unit tests under Node. The host
// component names keep react-test-renderer traversal simple.

type StyleObject = TextStyle & NativeViewStyle;

export const View = "View";

export const Text = "Text";

export const TextInput = "TextInput";

export const Pressable = "Pressable";

export const ScrollView = "ScrollView";

// Native image sizing has no network implementation in Node. The real FitImage
// lifecycle still runs and handles this native failure callback.
export const Image = Object.assign((props: ImageProps) => createElement("Image", props), {
  getSize(
    _uri: string,
    _success: (width: number, height: number) => void,
    failure?: (error: Error) => void,
  ) {
    failure?.(new Error("Native image sizing is unavailable in the Node host"));
  },
});

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

export function useColorScheme() {
  return "light";
}

export type ViewStyle = NativeViewStyle;

export type ColorValue = string;
