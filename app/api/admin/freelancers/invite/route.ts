import { NextResponse } from "next/server";
import { freelancerFormSchema } from "@/lib/domain/schemas";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  const payload = freelancerFormSchema.safeParse(await request.json());

  if (!payload.success) {
    return NextResponse.json(
      { error: "Dados inválidos para convite de freelancer." },
      { status: 400 },
    );
  }

  try {
    const supabase = createSupabaseAdminClient();
    const { data, error } = await supabase.auth.admin.inviteUserByEmail(
      payload.data.email,
      {
        data: {
          full_name: payload.data.fullName,
          role: "freelancer",
        },
      },
    );

    if (error) throw error;
    return NextResponse.json({ ok: true, user: data.user });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Não foi possível enviar o convite pelo Supabase.",
      },
      { status: 500 },
    );
  }
}
