import Link from "next/link";
import ForgotPasswordForm from "@/components/forgot-password-form";

export default function ForgotPasswordPage() {
  return (
    <main className="min-h-screen bg-blue-400 p-4 sm:p-8">
      <div className="mx-auto max-w-md">
        <div className="rounded-xl bg-white p-6 shadow sm:p-8">
          <h1 className="text-2xl font-bold text-black">
            Reset Password
          </h1>

          <p className="mt-2 text-sm text-gray-600">
            Enter the email associated with your Det 055 Inventory account.
          </p>

          <div className="mt-6">
            <ForgotPasswordForm />
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