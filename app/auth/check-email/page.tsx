import Link from "next/link";

export default function CheckEmailPage() {
  return (
    <main className="min-h-screen bg-blue-400 p-4 sm:p-8">
      <div className="mx-auto flex min-h-[80vh] max-w-lg items-center">
        <div className="w-full rounded-xl bg-white p-6 shadow sm:p-8">
          <p className="text-sm font-semibold uppercase tracking-wide text-blue-400">
            Det 055 Inventory
          </p>

          <h1 className="mt-2 text-3xl font-bold text-black">
            Check Your Email
          </h1>

          <p className="mt-4 text-gray-600">
            Your account has been created. We sent a confirmation email to the
            address you provided.
          </p>

          <div className="mt-6 rounded-lg bg-gray-100 p-4">
            <p className="font-semibold text-black">
              Before you can log in:
            </p>

            <ol className="mt-2 list-decimal space-y-2 pl-5 text-sm text-gray-600">
              <li>Open the confirmation email from Det 055 Inventory.</li>
              <li>Click the confirmation link in the email.</li>
              <li>Return here and continue to login.</li>
            </ol>
          </div>

          <Link
            href="/auth/login"
            className="mt-6 block w-full rounded-lg bg-black px-5 py-3 text-center font-semibold text-white transition hover:bg-gray-800"
          >
            Continue to Login After Confirmation
          </Link>

          <p className="mt-4 text-center text-xs text-gray-500">
            You will not be able to sign in until your email address has been
            confirmed.
          </p>
        </div>
      </div>
    </main>
  );
}