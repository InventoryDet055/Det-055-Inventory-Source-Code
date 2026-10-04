"use client";

import {
  useState,
  useTransition,
} from "react";

import { signUpCadet } from "@/app/auth/sign-up/actions";

export function SignUpForm() {
  const [
    message,
    setMessage,
  ] = useState("");

  const [
    success,
    setSuccess,
  ] = useState(false);

  const [
    isPending,
    startTransition,
  ] = useTransition();

  function handleSubmit(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setMessage("");
    setSuccess(false);

    const formData =
      new FormData(
        event.currentTarget
      );

    startTransition(
      async () => {
        const result =
          await signUpCadet(
            formData
          );

        setMessage(
          result.message
        );

        setSuccess(
          result.success
        );
      }
    );
  }

  return (
    <form
      onSubmit={
        handleSubmit
      }
      className="flex flex-col gap-4"
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label
            htmlFor="first_name"
            className="mb-1 block text-sm font-semibold text-black"
          >
            First Name
          </label>

          <input
            id="first_name"
            name="first_name"
            type="text"
            required
            autoComplete="given-name"
            className="w-full rounded-lg border border-gray-300 bg-white p-3 text-black"
          />
        </div>

        <div>
          <label
            htmlFor="last_name"
            className="mb-1 block text-sm font-semibold text-black"
          >
            Last Name
          </label>

          <input
            id="last_name"
            name="last_name"
            type="text"
            required
            autoComplete="family-name"
            className="w-full rounded-lg border border-gray-300 bg-white p-3 text-black"
          />
        </div>
      </div>

      <div>
        <label
          htmlFor="as_class"
          className="mb-1 block text-sm font-semibold text-black"
        >
          AS Class
        </label>

        <select
          id="as_class"
          name="as_class"
          required
          defaultValue=""
          className="w-full rounded-lg border border-gray-300 bg-white p-3 text-black"
        >
          <option
            value=""
            disabled
          >
            Select AS Class
          </option>

          <option value="100">
            AS 100
          </option>

          <option value="200">
            AS 200
          </option>

          <option value="250">
            AS 250
          </option>

          <option value="300">
            AS 300
          </option>

          <option value="400">
            AS 400
          </option>
        </select>
      </div>

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

      <div>
        <label
          htmlFor="password"
          className="mb-1 block text-sm font-semibold text-black"
        >
          Password
        </label>

        <input
          id="password"
          name="password"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          className="w-full rounded-lg border border-gray-300 bg-white p-3 text-black"
        />
      </div>

      <div>
        <label
          htmlFor="repeat_password"
          className="mb-1 block text-sm font-semibold text-black"
        >
          Repeat Password
        </label>

        <input
          id="repeat_password"
          name="repeat_password"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          className="w-full rounded-lg border border-gray-300 bg-white p-3 text-black"
        />
      </div>

      <div>
        <label
          htmlFor="access_code"
          className="mb-1 block text-sm font-semibold text-black"
        >
          Det 055 Access Code
        </label>

        <input
          id="access_code"
          name="access_code"
          type="password"
          required
          autoComplete="off"
          className="w-full rounded-lg border border-gray-300 bg-white p-3 text-black"
        />

        <p className="mt-1 text-xs text-gray-500">
          Get the current access code from Det 055 Inventory staff.
        </p>
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
        disabled={
          isPending ||
          success
        }
        className="rounded-lg bg-black px-4 py-3 font-semibold text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isPending
          ? "Creating account..."
          : success
            ? "Account Created"
            : "Create Account"}
      </button>
    </form>
  );
}