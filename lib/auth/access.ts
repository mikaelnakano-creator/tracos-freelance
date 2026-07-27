import { redirect } from "next/navigation";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  getOptionalEnv,
  hasSupabasePublicEnv,
  hasSupabaseServerEnv,
  isDemoModeAllowed,
  shouldShowPendingConfiguration,
} from "@/lib/env";
import type { UserRole } from "@/lib/domain/types";

export type AppAccessStatus = "authorized" | "unauthorized" | "inactive";

export type AppAccessResult =
  | {
      status: "authorized";
      roles: UserRole[];
      profileId: string;
      organizationId: string;
    }
  | {
      status: "unauthorized" | "inactive";
      message: string;
    };

type AccessRoleRow = {
  role: UserRole;
};

type AccessMemberRow = {
  organization_id: string;
  is_active: boolean;
  organization_member_roles: AccessRoleRow[] | AccessRoleRow | null;
};

type AccessProfileRow = {
  id: string;
  organization_id?: string | null;
  is_active: boolean;
  organization_members: AccessMemberRow[] | AccessMemberRow | null;
};

type BootstrapResult = {
  status: AppAccessStatus;
  message?: string;
  profile_id?: string;
  organization_id?: string;
  roles?: UserRole[];
};

export function isSupabaseConfigured() {
  return hasSupabaseServerEnv();
}

export function dashboardPathForRole(role: UserRole) {
  return role === "admin" ? "/admin/dashboard" : "/freelancer";
}

export function dashboardPathForRoles(roles: UserRole[]) {
  const uniqueRoles = normalizeRoles(roles);
  if (uniqueRoles.includes("admin") && uniqueRoles.includes("freelancer")) {
    return "/selecionar-area";
  }
  return dashboardPathForRole(
    uniqueRoles.includes("admin") ? "admin" : "freelancer",
  );
}

export function accessRedirectPath(access: AppAccessResult) {
  switch (access.status) {
    case "authorized":
      return dashboardPathForRoles(access.roles);
    case "inactive":
      return "/conta-inativa";
    case "unauthorized":
      return "/acesso-negado";
  }
}

export async function authorizeGoogleUser(
  user: User,
  supabase: SupabaseClient,
): Promise<AppAccessResult> {
  const email = normalizeEmail(user.email);

  if (!email || !isVerifiedGoogleEmail(user)) {
    return {
      status: "unauthorized",
      message:
        "Esta conta Google ainda não foi autorizada pela Traços Detalhados.",
    };
  }

  const { data, error } = await supabase.rpc("bootstrap_google_user", {
    p_auth_user_id: user.id,
    p_email: email,
    p_full_name: googleFullName(user) ?? email.slice(0, email.indexOf("@")),
    p_avatar_url: googleAvatar(user),
    p_first_admin_email: normalizeEmail(getOptionalEnv().FIRST_ADMIN_EMAIL),
  });

  if (error) throw error;
  return parseBootstrapResult(data as BootstrapResult | null);
}

export async function requireAppRole(role: UserRole) {
  if (shouldShowPendingConfiguration()) redirect("/configuracao-pendente");
  if (!hasSupabasePublicEnv() && isDemoModeAllowed()) return null;

  const access = await getCurrentAppAccess();

  if (access.status !== "authorized") redirect(accessRedirectPath(access));
  if (!access.roles.includes(role)) {
    redirect(dashboardPathForRoles(access.roles));
  }

  return access;
}

export async function requireAdminRoute() {
  return requireAppRole("admin");
}

export async function requireFreelancerRoute() {
  return requireAppRole("freelancer");
}

