import Link from "next/link";
import {
  redirect,
} from "next/navigation";

import StaffHeader from "@/components/staff-header";
import { createClient } from "@/lib/supabase/server";

import {
  saveCadetMeasurements,
} from "./actions";

export const instant = false;

type Props = {
  params: Promise<{
    cadetId: string;
  }>;
};

export default async function CadetSizingPage({
  params,
}: Props) {
  const {
    cadetId,
  } = await params;

  const supabase =
    await createClient();

  const {
    data: { user },
  } =
    await supabase.auth.getUser();

  if (!user) {
    redirect(
      "/auth/login"
    );
  }

  /*
   * Only Inventory Admin /
   * Inventory Assistant may edit.
   */
  const {
    data: profileRoles,
    error:
      profileRolesError,
  } = await supabase
    .from("profile_roles")
    .select("role_id")
    .eq(
      "profile_id",
      user.id
    );

  if (
    profileRolesError
  ) {
    throw new Error(
      profileRolesError.message
    );
  }

  const roleIds =
    profileRoles?.map(
      (role) =>
        role.role_id
    ) ?? [];

  let roleNames:
    string[] = [];

  if (
    roleIds.length > 0
  ) {
    const {
      data: roles,
      error:
        rolesError,
    } = await supabase
      .from("roles")
      .select("name")
      .in(
        "id",
        roleIds
      );

    if (rolesError) {
      throw new Error(
        rolesError.message
      );
    }

    roleNames =
      roles?.map(
        (role) =>
          role.name
      ) ?? [];
  }

  const canEdit =
    roleNames.includes(
      "inventory_admin"
    ) ||
    roleNames.includes(
      "inventory_assistant"
    );

  if (!canEdit) {
    redirect("/sizing");
  }

  /*
   * Load cadet.
   */
  const {
    data: cadet,
    error: cadetError,
  } = await supabase
    .from("cadets")
    .select(`
      id,
      profile_id,
      as_class,
      component,
      status
    `)
    .eq("id", cadetId)
    .single();

  if (cadetError) {
    throw new Error(
      cadetError.message
    );
  }

  /*
   * Load profile.
   */
  const {
    data: profile,
    error:
      profileError,
  } = await supabase
    .from("profiles")
    .select(`
      first_name,
      last_name,
      email
    `)
    .eq(
      "id",
      cadet.profile_id
    )
    .single();

  if (profileError) {
    throw new Error(
      profileError.message
    );
  }

  /*
   * Load existing measurement profile,
   * if one exists.
   */
  const {
    data: measurement,
    error:
      measurementError,
  } = await supabase
    .from(
      "cadet_measurements"
    )
    .select("*")
    .eq(
      "cadet_id",
      cadetId
    )
    .maybeSingle();

  if (
    measurementError
  ) {
    throw new Error(
      measurementError.message
    );
  }

  const name =
    `${profile.first_name ?? ""} ${profile.last_name ?? ""}`.trim() ||
    profile.email;

  return (
    <div className="min-h-screen bg-blue-400">
      <StaffHeader />

      <main className="p-4 sm:p-8">
        <div className="mx-auto max-w-4xl">
          <Link
            href="/sizing"
            className="text-sm font-semibold text-white hover:text-black"
          >
            ← Back to Global Size Tracker
          </Link>

          <div className="mt-4 rounded-xl bg-white p-6 shadow sm:p-8">
            <p className="text-sm font-semibold uppercase tracking-wide text-blue-400">
              Cadet Measurements
            </p>

            <h1 className="mt-1 text-3xl font-bold text-black">
              {name}
            </h1>

            <p className="mt-2 text-sm text-gray-600">
              {cadet.as_class
                ? `AS ${cadet.as_class}`
                : "AS class not set"}

              {" · "}

              {cadet.component ??
                "Component not set"}

              {" · "}

              {
                profile.email
              }
            </p>
          </div>

          <form
            action={
              saveCadetMeasurements
            }
            className="mt-6 rounded-xl bg-white p-6 shadow sm:p-8"
          >
            <input
              type="hidden"
              name="cadet_id"
              value={cadetId}
            />

            <div className="mb-6 rounded-lg bg-blue-50 p-4">
              <p className="font-semibold text-black">
                Measurement Instructions
              </p>

              <p className="mt-1 text-sm text-gray-600">
                Enter all body
                measurements in inches.
                Decimals are allowed where
                needed. Shoe size uses
                standard U.S. shoe sizing.
                Invalid measurements will be
                flagged before the form can
                be submitted.
              </p>
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <FieldGroup
                label="Uniform Cut"
              >
                <select
                  name="uniform_cut_preference"
                  defaultValue={
                    measurement
                      ?.uniform_cut_preference ??
                    ""
                  }
                  className="mt-2 w-full rounded-lg border border-gray-300 bg-white p-3 text-black"
                >
                  <option value="">
                    Not Set
                  </option>

                  <option value="Male">
                    Male
                  </option>

                  <option value="Female">
                    Female
                  </option>
                </select>
              </FieldGroup>

              <MeasurementInput
                label="Height"
                name="height_inches"
                value={
                  measurement
                    ?.height_inches
                }
                min={36}
                max={96}
                step={0.5}
                placeholder="e.g. 72"
              />

              <MeasurementInput
                label="Head Circumference"
                name="head_circumference_inches"
                value={
                  measurement
                    ?.head_circumference_inches
                }
                min={15}
                max={30}
                step={0.25}
                placeholder="e.g. 22.5"
              />

              <MeasurementInput
                label="Neck"
                name="neck_inches"
                value={
                  measurement
                    ?.neck_inches
                }
                min={8}
                max={30}
                step={0.25}
                placeholder="e.g. 15.5"
              />

              <MeasurementInput
                label="Chest / Bust"
                name="chest_bust_inches"
                value={
                  measurement
                    ?.chest_bust_inches
                }
                min={20}
                max={80}
                step={0.5}
                placeholder="e.g. 40"
              />

              <MeasurementInput
                label="Sleeve"
                name="sleeve_inches"
                value={
                  measurement
                    ?.sleeve_inches
                }
                min={15}
                max={50}
                step={0.5}
                placeholder="e.g. 34"
              />

              <MeasurementInput
                label="Waist"
                name="waist_inches"
                value={
                  measurement
                    ?.waist_inches
                }
                min={15}
                max={80}
                step={0.5}
                placeholder="e.g. 32"
              />

              <MeasurementInput
                label="Hips"
                name="hips_inches"
                value={
                  measurement
                    ?.hips_inches
                }
                min={20}
                max={90}
                step={0.5}
                placeholder="e.g. 38"
              />

              <MeasurementInput
                label="Inseam"
                name="inseam_inches"
                value={
                  measurement
                    ?.inseam_inches
                }
                min={15}
                max={50}
                step={0.5}
                placeholder="e.g. 32"
              />

              <MeasurementInput
                label="Shoe Size"
                name="shoe_size"
                value={
                  measurement
                    ?.shoe_size
                }
                min={1}
                max={20}
                step={0.5}
                placeholder="e.g. 10.5"
                unit="US"
              />

              <FieldGroup
                label="Shoe Width"
              >
                <input
                  name="shoe_width"
                  defaultValue={
                    measurement
                      ?.shoe_width ??
                    ""
                  }
                  placeholder="e.g. D, W, EEE"
                  className="mt-2 w-full rounded-lg border border-gray-300 bg-white p-3 text-black outline-none focus:border-blue-400"
                />

                <p className="mt-1 text-xs text-gray-500">
                  Enter the width shown
                  for the cadet&apos;s
                  footwear size when known.
                </p>
              </FieldGroup>

              <FieldGroup
                label="Measured Date"
              >
                <input
                  type="date"
                  name="measured_at"
                  defaultValue={
                    measurement
                      ?.measured_at ??
                    ""
                  }
                  className="mt-2 w-full rounded-lg border border-gray-300 bg-white p-3 text-black"
                />
              </FieldGroup>
            </div>

            <div className="mt-5">
              <label className="text-sm font-semibold text-gray-700">
                Notes
              </label>

              <textarea
                name="notes"
                defaultValue={
                  measurement
                    ?.notes ??
                  ""
                }
                rows={4}
                placeholder="Optional sizing notes..."
                className="mt-2 w-full rounded-lg border border-gray-300 bg-white p-3 text-black outline-none focus:border-blue-400"
              />
            </div>

            <div className="mt-6 flex justify-end">
              <button
                type="submit"
                className="rounded-lg bg-black px-6 py-3 text-sm font-semibold text-white transition hover:bg-gray-800"
              >
                Save Measurements
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}

function FieldGroup({
  label,
  children,
}: {
  label: string;
  children:
    React.ReactNode;
}) {
  return (
    <div>
      <label className="text-sm font-semibold text-gray-700">
        {label}
      </label>

      {children}
    </div>
  );
}

function MeasurementInput({
  label,
  name,
  value,
  min,
  max,
  step,
  placeholder,
  unit = "inches",
}: {
  label: string;
  name: string;
  value:
    | number
    | null
    | undefined;
  min: number;
  max: number;
  step: number;
  placeholder?: string;
  unit?: string;
}) {
  return (
    <FieldGroup
      label={`${label} (${unit})`}
    >
      <input
        type="number"
        name={name}
        min={min}
        max={max}
        step={step}
        defaultValue={
          value ?? ""
        }
        placeholder={
          placeholder
        }
        className="mt-2 w-full rounded-lg border border-gray-300 bg-white p-3 text-black outline-none invalid:border-red-500 invalid:ring-1 invalid:ring-red-500 focus:border-blue-400"
      />

      <p className="mt-1 text-xs text-gray-500">
        Allowed: {min} to{" "}
        {max}
        {unit === "inches"
          ? " inches"
          : ""}
      </p>
    </FieldGroup>
  );
}