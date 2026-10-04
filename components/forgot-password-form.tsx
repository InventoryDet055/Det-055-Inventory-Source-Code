"use client";

import {
  useState,
  useTransition,
} from "react";

import {
  requestPasswordReset,
} from "@/app/auth/forgot-password/actions";

export default function ForgotPasswordForm() {
  const [message, setMessage] =
    useState("");

  const [success, setSuccess] =
    useState(false);

  const [isPending, startTransition] =
    useTransition();

  function handleSubmit(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    const formData =
      new FormData(event.currentTarget);

    setMessage("");
    setSuccess(false);

    startTransition(async () => {
      const result =
        await requestPasswordReset(
          formData
        );

      setMessage(result.message);
      setSuccess(result.success);
    });
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-4"
    >
      <div>
        <label
          htmlFor="email"
          className="mb-1 block text-sm font-semibold text-black"
        >
          Email
        </label>

        <input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          className="w-full rounded-lg border border-gray-300 bg-white p-3 text-black"
        />
      </div>

      {message && (
        <div
          className={`rounded-lg p-3 text-sm ${
            success
              ? "bg-green-50 text-green-700"
              : "bg-red-50 text-red-700"
          }`}
        >
          {message}
        </div>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="rounded-lg bg-black px-4 py-3 font-semibold text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isPending
          ? "Sending..."
          : "Send Reset Link"}
      </button>
    </form>
  );
}