"use client";

import {
  FormEvent,
  useEffect,
  useState,
} from "react";

import { useRouter } from "next/navigation";

import { createClient } from "@/lib/supabase/client";

export default function UpdatePasswordForm() {
  const router = useRouter();

  const [password, setPassword] =
    useState("");

  const [
    repeatPassword,
    setRepeatPassword,
  ] = useState("");

  const [message, setMessage] =
    useState("");

  const [isError, setIsError] =
    useState(false);

  const [isReady, setIsReady] =
    useState(false);

  const [
    isSubmitting,
    setIsSubmitting,
  ] = useState(false);

  useEffect(() => {
    async function checkSession() {
      const supabase =
        createClient();

      const {
        data: { user },
        error,
      } =
        await supabase.auth.getUser();

      if (error || !user) {
        setMessage(
          "No valid password recovery session was found. Request a new reset link."
        );

        setIsError(true);
        return;
      }

      setIsReady(true);
    }

    checkSession();
  }, []);

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setMessage("");
    setIsError(false);

    if (password.length < 8) {
      setMessage(
        "Password must be at least 8 characters."
      );

      setIsError(true);
      return;
    }

    if (
      password !==
      repeatPassword
    ) {
      setMessage(
        "Passwords do not match."
      );

      setIsError(true);
      return;
    }

    setIsSubmitting(true);

    const supabase =
      createClient();

    const { error } =
      await supabase.auth.updateUser({
        password,
      });

    if (error) {
      setMessage(error.message);
      setIsError(true);
      setIsSubmitting(false);

      return;
    }

    await supabase.auth.signOut();

    router.replace(
      "/auth/login?password_updated=true"
    );

    router.refresh();
  }

  if (!isReady) {
    return (
      <div
        className={`rounded-lg p-4 text-sm ${
          isError
            ? "bg-red-50 text-red-700"
            : "bg-gray-50 text-gray-600"
        }`}
      >
        {message ||
          "Verifying password reset link..."}
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-4"
    >
      <div>
        <label
          htmlFor="password"
          className="mb-1 block text-sm font-semibold text-black"
        >
          New Password
        </label>

        <input
          id="password"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          value={password}
          onChange={(event) =>
            setPassword(
              event.target.value
            )
          }
          className="w-full rounded-lg border border-gray-300 bg-white p-3 text-black"
        />
      </div>

      <div>
        <label
          htmlFor="repeat_password"
          className="mb-1 block text-sm font-semibold text-black"
        >
          Repeat New Password
        </label>

        <input
          id="repeat_password"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          value={repeatPassword}
          onChange={(event) =>
            setRepeatPassword(
              event.target.value
            )
          }
          className="w-full rounded-lg border border-gray-300 bg-white p-3 text-black"
        />
      </div>

      {message && (
        <div
          className={`rounded-lg p-3 text-sm ${
            isError
              ? "bg-red-50 text-red-700"
              : "bg-green-50 text-green-700"
          }`}
        >
          {message}
        </div>
      )}

      <button
        type="submit"
        disabled={isSubmitting}
        className="rounded-lg bg-black px-4 py-3 font-semibold text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isSubmitting
          ? "Updating Password..."
          : "Update Password"}
      </button>
    </form>
  );
}