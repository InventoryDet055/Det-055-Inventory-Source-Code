import { Suspense } from "react";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import StaffHeader from "@/components/staff-header";

import InventoryRoomTable, {
  InventoryRoomRow,
  InventoryHolder,
} from "./inventory-room-table";

const PAGE_SIZE = 1000;

async function InventoryRoomContent() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  /*
   * Determine signed-in user's roles.
   */
  const {
    data: profileRoles,
    error: profileRolesError,
  } = await supabase
    .from("profile_roles")
    .select("role_id")
    .eq("profile_id", user.id);

  if (profileRolesError) {
    throw new Error(
      profileRolesError.message
    );
  }

  const roleIds =
    profileRoles?.map(
      (role) => role.role_id
    ) ?? [];

  let roleNames: string[] = [];

  if (roleIds.length > 0) {
    const {
      data: roles,
      error: rolesError,
    } = await supabase
      .from("roles")
      .select("name")
      .in("id", roleIds);

    if (rolesError) {
      throw new Error(
        rolesError.message
      );
    }

    roleNames =
      roles?.map(
        (role) => role.name
      ) ?? [];
  }

  const isAdmin =
    roleNames.includes(
      "inventory_admin"
    );

  const isAssistant =
    roleNames.includes(
      "inventory_assistant"
    );

  const isCadre =
    roleNames.includes(
      "cadre"
    );

  const isCadet =
    roleNames.includes(
      "cadet"
    );

  if (
    !isAdmin &&
    !isAssistant &&
    !isCadre
  ) {
    if (isCadet) {
      redirect("/my-inventory");
    }

    redirect("/auth/login");
  }

  const canEdit =
    isAdmin ||
    isAssistant;

  /*
   * Load all rows from the live
   * full-inventory summary.
   */
  const summaryRows: {
    catalog_variant_id: string;
    app_item_id: string;
    uniform_category: string;
    display_name: string;
    cut: string | null;
    size_display: string;
    size_code: string | null;
    room_quantity: number;
    issued_quantity: number;
    total_accounted_quantity: number;
    cadet_count: number;
    last_counted_at: string | null;
    room_updated_at: string | null;
  }[] = [];

  let summaryFrom = 0;

  while (true) {
    const {
      data,
      error,
    } = await supabase
      .from(
        "inventory_variant_summary"
      )
      .select(`
        catalog_variant_id,
        app_item_id,
        uniform_category,
        display_name,
        cut,
        size_display,
        size_code,
        room_quantity,
        issued_quantity,
        total_accounted_quantity,
        cadet_count,
        last_counted_at,
        room_updated_at
      `)
      .order(
        "uniform_category"
      )
      .order("display_name")
      .order("cut")
      .order("size_display")
      .range(
        summaryFrom,
        summaryFrom +
          PAGE_SIZE -
          1
      );

    if (error) {
      throw new Error(
        error.message
      );
    }

    const batch =
      data ?? [];

    summaryRows.push(
      ...batch
    );

    if (
      batch.length <
      PAGE_SIZE
    ) {
      break;
    }

    summaryFrom +=
      PAGE_SIZE;
  }

  /*
   * Load every issued inventory
   * record so we can identify the
   * cadets holding each variant.
   */
  const issuedRows: {
    cadet_id: string;
    catalog_variant_id: string;
    quantity: number;
  }[] = [];

  let issuedFrom = 0;

  while (true) {
    const {
      data,
      error,
    } = await supabase
      .from("cadet_inventory")
      .select(`
        cadet_id,
        catalog_variant_id,
        quantity
      `)
      .range(
        issuedFrom,
        issuedFrom +
          PAGE_SIZE -
          1
      );

    if (error) {
      throw new Error(
        error.message
      );
    }

    const batch =
      data ?? [];

    issuedRows.push(
      ...batch
    );

    if (
      batch.length <
      PAGE_SIZE
    ) {
      break;
    }

    issuedFrom += PAGE_SIZE;
  }

  /*
   * Load cadets.
   */
  const {
    data: cadets,
    error: cadetsError,
  } = await supabase
    .from("cadets")
    .select(`
      id,
      profile_id
    `)
    .range(0, 999);

  if (cadetsError) {
    throw new Error(
      cadetsError.message
    );
  }

  /*
   * Load profiles.
   */
  const {
    data: profiles,
    error: profilesError,
  } = await supabase
    .from("profiles")
    .select(`
      id,
      first_name,
      last_name,
      email
    `)
    .range(0, 999);

  if (profilesError) {
    throw new Error(
      profilesError.message
    );
  }

  const cadetMap =
    new Map(
      (cadets ?? []).map(
        (cadet) => [
          cadet.id,
          cadet,
        ]
      )
    );

  const profileMap =
    new Map(
      (profiles ?? []).map(
        (profile) => [
          profile.id,
          profile,
        ]
      )
    );

  /*
   * Build:
   *
   * catalog_variant_id
   *      ↓
   * list of cadets holding
   * that exact variant
   */
  const holdersByVariant =
    new Map<
      string,
      InventoryHolder[]
    >();

  for (
    const record of issuedRows
  ) {
    if (
      Number(
        record.quantity
      ) <= 0
    ) {
      continue;
    }

    const cadet =
      cadetMap.get(
        record.cadet_id
      );

    if (!cadet) {
      continue;
    }

    const profile =
      profileMap.get(
        cadet.profile_id
      );

    if (!profile) {
      continue;
    }

    const holder: InventoryHolder =
      {
        cadetId:
          cadet.id,

        firstName:
          profile.first_name ??
          "",

        lastName:
          profile.last_name ??
          "",

        email:
          profile.email,

        quantity:
          Number(
            record.quantity
          ),
      };

    const current =
      holdersByVariant.get(
        record.catalog_variant_id
      ) ?? [];

    current.push(holder);

    holdersByVariant.set(
      record.catalog_variant_id,
      current
    );
  }

  /*
   * Alphabetize holder lists.
   */
  for (
    const holders of
    holdersByVariant.values()
  ) {
    holders.sort(
      (a, b) => {
        const last =
          a.lastName.localeCompare(
            b.lastName
          );

        if (last !== 0) {
          return last;
        }

        return a.firstName.localeCompare(
          b.firstName
        );
      }
    );
  }

  const rows: InventoryRoomRow[] =
    summaryRows.map(
      (row) => ({
        catalogVariantId:
          row.catalog_variant_id,

        category:
          row.uniform_category,

        itemName:
          row.display_name,

        cut:
          row.cut,

        size:
          row.size_display,

        roomQuantity:
          Number(
            row.room_quantity ??
            0
          ),

        issuedQuantity:
          Number(
            row.issued_quantity ??
            0
          ),

        totalQuantity:
          Number(
            row.total_accounted_quantity ??
            0
          ),

        cadetCount:
          Number(
            row.cadet_count ??
            0
          ),

        lastCountedAt:
          row.last_counted_at,

        holders:
          holdersByVariant.get(
            row.catalog_variant_id
          ) ?? [],
      })
    );

  const totalRoom =
    rows.reduce(
      (total, row) =>
        total +
        row.roomQuantity,
      0
    );

  const totalIssued =
    rows.reduce(
      (total, row) =>
        total +
        row.issuedQuantity,
      0
    );

  const totalAccounted =
    totalRoom +
    totalIssued;

  const countedVariants =
    rows.filter(
      (row) =>
        row.lastCountedAt !==
        null
    ).length;

  const uncountedVariants =
    rows.length -
    countedVariants;

  return (
    <div className="min-h-screen bg-blue-400">
      <StaffHeader
        showMyInventory={
          isCadet
        }
      />

      <main className="p-4 sm:p-8">
        <div className="mx-auto max-w-7xl">
          <div className="rounded-xl bg-white p-6 shadow sm:p-8">
            <p className="text-sm font-semibold uppercase tracking-wide text-blue-400">
              Inventory Management
            </p>

            <h1 className="mt-1 text-3xl font-bold text-black">
              Inventory Room
            </h1>

            <p className="mt-2 max-w-3xl text-sm text-gray-600">
              Track physical
              inventory currently
              stored at the
              Detachment and
              combine it with
              cadet-issued
              inventory for a
              live full-accountability
              picture.
            </p>
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
            <StatCard
              label="In Inventory Room"
              value={totalRoom}
            />

            <StatCard
              label="Issued to Cadets"
              value={totalIssued}
            />

            <StatCard
              label="Total Accounted"
              value={
                totalAccounted
              }
            />

            <StatCard
              label="Variants Counted"
              value={
                countedVariants
              }
            />

            <StatCard
              label="Still to Count"
              value={
                uncountedVariants
              }
            />
          </div>

          {!canEdit && (
            <div className="mt-6 rounded-xl bg-white p-5 shadow">
              <p className="font-semibold text-black">
                Read-only access
              </p>

              <p className="mt-1 text-sm text-gray-600">
                Cadre can review
                Detachment
                inventory but
                cannot change
                physical counts.
              </p>
            </div>
          )}

          <InventoryRoomTable
            rows={rows}
            canEdit={canEdit}
          />
        </div>
      </main>
    </div>
  );
}

function StatCard({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-xl bg-white p-5 shadow">
      <p className="text-sm font-semibold text-gray-500">
        {label}
      </p>

      <p className="mt-2 text-3xl font-bold text-black">
        {value.toLocaleString()}
      </p>
    </div>
  );
}

export default function InventoryRoomPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-blue-400 p-8">
          <div className="mx-auto max-w-7xl rounded-xl bg-white p-8 shadow">
            <p className="font-semibold text-black">
              Loading Inventory
              Room...
            </p>
          </div>
        </div>
      }
    >
      <InventoryRoomContent />
    </Suspense>
  );
}