import { Text, Linking, Alert, StyleSheet, TextStyle, StyleProp } from "react-native";
import { COLORS } from "../lib/constants";

/**
 * Renders a plain string but turns any URL inside it into a tappable link.
 * Tapping opens the link with Linking.openURL, so the OS routes it to the
 * relevant app when one is installed (YouTube links → YouTube app, maps → Maps,
 * etc.) and falls back to the browser otherwise.
 *
 * Matches http(s):// and bare www. links. Trailing sentence punctuation
 * (. , ; : ! ?) is kept out of the link so "watch www.youtu.be/x." works.
 */
const URL_RE = /((?:https?:\/\/|www\.)[^\s]+)/gi;      // for split (captures the URL)
const IS_URL = /^(?:https?:\/\/|www\.)[^\s]+$/i;       // for testing a split part (no /g state)

function openLink(raw: string) {
  // Strip trailing punctuation that is almost never part of the URL.
  const url = raw.replace(/[.,;:!?)\]}'"]+$/, "");
  const href = /^https?:\/\//i.test(url) ? url : `https://${url}`;
  Linking.openURL(href).catch(() =>
    Alert.alert("Can't open link", "No app was found to open this link."),
  );
}

export default function LinkText({
  children,
  style,
  linkStyle,
  numberOfLines,
}: {
  children?: string | null;
  style?: StyleProp<TextStyle>;
  linkStyle?: StyleProp<TextStyle>;
  numberOfLines?: number;
}) {
  const text = children ?? "";
  if (!text) return null;

  const parts = text.split(URL_RE);
  return (
    <Text style={style} numberOfLines={numberOfLines}>
      {parts.map((part, i) =>
        IS_URL.test(part) ? (
          <Text
            key={i}
            style={[s.link, linkStyle]}
            onPress={() => openLink(part)}
            suppressHighlighting
          >
            {part}
          </Text>
        ) : (
          part
        ),
      )}
    </Text>
  );
}

const s = StyleSheet.create({
  link: { color: COLORS.edu, textDecorationLine: "underline", fontWeight: "600" },
});
