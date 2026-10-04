"use client";

import { useMemo, useState } from "react";
import {
  setCadetStatus,
  setProfileRole,
} from "./actions";

type UserRow = {
  profileId: string;
  firstName: string;
  lastName: string;
  email: string;
  roles: string[];

  cadetId:
    | string
    | null;

  asClass:
    | number
    | null;

  component:
    | string
    | null;

  cadetStatus:
    | string
    | null;

  setupComplete:
    boolean;
};

type Props = {
  users: UserRow[];
  currentProfileId: string;
};

function hasRole(
  user: UserRow,
  role: string
) {
  return user.roles.includes(
    role
  );
}

export default function AdminUsers({
  users,
  currentProfileId,
}: Props) {
  const [search, setSearch] =
    useState("");

  const filteredUsers =
    useMemo(() => {
      const query =
        search
          .trim()
          .toLowerCase();

      if (!query) {
        return users;
      }

      return users.filter(
        (user) =>
          [
            user.firstName,
            user.lastName,
            user.email,
            user.asClass,
            user.component,
            user.cadetStatus,
            ...user.roles,
          ]
            .join(" ")
            .toLowerCase()
            .includes(query)
      );
    }, [
      users,
      search,
    ]);

  return (
    <>
      <div className="mt-6 rounded-xl bg-white p-6 shadow">
        <input
          type="text"
          value={search}
          onChange={(e) =>
            setSearch(
              e.target.value
            )
          }
          placeholder="Search name, email, role, AS class..."
          className="w-full rounded-lg border border-blue-400 bg-white p-3 text-black outline-none"
        />
      </div>

      <div className="mt-6 space-y-4">
        {filteredUsers.map(
          (user) => {
            const isCurrentUser =
              user.profileId ===
              currentProfileId;

            return (
              <div
                key={
                  user.profileId
                }
                className="rounded-xl bg-white p-6 shadow"
              >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-xl font-bold text-black">
                        {[
                          user.firstName,
                          user.lastName,
                        ]
                          .filter(
                            Boolean
                          )
                          .join(
                            " "
                          ) ||
                          "Unnamed User"}
                      </h2>

                      {isCurrentUser && (
                        <span className="rounded-full bg-black px-2 py-1 text-xs font-semibold text-white">
                          You
                        </span>
                      )}
                    </div>

                    <p className="mt-1 text-sm text-gray-600">
                      {
                        user.email
                      }
                    </p>

                    {user.cadetId && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        <span className="rounded-full bg-blue-400 px-2 py-1 text-xs font-semibold text-white">
                          AS{" "}
                          {
                            user.asClass
                          }
                        </span>

                        <span className="rounded-full bg-gray-100 px-2 py-1 text-xs font-semibold text-black">
                          {
                            user.component
                          }
                        </span>

                        <span className="rounded-full bg-gray-100 px-2 py-1 text-xs font-semibold text-black">
                          {
                            user.cadetStatus
                          }
                        </span>

                        <span className="rounded-full bg-gray-100 px-2 py-1 text-xs font-semibold text-black">
                          Setup{" "}
                          {user.setupComplete
                            ? "Complete"
                            : "Incomplete"}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {user.roles.map(
                      (role) => (
                        <span
                          key={
                            role
                          }
                          className="rounded-full bg-blue-400 px-3 py-1 text-xs font-semibold text-white"
                        >
                          {role.replaceAll(
                            "_",
                            " "
                          )}
                        </span>
                      )
                    )}
                  </div>
                </div>

                <div className="mt-6 border-t border-gray-200 pt-5">
                  <h3 className="text-sm font-bold uppercase tracking-wide text-gray-500">
                    Staff Roles
                  </h3>

                  <div className="mt-3 grid gap-3 sm:grid-cols-3">
                    <RoleToggle
                      profileId={
                        user.profileId
                      }
                      roleName="inventory_assistant"
                      label="Inventory Assistant"
                      enabled={hasRole(
                        user,
                        "inventory_assistant"
                      )}
                    />

                    <RoleToggle
                      profileId={
                        user.profileId
                      }
                      roleName="cadre"
                      label="Cadre"
                      enabled={hasRole(
                        user,
                        "cadre"
                      )}
                    />

                    <RoleToggle
                      profileId={
                        user.profileId
                      }
                      roleName="inventory_admin"
                      label="Inventory Admin"
                      enabled={hasRole(
                        user,
                        "inventory_admin"
                      )}
                      disabled={
                        isCurrentUser &&
                        hasRole(
                          user,
                          "inventory_admin"
                        )
                      }
                    />
                  </div>
                </div>

                {user.cadetId && (
                  <div className="mt-6 border-t border-gray-200 pt-5">
                    <h3 className="text-sm font-bold uppercase tracking-wide text-gray-500">
                      Cadet Status
                    </h3>

                    <div className="mt-3 flex flex-wrap gap-2">
                      {[
                        "active",
                        "inactive",
                        "archived",
                      ].map(
                        (
                          status
                        ) => (
                          <form
                            key={
                              status
                            }
                            action={
                              setCadetStatus
                            }
                          >
                            <input
                              type="hidden"
                              name="cadet_id"
                              value={
                                user.cadetId ??
                                ""
                              }
                            />

                            <input
                              type="hidden"
                              name="status"
                              value={
                                status
                              }
                            />

                            <button
                              type="submit"
                              disabled={
                                user.cadetStatus ===
                                status
                              }
                              className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
                                user.cadetStatus ===
                                status
                                  ? "bg-black text-white"
                                  : "border border-blue-400 bg-white text-blue-400 hover:bg-gray-100"
                              }`}
                            >
                              {
                                status
                              }
                            </button>
                          </form>
                        )
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          }
        )}

        {filteredUsers.length ===
          0 && (
          <div className="rounded-xl bg-white p-8 text-center text-gray-500 shadow">
            No users match
            your search.
          </div>
        )}
      </div>
    </>
  );
}

type RoleToggleProps = {
  profileId: string;
  roleName:
    | "inventory_assistant"
    | "inventory_admin"
    | "cadre";
  label: string;
  enabled: boolean;
  disabled?: boolean;
};

function RoleToggle({
  profileId,
  roleName,
  label,
  enabled,
  disabled = false,
}: RoleToggleProps) {
  return (
    <form
      action={
        setProfileRole
      }
    >
      <input
        type="hidden"
        name="profile_id"
        value={profileId}
      />

      <input
        type="hidden"
        name="role_name"
        value={roleName}
      />

      <input
        type="hidden"
        name="enabled"
        value={
          enabled
            ? "false"
            : "true"
        }
      />

      <button
        type="submit"
        disabled={disabled}
        className={`w-full rounded-lg border px-4 py-3 text-sm font-semibold transition ${
          enabled
            ? "border-black bg-black text-white"
            : "border-blue-400 bg-white text-blue-400 hover:bg-gray-100"
        } ${
          disabled
            ? "cursor-not-allowed opacity-60"
            : ""
        }`}
      >
        {enabled
          ? `✓ ${label}`
          : `+ ${label}`}
      </button>
    </form>
  );
}