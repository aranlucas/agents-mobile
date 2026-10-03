declare module "react-native-markdown-display" {
  export function removeTextStyleProps(
    style: import("react-native").TextStyle & import("react-native").ViewStyle,
  ): import("react-native").ViewStyle;
  export const textStyleProps: string[];
}

export { NativeMarkdown } from "./native-markdown";

export type { NativeMarkdownProps, NativeMarkdownStyle } from "./native-markdown";
