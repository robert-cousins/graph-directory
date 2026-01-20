import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type OtpType = "magiclink" | "recovery" | "invite";

export async function GET(request: Request) {
  const url = new URL(request.url);

  const code = url.searchParams.get("code");
  const token_hash = url.searchParams.get("token_hash");
  const typeParam = url.searchParams.get("type");

  const type: OtpType =
    typeParam === "magiclink" || typeParam === "recovery" || typeParam === "invite"
      ? typeParam
      : "magiclink";

  const supabase = await createClient();

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      return NextResponse.redirect(new URL(`/login?error=${encodeURIComponent(error.message)}`, url.origin));
    }
    return NextResponse.redirect(new URL("/admin", url.origin));
  }

  if (token_hash) {
    const { error } = await supabase.auth.verifyOtp({ token_hash, type });
    if (error) {
      return NextResponse.redirect(new URL(`/login?error=${encodeURIComponent(error.message)}`, url.origin));
    }
    return NextResponse.redirect(new URL("/admin", url.origin));
  }

  return NextResponse.redirect(new URL("/login", url.origin));
}