export async function getCurrentAppAccess(): Promise<AppAccessResult> {
  if (shouldShowPendingConfiguration()) {
    return {
      status: "unauthorized",
      message: "Configuração pendente.",
    };
  }

  if (!hasSupabasePublicEnv()) {
    return {
      status: "unauthorized",
      message:
        "Esta conta Google ainda não foi autorizada pela Traços Detalhados.",
    };
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  if (!hasSupabaseServerEnv()) {
    return {
      status: "unauthorized",
      message: "Configuração pendente.",
    };
  }

  const adminClient = createSupabaseAdminClient();
  return getAccessByAuthUserId(adminClient, user.id);
}

export async function getAccessByAuthUserId(
  supabase: SupabaseClient,
  authUserId: string,
): Promise<AppAccessResult> {
  const { data, error } = await supabase
    .from("profiles")
    .select(
      "id, organization_id, is_active, organization_members(organization_id, is_active, organization_member_roles(role))",
    )
    .eq("auth_user_id", authUserId)
    .maybeSingle<AccessProfileRow>();

  if (error) throw error;
  if (!data) {
    return {
      status: "unauthorized",
      message:
        "Esta conta Google ainda não foi autorizada pela Traços Detalhados.",
    };
  }

  const memberships = toArray(data.organization_members);
  const activeMemberships = memberships.filter((member) => member.is_active);
  const roles = normalizeRoles(
    activeMemberships.flatMap((member) =>
      toArray(member.organization_member_roles).map((roleRow) => roleRow.role),
    ),
  );
  const organizationId =
    activeMemberships[0]?.organization_id ?? data.organization_id ?? "";

  if (!data.is_active || activeMemberships.length === 0) {
    return {
      status: "inactive",
      message: "Seu acesso está inativo. Entre em contato com a empresa.",
    };
  }

  if (roles.length === 0 || !organizationId) {
    return {
      status: "unauthorized",
      message:
        "Esta conta Google ainda não foi autorizada pela Traços Detalhados.",
    };
  }

  return {
    status: "authorized",
    roles,
    profileId: data.id,
    organizationId,
  };
}

export function createServiceRoleClientForAuth() {
  return createSupabaseAdminClient();
}

function parseBootstrapResult(result: BootstrapResult | null): AppAccessResult {
  if (!result || result.status === "unauthorized") {
    return {
      status: "unauthorized",
      message:
        result?.message ??
        "Esta conta Google ainda não foi autorizada pela Traços Detalhados.",
    };
  }

  if (result.status === "inactive") {
    return {
      status: "inactive",
      message:
        result.message ??
        "Seu acesso está inativo. Entre em contato com a Traços Detalhados.",
    };
  }

  const roles = normalizeRoles(result.roles ?? []);
  if (!result.profile_id || !result.organization_id || roles.length === 0) {
    return {
      status: "unauthorized",
      message:
        "Esta conta Google ainda não foi autorizada pela Traços Detalhados.",
    };
  }

  return {
    status: "authorized",
    roles,
    profileId: result.profile_id,
    organizationId: result.organization_id,
  };
}

function normalizeRoles(roles: UserRole[]) {
  return Array.from(new Set(roles)).filter((role): role is UserRole =>
    ["admin", "freelancer"].includes(role),
  );
}

function normalizeEmail(email?: string | null) {
  return email?.trim().toLowerCase() ?? "";
}

function googleFullName(user: User) {
  const metadata = user.user_metadata as Record<string, unknown>;
  return typeof metadata.full_name === "string"
    ? metadata.full_name
    : typeof metadata.name === "string"
      ? metadata.name
      : null;
}

function googleAvatar(user: User) {
  const metadata = user.user_metadata as Record<string, unknown>;
  return typeof metadata.avatar_url === "string"
    ? metadata.avatar_url
    : typeof metadata.picture === "string"
      ? metadata.picture
      : null;
}

function isVerifiedGoogleEmail(user: User) {
  const metadata = user.user_metadata as Record<string, unknown>;
  return (
    user.email_confirmed_at !== null ||
    metadata.email_verified === true ||
    metadata.email_verified === "true"
  );
}

function toArray<T>(value: T[] | T | null | undefined): T[] {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}
