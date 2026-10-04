"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

export type ActivityRecord = {
  id: string;
  cadetId: string;
  cadetName: string;
  actorName: string;
  category: string;
  itemName: string;
  eventType: string;
  title: string;
  details: string;
  createdAt: string;
};

type Props = {
  activity: ActivityRecord[];
};

const filters = [
  ["ALL", "All"],
  ["item_added", "Added"],
  ["quantity_changed", "Quantity"],
  ["variant_changed", "Size"],
  ["item_updated", "Updated"],
  ["item_removed", "Removed"],
] as const;

export default function ActivityList({
  activity,
}: Props) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("ALL");

  const filteredActivity = useMemo(() => {
    const query = search.trim().toLowerCase();

    return activity.filter((record) => {
      const matchesFilter =
        filter === "ALL" ||
        record.eventType === filter;

      const searchable = [
        record.cadetName,
        record.actorName,
        record.itemName,
        record.category,
        record.title,
        record.details,
      ]
        .join(" ")
        .toLowerCase();

      const matchesSearch =
        !query ||
        searchable.includes(query);

      return matchesFilter && matchesSearch;
    });
  }, [activity, search, filter]);

  return (
    <>
      <div className="mt-6 rounded-xl bg-white p-6 shadow">
        <input
          type="text"
          placeholder="Search cadet, item, or staff member..."
          value={search}
          onChange={(e) =>
            setSearch(e.target.value)
          }
          className="w-full rounded-lg border border-blue-400 bg-white p-3 text-black outline-none"
        />

        <div className="mt-4 flex flex-wrap gap-2">
          {filters.map(([value, label]) => (
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

      <p className="mt-4 text-sm font-semibold text-white">
        {filteredActivity.length}{" "}
        {filteredActivity.length === 1
          ? "event"
          : "events"}
      </p>

      {filteredActivity.length === 0 ? (
        <div className="mt-4 rounded-xl bg-white p-8 text-center shadow">
          <p className="font-semibold text-black">
            No activity found.
          </p>

          <p className="mt-2 text-sm text-gray-500">
            Try changing your search or filter.
          </p>
        </div>
      ) : (
        <div className="mt-4 overflow-hidden rounded-xl bg-white shadow">
          {filteredActivity.map(
            (record, index) => (
              <div
                key={record.id}
                className={`p-5 sm:p-6 ${
                  index !==
                  filteredActivity.length - 1
                    ? "border-b border-gray-200"
                    : ""
                }`}
              >
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      {record.category && (
                        <span className="rounded-full bg-blue-400 px-2 py-1 text-xs font-semibold text-white">
                          {record.category}
                        </span>
                      )}

                      <Link
                        href={`/cadets/${record.cadetId}`}
                        className="text-sm font-semibold text-blue-500 hover:text-black"
                      >
                        {record.cadetName}
                      </Link>
                    </div>

                    <h2 className="mt-2 font-semibold text-black">
                      {record.title}
                    </h2>

                    {record.details && (
                      <p className="mt-1 text-sm text-gray-600">
                        {record.details}
                      </p>
                    )}

                    <p className="mt-2 text-xs text-gray-500">
                      Changed by{" "}
                      <span className="font-semibold">
                        {record.actorName}
                      </span>
                    </p>
                  </div>

                  <p className="shrink-0 text-sm text-gray-500">
                    {new Date(
                      record.createdAt
                    ).toLocaleString(
                      "en-US",
                      {
                        dateStyle: "medium",
                        timeStyle: "short",
                        timeZone:
                          "America/Los_Angeles",
                      }
                    )}
                  </p>
                </div>
              </div>
            )
          )}
        </div>
      )}
    </>
  );
}