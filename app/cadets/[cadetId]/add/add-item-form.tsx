"use client";

import { useMemo, useState } from "react";
import { addCadetInventoryItem } from "./actions";

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

type Props = {
  cadetId: string;
  items: AppItem[];
  variants: CatalogVariant[];
};

const categories = [
  "OCP",
  "Blues",
  "PTG",
  "FDU",
];

export default function AddCadetItemForm({
  cadetId,
  items,
  variants,
}: Props) {
  const [category, setCategory] =
    useState("");

  const [itemId, setItemId] =
    useState("");

  const [cut, setCut] =
    useState("");

  const [variantId, setVariantId] =
    useState("");

  const availableItems = useMemo(() => {
    return items
      .filter(
        (item) =>
          item.uniform_category === category
      )
      .sort(
        (a, b) =>
          a.sort_order - b.sort_order
      );
  }, [items, category]);

  const selectedItem =
    items.find(
      (item) => item.id === itemId
    );

  const effectiveCut = useMemo(() => {
    if (!selectedItem) return "";

    if (
      selectedItem.cut_rule ===
      "male_only"
    ) {
      return "Male";
    }

    if (
      selectedItem.cut_rule ===
      "female_only"
    ) {
      return "Female";
    }

    if (
      selectedItem.cut_rule ===
      "required"
    ) {
      return cut;
    }

    return "";
  }, [selectedItem, cut]);

  const availableVariants =
    useMemo(() => {
      if (!selectedItem) {
        return [];
      }

      return variants
        .filter((variant) => {
          if (
            variant.app_item_id !==
            selectedItem.id
          ) {
            return false;
          }

          if (
            selectedItem.cut_rule ===
            "none"
          ) {
            return variant.cut === null;
          }

          return (
            variant.cut === effectiveCut
          );
        })
        .sort(
          (a, b) =>
            a.sort_order -
            b.sort_order
        );
    }, [
      variants,
      selectedItem,
      effectiveCut,
    ]);

  function changeCategory(
    value: string
  ) {
    setCategory(value);
    setItemId("");
    setCut("");
    setVariantId("");
  }

  function changeItem(
    value: string
  ) {
    setItemId(value);
    setCut("");
    setVariantId("");
  }

  function changeCut(
    value: string
  ) {
    setCut(value);
    setVariantId("");
  }

  return (
    <form
      action={addCadetInventoryItem}
      className="space-y-6"
    >
      <input
        type="hidden"
        name="cadet_id"
        value={cadetId}
      />

      <div>
        <label className="mb-2 block text-sm font-semibold text-black">
          Uniform
        </label>

        <select
          value={category}
          onChange={(e) =>
            changeCategory(
              e.target.value
            )
          }
          required
          className="w-full rounded-lg border border-gray-300 bg-white p-3 text-black"
        >
          <option value="">
            Select uniform...
          </option>

          {categories.map(
            (categoryName) => (
              <option
                key={categoryName}
                value={categoryName}
              >
                {categoryName}
              </option>
            )
          )}
        </select>
      </div>

      {category && (
        <div>
          <label className="mb-2 block text-sm font-semibold text-black">
            Item
          </label>

          <select
            value={itemId}
            onChange={(e) =>
              changeItem(
                e.target.value
              )
            }
            required
            className="w-full rounded-lg border border-gray-300 bg-white p-3 text-black"
          >
            <option value="">
              Select item...
            </option>

            {availableItems.map(
              (item) => (
                <option
                  key={item.id}
                  value={item.id}
                >
                  {item.display_name}
                </option>
              )
            )}
          </select>
        </div>
      )}

      {selectedItem?.cut_rule ===
        "required" && (
        <div>
          <label className="mb-2 block text-sm font-semibold text-black">
            Uniform Cut
          </label>

          <select
            value={cut}
            onChange={(e) =>
              changeCut(
                e.target.value
              )
            }
            required
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

      {selectedItem &&
        (selectedItem.cut_rule !==
          "required" ||
          cut) && (
          <div>
            <label className="mb-2 block text-sm font-semibold text-black">
              Size
            </label>

            <select
              name="catalog_variant_id"
              value={variantId}
              onChange={(e) =>
                setVariantId(
                  e.target.value
                )
              }
              required
              className="w-full rounded-lg border border-gray-300 bg-white p-3 text-black"
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
        )}

      {variantId && (
        <div>
          <label className="mb-2 block text-sm font-semibold text-black">
            Quantity
          </label>

          <input
            name="quantity"
            type="number"
            min={1}
            step={1}
            defaultValue={1}
            required
            className="w-full rounded-lg border border-gray-300 bg-white p-3 text-black"
          />
        </div>
      )}

      <div className="flex gap-3 pt-2">
        <a
          href={`/cadets/${cadetId}`}
          className="flex-1 rounded-lg border border-gray-300 px-4 py-3 text-center font-semibold text-black hover:bg-gray-100"
        >
          Cancel
        </a>

        <button
          type="submit"
          disabled={!variantId}
          className="flex-1 rounded-lg bg-black px-4 py-3 font-semibold text-white hover:bg-gray-800 disabled:cursor-not-allowed disabled:bg-gray-400"
        >
          Add Item
        </button>
      </div>
    </form>
  );
}