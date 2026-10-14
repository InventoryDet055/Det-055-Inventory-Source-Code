"use client";

import Link from "next/link";
import {
  useMemo,
  useState,
} from "react";

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

type DisplayRow = {
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

  wingsItemNo: string;
  itemName: string;
  category: string;
  subcategory: string;
  sex: string;
  size: string;
  nsn: string;
  uom: string;
  mappingRole: string;
};

function csvEscape(
  value:
    | string
    | number
    | null
    | undefined
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

  /*
   * Combine mapped and unmapped
   * physical inventory into one view.
   *
   * If we know the WINGS catalog
   * information, use it.
   *
   * Otherwise preserve the physical
   * item and leave unknown WINGS
   * fields blank.
   */
  const displayRows =
    useMemo<DisplayRow[]>(
      () => {
        const mapped:
          DisplayRow[] =
          rows.map(
            (row) => ({
              id: row.id,

              cadetId:
                row.cadetId,

              firstName:
                row.firstName,

              lastName:
                row.lastName,

              email:
                row.email,

              asClass:
                row.asClass,

              component:
                row.component,

              sourceCategory:
                row.sourceCategory,

              sourceItem:
                row.sourceItem,

              sourceCut:
                row.sourceCut,

              sourceSize:
                row.sourceSize,

              quantity:
                row.wingsQuantity,

              wingsItemNo:
                row.wingsItemNo,

              itemName:
                row.wingsItemName ||
                row.sourceItem,

              category:
                row.wingsCategory ||
                row.sourceCategory,

              subcategory:
                row.wingsSubcategory ||
                "",

              sex:
                row.wingsSex ||
                row.sourceCut ||
                "",

              size:
                row.wingsSize ||
                row.sourceSize,

              nsn:
                row.nsn ?? "",

              uom:
                row.uom ?? "",

              mappingRole:
                row.mappingRole,
            })
          );

        const unmapped:
          DisplayRow[] =
          unmappedRows.map(
            (row) => ({
              id:
                `unmapped-${row.id}`,

              cadetId:
                row.cadetId,

              firstName:
                row.firstName,

              lastName:
                row.lastName,

              email:
                row.email,

              asClass:
                row.asClass,

              component:
                row.component,

              sourceCategory:
                row.sourceCategory,

              sourceItem:
                row.sourceItem,

              sourceCut:
                row.sourceCut,

              sourceSize:
                row.sourceSize,

              quantity:
                row.quantity,

              /*
               * Unknown WINGS fields
               * intentionally remain
               * blank.
               */
              wingsItemNo: "",

              itemName:
                row.sourceItem,

              category:
                row.sourceCategory,

              subcategory: "",

              sex:
                row.sourceCut ??
                "",

              size:
                row.sourceSize,

              nsn: "",

              uom: "",

              mappingRole: "",
            })
          );

        return [
          ...mapped,
          ...unmapped,
        ].sort(
          (a, b) => {
            const lastName =
              a.lastName.localeCompare(
                b.lastName
              );

            if (
              lastName !== 0
            ) {
              return lastName;
            }

            const firstName =
              a.firstName.localeCompare(
                b.firstName
              );

            if (
              firstName !== 0
            ) {
              return firstName;
            }

            const item =
              a.sourceItem.localeCompare(
                b.sourceItem
              );

            if (item !== 0) {
              return item;
            }

            return a.sourceSize.localeCompare(
              b.sourceSize
            );
          }
        );
      },
      [
        rows,
        unmappedRows,
      ]
    );

  const filteredRows =
    useMemo(() => {
      const query =
        search
          .trim()
          .toLowerCase();

      return displayRows.filter(
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
            row.wingsItemNo,
            row.itemName,
            row.category,
            row.subcategory,
            row.sex,
            row.size,
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
      displayRows,
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
      "Item Name",
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
            row.itemName,
            row.category,
            row.subcategory,
            row.sex,
            row.size,
            row.quantity,
            row.nsn,
            row.uom,
            row.mappingRole,
          ]
            .map(csvEscape)
            .join(",")
      ),
    ];

    const blob =
      new Blob(
        [
          lines.join(
            "\n"
          ),
        ],
        {
          type:
            "text/csv;charset=utf-8;",
        }
      );

    const url =
      URL.createObjectURL(
        blob
      );

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

    URL.revokeObjectURL(
      url
    );
  }

  return (
    <>
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
              [
                "ALL",
                "All",
              ],
              [
                "GMC",
                "GMC",
              ],
              [
                "POC",
                "POC",
              ],
            ] as const
          ).map(
            ([
              value,
              label,
            ]) => (
              <button
                key={
                  value
                }
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

      <div className="mt-6 rounded-xl bg-white p-6 shadow">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xl font-bold text-black">
              Inventory Records
            </h2>

            <p className="mt-1 text-sm text-gray-600">
              All physical
              inventory is shown
              together. Known
              WINGS catalog fields
              are populated when
              available; unknown
              WINGS fields remain
              blank.
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
            No inventory
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
                      key={
                        row.id
                      }
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
                          row.itemName
                        }
                      </td>

                      <td className="py-3 pr-4">
                        {
                          row.category
                        }
                      </td>

                      <td className="py-3 pr-4">
                        {
                          row.subcategory
                        }
                      </td>

                      <td className="py-3 pr-4">
                        {
                          row.sex
                        }
                      </td>

                      <td className="py-3 pr-4">
                        {
                          row.size
                        }
                      </td>

                      <td className="py-3 pr-4 font-semibold">
                        {
                          row.quantity
                        }
                      </td>

                      <td className="py-3 pr-4 font-mono text-xs">
                        {
                          row.nsn
                        }
                      </td>

                      <td className="py-3">
                        {
                          row.uom
                        }
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