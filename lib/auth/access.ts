import { redirect } from "next/navigation";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getOptionalEnv } from "@/lib/env";
import type { UserRole } from "@/lib/domain/types";

export type AppAccessStatus = "authorized" | "unauthorized" | "inactive";

export type AppAccessResult =
  | {
      status: "authorized";
      role: UserRole;
      profileId: string;
      organizationId: string;
    }
  | {
      status: "unauthorized" | "inactive";
      message: string;
    };

const ORGANIZATION_NAME = "Traços Detalhados";
const ORGANIZATION_SLUG = "tracos-detalhados";
const ORGANIZATION_TIMEZONE = "America/Cuiaba";

type AuthorizedUserRow = {
  id: string;
  organization_id: string;
  email: string;
  role: UserRole;
  full_name: string;
  phone: string | null;
  pix_key: string | null;
  is_active: boolean;
  linked_auth_user_id: string | null;
  first_access_at: string | null;
};

type ProfileRow = {
  id: string;
  organization_id: string;
  role: UserRole;
  is_active: boolean;
};

export function isSupabaseConfigured() {
  const env = getOptionalEnv();
  return Boolean(
    env.NEXT_PUBLIC_SUPABASE_URL &&
    env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY &&
    env.SUPABASE_SERVICE_ROLE_KEY,
  );
}

export function dashboardPathForRole(role: UserRole) {
  return role === "admin" ? "/admin/dashboard" : "/freelancer";
}

export function accessRedirectPath(access: AppAccessResult) {
  switch (access.status) {
    case "authorized":
      return dashboardPathForRole(access.role);
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

  if (!email) {
    return {
      status: "unauthorized",
      message:
        "Esta conta Google ainda não foi autorizada pela Traços Detalhados.",
    };
  }

  const existingProfile = await findProfileByAuthUserId(supabase, user.id);
  if (existingProfile) {
    await touchProfileAccess(supabase, user, existingProfile);
    return existingProfile.is_active
      ? {
          status: "authorized",
          role: existingProfile.role,
          profileId: existingProfile.id,
          organizationId: existingProfile.organization_id,
        }
      : {
          status: "inactive",
          message: "Sua conta está inativa. Entre em contato com a empresa.",
        };
  }

  const firstAdmin = await maybeCreateFirstAdmin(supabase, user, email);
  if (firstAdmin) return firstAdmin;

  const authorizedUser = await findAuthorizedUserByEmail(supabase, email);
  if (!authorizedUser) {
    return {
      status: "unauthorized",
      message:
        "Esta conta Google ainda não foi autorizada pela Traços Detalhados.",
    };
  }

  if (!authorizedUser.is_active) {
    return {
      status: "inactive",
      message: "Sua conta está inativa. Entre em contato com a empresa.",
    };
  }

  const displayName =
    authorizedUser.full_name ||
    googleFullName(user) ||
    email.slice(0, email.indexOf("@"));
  const googleAvatarUrl = googleAvatar(user);
  const now = new Date().toISOString();

  const { error: profileError } = await supabase.from("profiles").upsert({
    id: user.id,
    organization_id: authorizedUser.organization_id,
    role: authorizedUser.role,
    full_name: displayName,
    email,
    phone: authorizedUser.phone,
    pix_key: authorizedUser.pix_key,
    avatar_url: googleAvatarUrl,
    google_avatar_url: googleAvatarUrl,
    notes: null,
    is_active: true,
    first_access_at: authorizedUser.first_access_at ?? now,
    last_access_at: now,
    updated_at: now,
  });

  if (profileError) throw profileError;

  const { error: authorizedError } = await supabase
    .from("authorized_users")
    .update({
      linked_auth_user_id: user.id,
      first_access_at: authorizedUser.first_access_at ?? now,
      last_access_at: now,
      updated_at: now,
    })
    .eq("id", authorizedUser.id);

  if (authorizedError) throw authorizedError;

  await writeAuditLog(supabase, {
    organizationId: authorizedUser.organization_id,
    userId: user.id,
    action: "user.google_linked",
    entityType: "profiles",
    entityId: user.id,
    newValues: { email, role: authorizedUser.role },
  });

  return {
    status: "authorized",
    role: authorizedUser.role,
    profileId: user.id,
    organizationId: authorizedUser.organization_id,
  };
}

export async function requireAppRole(role: UserRole) {
  if (!hasSupabasePublicEnv()) return null;

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, organization_id, role, is_active")
    .eq("id", user.id)
    .maybeSingle<ProfileRow>();

  if (!profile) redirect("/acesso-negado");
  if (!profile.is_active) redirect("/conta-inativa");
  if (profile.role !== role) {
    redirect(profile.role === "admin" ? "/admin/dashboard" : "/freelancer");
  }

  return profile;
}

export async function requireAdminRoute() {
  return requireAppRole("admin");
}

export async function requireFreelancerRoute() {
  return requireAppRole("freelancer");
}

function hasSupabasePublicEnv() {
  const env = getOptionalEnv();
  return Boolean(
    env.NEXT_PUBLIC_SUPABASE_URL && env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  );
}

async function findProfileByAuthUserId(
  supabase: SupabaseClient,
  id: string,
): Promise<ProfileRow | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, organization_id, role, is_active")
    .eq("id", id)
    .maybeSingle<ProfileRow>();

  if (error) throw error;
  return data ?? null;
}

