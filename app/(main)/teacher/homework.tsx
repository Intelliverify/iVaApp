import { useEffect, useState } from "react";
import {
  View, Text, ScrollView, StyleSheet, TextInput, TouchableOpacity,
  ActivityIndicator, RefreshControl, Alert, KeyboardAvoidingView, Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "../../../src/lib/constants";
import { supabase } from "../../../src/lib/supabase";
import { useSession } from "../../../src/store/session";
import { useRealtime } from "../../../src/lib/realtime";
import Attacher from "../../../src/components/Attacher";
import TeacherHomeworkCard from "../../../src/components/TeacherHomeworkCard";

const SUBJECTS = ["English", "Hindi", "Maths", "Science", "EVS", "Drawing", "GK", "Other"];

export default function TeacherHomework() {
  const { session } = useSession();
  const [list, setList]       = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refresh, setRefresh] = useState(false);

  // Form state
  const [subject, setSubject]   = useState(SUBJECTS[0]);
  const [title, setTitle]       = useState("");
  const [desc, setDesc]         = useState("");
  const [dueDate, setDueDate]   = useState("");
  const [keywords, setKeywords] = useState("");
  const [attachments, setAttachments] = useState<any[]>([]);
  const [statusByHw, setStatusByHw]   = useState<Record<string, any[]>>({});
  const [submitting, setSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId]     = useState<string | null>(null);        // homework being edited (null = create)
  const [descSel, setDescSel]   = useState({ start: 0, end: 0 });        // for the rich-text toolbar

  const load = async (isRefresh = false) => {
    if (isRefresh) setRefresh(true); else setLoading(true);
    try {
      if (session?.sectionId) {
        const { data } = await supabase
          .from("homework")
          .select("*")
          .eq("section_id", session.sectionId)
          .order("created_at", { ascending: false })
          .limit(50);
        setList(data || []);
        const ids = (data || []).map((h: any) => h.id);
        if (ids.length) {
          const { data: st } = await supabase.from("homework_status").select("*").in("homework_id", ids);
          const map: Record<string, any[]> = {};
          (st || []).forEach((r: any) => { (map[r.homework_id] ??= []).push(r); });
          setStatusByHw(map);
        } else { setStatusByHw({}); }
      }
    } catch {}
    if (isRefresh) setRefresh(false); else setLoading(false);
  };

  useEffect(() => { load(); }, [session?.sectionId]);
  useRealtime("homework", () => load());
  useRealtime("homework_status", () => load());

  const resetForm = () => {
    setTitle(""); setDesc(""); setDueDate(""); setKeywords(""); setAttachments([]); setEditId(null);
  };

  // Open the form pre-filled to edit an existing homework.
  const startEdit = (hw: any) => {
    setEditId(hw.id);
    setSubject(hw.subject || SUBJECTS[0]);
    setTitle(hw.title || "");
    setDesc(hw.description || "");
    setDueDate((hw.due_date || "").slice(0, 10));
    setKeywords(hw.audio_keywords || "");
    setAttachments(Array.isArray(hw.attachments) ? hw.attachments : []);
    setShowForm(true);
  };

  // Rich-text toolbar: wrap the current description selection with markers.
  const wrapDesc = (marker: string) => {
    const { start, end } = descSel;
    const sel = desc.slice(start, end) || "text";
    setDesc(desc.slice(0, start) + marker + sel + marker + desc.slice(end));
  };

  const handleSubmit = async () => {
    if (!title.trim()) { Alert.alert("Enter a title"); return; }
    setSubmitting(true);
    try {
      const base: any = {
        subject,
        title:       title.trim(),
        description: desc.trim() || null,
        due_date:    dueDate || null,
        attachments,
      };
      let error;
      if (editId) {
        // UPDATE existing homework
        ({ error } = await supabase.from("homework").update({ ...base, audio_keywords: keywords.trim() || null }).eq("id", editId));
        if (error && /audio_keywords/i.test(error.message)) {
          ({ error } = await supabase.from("homework").update(base).eq("id", editId));
        }
      } else {
        // INSERT new homework
        const ins = { ...base, section_id: session?.sectionId, assigned_by: session?.name || null };
        ({ error } = await supabase.from("homework").insert({ ...ins, audio_keywords: keywords.trim() || null }));
        if (error && /audio_keywords/i.test(error.message)) {
          ({ error } = await supabase.from("homework").insert(ins));
        }
      }
      if (error) { Alert.alert("Error", error.message); return; }
      const wasEdit = !!editId;
      resetForm(); setShowForm(false);
      load(true); // refresh in place (no full-screen spinner)
      Alert.alert("Done", wasEdit ? "Homework updated!" : "Homework assigned!");
    } catch (e: any) {
      Alert.alert("Error", e?.message || "Could not save. Check connection.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <View style={s.center}><ActivityIndicator size="large" color={COLORS.primary} /></View>;
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView
        style={s.root}
        contentContainerStyle={s.content}
        refreshControl={<RefreshControl refreshing={refresh} onRefresh={() => load(true)} tintColor={COLORS.primary} />}
        keyboardShouldPersistTaps="handled"
      >
        <View style={s.pageHeader}>
          <Text style={s.pageTitle}>Homework</Text>
          <TouchableOpacity style={s.addBtn} onPress={() => { if (showForm) { setShowForm(false); resetForm(); } else { resetForm(); setShowForm(true); } }}>
            <Ionicons name={showForm ? "close" : "add"} size={20} color="#fff" />
            <Text style={s.addBtnTxt}>{showForm ? "Cancel" : "Assign"}</Text>
          </TouchableOpacity>
        </View>

        {/* Assign form */}
        {showForm && (
          <View style={s.formCard}>
            <Text style={s.formTitle}>{editId ? "✏️ Edit Assignment" : "New Assignment"}</Text>

            {/* Subject picker */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 14 }}>
              <View style={s.subjectRow}>
                {SUBJECTS.map((sub) => (
                  <TouchableOpacity
                    key={sub}
                    style={[s.subjectPill, subject === sub && s.subjectPillActive]}
                    onPress={() => setSubject(sub)}
                  >
                    <Text style={[s.subjectTxt, subject === sub && s.subjectTxtActive]}>{sub}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>

            <TextInput
              style={s.formInput}
              placeholder="Title *"
              placeholderTextColor={COLORS.mid}
              value={title}
              onChangeText={setTitle}
            />
            <View style={s.rtBar}>
              <TouchableOpacity style={s.rtBtn} onPress={() => wrapDesc("**")}><Text style={[s.rtBtnTxt, { fontWeight: "900" }]}>B</Text></TouchableOpacity>
              <TouchableOpacity style={s.rtBtn} onPress={() => wrapDesc("*")}><Text style={[s.rtBtnTxt, { fontStyle: "italic" }]}>i</Text></TouchableOpacity>
              <TouchableOpacity style={[s.rtBtn, { backgroundColor: "#FEF9C3" }]} onPress={() => wrapDesc("==")}><Text style={s.rtBtnTxt}>Highlight</Text></TouchableOpacity>
            </View>
            <TextInput
              style={[s.formInput, s.formTextarea]}
              placeholder={"Description (optional)\nSelect text then tap B / i / Highlight. New lines are kept."}
              placeholderTextColor={COLORS.mid}
              value={desc}
              onChangeText={setDesc}
              onSelectionChange={(e) => setDescSel(e.nativeEvent.selection)}
              multiline
              numberOfLines={3}
            />
            <TextInput
              style={s.formInput}
              placeholder="Due date (YYYY-MM-DD, optional)"
              placeholderTextColor={COLORS.mid}
              value={dueDate}
              onChangeText={setDueDate}
              keyboardType="numbers-and-punctuation"
            />
            <TextInput
              style={s.formInput}
              placeholder="Keep in English (e.g. 1 to 10, A B C) — optional"
              placeholderTextColor={COLORS.mid}
              value={keywords}
              onChangeText={setKeywords}
            />
            <Text style={s.formHint}>
              Comma-separate words/phrases that must NOT be translated in the audio (kept in English).
            </Text>

            <View style={s.attachRow}>
              <Attacher
                bucket="homework-files"
                folder="teacher"
                label={attachments.length ? `${attachments.length} attached — add more` : "Attach image / video / scan to PDF (optional)"}
                onUploaded={(url, kind) => setAttachments((a) => [...a, { url, type: kind, name: `${kind} ${a.length + 1}` }])}
              />
            </View>

            {attachments.length > 0 && (
              <View style={s.attChips}>
                {attachments.map((f, i) => (
                  <View key={i} style={s.attChip}>
                    <Text style={s.attChipTxt} numberOfLines={1}>📎 {f?.name || `file ${i + 1}`}</Text>
                    <TouchableOpacity onPress={() => setAttachments((arr) => arr.filter((_, j) => j !== i))} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                      <Text style={s.attChipX}>✕</Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}

            <TouchableOpacity
              style={[s.submitBtn, submitting && { opacity: 0.6 }]}
              onPress={handleSubmit}
              disabled={submitting}
            >
              {submitting ? <ActivityIndicator color="#fff" /> : <Text style={s.submitBtnTxt}>{editId ? "Save Changes →" : "Assign Homework →"}</Text>}
            </TouchableOpacity>
          </View>
        )}

        {/* List */}
        <Text style={s.sectionTitle}>Recent Assignments ({list.length})</Text>
        {list.length === 0 ? (
          <View style={s.emptyCard}>
            <Ionicons name="book-outline" size={40} color={COLORS.mid} />
            <Text style={s.emptyTxt}>No homework assigned yet</Text>
          </View>
        ) : (
          list.map((hw: any) => (
            <TeacherHomeworkCard
              key={hw.id}
              hw={hw}
              statuses={statusByHw[hw.id] || []}
              onReplied={() => load(true)}
              onEdit={() => startEdit(hw)}
            />
          ))
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  root:              { flex: 1, backgroundColor: COLORS.bg },
  content:           { padding: 20, paddingBottom: 40 },
  center:            { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: COLORS.bg },
  pageHeader:        { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 20 },
  pageTitle:         { fontSize: 22, fontWeight: "800", color: COLORS.dark },
  addBtn:            { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: COLORS.primary, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 8 },
  addBtnTxt:         { color: "#fff", fontWeight: "700", fontSize: 14 },
  formCard:          { backgroundColor: "#fff", borderRadius: 20, padding: 20, marginBottom: 24, borderWidth: 1, borderColor: COLORS.border },
  formTitle:         { fontSize: 16, fontWeight: "800", color: COLORS.dark, marginBottom: 14 },
  subjectRow:        { flexDirection: "row", gap: 8 },
  subjectPill:       { borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6, backgroundColor: COLORS.bg, borderWidth: 1, borderColor: COLORS.border },
  subjectPillActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  subjectTxt:        { fontSize: 12, fontWeight: "600", color: COLORS.mid },
  subjectTxtActive:  { color: "#fff" },
  formInput:         { backgroundColor: COLORS.bg, borderRadius: 12, padding: 14, fontSize: 14, color: COLORS.dark, borderWidth: 1, borderColor: COLORS.border, marginBottom: 12 },
  formTextarea:      { height: 80, textAlignVertical: "top" },
  rtBar:             { flexDirection: "row", gap: 8, marginBottom: 8 },
  rtBtn:             { minWidth: 34, height: 30, borderRadius: 8, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.bg, alignItems: "center", justifyContent: "center", paddingHorizontal: 10 },
  rtBtnTxt:          { fontSize: 13, color: COLORS.dark, fontWeight: "700" },
  formHint:          { fontSize: 11, color: COLORS.mid, marginTop: -6, marginBottom: 12, lineHeight: 16 },
  attachRow:         { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 10, marginBottom: 4 },
  attachRowTxt:      { fontSize: 13, fontWeight: "600", color: COLORS.primary },
  attChips:          { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 12 },
  attChip:           { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: COLORS.eduLight, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, maxWidth: "100%" },
  attChipTxt:        { fontSize: 12, fontWeight: "600", color: COLORS.edu, flexShrink: 1 },
  attChipX:          { fontSize: 13, fontWeight: "800", color: COLORS.error },
  submitBtn:         { backgroundColor: COLORS.primary, borderRadius: 12, padding: 14, alignItems: "center" },
  submitBtnTxt:      { color: "#fff", fontSize: 15, fontWeight: "700" },
  sectionTitle:      { fontSize: 13, fontWeight: "700", color: COLORS.mid, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 12 },
  hwCard:            { backgroundColor: "#fff", borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: COLORS.border },
  hwTop:             { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 },
  subjectBadge:      { backgroundColor: "#EDE9FE", borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  subjectBadgeTxt:   { fontSize: 12, fontWeight: "700", color: COLORS.primary },
  dueDate:           { fontSize: 12, color: COLORS.orange, fontWeight: "600" },
  hwTitle:           { fontSize: 15, fontWeight: "700", color: COLORS.dark },
  hwDesc:            { fontSize: 13, color: COLORS.mid, marginTop: 6, lineHeight: 19 },
  hwMeta:            { fontSize: 11, color: COLORS.mid, marginTop: 8 },
  emptyCard:         { alignItems: "center", padding: 40, backgroundColor: "#fff", borderRadius: 20, borderWidth: 1, borderColor: COLORS.border, marginTop: 10 },
  emptyTxt:          { fontSize: 14, color: COLORS.mid, marginTop: 10 },
});
