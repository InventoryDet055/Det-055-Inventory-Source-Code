import { type EmailOtpType } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);

  const tokenHash =
    requestUrl.searchParams.get("token_hash");

  const type =
    requestUrl.searchParams.get(
      "type"
    ) as EmailOtpType | null;

  const requestedNext =
    requestUrl.searchParams.get("next");

  // Only permit internal redirects.
  const next =
    requestedNext?.startsWith("/")
      ? requestedNext
      : "/";

  if (tokenHash && type) {
    const supabase = await createClient();

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
      "Auth confirmation error:",
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