"use server";

import { createClient } from "@/lib/supabase/server";

type ResetResult = {
  success: boolean;
  message: string;
};

export async function requestPasswordReset(
  formData: FormData
): Promise<ResetResult> {
  const email = String(
    formData.get("email") ?? ""
  )
    .trim()
    .toLowerCase();

  if (!email) {
    return {
      success: false,
      message: "Enter your email address.",
    };
  }

  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL ??
    "http://localhost:3000";

  const supabase = await createClient();

  const { error } =
    await supabase.auth.resetPasswordForEmail(
      email,
      {
        redirectTo: `${siteUrl}/auth/confirm`,
      }
    );

  if (error) {
    console.error(
      "Password reset error:",
      error.message
    );

    return {
      success: false,
      message:
        "Unable to send a password reset email.",
    };
  }

  return {
    success: true,
    message:
      "If an account exists for that email, a password reset link has been sent.",
  };
}