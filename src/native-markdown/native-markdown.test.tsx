import { z } from "zod";
import type { ReactElement, ReactNode } from "react";
import { isValidElement } from "react";
import type { ASTNode } from "react-native-markdown-display";
import { describe, expect, it } from "vitest";

import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { NativeMarkdown, prepareMarkdownBlocks } from "./native-markdown";
import { createMarkdownRules, markdownRules } from "./rules";

describe("NativeMarkdown table rendering", () => {
  it("wraps tables in a nested horizontal scroll view", () => {
    const node = astNode("table", "table-1", "");

    const result = markdownRules.table?.(node, ["table contents"], [], {
      tableScroller: {},
      _VIEW_SAFE_table: {},
    });

    expect(isValidElement(result)).toBe(true);

    const table = elementWithProps(
      result,
      z.object({
        children: reactElement,
        horizontal: z.boolean(),
        nestedScrollEnabled: z.boolean(),
        style: z.array(z.unknown()),
      }),
    );

    expect(table.type).toBe("ScrollView");
    expect(table.props.horizontal).toBe(true);
    expect(table.props.nestedScrollEnabled).toBe(true);
    expect(table.props.style).toContainEqual({ flexGrow: 0 });
    expect(table.props.children.type).toBe("View");
  });

  it("sizes each column consistently from its widest content", () => {
    const shortHeader = astNode("th", "short-header", "Item");
    const wideHeader = astNode("th", "wide-header", "Notes");
    const shortCell = astNode("td", "short-cell", "Milk");

    const wideCell = astNode(
      "td",
      "wide-cell",
      "A much longer description that needs additional column width",
    );

    const headerRow = astNode("tr", "header-row", "", [shortHeader, wideHeader]);
    const bodyRow = astNode("tr", "body-row", "", [shortCell, wideCell]);
    const head = astNode("thead", "head", "", [headerRow]);
    const body = astNode("tbody", "body", "", [bodyRow]);
    const tableNode = astNode("table", "table", "", [head, body]);
    const styles = { _VIEW_SAFE_th: {}, _VIEW_SAFE_td: {} };

    const header = markdownRules.th?.(shortHeader, ["Item"], [headerRow, head, tableNode], styles);
    const cell = markdownRules.td?.(shortCell, ["Milk"], [bodyRow, body, tableNode], styles);
    const wide = markdownRules.td?.(wideCell, ["Description"], [bodyRow, body, tableNode], styles);
    const headerDimensions = cellDimensions(header);
    const cellDimensionsValue = cellDimensions(cell);
    const wideDimensions = cellDimensions(wide);

    expect(headerDimensions).toEqual(cellDimensionsValue);
    expect(headerDimensions.minWidth).toBeGreaterThanOrEqual(112);
    expect(wideDimensions.minWidth).toBeGreaterThan(z.number().parse(headerDimensions.minWidth));
    expect(wideDimensions.flexShrink).toBe(0);
  });

  it("honors GFM column alignment on cells", () => {
    const centered = astNode("td", "centered", "Qty", [], { style: "text-align:center" });
    const righted = astNode("td", "righted", "9.99", [], { style: "text-align:right" });
    const plain = astNode("td", "plain", "Milk");
    const row = astNode("tr", "row", "", [centered, righted, plain]);
    const body = astNode("tbody", "body", "", [row]);
    const tableNode = astNode("table", "table", "", [body]);
    const styles = { _VIEW_SAFE_td: {} };

    const centeredCell = markdownRules.td?.(centered, [], [row, body, tableNode], styles);
    const rightCell = markdownRules.td?.(righted, [], [row, body, tableNode], styles);
    const plainCell = markdownRules.td?.(plain, [], [row, body, tableNode], styles);

    expect(cellDimensions(centeredCell).alignItems).toBe("center");
    expect(cellDimensions(rightCell).alignItems).toBe("flex-end");
    expect(cellDimensions(plainCell).alignItems).toBeUndefined();
  });

  it("drops the bottom border on the table's last row", () => {
    const headerRow = astNode("tr", "header-row", "");
    const firstRow = astNode("tr", "first-row", "");
    const lastRow = astNode("tr", "last-row", "");
    const head = astNode("thead", "head", "", [headerRow]);
    const body = astNode("tbody", "body", "", [firstRow, lastRow]);
    const tableNode = astNode("table", "table", "", [head, body]);
    const styles = { _VIEW_SAFE_tr: {} };

    const first = elementWithProps(
      markdownRules.tr?.(firstRow, [], [body, tableNode], styles),
      z.object({ style: z.array(z.unknown()) }),
    );

    const last = elementWithProps(
      markdownRules.tr?.(lastRow, [], [body, tableNode], styles),
      z.object({ style: z.array(z.unknown()) }),
    );

    expect(first.props.style[1]).toBeFalsy();
    expect(last.props.style[1]).toEqual({ borderBottomWidth: 0 });
  });

  it("widens columns for emoji and CJK content", () => {
    const styles = { _VIEW_SAFE_td: {} };

    const buildTable = (text: string, prefix: string) => {
      const cell = astNode("td", `${prefix}-cell`, text);
      const row = astNode("tr", `${prefix}-row`, "", [cell]);
      const body = astNode("tbody", `${prefix}-body`, "", [row]);
      const tableNode = astNode("table", `${prefix}-table`, "", [body]);

      return { cell, parents: [row, body, tableNode] };
    };

    const ascii = buildTable("apples and pears jam", "ascii");
    const emoji = buildTable("🍎🍐🍞🥛🧀🍗🍚🥦🥕🧅🍋🍊🍇🫐🍓🥔🌽🍅🥬🥒", "emoji");
    const asciiCell = markdownRules.td?.(ascii.cell, [], ascii.parents, styles);
    const emojiCell = markdownRules.td?.(emoji.cell, [], emoji.parents, styles);

    expect(z.number().parse(cellDimensions(emojiCell).width)).toBeGreaterThan(
      z.number().parse(cellDimensions(asciiCell).width),
    );
  });
});

