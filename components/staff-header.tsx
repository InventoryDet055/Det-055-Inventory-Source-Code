import Link from "next/link";
import { signOut } from "@/app/auth/signout/actions";

type StaffHeaderProps = {
  showMyInventory?: boolean;
};

export default function StaffHeader({
  showMyInventory = false,
}: StaffHeaderProps) {
  return (
    <header className="bg-white shadow">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-8">
        <div className="flex items-center gap-8">
          <Link
            href="/dashboard"
            className="font-bold text-black"
          >
            Det 055 Inventory
          </Link>

          <nav className="hidden items-center gap-6 sm:flex">
            <Link
              href="/dashboard"
              className="text-sm font-semibold text-gray-600 transition hover:text-blue-500"
            >
              Dashboard
            </Link>

            <Link
              href="/cadets"
              className="text-sm font-semibold text-gray-600 transition hover:text-blue-500"
            >
              Cadets
            </Link>

            <Link
              href="/wings"
              className="text-sm font-semibold text-gray-600 transition hover:text-blue-500"
            >
              WINGS
            </Link>

            <Link
              href="/activity"
              className="text-sm font-semibold text-gray-600 transition hover:text-blue-500"
            >
              Activity
            </Link>

            {showMyInventory && (
              <Link
                href="/my-inventory"
                className="text-sm font-semibold text-gray-600 transition hover:text-blue-500"
              >
                My Inventory
              </Link>
            )}
          </nav>
        </div>

        <form action={signOut}>
          <button
            type="submit"
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-black transition hover:bg-gray-100"
          >
            Sign Out
          </button>
        </form>
      </div>

      <nav className="flex border-t border-gray-200 sm:hidden">
        <Link
          href="/dashboard"
          className="flex-1 py-3 text-center text-sm font-semibold text-gray-600 hover:bg-gray-50 hover:text-blue-500"
        >
          Dashboard
        </Link>

        <Link
          href="/cadets"
          className="flex-1 border-l border-gray-200 py-3 text-center text-sm font-semibold text-gray-600 hover:bg-gray-50 hover:text-blue-500"
        >
          Cadets
        </Link>

        <Link
          href="/wings"
          className="flex-1 border-l border-gray-200 py-3 text-center text-sm font-semibold text-gray-600 hover:bg-gray-50 hover:text-blue-500"
        >
          WINGS
        </Link>

        <Link
          href="/activity"
          className="flex-1 border-l border-gray-200 py-3 text-center text-sm font-semibold text-gray-600 hover:bg-gray-50 hover:text-blue-500"
        >
          Activity
        </Link>

        {showMyInventory && (
          <Link
            href="/my-inventory"
            className="flex-1 border-l border-gray-200 py-3 text-center text-sm font-semibold text-gray-600 hover:bg-gray-50 hover:text-blue-500"
          >
            My Inventory
          </Link>
        )}
      </nav>
    </header>
  );
}