import { type EmailOtpType } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);

  const code = requestUrl.searchParams.get("code");

  const tokenHash =
    requestUrl.searchParams.get("token_hash");

  const type =
    requestUrl.searchParams.get(
      "type"
    ) as EmailOtpType | null;

  const requestedNext =
    requestUrl.searchParams.get("next");

  // Prevent external/open redirects.
  const next =
    requestedNext?.startsWith("/")
      ? requestedNext
      : "/";

  const supabase = await createClient();

  /*
   * Flow 1:
   * Standard Supabase confirmation links.
   *
   * Used by normal account signup confirmation when
   * Supabase redirects back with a PKCE code.
   */
  if (code) {
    const { error } =
      await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      return NextResponse.redirect(
        new URL(next, requestUrl.origin)
      );
    }

    console.error(
      "Auth code exchange error:",
      error.message
    );
  }

  /*
   * Flow 2:
   * Token-hash links.
   *
   * Used by our password-recovery email template.
   */
  if (tokenHash && type) {
    const { error } =
      await supabase.auth.verifyOtp({
        type,
        token_hash: tokenHash,
      });

    if (!error) {
      return NextResponse.redirect(
        new URL(next, requestUrl.origin)
      );
    }

    console.error(
      "Auth token verification error:",
      error.message
    );
  }

  return NextResponse.redirect(
    new URL(
      "/auth/error?message=Invalid%20or%20expired%20authentication%20link",
      requestUrl.origin
    )
  );
}