import { LanguageSupport } from "@codemirror/language";
import { goLanguage, localCompletionSource } from "@codemirror/lang-go";
import { parseMixed } from "@lezer/common";
import { styleTags, tags as t } from "@lezer/highlight";

// Interpolation spans `{...}` inside a double-quoted string; `{{` and `}}` are escaped braces.
const interpolationRanges = (text: string) => {
  const ranges: { from: number; to: number }[] = [];
  let depth = 0;
  let start = -1;

  for (let i = 1; i < text.length - 1; i++) {
    const ch = text[i];
    const next = text[i + 1];

    if (depth === 0 && (ch === "{" || ch === "}") && next === ch) {
      i++;
      continue;
    }

    if (ch === "{") {
      if (depth === 0) start = i;
      depth++;
    } else if (ch === "}" && depth > 0) {
      depth--;
      if (depth === 0) ranges.push({ from: start, to: i + 1 });
    }
  }

  return ranges;
};

const interpolationParser = goLanguage.parser.configure({
  props: [styleTags({ "{ }": t.special(t.string) })],
});

const soppoLanguage = goLanguage.configure({
  wrap: parseMixed((node, input) => {
    if (node.name !== "String") return null;

    const text = input.read(node.from, node.to);
    if (!text.startsWith('"')) return null;

    const overlay = interpolationRanges(text).map(({ from, to }) => ({
      from: node.from + from,
      to: node.from + to,
    }));

    return overlay.length ? { parser: interpolationParser, overlay } : null;
  }),
});

export const soppo = () =>
  new LanguageSupport(soppoLanguage, [
    soppoLanguage.data.of({ autocomplete: localCompletionSource }),
  ]);