describe("NativeMarkdown rendering rules", () => {
  it("makes text selectable by default and supports opting out", () => {
    const node = astNode("textgroup", "textgroup", "");
    const selectable = markdownRules.textgroup?.(node, ["Text"], [], { textgroup: {} });

    const notSelectable = createMarkdownRules(false).textgroup?.(node, ["Text"], [], {
      textgroup: {},
    });

    expect(elementProps(selectable).selectable).toBe(true);
    expect(elementProps(notSelectable).selectable).toBe(false);
  });

  it("renders checkbox tokens as selectable glyphs", () => {
    const checked = markdownRules.checkbox?.(astNode("checkbox", "checked", "true"), [], [], {
      checkbox: {},
    });

    const unchecked = markdownRules.checkbox?.(astNode("checkbox", "unchecked", "false"), [], [], {
      checkbox: {},
    });

    expect(elementProps(checked).children).toBe("☑ ");
    expect(elementProps(checked).selectable).toBe(true);
    expect(elementProps(unchecked).children).toBe("☐ ");
  });

  it("renders fenced code in a labeled horizontal scroller with split styles", () => {
    const node = {
      ...astNode("fence", "fence", "const value = 1;\n"),
      sourceInfo: "typescript",
    };

    const result = markdownRules.fence?.(node, [], [], {
      codeLanguage: { fontSize: 12 },
      codeScroller: { maxWidth: "100%" },
      fence: { backgroundColor: "gray", fontFamily: "monospace", padding: 10 },
    });

    const fence = elementWithProps(
      result,
      z.object({ children: z.array(reactElement), style: z.unknown() }),
    );

    const [labelElement, scrollerElement] = fence.props.children;
    const label = elementWithProps(labelElement, z.object({ children: z.string() }));

    const scroller = elementWithProps(
      scrollerElement,
      z.object({
        children: reactElement,
        horizontal: z.boolean(),
        nestedScrollEnabled: z.boolean(),
      }),
    );

    const code = elementWithProps(
      scroller.props.children,
      z.object({ children: z.string(), selectable: z.boolean(), style: z.array(z.unknown()) }),
    );

    expect(fence.type).toBe("View");
    expect(fence.props.style).toEqual({ backgroundColor: "gray", padding: 10 });
    expect(label?.type).toBe("Text");
    expect(label?.props.children).toBe("typescript");
    expect(scroller?.type).toBe("ScrollView");
    expect(scroller?.props.horizontal).toBe(true);
    expect(scroller?.props.nestedScrollEnabled).toBe(true);
    expect(code.type).toBe("Text");
    expect(code.props.children).toBe("const value = 1;");
    expect(code.props.selectable).toBe(true);
    expect(code.props.style[1]).toEqual({ fontFamily: "monospace" });
  });

  it("converts ordered-list starts to numbers before adding the item index", () => {
    const item = astNode("list_item", "item", "");
    item.index = 0;
    item.markup = ".";
    const orderedList = astNode("ordered_list", "ordered", "", [], { start: "2" });

    const rendered = markdownRules.list_item?.(item, ["Second"], [orderedList], {
      _VIEW_SAFE_list_item: {},
      _VIEW_SAFE_ordered_list_content: {},
      list_item: {},
      ordered_list_icon: {},
    });

    const result = elementWithProps(rendered, z.object({ children: z.array(reactElement) }));

    const icon = elementWithProps(
      result.props.children[0],
      z.object({ children: z.array(z.union([z.number(), z.string()])) }),
    );

    expect(icon?.props.children).toEqual([2, "."]);
  });
});

