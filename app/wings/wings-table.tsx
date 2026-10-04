"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

export type WingsRow = {
  id: string;
  cadetId: string;
  firstName: string;
  lastName: string;
  email: string;
  asClass: number | null;
  component: string | null;

  sourceCategory: string;
  sourceItem: string;
  sourceCut: string | null;
  sourceSize: string;
  sourceQuantity: number;

  wingsItemNo: string;
  wingsItemName: string;
  wingsCategory: string;
  wingsSubcategory: string;
  wingsSex: string | null;
  wingsSize: string | null;
  wingsQuantity: number;
  nsn: string | null;
  uom: string | null;
  mappingRole: string;
};

export type UnmappedRow = {
  id: string;
  cadetId: string;
  firstName: string;
  lastName: string;
  email: string;
  asClass: number | null;
  component: string | null;

  sourceCategory: string;
  sourceItem: string;
  sourceCut: string | null;
  sourceSize: string;
  quantity: number;
};

type Props = {
  rows: WingsRow[];
  unmappedRows: UnmappedRow[];
};

type ComponentFilter =
  | "ALL"
  | "GMC"
  | "POC";

function csvEscape(
  value: string | number | null | undefined
) {
  const text =
    value === null ||
    value === undefined
      ? ""
      : String(value);

  return `"${text.replace(
    /"/g,
    '""'
  )}"`;
}

