import { NextResponse } from "next/server";
import { freelancerFormSchema } from "@/lib/domain/schemas";
import {
  hasSupabaseServerEnv,
  isDemoModeAllowed,
  shouldShowPendingConfiguration,
} from "@/lib/env";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type RoleRow = { role: "admin" | "freelancer" };
type MemberRow = {
  id: string;
  organization_id: string;
  is_active: boolean;
  organization_member_roles: RoleRow[] | RoleRow | null;
};

export async function POST(request: Request) {
  const payload = freelancerFormSchema.safeParse(await request.json());

  if (!payload.success) {
    return NextResponse.json(
      { error: "Dados inválidos para cadastro do freelancer." },
      { status: 400 },
    );
  }

  if (shouldShowPendingConfiguration()) {
    return NextResponse.json(
      { error: "Supabase ainda não configurado." },
      { status: 503 },
    );
  }

  if (!hasSupabaseServerEnv() && isDemoModeAllowed()) {
    return NextResponse.json({
      ok: true,
      mode: "demo",
      message: "Freelancer autorizado no modo demonstração.",
    });
  }

  try {
    const serverClient = await createSupabaseServerClient();
    const {
      data: { user },
    } = await serverClient.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Sessão inválida." }, { status: 401 });
    }

    const adminClient = createSupabaseAdminClient();
    const adminProfile = await getAdminProfile(adminClient, user.id);

    if (!adminProfile) {
      return NextResponse.json({ error: "Acesso negado." }, { status: 403 });
    }

    const email = payload.data.email.trim().toLowerCase();
    const now = new Date().toISOString();
    const profileId = await upsertFreelancerProfile(adminClient, {
      email,
      fullName: payload.data.fullName,
      phone: payload.data.phone,
      pixKey: payload.data.pixKey || null,
      notes: payload.data.notes || null,
      isActive: payload.data.isActive,
      now,
    });
    const memberId = await upsertOrganizationMember(adminClient, {
      organizationId: adminProfile.organizationId,
      profileId,
      isActive: payload.data.isActive,
      now,
    });

    const { error: roleError } = await adminClient
      .from("organization_member_roles")
      .upsert(
        {
          organization_member_id: memberId,
          role: "freelancer",
        },
        { onConflict: "organization_member_id,role" },
      );

    if (roleError) throw roleError;

    await adminClient.from("audit_logs").insert({
      organization_id: adminProfile.organizationId,
      user_id: adminProfile.profileId,
      action: "freelancer.authorized",
      entity_type: "profiles",
      entity_id: profileId,
      old_values: null,
      new_values: {
        email,
        role: "freelancer",
        status: "Aguardando primeiro acesso",
      },
    });

    return NextResponse.json({
      ok: true,
      profileId,
      status: "Aguardando primeiro acesso",
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Não foi possível cadastrar o freelancer.",
      },
      { status: 500 },
    );
  }
}

async function getAdminProfile(
  adminClient: ReturnType<typeof createSupabaseAdminClient>,
  authUserId: string,
) {
  const { data, error } = await adminClient
    .from("profiles")
    .select(
      "id, is_active, organization_members(id, organization_id, is_active, organization_member_roles(role))",
    )
    .eq("auth_user_id", authUserId)
    .maybeSingle<{
      id: string;
      is_active: boolean;
      organization_members: MemberRow[] | MemberRow | null;
    }>();

  if (error) throw error;
  if (!data?.is_active) return null;

  const activeMember = toArray(data.organization_members).find(
    (member) =>
      member.is_active &&
      toArray(member.organization_member_roles).some(
        (roleRow) => roleRow.role === "admin",
      ),
  );

  if (!activeMember) return null;

  return {
    profileId: data.id,
    organizationId: activeMember.organization_id,
  };
}

async function upsertFreelancerProfile(
  adminClient: ReturnType<typeof createSupabaseAdminClient>,
  input: {
    email: string;
    fullName: string;
    phone: string;
    pixKey: string | null;
    notes: string | null;
    isActive: boolean;
    now: string;
  },
) {
  const { data: existing, error: selectError } = await adminClient
    .from("profiles")
    .select("id")
    .eq("email", input.email)
    .maybeSingle<{ id: string }>();

  if (selectError) throw selectError;

  if (existing?.id) {
    const { error } = await adminClient
      .from("profiles")
      .update({
        full_name: input.fullName,
        phone: input.phone,
        pix_key: input.pixKey,
        notes: input.notes,
        is_active: input.isActive,
        updated_at: input.now,
      })
      .eq("id", existing.id);

    if (error) throw error;
    return existing.id;
  }

  const { data, error } = await adminClient
    .from("profiles")
    .insert({
      email: input.email,
      full_name: input.fullName,
      phone: input.phone,
      pix_key: input.pixKey,
      notes: input.notes,
      is_active: input.isActive,
      auth_user_id: null,
      created_at: input.now,
      updated_at: input.now,
    })
    .select("id")
    .single<{ id: string }>();

  if (error) throw error;
  return data.id;
}

async function upsertOrganizationMember(
  adminClient: ReturnType<typeof createSupabaseAdminClient>,
  input: {
    organizationId: string;
    profileId: string;
    isActive: boolean;
    now: string;
  },
) {
  const { data, error } = await adminClient
    .from("organization_members")
    .upsert(
      {
        organization_id: input.organizationId,
        profile_id: input.profileId,
        is_active: input.isActive,
        updated_at: input.now,
      },
      { onConflict: "organization_id,profile_id" },
    )
    .select("id")
    .single<{ id: string }>();

  if (error) throw error;
  return data.id;
}

function toArray<T>(value: T[] | T | null | undefined): T[] {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}
