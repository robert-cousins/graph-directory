import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const url = new URL(request.url);

  // Supabase can send either `code` (PKCE) or `token_hash` (magic link variant).
  const code = url.searchParams.get("code");
  const token_hash = url.searchParams.get("token_hash");
  const type = (url.searchParams.get("type") ?? "magiclink") as "magiclink";

  const supabase = await createClient();

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      return NextResponse.redirect(new URL(`/login?error=${encodeURIComponent(error.message)}`, url.origin));
    }
    return NextResponse.redirect(new URL("/admin", url.origin));
  }

  // Some magic link flows use token_hash + type.
  if (token_hash) {
    const { error } = await supabase.auth.verifyOtp({ token_hash, type });
    if (error) {
      return NextResponse.redirect(new URL(`/login?error=${encodeURIComponent(error.message)}`, url.origin));
    }
    return NextResponse.redirect(new URL("/admin", url.origin));
  }

  // No auth parameters -> send to login
  return NextResponse.redirect(new URL("/login", url.origin));
}
