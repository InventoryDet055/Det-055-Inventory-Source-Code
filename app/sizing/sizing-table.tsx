"use client";

import Link from "next/link";
import {
  useMemo,
  useState,
} from "react";

export type SizingRow = {
  cadetId: string;

  firstName: string;
  lastName: string;
  email: string;

  asClass: number | null;
  component: string | null;

  uniformCutPreference:
    string | null;

  height: number | null;
  head: number | null;
  neck: number | null;
  chestBust: number | null;
  sleeve: number | null;
  waist: number | null;
  hips: number | null;
  inseam: number | null;

  shoeSize: number | null;
  shoeWidth: string | null;

  measuredAt: string | null;
};

type Props = {
  rows: SizingRow[];
  canEdit: boolean;
};

type DataFilter =
  | "ALL"
  | "COMPLETE"
  | "MISSING";

function measurementValue(
  value: number | null
) {
  if (
    value === null ||
    value === undefined
  ) {
    return "—";
  }

  return value.toString();
}

function measurementCount(
  row: SizingRow
) {
  const fields = [
    row.uniformCutPreference,
    row.height,
    row.head,
    row.neck,
    row.chestBust,
    row.sleeve,
    row.waist,
    row.hips,
    row.inseam,
    row.shoeSize,
    row.shoeWidth,
  ];

  return fields.filter(
    (value) =>
      value !== null &&
      value !== ""
  ).length;
}

