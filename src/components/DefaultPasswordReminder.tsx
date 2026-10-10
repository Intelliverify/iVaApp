import { useEffect, useState } from "react";
import { View, Text, Modal, TouchableOpacity, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { COLORS } from "../lib/constants";
import { useSession } from "../store/session";

const SNOOZE_KEY     = "iva_pw_reminder_snooze_until";
const SNOOZE_MS      = 30 * 24 * 60 * 60 * 1000; // ~1 month

// Dismissible reminder shown while a parent is still on the default password.
// Appears at most once a month (snoozed via AsyncStorage when dismissed).
export default function DefaultPasswordReminder() {
  const router = useRouter();
  const { t } = useTranslation();
  const { session } = useSession();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      if (session?.role !== "parent" || !session?.isDefaultPassword) { setVisible(false); return; }
      let until = 0;
      try { until = Number((await AsyncStorage.getItem(SNOOZE_KEY)) || 0); } catch {}
      if (alive) setVisible(Date.now() > until);
    })();
    return () => { alive = false; };
  }, [session?.role, session?.isDefaultPassword]);

  const snooze = async () => {
    try { await AsyncStorage.setItem(SNOOZE_KEY, String(Date.now() + SNOOZE_MS)); } catch {}
    setVisible(false);
  };

  const goChange = () => { setVisible(false); router.push("/(main)/parent/change-password" as any); };

  if (!visible) return null;

  return (
    <Modal visible transparent animationType="fade" onRequestClose={snooze}>
      <View style={s.overlay}>
        <View style={s.sheet}>
          <View style={s.iconWrap}><Ionicons name="lock-closed" size={26} color={COLORS.edu} /></View>
          <Text style={s.title}>{t("defaultPwReminderTitle")}</Text>
          <Text style={s.body}>{t("defaultPwReminderBody")}</Text>
          <TouchableOpacity style={s.primaryBtn} onPress={goChange} activeOpacity={0.85}>
            <Text style={s.primaryTxt}>{t("setYourPassword")}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.secondaryBtn} onPress={snooze} activeOpacity={0.7}>
            <Text style={s.secondaryTxt}>{t("remindMeLater")}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  overlay:      { flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "center", alignItems: "center", padding: 28 },
  sheet:        { width: "100%", backgroundColor: "#fff", borderRadius: 22, padding: 24, alignItems: "center" },
  iconWrap:     { width: 54, height: 54, borderRadius: 27, backgroundColor: COLORS.eduLight, alignItems: "center", justifyContent: "center", marginBottom: 14 },
  title:        { fontSize: 18, fontWeight: "800", color: COLORS.dark, textAlign: "center", marginBottom: 8 },
  body:         { fontSize: 13, color: COLORS.mid, textAlign: "center", lineHeight: 20, marginBottom: 20 },
  primaryBtn:   { width: "100%", backgroundColor: COLORS.edu, borderRadius: 14, padding: 15, alignItems: "center", marginBottom: 10 },
  primaryTxt:   { color: "#fff", fontSize: 15, fontWeight: "700" },
  secondaryBtn: { width: "100%", padding: 12, alignItems: "center" },
  secondaryTxt: { color: COLORS.mid, fontSize: 13, fontWeight: "600" },
});