describe("NativeMarkdown streaming preparation", () => {
  it("applies remend to the last block only while streaming", () => {
    expect(prepareMarkdownBlocks("**complete**\n\n**partial", true)).toEqual([
      "**complete**",
      "**partial**",
    ]);
    expect(prepareMarkdownBlocks("**complete**\n\n**partial", false)).toEqual([
      "**complete**",
      "**partial",
    ]);
  });
});

function astNode(
  type: string,
  key: string,
  content: string,
  children: ASTNode[] = [],
  attributes: Record<string, string> = {},
): ASTNode {
  return {
    type,
    sourceType: type,
    key,
    content,
    markup: "",
    tokenIndex: 0,
    index: 0,
    attributes,
    children,
  };
}

const reactElement = z.custom<ReactElement>(isValidElement);

function elementWithProps<T extends z.ZodType>(value: ReactNode, schema: T) {
  if (!isValidElement(value)) throw new Error("Expected a rendered React element");

  return { type: value.type, props: schema.parse(value.props) };
}

function cellDimensions(value: ReactNode) {
  const element = elementWithProps(value, z.object({ style: z.array(z.unknown()) }));

  return z
    .object({
      minWidth: z.number().optional(),
      width: z.number().optional(),
      flexShrink: z.number().optional(),
      alignItems: z.string().optional(),
    })
    .parse(element.props.style[1]);
}

function elementProps(value: ReactNode) {
  return elementWithProps(
    value,
    z.object({ selectable: z.boolean().optional(), children: z.unknown().optional() }),
  ).props;
}

it("renders images through the installed FitImage lifecycle without native networking", async () => {
  let tree: ReactTestRenderer;
  await act(async () => {
    tree = create(
      <NativeMarkdown>{"![Milk](https://images.example.test/milk.png)"}</NativeMarkdown>,
    );
  });
  const image = tree!.root.findByType("Image");
  expect(image.props.source).toEqual({ uri: "https://images.example.test/milk.png" });
  expect(image.props.onLayout).toBeTypeOf("function");
  await act(async () => {
    image.props.onLayout({ nativeEvent: { layout: { width: 240 } } });
    image.props.onLoadStart();
  });
  expect(tree!.root.findAllByType("ActivityIndicator")).toHaveLength(1);
  await act(async () => {
    image.props.onLoad();
  });
  expect(tree!.root.findAllByType("ActivityIndicator")).toHaveLength(0);
  await act(async () => {
    tree!.unmount();
  });
});
