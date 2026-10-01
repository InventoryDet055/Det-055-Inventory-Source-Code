"use client";

import { useMemo, useState } from "react";
import { editInventoryItem } from "./actions";

type AppItem = {
  id: string;
  display_name: string;
  uniform_category: string;
  cut_rule: string;
};

type CatalogVariant = {
  id: string;
  cut: string | null;
  size_display: string;
  size_code: string;
  sort_order: number;
};

type Props = {
  inventoryId: string;
  item: AppItem;
  currentVariantId: string;
  currentCut: string | null;
  currentQuantity: number;
  variants: CatalogVariant[];
};

export default function EditItemForm({
  inventoryId,
  item,
  currentVariantId,
  currentCut,
  currentQuantity,
  variants,
}: Props) {
  const impliedCut =
    item.cut_rule === "female_only"
      ? "Female"
      : item.cut_rule === "male_only"
      ? "Male"
      : "";

  const [cut, setCut] = useState(
    currentCut ?? impliedCut
  );

  const [variantId, setVariantId] =
    useState(currentVariantId);

  const [quantity, setQuantity] =
    useState(currentQuantity);

  const availableVariants = useMemo(() => {
    return variants
      .filter((variant) => {
        if (item.cut_rule === "none") {
          return variant.cut === null;
        }

        if (item.cut_rule === "required") {
          return variant.cut === cut;
        }

        if (item.cut_rule === "female_only") {
          return variant.cut === "Female";
        }

        if (item.cut_rule === "male_only") {
          return variant.cut === "Male";
        }

        return false;
      })
      .sort(
        (a, b) => a.sort_order - b.sort_order
      );
  }, [variants, item.cut_rule, cut]);

  function changeCut(newCut: string) {
    setCut(newCut);

    const firstVariant = variants
      .filter(
        (variant) => variant.cut === newCut
      )
      .sort(
        (a, b) =>
          a.sort_order - b.sort_order
      )[0];

    setVariantId(firstVariant?.id ?? "");
  }

  return (
    <form
      action={editInventoryItem}
      className="space-y-6"
    >
      <input
        type="hidden"
        name="inventory_id"
        value={inventoryId}
      />

      <div>
        <p className="text-sm font-semibold uppercase tracking-wide text-blue-400">
          {item.uniform_category}
        </p>

        <h1 className="mt-1 text-2xl font-bold text-black">
          {item.display_name}
        </h1>
      </div>

      {item.cut_rule === "required" && (
        <div>
          <label className="mb-2 block text-sm font-semibold text-black">
            Uniform Cut
          </label>

          <select
            value={cut}
            onChange={(e) =>
              changeCut(e.target.value)
            }
            className="w-full rounded-lg border border-gray-300 bg-white p-3 text-black"
            required
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

      <div>
        <label className="mb-2 block text-sm font-semibold text-black">
          Size
        </label>

        <select
          name="catalog_variant_id"
          value={variantId}
          onChange={(e) =>
            setVariantId(e.target.value)
          }
          className="w-full rounded-lg border border-gray-300 bg-white p-3 text-black"
          required
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
                {variant.size_display}
              </option>
            )
          )}
        </select>
      </div>

      <div>
        <label className="mb-2 block text-sm font-semibold text-black">
          Quantity
        </label>

        <input
          name="quantity"
          type="number"
          min={1}
          step={1}
          value={quantity}
          onChange={(e) =>
            setQuantity(
              Number(e.target.value)
            )
          }
          className="w-full rounded-lg border border-gray-300 bg-white p-3 text-black"
          required
        />

        <p className="mt-2 text-xs text-gray-500">
          If you no longer possess this item,
          contact Inventory to have it removed
          from your account.
        </p>
      </div>

      <div className="flex gap-3 pt-2">
        <a
          href="/my-inventory"
          className="flex-1 rounded-lg border border-gray-300 px-4 py-3 text-center font-semibold text-black hover:bg-gray-100"
        >
          Cancel
        </a>

        <button
          type="submit"
          disabled={!variantId}
          className="flex-1 rounded-lg bg-black px-4 py-3 font-semibold text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:bg-gray-400"
        >
          Save Changes
        </button>
      </div>
    </form>
  );
}