export default function SizingTable({
  rows,
  canEdit,
}: Props) {
  const [search, setSearch] =
    useState("");

  const [
    asClassFilter,
    setAsClassFilter,
  ] = useState("ALL");

  const [
    componentFilter,
    setComponentFilter,
  ] = useState("ALL");

  const [
    dataFilter,
    setDataFilter,
  ] =
    useState<DataFilter>(
      "ALL"
    );

  const asClasses =
    useMemo(() => {
      return Array.from(
        new Set(
          rows
            .map(
              (row) =>
                row.asClass
            )
            .filter(
              (
                value
              ): value is number =>
                value !== null
            )
        )
      ).sort(
        (a, b) => a - b
      );
    }, [rows]);

  const components =
    useMemo(() => {
      return Array.from(
        new Set(
          rows
            .map(
              (row) =>
                row.component
            )
            .filter(
              (
                value
              ): value is string =>
                Boolean(value)
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
            asClassFilter !==
              "ALL" &&
            String(
              row.asClass
            ) !==
              asClassFilter
          ) {
            return false;
          }

          if (
            componentFilter !==
              "ALL" &&
            row.component !==
              componentFilter
          ) {
            return false;
          }

          const count =
            measurementCount(
              row
            );

          if (
            dataFilter ===
              "COMPLETE" &&
            count < 11
          ) {
            return false;
          }

          if (
            dataFilter ===
              "MISSING" &&
            count === 11
          ) {
            return false;
          }

          if (!query) {
            return true;
          }

          return [
            row.firstName,
            row.lastName,
            row.email,
            row.asClass ??
              "",
            row.component ??
              "",
          ]
            .join(" ")
            .toLowerCase()
            .includes(query);
        }
      );
    }, [
      rows,
      search,
      asClassFilter,
      componentFilter,
      dataFilter,
    ]);

  return (
    <>
      <div className="mt-6 rounded-xl bg-white p-5 shadow">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div>
            <label className="text-sm font-semibold text-gray-700">
              Search cadets
            </label>

            <input
              value={search}
              onChange={(
                event
              ) =>
                setSearch(
                  event.target
                    .value
                )
              }
              placeholder="Name or email..."
              className="mt-2 w-full rounded-lg border border-gray-300 bg-white p-3 text-black outline-none focus:border-blue-400"
            />
          </div>

          <div>
            <label className="text-sm font-semibold text-gray-700">
              AS Class
            </label>

            <select
              value={
                asClassFilter
              }
              onChange={(
                event
              ) =>
                setAsClassFilter(
                  event.target
                    .value
                )
              }
              className="mt-2 w-full rounded-lg border border-gray-300 bg-white p-3 text-black"
            >
              <option value="ALL">
                All Classes
              </option>

              {asClasses.map(
                (value) => (
                  <option
                    key={value}
                    value={value}
                  >
                    AS {value}
                  </option>
                )
              )}
            </select>
          </div>

          <div>
            <label className="text-sm font-semibold text-gray-700">
              Component
            </label>

            <select
              value={
                componentFilter
              }
              onChange={(
                event
              ) =>
                setComponentFilter(
                  event.target
                    .value
                )
              }
              className="mt-2 w-full rounded-lg border border-gray-300 bg-white p-3 text-black"
            >
              <option value="ALL">
                All Components
              </option>

              {components.map(
                (value) => (
                  <option
                    key={value}
                    value={value}
                  >
                    {value}
                  </option>
                )
              )}
            </select>
          </div>

          <div>
            <label className="text-sm font-semibold text-gray-700">
              Measurement Data
            </label>

            <select
              value={dataFilter}
              onChange={(
                event
              ) =>
                setDataFilter(
                  event.target
                    .value as DataFilter
                )
              }
              className="mt-2 w-full rounded-lg border border-gray-300 bg-white p-3 text-black"
            >
              <option value="ALL">
                All Cadets
              </option>

              <option value="COMPLETE">
                Complete
              </option>

              <option value="MISSING">
                Missing Data
              </option>
            </select>
          </div>
        </div>

        <p className="mt-4 text-sm text-gray-500">
          Showing{" "}
          <span className="font-semibold text-black">
            {
              filteredRows.length
            }
          </span>{" "}
          cadets
        </p>
      </div>

      <div className="mt-6 overflow-hidden rounded-xl bg-white shadow">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1750px] text-left text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50 text-gray-500">
                <th className="px-4 py-3">
                  Cadet
                </th>

                <th className="px-4 py-3">
                  AS
                </th>

                <th className="px-4 py-3">
                  Component
                </th>

                <th className="px-4 py-3">
                  Cut
                </th>

                <th className="px-4 py-3">
                  Height
                </th>

                <th className="px-4 py-3">
                  Head
                </th>

                <th className="px-4 py-3">
                  Neck
                </th>

                <th className="px-4 py-3">
                  Chest/Bust
                </th>

                <th className="px-4 py-3">
                  Sleeve
                </th>

                <th className="px-4 py-3">
                  Waist
                </th>

                <th className="px-4 py-3">
                  Hips
                </th>

                <th className="px-4 py-3">
                  Inseam
                </th>

                <th className="px-4 py-3">
                  Shoe
                </th>

                <th className="px-4 py-3">
                  Status
                </th>

                {canEdit && (
                  <th className="px-4 py-3">
                    Action
                  </th>
                )}
              </tr>
            </thead>

            <tbody>
              {filteredRows.map(
                (row) => {
                  const completed =
                    measurementCount(
                      row
                    );

                  const name =
                    `${row.firstName} ${row.lastName}`.trim() ||
                    row.email;

                  return (
                    <tr
                      key={
                        row.cadetId
                      }
                      className="border-b border-gray-100 hover:bg-gray-50"
                    >
                      <td className="px-4 py-4">
                        <p className="font-semibold text-black">
                          {name}
                        </p>

                        <p className="mt-1 text-xs text-gray-500">
                          {
                            row.email
                          }
                        </p>
                      </td>

                      <td className="px-4 py-4 text-gray-600">
                        {row.asClass
                          ? `AS ${row.asClass}`
                          : "—"}
                      </td>

                      <td className="px-4 py-4 text-gray-600">
                        {row.component ??
                          "—"}
                      </td>

                      <td className="px-4 py-4 font-semibold text-gray-700">
                        {row.uniformCutPreference ??
                          "—"}
                      </td>

                      <td className="px-4 py-4">
                        {measurementValue(
                          row.height
                        )}
                      </td>

                      <td className="px-4 py-4">
                        {measurementValue(
                          row.head
                        )}
                      </td>

                      <td className="px-4 py-4">
                        {measurementValue(
                          row.neck
                        )}
                      </td>

                      <td className="px-4 py-4">
                        {measurementValue(
                          row.chestBust
                        )}
                      </td>

                      <td className="px-4 py-4">
                        {measurementValue(
                          row.sleeve
                        )}
                      </td>

                      <td className="px-4 py-4">
                        {measurementValue(
                          row.waist
                        )}
                      </td>

                      <td className="px-4 py-4">
                        {measurementValue(
                          row.hips
                        )}
                      </td>

                      <td className="px-4 py-4">
                        {measurementValue(
                          row.inseam
                        )}
                      </td>

                      <td className="px-4 py-4 whitespace-nowrap">
                        {row.shoeSize ??
                          "—"}

                        {row.shoeWidth
                          ? ` ${row.shoeWidth}`
                          : ""}
                      </td>

                      <td className="px-4 py-4">
                        <span
                          className={
                            completed ===
                            11
                              ? "rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700"
                              : "rounded-full bg-orange-100 px-3 py-1 text-xs font-semibold text-orange-700"
                          }
                        >
                          {completed ===
                          11
                            ? "Complete"
                            : `${completed}/11`}
                        </span>
                      </td>

                      {canEdit && (
                        <td className="px-4 py-4">
                          <Link
                            href={`/sizing/${row.cadetId}`}
                            className="font-semibold text-blue-500 hover:text-black"
                          >
                            Edit
                          </Link>
                        </td>
                      )}
                    </tr>
                  );
                }
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}