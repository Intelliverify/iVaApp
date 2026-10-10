import { useState } from "react";
import {
  View, Text, ScrollView, StyleSheet, TextInput,
  TouchableOpacity, Alert, ActivityIndicator, KeyboardAvoidingView, Platform,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { COLORS } from "../../../src/lib/constants";
import { useSession } from "../../../src/store/session";
import { changePassword } from "../../../src/lib/api";

export default function ChangePassword() {
  const router = useRouter();
  const { t } = useTranslation();
  const { session, setSession } = useSession();

  const [current, setCurrent] = useState("");
  const [next, setNext]       = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy]       = useState(false);

  const handleSave = async () => {
    if (!current || !next || !confirm) { Alert.alert(t("fillAllFields")); return; }
    if (next.length < 8)   { Alert.alert(t("changePassword"), t("passwordMin8")); return; }
    if (next !== confirm)  { Alert.alert(t("changePassword"), t("passwordsNoMatch")); return; }
    if (next === current)  { Alert.alert(t("changePassword"), t("passwordSameAsCurrent")); return; }

    setBusy(true);
    const data = await changePassword(session?.phone || "", current, next);
    setBusy(false);
    if (data.error) { Alert.alert(t("changePassword"), data.error); return; }

    // No longer on the default password — update the session so the reminder stops.
    if (session) await setSession({ ...session, isDefaultPassword: false });

    Alert.alert(t("changePassword"), t("passwordChanged"), [
      { text: "OK", onPress: () => router.back() },
    ]);
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: COLORS.bg }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView style={s.root} contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">

        {/* Header */}
        <View style={s.headerRow}>
          <TouchableOpacity onPress={() => router.back()} style={s.backBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Ionicons name="arrow-back" size={22} color={COLORS.dark} />
          </TouchableOpacity>
          <Text style={s.pageTitle}>{t("changePassword")}</Text>
        </View>

        <View style={s.card}>
          <Text style={s.label}>{t("currentPassword")}</Text>
          <TextInput
            style={s.input}
            placeholder={t("currentPassword")}
            placeholderTextColor={COLORS.mid}
            secureTextEntry
            value={current}
            onChangeText={setCurrent}
          />

          <Text style={s.label}>{t("newPasswordLabel")}</Text>
          <TextInput
            style={s.input}
            placeholder={t("passwordMin8")}
            placeholderTextColor={COLORS.mid}
            secureTextEntry
            value={next}
            onChangeText={setNext}
          />

          <Text style={s.label}>{t("confirmPassword")}</Text>
          <TextInput
            style={s.input}
            placeholder={t("confirmPassword")}
            placeholderTextColor={COLORS.mid}
            secureTextEntry
            value={confirm}
            onChangeText={setConfirm}
          />

          <Text style={s.hint}>{t("passwordNotDefaultHint")}</Text>

          <TouchableOpacity style={[s.btn, busy && s.btnDisabled]} onPress={handleSave} disabled={busy}>
            {busy ? <ActivityIndicator color="#fff" /> : <Text style={s.btnTxt}>{t("updatePassword")}</Text>}
          </TouchableOpacity>
        </View>

      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  root:       { flex: 1, backgroundColor: COLORS.bg },
  content:    { padding: 20, paddingBottom: 50 },
  headerRow:  { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 20 },
  backBtn:    { padding: 2 },
  pageTitle:  { fontSize: 20, fontWeight: "800", color: COLORS.dark },
  card:       { backgroundColor: "#fff", borderRadius: 20, borderWidth: 1, borderColor: COLORS.border, padding: 20 },
  label:      { fontSize: 12, fontWeight: "700", color: COLORS.mid, marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.5 },
  input:      { backgroundColor: COLORS.bg, borderRadius: 12, padding: 14, fontSize: 15, color: COLORS.dark, borderWidth: 1, borderColor: COLORS.border, marginBottom: 16 },
  hint:       { fontSize: 12, color: COLORS.mid, lineHeight: 18, marginBottom: 18 },
  btn:        { backgroundColor: COLORS.edu, borderRadius: 14, padding: 16, alignItems: "center" },
  btnDisabled:{ opacity: 0.6 },
  btnTxt:     { color: "#fff", fontSize: 16, fontWeight: "700" },
});
