import { createClient } from "@/lib/supabase/server";

const PAGE_SIZE = 1000;

async function requireInventoryAdmin() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      error: new Response(
        "Authentication required.",
        {
          status: 401,
        }
      ),
    };
  }

  const {
    data: role,
    error: roleError,
  } = await supabase
    .from("roles")
    .select("id")
    .eq(
      "name",
      "inventory_admin"
    )
    .maybeSingle();

  if (
    roleError ||
    !role
  ) {
    return {
      error: new Response(
        "Inventory Admin role could not be verified.",
        {
          status: 500,
        }
      ),
    };
  }

  const {
    data: assignment,
    error: assignmentError,
  } = await supabase
    .from("profile_roles")
    .select("profile_id")
    .eq(
      "profile_id",
      user.id
    )
    .eq(
      "role_id",
      role.id
    )
    .maybeSingle();

  if (assignmentError) {
    return {
      error: new Response(
        assignmentError.message,
        {
          status: 500,
        }
      ),
    };
  }

  if (!assignment) {
    return {
      error: new Response(
        "Inventory Admin access required.",
        {
          status: 403,
        }
      ),
    };
  }

  return {
    supabase,
    user,
  };
}

async function loadEntireTable(
  supabase: Awaited<
    ReturnType<typeof createClient>
  >,
  tableName: string
) {
  const rows: Record<
    string,
    unknown
  >[] = [];

  let start = 0;

  while (true) {
    const end =
      start +
      PAGE_SIZE -
      1;

    const {
      data,
      error,
    } = await supabase
      .from(tableName)
      .select("*")
      .range(
        start,
        end
      );

    if (error) {
      throw new Error(
        `Failed to back up ${tableName}: ${error.message}`
      );
    }

    const page =
      (data ?? []) as Record<
        string,
        unknown
      >[];

    rows.push(
      ...page
    );

    if (
      page.length <
      PAGE_SIZE
    ) {
      break;
    }

    start +=
      PAGE_SIZE;
  }

  return rows;
}

export async function GET() {
  const auth =
    await requireInventoryAdmin();

  if ("error" in auth) {
    return auth.error;
  }

  const {
    supabase,
    user,
  } = auth;

  try {
    /*
     * Keep this list explicit so the
     * backup format is predictable.
     */
    const tables = [
      "profiles",
      "cadets",
      "roles",
      "profile_roles",
      "app_items",
      "catalog_variants",
      "wings_variants",
      "catalog_variant_wings",
      "cadet_inventory",
      "inventory_events",
    ] as const;

    const tableData: Record<
      string,
      Record<
        string,
        unknown
      >[]
    > = {};

    const counts: Record<
      string,
      number
    > = {};

    /*
     * Load sequentially rather than
     * hitting Supabase with every large
     * table at exactly the same time.
     */
    for (
      const tableName of
        tables
    ) {
      const rows =
        await loadEntireTable(
          supabase,
          tableName
        );

      tableData[
        tableName
      ] = rows;

      counts[
        tableName
      ] = rows.length;
    }

    const exportedAt =
      new Date();

    const backup = {
      manifest: {
        application:
          "Det 055 Inventory",

        format:
          "det055-full-backup",

        format_version: 1,

        exported_at:
          exportedAt.toISOString(),

        exported_by_profile_id:
          user.id,

        database:
          "Supabase",

        table_counts:
          counts,

        restore_order: [
          "roles",
          "profiles",
          "cadets",
          "app_items",
          "catalog_variants",
          "wings_variants",
          "profile_roles",
          "catalog_variant_wings",
          "cadet_inventory",
          "inventory_events",
        ],

        notes: [
          "This backup contains application database records only.",
          "Supabase Auth passwords and authentication secrets are not included.",
          "Restore should preserve UUID primary keys so foreign-key relationships remain intact.",
          "Inventory events should normally be restored last because they depend on profile and cadet records.",
        ],
      },

      tables:
        tableData,
    };

    const timestamp =
      exportedAt
        .toISOString()
        .replace(
          /[:.]/g,
          "-"
        );

    const filename =
      `det055-inventory-backup-${timestamp}.json`;

    return new Response(
      JSON.stringify(
        backup,
        null,
        2
      ),
      {
        status: 200,

        headers: {
          "Content-Type":
            "application/json; charset=utf-8",

          "Content-Disposition":
            `attachment; filename="${filename}"`,

          "Cache-Control":
            "no-store",
        },
      }
    );
  } catch (error) {
    console.error(
      "Backup generation failed:",
      error
    );

    return new Response(
      error instanceof Error
        ? error.message
        : "Backup generation failed.",
      {
        status: 500,
      }
    );
  }
}