import { Text, Linking, Alert, StyleProp, TextStyle } from "react-native";
import { COLORS } from "../lib/constants";

// SAFE lightweight rich text for React Native — no deps, no HTML.
// Mirrors the web RichText: **bold**, *italic*, ==highlight==, links, newlines.
// Newlines render natively inside a <Text>.

type TokType = "text" | "bold" | "italic" | "mark" | "link";
type Tok = { t: TokType; v: string };

const RULES: { re: RegExp; t: TokType }[] = [
  { re: /\*\*([^*\n]+)\*\*/, t: "bold" },
  { re: /==([^=\n]+)==/, t: "mark" },
  { re: /\*([^*\n]+)\*/, t: "italic" },
  { re: /((?:https?:\/\/|www\.)[^\s]+)/, t: "link" },
];

function tokenize(input: string): Tok[] {
  const toks: Tok[] = [];
  let s = input;
  let guard = 0;
  while (s.length && guard++ < 5000) {
    let best: { idx: number; len: number; v: string; t: TokType } | null = null;
    for (const r of RULES) {
      const m = r.re.exec(s);
      if (m && (best === null || m.index < best.idx)) best = { idx: m.index, len: m[0].length, v: m[1], t: r.t };
    }
    if (!best) { toks.push({ t: "text", v: s }); break; }
    if (best.idx > 0) toks.push({ t: "text", v: s.slice(0, best.idx) });
    toks.push({ t: best.t, v: best.v });
    s = s.slice(best.idx + best.len);
  }
  return toks;
}

function openLink(raw: string) {
  const url = raw.replace(/[.,;:!?)\]}'"]+$/, "");
  const href = /^https?:\/\//i.test(url) ? url : `https://${url}`;
  Linking.openURL(href).catch(() => Alert.alert("Can't open link", "No app was found to open this link."));
}

export default function RichText({
  children,
  style,
  accent = COLORS.edu,
  numberOfLines,
}: {
  children?: string | null;
  style?: StyleProp<TextStyle>;
  accent?: string;
  numberOfLines?: number;
}) {
  const text = children ?? "";
  if (!text) return null;
  const toks = tokenize(String(text));
  return (
    <Text style={style} numberOfLines={numberOfLines}>
      {toks.map((tk, i) => {
        switch (tk.t) {
          case "bold":
            return <Text key={i} style={{ fontWeight: "800" }}>{tk.v}</Text>;
          case "italic":
            return <Text key={i} style={{ fontStyle: "italic" }}>{tk.v}</Text>;
          case "mark":
            return <Text key={i} style={{ backgroundColor: accent + "33", color: COLORS.dark }}>{tk.v}</Text>;
          case "link":
            return (
              <Text key={i} style={{ color: accent, textDecorationLine: "underline", fontWeight: "600" }} onPress={() => openLink(tk.v)} suppressHighlighting>
                {tk.v}
              </Text>
            );
          default:
            return tk.v;
        }
      })}
    </Text>
  );
}
