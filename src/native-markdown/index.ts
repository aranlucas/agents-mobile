declare module "react-native-markdown-display" {
  export function removeTextStyleProps(style: Record<string, unknown>): Record<string, unknown>;
  export const textStyleProps: string[];
}

export { NativeMarkdown } from "./native-markdown";
export type { NativeMarkdownProps, NativeMarkdownStyle } from "./native-markdown";
