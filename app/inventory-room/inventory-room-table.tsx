"use client";

import Link from "next/link";
import {
  Fragment,
  useMemo,
  useState,
} from "react";
import { useFormStatus } from "react-dom";

import { setRoomInventoryCount } from "./actions";

export type InventoryHolder = {
  cadetId: string;

  firstName: string;
  lastName: string;
  email: string;

  quantity: number;
};

export type InventoryRoomRow = {
  catalogVariantId: string;

  category: string;
  itemName: string;

  cut: string | null;
  size: string;

  roomQuantity: number;
  issuedQuantity: number;
  totalQuantity: number;

  cadetCount: number;

  lastCountedAt: string | null;

  holders: InventoryHolder[];
};

type Props = {
  rows: InventoryRoomRow[];
  canEdit: boolean;
};

type CountFilter =
  | "ALL"
  | "COUNTED"
  | "UNCOUNTED"
  | "AVAILABLE";

const PAGE_SIZE = 75;

function SaveButton() {
  const { pending } =
    useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-lg bg-black px-4 py-2 text-sm font-semibold text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {pending
        ? "Saving..."
        : "Save"}
    </button>
  );
}

function formatDate(
  value: string | null
) {
  if (!value) {
    return "Never counted";
  }

  return new Intl.DateTimeFormat(
    "en-US",
    {
      dateStyle: "medium",
      timeStyle: "short",
    }
  ).format(
    new Date(value)
  );
}

