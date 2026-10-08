import { createClient, SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

// Polyfill minimal WebSocket constructor in Node < 22 environments if absent
if (typeof globalThis.WebSocket === "undefined") {
  (globalThis as any).WebSocket = class MockWebSocket {};
}

/**
 * Browser / Client-side Supabase instance
 */
export const supabaseClient: SupabaseClient | null =
  supabaseUrl && supabaseAnonKey
    ? createClient(supabaseUrl, supabaseAnonKey, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
        },
      })
    : null;

/**
 * Server-side Admin Supabase instance (Service Role)
 */
export function getSupabaseAdmin(): SupabaseClient | null {
  if (!supabaseUrl || !supabaseServiceKey) return null;
  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

export const STORAGE_BUCKET = "jamnagar-documents";

let bucketChecked = false;

/**
 * Ensures the private Supabase Storage bucket 'jamnagar-documents' exists.
 */
export async function ensureStorageBucketExists(): Promise<boolean> {
  if (bucketChecked) return true;
  const admin = getSupabaseAdmin();
  if (!admin) return false;

  try {
    const { data: buckets, error: listError } = await admin.storage.listBuckets();
    if (listError) {
      console.warn("Storage listBuckets notice:", listError.message);
      return false;
    }

    const exists = buckets?.some((b) => b.name === STORAGE_BUCKET);
    if (!exists) {
      const { error: createError } = await admin.storage.createBucket(STORAGE_BUCKET, {
        public: false,
        fileSizeLimit: 25 * 1024 * 1024, // 25MB max per document
      });
      if (createError && !createError.message.includes("already exists")) {
        console.warn("Could not create storage bucket:", createError.message);
        return false;
      }
      console.log(`✓ Created private Supabase Storage bucket: ${STORAGE_BUCKET}`);
    }

    bucketChecked = true;
    return true;
  } catch (err: any) {
    console.warn("ensureStorageBucketExists notice:", err?.message);
    return false;
  }
}
