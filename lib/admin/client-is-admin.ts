"use client"

import { createClient, isSupabaseConfigured } from "@/lib/supabase/client"

export async function isAdminClient(): Promise<boolean> {
  if (!isSupabaseConfigured) return false;

  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user?.email) return false;

  const allowlist = process.env.NEXT_PUBLIC_ADMIN_EMAIL_ALLOWLIST;
  if (!allowlist?.trim()) return false;

  return allowlist.split(",").map(e => e.trim().toLowerCase()).includes(user.email.toLowerCase());
}
