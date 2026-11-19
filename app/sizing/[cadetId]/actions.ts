"use server";

import {
  revalidatePath,
} from "next/cache";
import {
  redirect,
} from "next/navigation";

import { createClient } from "@/lib/supabase/server";

function optionalNumber(
  formData: FormData,
  key: string
) {
  const raw = String(
    formData.get(key) ?? ""
  ).trim();

  if (!raw) {
    return null;
  }

  const value =
    Number(raw);

  if (!Number.isFinite(value)) {
    throw new Error(
      `${key} must be a valid number.`
    );
  }

  return value;
}

export async function saveCadetMeasurements(
  formData: FormData
) {
  const supabase =
    await createClient();

  const {
    data: { user },
  } =
    await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const cadetId =
    String(
      formData.get(
        "cadet_id"
      ) ?? ""
    );

  if (!cadetId) {
    throw new Error(
      "Cadet was not provided."
    );
  }

  const uniformCut =
    String(
      formData.get(
        "uniform_cut_preference"
      ) ?? ""
    ).trim();

  const shoeWidth =
    String(
      formData.get(
        "shoe_width"
      ) ?? ""
    ).trim();

  const measuredAt =
    String(
      formData.get(
        "measured_at"
      ) ?? ""
    ).trim();

  const notes =
    String(
      formData.get(
        "notes"
      ) ?? ""
    ).trim();

  const {
    error,
  } = await supabase
    .from(
      "cadet_measurements"
    )
    .upsert(
      {
        cadet_id:
          cadetId,

        uniform_cut_preference:
          uniformCut ||
          null,

        height_inches:
          optionalNumber(
            formData,
            "height_inches"
          ),

        head_circumference_inches:
          optionalNumber(
            formData,
            "head_circumference_inches"
          ),

        neck_inches:
          optionalNumber(
            formData,
            "neck_inches"
          ),

        chest_bust_inches:
          optionalNumber(
            formData,
            "chest_bust_inches"
          ),

        sleeve_inches:
          optionalNumber(
            formData,
            "sleeve_inches"
          ),

        waist_inches:
          optionalNumber(
            formData,
            "waist_inches"
          ),

        hips_inches:
          optionalNumber(
            formData,
            "hips_inches"
          ),

        inseam_inches:
          optionalNumber(
            formData,
            "inseam_inches"
          ),

        shoe_size:
          optionalNumber(
            formData,
            "shoe_size"
          ),

        shoe_width:
          shoeWidth ||
          null,

        measured_at:
          measuredAt ||
          null,

        notes:
          notes ||
          null,

        updated_by:
          user.id,
      },
      {
        onConflict:
          "cadet_id",
      }
    );

  if (error) {
    throw new Error(
      error.message
    );
  }

  revalidatePath(
    "/sizing"
  );

  revalidatePath(
    `/sizing/${cadetId}`
  );

  redirect("/sizing");
}