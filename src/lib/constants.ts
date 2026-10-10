// Per-environment config via EXPO_PUBLIC_* (set in eas.json build profiles /
// .env files, inlined at build per Expo SDK 56). Must be static process.env.X
// dot-access to be inlined. Defaults = Evergreen client-prod so existing builds
// and local runs behave exactly as before when no env is set.
export const EDU_API = process.env.EXPO_PUBLIC_EDU_API ?? "https://evergreenprepschools.com";

export const SUPABASE_URL  = process.env.EXPO_PUBLIC_SUPABASE_URL ?? "https://mmznugcbwbjeqnmmwmxn.supabase.co";
export const SUPABASE_ANON = process.env.EXPO_PUBLIC_SUPABASE_ANON ?? "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1tem51Z2Nid2JqZXFubW13bXhuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM5MDc4MjUsImV4cCI6MjA4OTQ4MzgyNX0.tiy-3xRagzg3TbF2oGifukQz1Xb8-Bl31imRF6IGAA8";

export const COLORS = {
  primary:    "#4F46E5",
  secondary:  "#7C3AED",
  edu:        "#178F78",
  eduLight:   "#EEF8F6",
  orange:     "#E8694A",
  yellow:     "#F5B829",
  dark:       "#1A2F4A",
  mid:        "#6B7A99",
  border:     "#EDE8DF",
  bg:         "#FAFAFA",
  white:      "#FFFFFF",
  error:      "#DC2626",
  success:    "#16A34A",
};

export const SESSION_KEY = "iva_session";
