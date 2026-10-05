"use client";

import {
  useMemo,
  useState,
  useTransition,
} from "react";

import { useRouter } from "next/navigation";

import { addOwnInventoryItem } from "./actions";

type Item = {
  id: string;
  display_name: string;
  uniform_category: string;
  cut_rule: string | null;
};

type Variant = {
  id: string;
  app_item_id: string;
  cut: string | null;
  size_display: string;
  size_code: string | null;
  sort_order: number | null;
};

type Props = {
  items: Item[];
  variants: Variant[];
};

const CATEGORIES = [
  "OCP",
  "Blues",
  "PTG",
  "FDU",
];

export default function AddItemForm({
  items,
  variants,
}: Props) {
  const router = useRouter();

  const [
    selectedCategory,
    setSelectedCategory,
  ] = useState("");

  const [
    selectedItemId,
    setSelectedItemId,
  ] = useState("");

  const [
    selectedCut,
    setSelectedCut,
  ] = useState("");

  const [
    selectedVariantId,
    setSelectedVariantId,
  ] = useState("");

  const [
    quantity,
    setQuantity,
  ] = useState(1);

  const [
    message,
    setMessage,
  ] = useState("");

  const [
    isError,
    setIsError,
  ] = useState(false);

  const [
    isPending,
    startTransition,
  ] = useTransition();

  const categoryItems = useMemo(
    () =>
      items.filter(
        (item) =>
          item.uniform_category ===
          selectedCategory
      ),
    [items, selectedCategory]
  );

  const itemVariants = useMemo(
    () =>
      variants.filter(
        (variant) =>
          variant.app_item_id ===
          selectedItemId
      ),
    [variants, selectedItemId]
  );

  const cuts = useMemo(() => {
    const values =
      itemVariants
        .map((variant) => variant.cut)
        .filter(
          (
            cut
          ): cut is string =>
            Boolean(cut)
        );

    return Array.from(
      new Set(values)
    );
  }, [itemVariants]);

  const hasCuts = cuts.length > 0;

  const sizeVariants = useMemo(() => {
    if (!selectedItemId) {
      return [];
    }

    if (!hasCuts) {
      return itemVariants;
    }

    if (!selectedCut) {
      return [];
    }

    return itemVariants.filter(
      (variant) =>
        variant.cut === selectedCut
    );
  }, [
    itemVariants,
    hasCuts,
    selectedCut,
    selectedItemId,
  ]);

  function handleCategoryChange(
    value: string
  ) {
    setSelectedCategory(value);
    setSelectedItemId("");
    setSelectedCut("");
    setSelectedVariantId("");
    setMessage("");
  }

  function handleItemChange(
    value: string
  ) {
    setSelectedItemId(value);
    setSelectedCut("");
    setSelectedVariantId("");
    setMessage("");
  }

  function handleCutChange(
    value: string
  ) {
    setSelectedCut(value);
    setSelectedVariantId("");
    setMessage("");
  }

  function handleSubmit(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setMessage("");
    setIsError(false);

    if (!selectedVariantId) {
      setMessage(
        "Select a size before adding the item."
      );
      setIsError(true);
      return;
    }

    const formData =
      new FormData();

    formData.set(
      "catalog_variant_id",
      selectedVariantId
    );

    formData.set(
      "quantity",
      String(quantity)
    );

    startTransition(async () => {
      const result =
        await addOwnInventoryItem(
          formData
        );

      if (!result.success) {
        setMessage(result.message);
        setIsError(true);
        return;
      }

      router.push("/my-inventory");
      router.refresh();
    });
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-6"
    >
      <div>
        <p className="text-sm font-semibold uppercase tracking-wide text-blue-400">
          My Inventory
        </p>

        <h1 className="mt-1 text-2xl font-bold text-black">
          Add Item
        </h1>

        <p className="mt-2 text-sm text-gray-600">
          Add an issued uniform item that is
          currently in your possession.
        </p>
      </div>

      <div>
        <label
          htmlFor="uniform"
          className="mb-2 block text-sm font-semibold text-black"
        >
          Uniform
        </label>

        <select
          id="uniform"
          value={selectedCategory}
          onChange={(event) =>
            handleCategoryChange(
              event.target.value
            )
          }
          required
          className="w-full rounded-lg border border-gray-300 bg-white p-3 text-black"
        >
          <option value="">
            Select uniform
          </option>

          {CATEGORIES.map(
            (category) => (
              <option
                key={category}
                value={category}
              >
                {category}
              </option>
            )
          )}
        </select>
      </div>

      <div>
        <label
          htmlFor="item"
          className="mb-2 block text-sm font-semibold text-black"
        >
          Item
        </label>

        <select
          id="item"
          value={selectedItemId}
          onChange={(event) =>
            handleItemChange(
              event.target.value
            )
          }
          required
          disabled={!selectedCategory}
          className="w-full rounded-lg border border-gray-300 bg-white p-3 text-black disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-400"
        >
          <option value="">
            Select item
          </option>

          {categoryItems.map(
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

      {selectedItemId &&
        hasCuts && (
          <div>
            <label
              htmlFor="cut"
              className="mb-2 block text-sm font-semibold text-black"
            >
              Cut
            </label>

            <select
              id="cut"
              value={selectedCut}
              onChange={(event) =>
                handleCutChange(
                  event.target.value
                )
              }
              required
              className="w-full rounded-lg border border-gray-300 bg-white p-3 text-black"
            >
              <option value="">
                Select cut
              </option>

              {cuts.map((cut) => (
                <option
                  key={cut}
                  value={cut}
                >
                  {cut}
                </option>
              ))}
            </select>
          </div>
        )}

      <div>
        <label
          htmlFor="size"
          className="mb-2 block text-sm font-semibold text-black"
        >
          Size
        </label>

        <select
          id="size"
          value={selectedVariantId}
          onChange={(event) => {
            setSelectedVariantId(
              event.target.value
            );

            setMessage("");
          }}
          required
          disabled={
            !selectedItemId ||
            (hasCuts &&
              !selectedCut)
          }
          className="w-full rounded-lg border border-gray-300 bg-white p-3 text-black disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-400"
        >
          <option value="">
            Select size
          </option>

          {sizeVariants.map(
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
        <label
          htmlFor="quantity"
          className="mb-2 block text-sm font-semibold text-black"
        >
          Quantity
        </label>

        <input
          id="quantity"
          type="number"
          min={1}
          max={99}
          value={quantity}
          onChange={(event) =>
            setQuantity(
              Number(
                event.target.value
              )
            )
          }
          required
          className="w-full rounded-lg border border-gray-300 bg-white p-3 text-black"
        />
      </div>

      {message && (
        <div
          className={`rounded-lg p-3 text-sm ${
            isError
              ? "bg-red-50 text-red-700"
              : "bg-green-50 text-green-700"
          }`}
        >
          {message}
        </div>
      )}

      <div className="flex flex-col gap-3 sm:flex-row">
        <button
          type="submit"
          disabled={
            isPending ||
            !selectedVariantId
          }
          className="flex-1 rounded-lg bg-black px-5 py-3 font-semibold text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isPending
            ? "Adding..."
            : "Add Item"}
        </button>

        <a
          href="/my-inventory"
          className="rounded-lg border border-gray-300 px-5 py-3 text-center font-semibold text-black transition hover:bg-gray-100"
        >
          Cancel
        </a>
      </div>
    </form>
  );
}