async function touchProfileAccess(
  supabase: SupabaseClient,
  user: User,
  profile: ProfileRow,
) {
  const now = new Date().toISOString();
  const googleAvatarUrl = googleAvatar(user);

  await supabase
    .from("profiles")
    .update({
      avatar_url: googleAvatarUrl,
      google_avatar_url: googleAvatarUrl,
      last_access_at: now,
      updated_at: now,
    })
    .eq("id", profile.id);

  await writeAuditLog(supabase, {
    organizationId: profile.organization_id,
    userId: user.id,
    action: "login.google",
    entityType: "profiles",
    entityId: profile.id,
    newValues: { email: user.email },
  });
}

async function maybeCreateFirstAdmin(
  supabase: SupabaseClient,
  user: User,
  email: string,
): Promise<AppAccessResult | null> {
  const env = getOptionalEnv();
  if (!env.FIRST_ADMIN_EMAIL) return null;
  if (email !== normalizeEmail(env.FIRST_ADMIN_EMAIL)) return null;

  const { count, error: countError } = await supabase
    .from("profiles")
    .select("id", { count: "exact", head: true })
    .eq("role", "admin");

  if (countError) throw countError;
  if ((count ?? 0) > 0) return null;

  const organizationId = await ensureOrganization(supabase);
  const fullName = googleFullName(user) ?? "Administrador Traços";
  const avatar = googleAvatar(user);
  const now = new Date().toISOString();

  const { error: authorizedError } = await supabase
    .from("authorized_users")
    .upsert(
      {
        organization_id: organizationId,
        email,
        role: "admin",
        full_name: fullName,
        is_active: true,
        linked_auth_user_id: user.id,
        first_access_at: now,
        last_access_at: now,
        updated_at: now,
      },
      { onConflict: "organization_id,email" },
    );

  if (authorizedError) throw authorizedError;

  const { error: profileError } = await supabase.from("profiles").insert({
    id: user.id,
    organization_id: organizationId,
    role: "admin",
    full_name: fullName,
    email,
    phone: "",
    pix_key: null,
    avatar_url: avatar,
    google_avatar_url: avatar,
    notes: "Primeiro administrador criado por FIRST_ADMIN_EMAIL.",
    is_active: true,
    first_access_at: now,
    last_access_at: now,
  });

  if (profileError) throw profileError;

  await writeAuditLog(supabase, {
    organizationId,
    userId: user.id,
    action: "login.first_admin_created",
    entityType: "profiles",
    entityId: user.id,
    newValues: { email, role: "admin" },
  });

  return {
    status: "authorized",
    role: "admin",
    profileId: user.id,
    organizationId,
  };
}

async function ensureOrganization(supabase: SupabaseClient) {
  const { data: existing, error: selectError } = await supabase
    .from("organizations")
    .select("id")
    .eq("slug", ORGANIZATION_SLUG)
    .maybeSingle<{ id: string }>();

  if (selectError) throw selectError;
  if (existing?.id) return existing.id;

  const { data, error } = await supabase
    .from("organizations")
    .insert({
      name: ORGANIZATION_NAME,
      slug: ORGANIZATION_SLUG,
      timezone: ORGANIZATION_TIMEZONE,
    })
    .select("id")
    .single<{ id: string }>();

  if (error) throw error;
  return data.id;
}

async function findAuthorizedUserByEmail(
  supabase: SupabaseClient,
  email: string,
) {
  const { data, error } = await supabase
    .from("authorized_users")
    .select(
      "id, organization_id, email, role, full_name, phone, pix_key, is_active, linked_auth_user_id, first_access_at",
    )
    .eq("email", email)
    .maybeSingle<AuthorizedUserRow>();

  if (error) throw error;
  return data ?? null;
}

async function writeAuditLog(
  supabase: SupabaseClient,
  input: {
    organizationId: string;
    userId: string;
    action: string;
    entityType: string;
    entityId: string;
    newValues: Record<string, unknown>;
  },
) {
  await supabase.from("audit_logs").insert({
    organization_id: input.organizationId,
    user_id: input.userId,
    action: input.action,
    entity_type: input.entityType,
    entity_id: input.entityId,
    old_values: null,
    new_values: input.newValues,
  });
}

export function createServiceRoleClientForAuth() {
  return createSupabaseAdminClient();
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
