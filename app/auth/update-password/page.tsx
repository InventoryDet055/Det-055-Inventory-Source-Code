import { Suspense } from "react";
import Link from "next/link";

import UpdatePasswordForm from "@/components/update-password-form";

export default function Page() {
  return (
    <main className="min-h-screen bg-blue-400 p-4 sm:p-8">
      <div className="mx-auto max-w-md">
        <div className="rounded-xl bg-white p-6 shadow sm:p-8">
          <p className="text-sm font-semibold uppercase tracking-wide text-blue-400">
            Det 055 Inventory
          </p>

          <h1 className="mt-1 text-2xl font-bold text-black">
            Choose New Password
          </h1>

          <p className="mt-2 text-sm text-gray-600">
            Enter a new password for your inventory account.
          </p>

          <div className="mt-6">
            <Suspense
              fallback={
                <div className="rounded-lg bg-gray-50 p-4 text-sm text-gray-600">
                  Verifying password reset link...
                </div>
              }
            >
              <UpdatePasswordForm />
            </Suspense>
          </div>

          <Link
            href="/auth/login"
            className="mt-6 block text-center text-sm font-semibold text-blue-500 hover:text-black"
          >
            Back to Sign In
          </Link>
        </div>
      </div>
    </main>
  );
}