export default function InventoryRoomTable({
  rows,
  canEdit,
}: Props) {
  const [search, setSearch] =
    useState("");

  const [
    category,
    setCategory,
  ] = useState("ALL");

  const [
    countFilter,
    setCountFilter,
  ] =
    useState<CountFilter>(
      "ALL"
    );

  const [
    expandedVariant,
    setExpandedVariant,
  ] =
    useState<string | null>(
      null
    );

  const [page, setPage] =
    useState(1);

  const categories =
    useMemo(() => {
      return Array.from(
        new Set(
          rows.map(
            (row) =>
              row.category
          )
        )
      ).sort();
    }, [rows]);

  const filteredRows =
    useMemo(() => {
      const query =
        search
          .trim()
          .toLowerCase();

      return rows.filter(
        (row) => {
          if (
            category !==
              "ALL" &&
            row.category !==
              category
          ) {
            return false;
          }

          if (
            countFilter ===
              "COUNTED" &&
            !row.lastCountedAt
          ) {
            return false;
          }

          if (
            countFilter ===
              "UNCOUNTED" &&
            row.lastCountedAt
          ) {
            return false;
          }

          if (
            countFilter ===
              "AVAILABLE" &&
            row.roomQuantity <=
              0
          ) {
            return false;
          }

          if (!query) {
            return true;
          }

          const holderNames =
            row.holders
              .map(
                (holder) =>
                  `${holder.firstName} ${holder.lastName} ${holder.email}`
              )
              .join(" ");

          const searchable = [
            row.category,
            row.itemName,
            row.cut ?? "",
            row.size,
            holderNames,
          ]
            .join(" ")
            .toLowerCase();

          return searchable.includes(
            query
          );
        }
      );
    }, [
      rows,
      search,
      category,
      countFilter,
    ]);

  const totalPages =
    Math.max(
      1,
      Math.ceil(
        filteredRows.length /
          PAGE_SIZE
      )
    );

  const safePage =
    Math.min(
      page,
      totalPages
    );

  const pageRows =
    filteredRows.slice(
      (safePage - 1) *
        PAGE_SIZE,
      safePage *
        PAGE_SIZE
    );

  function resetPage() {
    setPage(1);
    setExpandedVariant(
      null
    );
  }

  return (
    <>
      <div className="mt-6 rounded-xl bg-white p-5 shadow">
        <div className="grid gap-4 lg:grid-cols-[1fr_220px_220px]">
          <div>
            <label className="text-sm font-semibold text-gray-700">
              Search inventory
            </label>

            <input
              value={search}
              onChange={(
                event
              ) => {
                setSearch(
                  event.target
                    .value
                );

                resetPage();
              }}
              placeholder="Search item, cut, size, or cadet..."
              className="mt-2 w-full rounded-lg border border-gray-300 bg-white p-3 text-black outline-none focus:border-blue-400"
            />
          </div>

          <div>
            <label className="text-sm font-semibold text-gray-700">
              Category
            </label>

            <select
              value={category}
              onChange={(
                event
              ) => {
                setCategory(
                  event.target
                    .value
                );

                resetPage();
              }}
              className="mt-2 w-full rounded-lg border border-gray-300 bg-white p-3 text-black"
            >
              <option value="ALL">
                All Categories
              </option>

              {categories.map(
                (value) => (
                  <option
                    key={
                      value
                    }
                    value={
                      value
                    }
                  >
                    {value}
                  </option>
                )
              )}
            </select>
          </div>

          <div>
            <label className="text-sm font-semibold text-gray-700">
              Stock Status
            </label>

            <select
              value={
                countFilter
              }
              onChange={(
                event
              ) => {
                setCountFilter(
                  event.target
                    .value as CountFilter
                );

                resetPage();
              }}
              className="mt-2 w-full rounded-lg border border-gray-300 bg-white p-3 text-black"
            >
              <option value="ALL">
                All Variants
              </option>

              <option value="AVAILABLE">
                Available in Room
              </option>

              <option value="COUNTED">
                Counted
              </option>

              <option value="UNCOUNTED">
                Not Counted Yet
              </option>
            </select>
          </div>
        </div>

        <div className="mt-4 text-sm text-gray-500">
          Showing{" "}
          <span className="font-semibold text-black">
            {
              filteredRows.length
            }
          </span>{" "}
          catalog variants
        </div>
      </div>

      <div className="mt-6 overflow-hidden rounded-xl bg-white shadow">
        <div className="border-b border-gray-200 p-5">
          <h2 className="text-xl font-bold text-black">
            Full Inventory
          </h2>

          <p className="mt-1 text-sm text-gray-600">
            Room stock plus
            inventory currently
            issued to cadets.
            Select a cadet count
            to see exactly who
            holds that variant.
          </p>
        </div>

        {pageRows.length ===
        0 ? (
          <div className="p-10 text-center text-gray-500">
            No inventory
            variants match the
            current filters.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1150px] text-left text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50 text-gray-500">
                  <th className="px-4 py-3">
                    Category
                  </th>

                  <th className="px-4 py-3">
                    Item
                  </th>

                  <th className="px-4 py-3">
                    Cut
                  </th>

                  <th className="px-4 py-3">
                    Size
                  </th>

                  <th className="px-4 py-3 text-center">
                    Room
                  </th>

                  <th className="px-4 py-3 text-center">
                    Issued
                  </th>

                  <th className="px-4 py-3 text-center">
                    Total
                  </th>

                  <th className="px-4 py-3 text-center">
                    Cadets
                  </th>

                  <th className="px-4 py-3">
                    Last Count
                  </th>

                  {canEdit && (
                    <th className="px-4 py-3">
                      Physical Count
                    </th>
                  )}
                </tr>
              </thead>

              <tbody>
                {pageRows.map(
                  (row) => {
                    const isExpanded =
                      expandedVariant ===
                      row.catalogVariantId;

                    return (
                      <Fragment
                        key={
                          row.catalogVariantId
                        }
                      >
                        <tr className="border-b border-gray-100 hover:bg-gray-50">
                          <td className="px-4 py-4 font-medium text-gray-600">
                            {
                              row.category
                            }
                          </td>

                          <td className="px-4 py-4 font-semibold text-black">
                            {
                              row.itemName
                            }
                          </td>

                          <td className="px-4 py-4 text-gray-600">
                            {row.cut ??
                              "—"}
                          </td>

                          <td className="px-4 py-4 text-gray-600">
                            {
                              row.size
                            }
                          </td>

                          <td className="px-4 py-4 text-center">
                            <span
                              className={
                                row.roomQuantity >
                                0
                                  ? "font-bold text-black"
                                  : "text-gray-400"
                              }
                            >
                              {
                                row.roomQuantity
                              }
                            </span>
                          </td>

                          <td className="px-4 py-4 text-center font-semibold text-blue-500">
                            {
                              row.issuedQuantity
                            }
                          </td>

                          <td className="px-4 py-4 text-center">
                            <span className="rounded-full bg-gray-100 px-3 py-1 font-bold text-black">
                              {
                                row.totalQuantity
                              }
                            </span>
                          </td>

                          <td className="px-4 py-4 text-center">
                            {row.cadetCount >
                            0 ? (
                              <button
                                type="button"
                                onClick={() =>
                                  setExpandedVariant(
                                    isExpanded
                                      ? null
                                      : row.catalogVariantId
                                  )
                                }
                                className="rounded-lg bg-blue-50 px-3 py-1.5 font-bold text-blue-500 transition hover:bg-blue-100"
                              >
                                {
                                  row.cadetCount
                                }{" "}
                                {isExpanded
                                  ? "▲"
                                  : "▼"}
                              </button>
                            ) : (
                              <span className="text-gray-400">
                                0
                              </span>
                            )}
                          </td>

                          <td className="px-4 py-4 text-xs text-gray-500">
                            {formatDate(
                              row.lastCountedAt
                            )}
                          </td>

                          {canEdit && (
                            <td className="px-4 py-4">
                              <form
                                key={`${row.catalogVariantId}-${row.roomQuantity}-${row.lastCountedAt ?? "never"}`}
                                action={
                                  setRoomInventoryCount
                                }
                                className="flex items-center gap-2"
                              >
                                <input
                                  type="hidden"
                                  name="catalog_variant_id"
                                  value={
                                    row.catalogVariantId
                                  }
                                />

                                <input
                                  type="number"
                                  name="quantity"
                                  min="0"
                                  step="1"
                                  defaultValue={
                                    row.roomQuantity
                                  }
                                  className="w-24 rounded-lg border border-gray-300 bg-white px-3 py-2 text-black"
                                />

                                <SaveButton />
                              </form>
                            </td>
                          )}
                        </tr>

                        {isExpanded && (
                          <tr className="border-b border-gray-200 bg-blue-50/40">
                            <td
                              colSpan={
                                canEdit
                                  ? 10
                                  : 9
                              }
                              className="px-6 py-5"
                            >
                              <div className="rounded-xl border border-blue-100 bg-white p-5">
                                <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                                  <div>
                                    <h3 className="font-bold text-black">
                                      Cadets
                                      Holding
                                      This
                                      Variant
                                    </h3>

                                    <p className="mt-1 text-sm text-gray-500">
                                      {
                                        row.itemName
                                      }{" "}
                                      ·{" "}
                                      {row.cut ??
                                        "Unspecified"}{" "}
                                      ·{" "}
                                      {
                                        row.size
                                      }
                                    </p>
                                  </div>

                                  <p className="text-sm font-semibold text-gray-500">
                                    {
                                      row.issuedQuantity
                                    }{" "}
                                    total
                                    issued
                                  </p>
                                </div>

                                <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                                  {row.holders.map(
                                    (
                                      holder
                                    ) => {
                                      const name =
                                        `${holder.firstName} ${holder.lastName}`.trim() ||
                                        holder.email;

                                      return (
                                        <Link
                                          key={
                                            holder.cadetId
                                          }
                                          href={`/cadets/${holder.cadetId}`}
                                          className="rounded-lg border border-gray-200 p-4 transition hover:border-blue-300 hover:bg-blue-50"
                                        >
                                          <div className="flex items-start justify-between gap-3">
                                            <div>
                                              <p className="font-semibold text-blue-500">
                                                {
                                                  name
                                                }
                                              </p>

                                              <p className="mt-1 text-xs text-gray-500">
                                                {
                                                  holder.email
                                                }
                                              </p>
                                            </div>

                                            <span className="rounded-full bg-black px-2.5 py-1 text-xs font-bold text-white">
                                              Qty{" "}
                                              {
                                                holder.quantity
                                              }
                                            </span>
                                          </div>
                                        </Link>
                                      );
                                    }
                                  )}
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    );
                  }
                )}
              </tbody>
            </table>
          </div>
        )}

        <div className="flex flex-col gap-3 border-t border-gray-200 p-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-gray-500">
            Page {safePage} of{" "}
            {totalPages}
          </p>

          <div className="flex gap-2">
            <button
              type="button"
              disabled={
                safePage <= 1
              }
              onClick={() => {
                setPage(
                  Math.max(
                    1,
                    safePage - 1
                  )
                );

                setExpandedVariant(
                  null
                );
              }}
              className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-black disabled:opacity-40"
            >
              Previous
            </button>

            <button
              type="button"
              disabled={
                safePage >=
                totalPages
              }
              onClick={() => {
                setPage(
                  Math.min(
                    totalPages,
                    safePage + 1
                  )
                );

                setExpandedVariant(
                  null
                );
              }}
              className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-black disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </>
  );
}