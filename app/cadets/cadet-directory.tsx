"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

type Cadet = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  asClass: number | null;
  component: string | null;
  status: string;
  setupCompleted: boolean;
};

type Props = {
  cadets: Cadet[];
};

type Filter = "ALL" | "GMC" | "POC";

export default function CadetDirectory({
  cadets,
}: Props) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] =
    useState<Filter>("ALL");

  const filteredCadets = useMemo(() => {
    const query = search.trim().toLowerCase();

    return cadets.filter((cadet) => {
      const matchesFilter =
        filter === "ALL" ||
        cadet.component === filter;

      const fullName =
        `${cadet.firstName} ${cadet.lastName}`.toLowerCase();

      const matchesSearch =
        !query ||
        fullName.includes(query) ||
        cadet.email.toLowerCase().includes(query) ||
        String(cadet.asClass ?? "").includes(query);

      return matchesFilter && matchesSearch;
    });
  }, [cadets, search, filter]);

  return (
    <>
      <div className="mt-6 rounded-xl bg-white p-6 shadow">
        <input
          type="text"
          placeholder="Search by name, email, or AS class..."
          value={search}
          onChange={(e) =>
            setSearch(e.target.value)
          }
          className="w-full rounded-lg border border-blue-400 bg-white p-3 text-black outline-none"
        />

        <div className="mt-4 flex flex-wrap gap-2">
          {(
            [
              ["ALL", "All"],
              ["GMC", "GMC"],
              ["POC", "POC"],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() =>
                setFilter(value)
              }
              className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
                filter === value
                  ? "bg-black text-white"
                  : "bg-white text-blue-400 ring-1 ring-blue-400 hover:bg-gray-100"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-4">
        <p className="text-sm font-semibold text-white">
          {filteredCadets.length}{" "}
          {filteredCadets.length === 1
            ? "cadet"
            : "cadets"}
        </p>
      </div>

      {filteredCadets.length === 0 ? (
        <div className="mt-4 rounded-xl bg-white p-8 text-center shadow">
          <p className="font-semibold text-black">
            No cadets found.
          </p>

          <p className="mt-2 text-sm text-gray-500">
            Try changing your search or filter.
          </p>
        </div>
      ) : (
        <div className="mt-4 max-h-[700px] space-y-3 overflow-y-auto">
          {filteredCadets.map((cadet) => (
            <Link
              key={cadet.id}
              href={`/cadets/${cadet.id}`}
              className="flex flex-col gap-4 rounded-xl bg-white p-4 shadow transition hover:bg-gray-100 sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-semibold text-blue-400">
                    {cadet.firstName}{" "}
                    {cadet.lastName}
                  </p>

                  {cadet.component && (
                    <span className="rounded-full bg-blue-400 px-2 py-1 text-xs font-semibold text-white">
                      {cadet.component}
                    </span>
                  )}

                  {!cadet.setupCompleted && (
                    <span className="rounded-full bg-gray-200 px-2 py-1 text-xs font-semibold text-gray-700">
                      Setup Incomplete
                    </span>
                  )}
                </div>

                <p className="mt-1 text-sm text-black">
                  {cadet.asClass
                    ? `AS ${cadet.asClass}`
                    : "AS class not set"}
                </p>

                <p className="mt-1 text-sm text-gray-500">
                  {cadet.email}
                </p>
              </div>

              <div className="flex items-center gap-3">
                <span
                  className={`text-xs font-semibold uppercase ${
                    cadet.status === "active"
                      ? "text-green-700"
                      : "text-gray-500"
                  }`}
                >
                  {cadet.status}
                </span>

                <span className="text-sm font-semibold text-blue-500">
                  View →
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}