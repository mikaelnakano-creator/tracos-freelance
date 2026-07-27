import { NextResponse } from "next/server";
import { freelancerFormSchema } from "@/lib/domain/schemas";
import { getOptionalEnv } from "@/lib/env";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const payload = freelancerFormSchema.safeParse(await request.json());

  if (!payload.success) {
    return NextResponse.json(
      { error: "Dados inválidos para autorização do freelancer." },
      { status: 400 },
    );
  }

  const env = getOptionalEnv();
  if (
    !env.NEXT_PUBLIC_SUPABASE_URL ||
    !env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    !env.SUPABASE_SERVICE_ROLE_KEY
  ) {
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
    const { data: adminProfile, error: profileError } = await adminClient
      .from("profiles")
      .select("id, organization_id, role, is_active")
      .eq("id", user.id)
      .maybeSingle<{
        id: string;
        organization_id: string;
        role: string;
        is_active: boolean;
      }>();

    if (profileError) throw profileError;
    if (
      !adminProfile ||
      adminProfile.role !== "admin" ||
      !adminProfile.is_active
    ) {
      return NextResponse.json({ error: "Acesso negado." }, { status: 403 });
    }

    const { data, error } = await adminClient
      .from("authorized_users")
      .upsert(
        {
          organization_id: adminProfile.organization_id,
          email: payload.data.email.trim().toLowerCase(),
          role: "freelancer",
          full_name: payload.data.fullName,
          phone: payload.data.phone,
          pix_key: payload.data.pixKey || null,
          is_active: payload.data.isActive,
          invited_by: adminProfile.id,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "organization_id,email" },
      )
      .select("id")
      .single<{ id: string }>();

    if (error) throw error;

    await adminClient.from("audit_logs").insert({
      organization_id: adminProfile.organization_id,
      user_id: adminProfile.id,
      action: "freelancer.authorized",
      entity_type: "authorized_users",
      entity_id: data.id,
      old_values: null,
      new_values: {
        email: payload.data.email.trim().toLowerCase(),
        role: "freelancer",
      },
    });

    return NextResponse.json({ ok: true, authorizedUserId: data.id });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Não foi possível autorizar o freelancer.",
      },
      { status: 500 },
    );
  }
}