export default function WingsTable({
  rows,
  unmappedRows,
}: Props) {
  const [search, setSearch] =
    useState("");

  const [
    componentFilter,
    setComponentFilter,
  ] =
    useState<ComponentFilter>(
      "ALL"
    );

  const filteredRows =
    useMemo(() => {
      const query =
        search
          .trim()
          .toLowerCase();

      return rows.filter(
        (row) => {
          const matchesComponent =
            componentFilter ===
              "ALL" ||
            row.component ===
              componentFilter;

          const searchable = [
            row.firstName,
            row.lastName,
            row.email,
            row.asClass,
            row.component,
            row.sourceItem,
            row.sourceSize,
            row.wingsItemNo,
            row.wingsItemName,
            row.wingsCategory,
            row.wingsSubcategory,
            row.wingsSex,
            row.wingsSize,
            row.nsn,
          ]
            .join(" ")
            .toLowerCase();

          const matchesSearch =
            !query ||
            searchable.includes(
              query
            );

          return (
            matchesComponent &&
            matchesSearch
          );
        }
      );
    }, [
      rows,
      search,
      componentFilter,
    ]);

  const filteredUnmapped =
    useMemo(() => {
      const query =
        search
          .trim()
          .toLowerCase();

      return unmappedRows.filter(
        (row) => {
          const matchesComponent =
            componentFilter ===
              "ALL" ||
            row.component ===
              componentFilter;

          const searchable = [
            row.firstName,
            row.lastName,
            row.email,
            row.asClass,
            row.component,
            row.sourceCategory,
            row.sourceItem,
            row.sourceCut,
            row.sourceSize,
          ]
            .join(" ")
            .toLowerCase();

          const matchesSearch =
            !query ||
            searchable.includes(
              query
            );

          return (
            matchesComponent &&
            matchesSearch
          );
        }
      );
    }, [
      unmappedRows,
      search,
      componentFilter,
    ]);

  function downloadCsv() {
    const headers = [
      "Cadet Last Name",
      "Cadet First Name",
      "Email",
      "AS Class",
      "Component",
      "Source Item",
      "Source Cut",
      "Source Size",
      "WINGS Item No",
      "WINGS Item Name",
      "Category",
      "Subcategory",
      "Sex",
      "Size",
      "Quantity",
      "NSN",
      "UoM",
      "Mapping Role",
    ];

    const lines = [
      headers
        .map(csvEscape)
        .join(","),
      ...filteredRows.map(
        (row) =>
          [
            row.lastName,
            row.firstName,
            row.email,
            row.asClass,
            row.component,
            row.sourceItem,
            row.sourceCut,
            row.sourceSize,
            row.wingsItemNo,
            row.wingsItemName,
            row.wingsCategory,
            row.wingsSubcategory,
            row.wingsSex,
            row.wingsSize,
            row.wingsQuantity,
            row.nsn,
            row.uom,
            row.mappingRole,
          ]
            .map(csvEscape)
            .join(",")
      ),
    ];

    const blob = new Blob(
      [lines.join("\n")],
      {
        type: "text/csv;charset=utf-8;",
      }
    );

    const url =
      URL.createObjectURL(blob);

    const link =
      document.createElement(
        "a"
      );

    link.href = url;
    link.download =
      "Det055_WINGS_Inventory.csv";

    document.body.appendChild(
      link
    );

    link.click();
    link.remove();

    URL.revokeObjectURL(url);
  }

  return (
    <>
      {/* Controls */}
      <div className="mt-6 rounded-xl bg-white p-6 shadow">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <input
            type="text"
            placeholder="Search cadet, item number, NSN, size..."
            value={search}
            onChange={(e) =>
              setSearch(
                e.target.value
              )
            }
            className="w-full rounded-lg border border-blue-400 bg-white p-3 text-black outline-none lg:max-w-xl"
          />

          <button
            type="button"
            onClick={
              downloadCsv
            }
            className="rounded-lg bg-black px-5 py-3 font-semibold text-white transition hover:bg-gray-800"
          >
            Export CSV
          </button>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {(
            [
              ["ALL", "All"],
              ["GMC", "GMC"],
              ["POC", "POC"],
            ] as const
          ).map(
            ([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() =>
                  setComponentFilter(
                    value
                  )
                }
                className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
                  componentFilter ===
                  value
                    ? "bg-black text-white"
                    : "bg-white text-blue-400 ring-1 ring-blue-400 hover:bg-gray-100"
                }`}
              >
                {label}
              </button>
            )
          )}
        </div>
      </div>

      {/* Unmapped Warning */}
      {filteredUnmapped.length >
        0 && (
        <div className="mt-6 rounded-xl border-2 border-black bg-white p-6 shadow">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-xl font-bold text-black">
                Unmapped Inventory
              </h2>

              <p className="mt-1 text-sm text-gray-600">
                These records do
                not currently have a
                valid WINGS mapping
                and require review
                before entry.
              </p>
            </div>

            <span className="rounded-full bg-black px-3 py-1 text-sm font-semibold text-white">
              {
                filteredUnmapped.length
              }{" "}
              unresolved
            </span>
          </div>

          <div className="mt-5 overflow-x-auto">
            <table className="w-full min-w-[800px] text-left text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-gray-500">
                  <th className="pb-3 pr-4">
                    Cadet
                  </th>

                  <th className="pb-3 pr-4">
                    AS
                  </th>

                  <th className="pb-3 pr-4">
                    Component
                  </th>

                  <th className="pb-3 pr-4">
                    Item
                  </th>

                  <th className="pb-3 pr-4">
                    Cut
                  </th>

                  <th className="pb-3 pr-4">
                    Size
                  </th>

                  <th className="pb-3">
                    Qty
                  </th>
                </tr>
              </thead>

              <tbody>
                {filteredUnmapped.map(
                  (row) => (
                    <tr
                      key={row.id}
                      className="border-b border-gray-100 last:border-0"
                    >
                      <td className="py-3 pr-4">
                        <Link
                          href={`/cadets/${row.cadetId}`}
                          className="font-semibold text-blue-500 hover:text-black"
                        >
                          {
                            row.lastName
                          }
                          ,{" "}
                          {
                            row.firstName
                          }
                        </Link>
                      </td>

                      <td className="py-3 pr-4">
                        {row.asClass ??
                          "—"}
                      </td>

                      <td className="py-3 pr-4">
                        {row.component ??
                          "—"}
                      </td>

                      <td className="py-3 pr-4 font-medium text-black">
                        {
                          row.sourceItem
                        }
                      </td>

                      <td className="py-3 pr-4">
                        {row.sourceCut ??
                          "—"}
                      </td>

                      <td className="py-3 pr-4">
                        {
                          row.sourceSize
                        }
                      </td>

                      <td className="py-3">
                        {
                          row.quantity
                        }
                      </td>
                    </tr>
                  )
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* WINGS Table */}
      <div className="mt-6 rounded-xl bg-white p-6 shadow">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xl font-bold text-black">
              WINGS-Ready Records
            </h2>

            <p className="mt-1 text-sm text-gray-600">
              Primary and
              composite mappings
              ready for WINGS
              entry.
            </p>
          </div>

          <span className="text-sm font-semibold text-gray-500">
            {
              filteredRows.length
            }{" "}
            rows
          </span>
        </div>

        {filteredRows.length ===
        0 ? (
          <div className="py-10 text-center text-gray-500">
            No WINGS-ready
            records match the
            current filters.
          </div>
        ) : (
          <div className="mt-5 overflow-x-auto">
            <table className="w-full min-w-[1500px] text-left text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-gray-500">
                  <th className="pb-3 pr-4">
                    Cadet
                  </th>
                  <th className="pb-3 pr-4">
                    AS
                  </th>
                  <th className="pb-3 pr-4">
                    Component
                  </th>
                  <th className="pb-3 pr-4">
                    Source Item
                  </th>
                  <th className="pb-3 pr-4">
                    WINGS Item No
                  </th>
                  <th className="pb-3 pr-4">
                    Item Name
                  </th>
                  <th className="pb-3 pr-4">
                    Category
                  </th>
                  <th className="pb-3 pr-4">
                    Subcategory
                  </th>
                  <th className="pb-3 pr-4">
                    Sex
                  </th>
                  <th className="pb-3 pr-4">
                    Size
                  </th>
                  <th className="pb-3 pr-4">
                    Qty
                  </th>
                  <th className="pb-3 pr-4">
                    NSN
                  </th>
                  <th className="pb-3">
                    UoM
                  </th>
                </tr>
              </thead>

              <tbody>
                {filteredRows.map(
                  (row) => (
                    <tr
                      key={row.id}
                      className="border-b border-gray-100 last:border-0"
                    >
                      <td className="py-3 pr-4">
                        <Link
                          href={`/cadets/${row.cadetId}`}
                          className="font-semibold text-blue-500 hover:text-black"
                        >
                          {
                            row.lastName
                          }
                          ,{" "}
                          {
                            row.firstName
                          }
                        </Link>
                      </td>

                      <td className="py-3 pr-4">
                        {row.asClass ??
                          "—"}
                      </td>

                      <td className="py-3 pr-4">
                        {row.component ??
                          "—"}
                      </td>

                      <td className="py-3 pr-4">
                        <div className="font-medium text-black">
                          {
                            row.sourceItem
                          }
                        </div>

                        <div className="text-xs text-gray-500">
                          {[
                            row.sourceCut,
                            row.sourceSize,
                          ]
                            .filter(
                              Boolean
                            )
                            .join(
                              " • "
                            )}
                        </div>
                      </td>

                      <td className="py-3 pr-4 font-mono text-xs">
                        {
                          row.wingsItemNo
                        }
                      </td>

                      <td className="py-3 pr-4 font-medium text-black">
                        {
                          row.wingsItemName
                        }
                      </td>

                      <td className="py-3 pr-4">
                        {
                          row.wingsCategory
                        }
                      </td>

                      <td className="py-3 pr-4">
                        {
                          row.wingsSubcategory
                        }
                      </td>

                      <td className="py-3 pr-4">
                        {row.wingsSex ??
                          "—"}
                      </td>

                      <td className="py-3 pr-4">
                        {row.wingsSize ??
                          "—"}
                      </td>

                      <td className="py-3 pr-4 font-semibold">
                        {
                          row.wingsQuantity
                        }
                      </td>

                      <td className="py-3 pr-4 font-mono text-xs">
                        {row.nsn ??
                          "—"}
                      </td>

                      <td className="py-3">
                        {row.uom ??
                          "—"}
                      </td>
                    </tr>
                  )
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}