"use server";

import { createClient } from "@/lib/supabase/server";

type SignUpResult = {
  success: boolean;
  message: string;
};

export async function signUpCadet(
  formData: FormData
): Promise<SignUpResult> {
  const firstName = String(
    formData.get("first_name") ?? ""
  ).trim();

  const lastName = String(
    formData.get("last_name") ?? ""
  ).trim();

  const email = String(
    formData.get("email") ?? ""
  )
    .trim()
    .toLowerCase();

  const password = String(
    formData.get("password") ?? ""
  );

  const repeatPassword = String(
    formData.get("repeat_password") ?? ""
  );

  const accessCode = String(
    formData.get("access_code") ?? ""
  ).trim();

  const asClass = Number(
    formData.get("as_class") ?? ""
  );

  if (
    !firstName ||
    !lastName ||
    !email ||
    !password ||
    !repeatPassword ||
    !accessCode
  ) {
    return {
      success: false,
      message: "Please complete all fields.",
    };
  }

  const validAsClasses = [
    100,
    200,
    250,
    300,
    400,
  ];

  if (!validAsClasses.includes(asClass)) {
    return {
      success: false,
      message: "Please select a valid AS class.",
    };
  }

  if (password !== repeatPassword) {
    return {
      success: false,
      message: "Passwords do not match.",
    };
  }

  if (password.length < 8) {
    return {
      success: false,
      message:
        "Password must be at least 8 characters.",
    };
  }

  const correctCode =
    process.env.DET055_SIGNUP_CODE;

  if (!correctCode) {
    console.error(
      "DET055_SIGNUP_CODE is not configured."
    );

    return {
      success: false,
      message:
        "Signup is temporarily unavailable. Contact Inventory staff.",
    };
  }

  if (accessCode !== correctCode) {
    return {
      success: false,
      message: "Invalid Det 055 access code.",
    };
  }

  const supabase = await createClient();

  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL ??
    "http://localhost:3000";

  const { error } =
    await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo:
          `${siteUrl}/auth/confirm`,
        data: {
          account_type: "cadet",
          first_name: firstName,
          last_name: lastName,
          as_class: asClass,
        },
      },
    });

  if (error) {
    console.error(
      "Signup error:",
      error.message
    );

    return {
      success: false,
      message: error.message,
    };
  }

  return {
    success: true,
    message:
      "Account created. Check your email to confirm your account.",
  };
}