import * as ImagePicker from "expo-image-picker";
import * as FileSystem from "expo-file-system/legacy";
import { Alert } from "react-native";
import { PDFDocument } from "pdf-lib";
import { supabase } from "./supabase";
import { SUPABASE_URL, SUPABASE_ANON } from "./constants";

export type Picked = { uri: string; name: string; mimeType: string; kind: "image" | "video"; size?: number };

// Max upload size. Supabase storage rejects files above its per-file limit (50 MB on the
// default plan), and loading anything larger into memory can crash the app — so we stop
// early and show a message instead. Keep in sync with the Supabase bucket file-size limit.
export const MAX_UPLOAD_BYTES = 50 * 1024 * 1024; // 50 MB

const humanSize = (bytes: number) => {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(0)} MB`;
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${bytes} B`;
};

// Returns true if the file is within the limit; otherwise shows an alert and returns false.
export function checkUploadSize(size?: number): boolean {
  if (typeof size === "number" && size > MAX_UPLOAD_BYTES) {
    Alert.alert(
      "File too large",
      `This file is ${humanSize(size)}. The maximum you can attach is ${humanSize(MAX_UPLOAD_BYTES)}. ` +
        `Please choose a smaller file, or trim / compress the video before attaching.`,
    );
    return false;
  }
  return true;
}

// Capture a single photo with the camera.
export async function takePhoto(): Promise<Picked | null> {
  const { status } = await ImagePicker.requestCameraPermissionsAsync();
  if (status !== "granted") { Alert.alert("Camera permission needed", "Please allow camera access."); return null; }
  const r = await ImagePicker.launchCameraAsync({ quality: 0.6 });
  if (r.canceled || !r.assets?.[0]) return null;
  const a: any = r.assets[0];
  const ext = (a.uri.split(".").pop() || "jpg").split("?")[0];
  return { uri: a.uri, name: a.fileName || `photo_${Date.now()}.${ext}`, mimeType: a.mimeType || `image/${ext}`, kind: "image", size: a.fileSize };
}

// Combine image URIs (in order) into a single PDF — returns the PDF bytes.
export async function imagesToPdf(uris: string[]): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  for (const uri of uris) {
    const bytes = new Uint8Array(await (await fetch(uri)).arrayBuffer());
    const isPng = bytes[0] === 0x89 && bytes[1] === 0x50; // PNG magic
    const img = isPng ? await pdf.embedPng(bytes) : await pdf.embedJpg(bytes);
    const page = pdf.addPage([img.width, img.height]);
    page.drawImage(img, { x: 0, y: 0, width: img.width, height: img.height });
  }
  return await pdf.save();
}

// Upload raw bytes (e.g. a generated PDF) → public URL.
export async function uploadBytes(bucket: string, folder: string, bytes: Uint8Array, mimeType: string, ext: string): Promise<string | null> {
  try {
    const path = `${folder}/${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const { error } = await supabase.storage.from(bucket).upload(path, bytes, { contentType: mimeType, upsert: false });
    if (error) { Alert.alert("Upload failed", error.message); return null; }
    const { data: { publicUrl } } = supabase.storage.from(bucket).getPublicUrl(path);
    return publicUrl;
  } catch (e: any) {
    Alert.alert("Upload failed", e?.message || "Could not upload the file.");
    return null;
  }
}

// Pick an image OR video from the library. (PDF/doc support needs expo-document-picker,
// which is a native module — added in the next app build.)
export async function pickImageOrVideo(): Promise<Picked | null> {
  // Uses the Android Photo Picker / iOS picker — no media-library permission needed.
  // SDK 56: `mediaTypes` takes a MediaType[] (string array); the old
  // `MediaTypeOptions.All` enum is removed and returns undefined, which made the
  // picker silently drop videos — that was the broken video upload.
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ["images", "videos"], // images + videos
    quality: 0.7,
  });
  if (result.canceled || !result.assets?.[0]) return null;
  const a: any = result.assets[0];
  const kind: "image" | "video" = a.type === "video" ? "video" : "image";
  const ext = (a.uri.split(".").pop() || (kind === "video" ? "mp4" : "jpg")).split("?")[0];
  const name = a.fileName || `${kind}_${Date.now()}.${ext}`;
  const mimeType = a.mimeType || (kind === "video" ? `video/${ext}` : `image/${ext}`);
  return { uri: a.uri, name, mimeType, kind, size: a.fileSize };
}

// Upload a picked file to a Supabase storage bucket; returns the public URL (or null).
// Streams the file from disk straight to Supabase Storage via expo-file-system —
// the bytes never pass through JS memory, so large videos no longer crash the app
// (the old fetch().arrayBuffer() path OOM-ed, and a Blob body isn't supported in RN).
// Size is read with getInfoAsync (the image picker often omits a video's size).
export async function uploadToBucket(bucket: string, folder: string, picked: Picked): Promise<string | null> {
  try {
    let size = picked.size;
    if (typeof size !== "number") {
      const info = await FileSystem.getInfoAsync(picked.uri);
      size = info.exists && typeof info.size === "number" ? info.size : 0;
    }
    if (!checkUploadSize(size)) return null;

    const ext = (picked.uri.split(".").pop() || "bin").split("?")[0];
    const path = `${folder}/${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const res = await FileSystem.uploadAsync(
      `${SUPABASE_URL}/storage/v1/object/${bucket}/${path}`,
      picked.uri,
      {
        httpMethod: "POST",
        uploadType: FileSystem.FileSystemUploadType.BINARY_CONTENT,
        headers: {
          apikey: SUPABASE_ANON,
          Authorization: `Bearer ${SUPABASE_ANON}`,
          "Content-Type": picked.mimeType || "application/octet-stream",
          "x-upsert": "false",
        },
      },
    );
    if (res.status < 200 || res.status >= 300) {
      let msg = `Upload failed (${res.status})`;
      try { const j = JSON.parse(res.body); msg = j.message || j.error || msg; } catch {}
      Alert.alert("Upload failed", msg);
      return null;
    }
    const { data: { publicUrl } } = supabase.storage.from(bucket).getPublicUrl(path);
    return publicUrl;
  } catch (e: any) {
    Alert.alert("Upload failed", e?.message || "Could not upload the file.");
    return null;
  }
}

// Detect a file's kind from its URL (for rendering attachments).
export function fileKind(url?: string | null): "image" | "video" | "pdf" | "file" {
  if (!url) return "file";
  const u = url.toLowerCase().split("?")[0];
  if (/\.(jpg|jpeg|png|gif|webp|heic)$/.test(u)) return "image";
  if (/\.(mp4|mov|m4v|webm|3gp|avi|mkv)$/.test(u)) return "video";
  if (/\.pdf$/.test(u)) return "pdf";
  return "file";
}
