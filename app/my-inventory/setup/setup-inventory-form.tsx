"use client";

import { useMemo, useState } from "react";
import { completeInventorySetup } from "./actions";

type AppItem = {
  id: string;
  uniform_category: string;
  display_name: string;
  cut_rule: string;
  sort_order: number;
};

type CatalogVariant = {
  id: string;
  app_item_id: string;
  cut: string | null;
  size_display: string;
  size_code: string;
  sort_order: number;
};

type InventoryRow = {
  variantId: string;
  quantity: number;
};

type ItemDetails = {
  cut: string;
  rows: InventoryRow[];
};

type Props = {
  items: AppItem[];
  variants: CatalogVariant[];
};

const categories = ["OCP", "Blues", "PTG", "FDU"];

export default function InventorySetupForm({
  items,
  variants,
}: Props) {
  const [step, setStep] = useState(1);

  const [selectedItems, setSelectedItems] = useState<string[]>([]);

  const [details, setDetails] = useState<
    Record<string, ItemDetails>
  >({});

  const selectedCatalogItems = useMemo(
    () =>
      items
        .filter((item) => selectedItems.includes(item.id))
        .sort((a, b) => {
          const categoryDifference =
            categories.indexOf(a.uniform_category) -
            categories.indexOf(b.uniform_category);

          if (categoryDifference !== 0) {
            return categoryDifference;
          }

          return a.sort_order - b.sort_order;
        }),
    [items, selectedItems]
  );

  function toggleItem(item: AppItem) {
    const selected = selectedItems.includes(item.id);

    if (selected) {
      setSelectedItems((current) =>
        current.filter((id) => id !== item.id)
      );

      setDetails((current) => {
        const copy = { ...current };
        delete copy[item.id];
        return copy;
      });

      return;
    }

    setSelectedItems((current) => [...current, item.id]);

    let impliedCut = "";

    if (item.cut_rule === "male_only") {
      impliedCut = "Male";
    }

    if (item.cut_rule === "female_only") {
      impliedCut = "Female";
    }

    setDetails((current) => ({
      ...current,
      [item.id]: {
        cut: impliedCut,
        rows: [
          {
            variantId: "",
            quantity: 1,
          },
        ],
      },
    }));
  }

  function setCategorySelection(
    category: string,
    shouldSelect: boolean
  ) {
    const categoryItems = items.filter(
      (item) => item.uniform_category === category
    );

    if (shouldSelect) {
      const idsToAdd = categoryItems
        .map((item) => item.id)
        .filter((id) => !selectedItems.includes(id));

      setSelectedItems((current) => [...current, ...idsToAdd]);

      setDetails((current) => {
        const copy = { ...current };

        for (const item of categoryItems) {
          if (!copy[item.id]) {
            let impliedCut = "";

            if (item.cut_rule === "male_only") {
              impliedCut = "Male";
            }

            if (item.cut_rule === "female_only") {
              impliedCut = "Female";
            }

            copy[item.id] = {
              cut: impliedCut,
              rows: [
                {
                  variantId: "",
                  quantity: 1,
                },
              ],
            };
          }
        }

        return copy;
      });
    } else {
      const categoryIds = new Set(
        categoryItems.map((item) => item.id)
      );

      setSelectedItems((current) =>
        current.filter((id) => !categoryIds.has(id))
      );

      setDetails((current) => {
        const copy = { ...current };

        for (const id of categoryIds) {
          delete copy[id];
        }

        return copy;
      });
    }
  }

  function updateCut(itemId: string, cut: string) {
    setDetails((current) => ({
      ...current,
      [itemId]: {
        cut,
        rows: [
          {
            variantId: "",
            quantity: 1,
          },
        ],
      },
    }));
  }

  function updateRow(
    itemId: string,
    rowIndex: number,
    field: keyof InventoryRow,
    value: string | number
  ) {
    setDetails((current) => {
      const itemDetails = current[itemId];

      const rows = itemDetails.rows.map((row, index) =>
        index === rowIndex
          ? {
              ...row,
              [field]: value,
            }
          : row
      );

      return {
        ...current,
        [itemId]: {
          ...itemDetails,
          rows,
        },
      };
    });
  }

  function addSizeRow(itemId: string) {
    setDetails((current) => ({
      ...current,
      [itemId]: {
        ...current[itemId],
        rows: [
          ...current[itemId].rows,
          {
            variantId: "",
            quantity: 1,
          },
        ],
      },
    }));
  }

  function removeSizeRow(itemId: string, rowIndex: number) {
    setDetails((current) => ({
      ...current,
      [itemId]: {
        ...current[itemId],
        rows: current[itemId].rows.filter(
          (_, index) => index !== rowIndex
        ),
      },
    }));
  }

  function availableVariantsFor(item: AppItem) {
    const itemDetails = details[item.id];

    if (!itemDetails) {
      return [];
    }

    let expectedCut: string | null = null;

    if (item.cut_rule === "required") {
      if (!itemDetails.cut) {
        return [];
      }

      expectedCut = itemDetails.cut;
    }

    if (item.cut_rule === "male_only") {
      expectedCut = "Male";
    }

    if (item.cut_rule === "female_only") {
      expectedCut = "Female";
    }

    return variants
      .filter((variant) => {
        if (variant.app_item_id !== item.id) {
          return false;
        }

        if (item.cut_rule === "none") {
          return variant.cut === null;
        }

        return variant.cut === expectedCut;
      })
      .sort((a, b) => a.sort_order - b.sort_order);
  }

  const setupComplete = useMemo(() => {
    if (selectedCatalogItems.length === 0) {
      return true;
    }

    return selectedCatalogItems.every((item) => {
      const itemDetails = details[item.id];

      if (!itemDetails) {
        return false;
      }

      if (
        item.cut_rule === "required" &&
        !itemDetails.cut
      ) {
        return false;
      }

      return (
        itemDetails.rows.length > 0 &&
        itemDetails.rows.every(
          (row) =>
            Boolean(row.variantId) &&
            Number.isInteger(row.quantity) &&
            row.quantity >= 1
        )
      );
    });
  }, [selectedCatalogItems, details]);

  const submittedInventory = useMemo(() => {
    const rows: {
      catalog_variant_id: string;
      quantity: number;
    }[] = [];

    for (const item of selectedCatalogItems) {
      const itemDetails = details[item.id];

      if (!itemDetails) continue;

      for (const row of itemDetails.rows) {
        if (!row.variantId) continue;

        rows.push({
          catalog_variant_id: row.variantId,
          quantity: row.quantity,
        });
      }
    }

    return rows;
  }, [selectedCatalogItems, details]);

  function getVariant(variantId: string) {
    return variants.find(
      (variant) => variant.id === variantId
    );
  }

  return (
    <>
      <div>
        <p className="text-sm font-semibold uppercase tracking-wide text-blue-400">
          Step {step} of 3
        </p>

        <h1 className="mt-1 text-3xl font-bold text-black">
          Set Up My Inventory
        </h1>

        <div className="mt-5 h-2 overflow-hidden rounded-full bg-gray-200">
          <div
            className="h-full bg-blue-400 transition-all"
            style={{
              width:
                step === 1
                  ? "33%"
                  : step === 2
                  ? "66%"
                  : "100%",
            }}
          />
        </div>
      </div>

      {step === 1 && (
        <div className="mt-8">
          <h2 className="text-xl font-bold text-black">
            What items do you currently have?
          </h2>

          <p className="mt-2 text-sm text-gray-600">
            Select every uniform item currently issued to you.
            Leave items you do not have unchecked.
          </p>

          <div className="mt-6 space-y-6">
            {categories.map((category) => {
              const categoryItems = items
                .filter(
                  (item) =>
                    item.uniform_category === category
                )
                .sort(
                  (a, b) =>
                    a.sort_order - b.sort_order
                );

              const allSelected =
                categoryItems.length > 0 &&
                categoryItems.every((item) =>
                  selectedItems.includes(item.id)
                );

              return (
                <section
                  key={category}
                  className="rounded-xl border border-gray-200 p-5"
                >
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-bold text-blue-400">
                      {category}
                    </h3>

                    <button
                      type="button"
                      onClick={() =>
                        setCategorySelection(
                          category,
                          !allSelected
                        )
                      }
                      className="text-sm font-semibold text-blue-500 hover:text-black"
                    >
                      {allSelected
                        ? "Clear"
                        : "Select all"}
                    </button>
                  </div>

                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    {categoryItems.map((item) => (
                      <label
                        key={item.id}
                        className="flex cursor-pointer items-center gap-3 rounded-lg border border-gray-200 p-3 hover:bg-gray-50"
                      >
                        <input
                          type="checkbox"
                          checked={selectedItems.includes(
                            item.id
                          )}
                          onChange={() => toggleItem(item)}
                          className="h-5 w-5"
                        />

                        <span className="font-medium text-black">
                          {item.display_name}
                        </span>
                      </label>
                    ))}
                  </div>
                </section>
              );
            })}
          </div>

          <div className="mt-8 flex justify-end">
            <button
              type="button"
              onClick={() => setStep(2)}
              className="rounded-lg bg-black px-6 py-3 font-semibold text-white hover:bg-gray-800"
            >
              Continue
            </button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="mt-8">
          <h2 className="text-xl font-bold text-black">
            Sizes and Quantities
          </h2>

          <p className="mt-2 text-sm text-gray-600">
            Enter the size and quantity for each item you
            selected.
          </p>

          {selectedCatalogItems.length === 0 ? (
            <div className="mt-6 rounded-lg bg-gray-50 p-5 text-sm text-gray-600">
              You selected no items. You may continue if you
              currently have no issued inventory.
            </div>
          ) : (
            <div className="mt-6 grid gap-5 lg:grid-cols-2">
              {selectedCatalogItems.map((item) => {
                const itemDetails = details[item.id];

                const availableVariants =
                  availableVariantsFor(item);

                return (
                  <section
                    key={item.id}
                    className="rounded-xl border border-gray-200 p-5"
                  >
                    <p className="text-xs font-semibold uppercase tracking-wide text-blue-400">
                      {item.uniform_category}
                    </p>

                    <h3 className="mt-1 text-lg font-bold text-black">
                      {item.display_name}
                    </h3>

                    {item.cut_rule === "required" && (
                      <div className="mt-4">
                        <label className="mb-2 block text-sm font-semibold text-black">
                          Uniform Cut
                        </label>

                        <select
                          value={itemDetails?.cut ?? ""}
                          onChange={(e) =>
                            updateCut(
                              item.id,
                              e.target.value
                            )
                          }
                          className="w-full rounded-lg border border-gray-300 bg-white p-3 text-black"
                        >
                          <option value="">
                            Select cut...
                          </option>
                          <option value="Male">
                            Male
                          </option>
                          <option value="Female">
                            Female
                          </option>
                        </select>
                      </div>
                    )}

                    <div className="mt-4 space-y-3">
                      {itemDetails?.rows.map(
                        (row, rowIndex) => (
                          <div
                            key={rowIndex}
                            className="rounded-lg bg-gray-50 p-3"
                          >
                            <div className="grid gap-3 sm:grid-cols-[1fr_100px]">
                              <div>
                                <label className="mb-1 block text-xs font-semibold text-gray-600">
                                  Size
                                </label>

                                <select
                                  value={row.variantId}
                                  onChange={(e) =>
                                    updateRow(
                                      item.id,
                                      rowIndex,
                                      "variantId",
                                      e.target.value
                                    )
                                  }
                                  disabled={
                                    item.cut_rule ===
                                      "required" &&
                                    !itemDetails.cut
                                  }
                                  className="w-full rounded-lg border border-gray-300 bg-white p-2.5 text-black disabled:bg-gray-100"
                                >
                                  <option value="">
                                    Select size...
                                  </option>

                                  {availableVariants.map(
                                    (variant) => (
                                      <option
                                        key={variant.id}
                                        value={variant.id}
                                      >
                                        {
                                          variant.size_display
                                        }
                                      </option>
                                    )
                                  )}
                                </select>
                              </div>

                              <div>
                                <label className="mb-1 block text-xs font-semibold text-gray-600">
                                  Quantity
                                </label>

                                <input
                                  type="number"
                                  min={1}
                                  step={1}
                                  value={row.quantity}
                                  onChange={(e) =>
                                    updateRow(
                                      item.id,
                                      rowIndex,
                                      "quantity",
                                      Number(
                                        e.target.value
                                      )
                                    )
                                  }
                                  className="w-full rounded-lg border border-gray-300 bg-white p-2.5 text-black"
                                />
                              </div>
                            </div>

                            {itemDetails.rows.length > 1 && (
                              <button
                                type="button"
                                onClick={() =>
                                  removeSizeRow(
                                    item.id,
                                    rowIndex
                                  )
                                }
                                className="mt-2 text-xs font-semibold text-red-600 hover:text-red-800"
                              >
                                Remove this size
                              </button>
                            )}
                          </div>
                        )
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        addSizeRow(item.id)
                      }
                      className="mt-3 text-sm font-semibold text-blue-500 hover:text-black"
                    >
                      + Add another size
                    </button>
                  </section>
                );
              })}
            </div>
          )}

          <div className="mt-8 flex justify-between gap-3">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="rounded-lg border border-gray-300 px-6 py-3 font-semibold text-black hover:bg-gray-100"
            >
              Back
            </button>

            <button
              type="button"
              disabled={!setupComplete}
              onClick={() => setStep(3)}
              className="rounded-lg bg-black px-6 py-3 font-semibold text-white hover:bg-gray-800 disabled:cursor-not-allowed disabled:bg-gray-400"
            >
              Review Inventory
            </button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="mt-8">
          <h2 className="text-xl font-bold text-black">
            Review Your Inventory
          </h2>

          <p className="mt-2 text-sm text-gray-600">
            Confirm that everything below accurately reflects
            what is currently issued to you.
          </p>

          {selectedCatalogItems.length === 0 ? (
            <div className="mt-6 rounded-lg bg-gray-50 p-5 text-sm text-gray-600">
              You indicated that you currently have no issued
              inventory.
            </div>
          ) : (
            <div className="mt-6 space-y-6">
              {categories.map((category) => {
                const categoryItems =
                  selectedCatalogItems.filter(
                    (item) =>
                      item.uniform_category === category
                  );

                if (categoryItems.length === 0) {
                  return null;
                }

                return (
                  <section key={category}>
                    <h3 className="text-lg font-bold text-blue-400">
                      {category}
                    </h3>

                    <div className="mt-2 divide-y rounded-xl border border-gray-200 px-4">
                      {categoryItems.flatMap((item) =>
                        details[item.id].rows.map(
                          (row, rowIndex) => {
                            const variant =
                              getVariant(
                                row.variantId
                              );

                            return (
                              <div
                                key={`${item.id}-${rowIndex}`}
                                className="flex items-center justify-between gap-4 py-4"
                              >
                                <div>
                                  <p className="font-semibold text-black">
                                    {
                                      item.display_name
                                    }
                                  </p>

                                  <p className="mt-1 text-sm text-gray-600">
                                    {details[item.id]
                                      .cut
                                      ? `${
                                          details[item.id]
                                            .cut
                                        } • `
                                      : ""}
                                    {
                                      variant?.size_display
                                    }
                                  </p>
                                </div>

                                <span className="rounded-full bg-blue-400 px-3 py-1 text-sm font-semibold text-white">
                                  Qty {row.quantity}
                                </span>
                              </div>
                            );
                          }
                        )
                      )}
                    </div>
                  </section>
                );
              })}
            </div>
          )}

          <form action={completeInventorySetup}>
            <input
              type="hidden"
              name="inventory_json"
              value={JSON.stringify(
                submittedInventory
              )}
            />

            <div className="mt-8 flex justify-between gap-3">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="rounded-lg border border-gray-300 px-6 py-3 font-semibold text-black hover:bg-gray-100"
              >
                Back
              </button>

              <button
                type="submit"
                className="rounded-lg bg-black px-6 py-3 font-semibold text-white hover:bg-gray-800"
              >
                Save My Inventory
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}