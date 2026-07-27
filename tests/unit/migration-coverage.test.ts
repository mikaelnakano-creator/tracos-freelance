import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();

describe("migrations de acesso, vagas e RLS", () => {
  it("mantem RPC atomica de aceite de vaga", () => {
    const migration = readFileSync(
      join(root, "supabase/migrations/0005_multi_role_membership_rls.sql"),
      "utf8",
    );

    expect(migration).toContain("accept_open_event_slot");
    expect(migration).toContain("for update");
    expect(migration).toContain("Você já faz parte da equipe deste evento.");
    expect(migration).toContain(
      "Esta vaga acabou de ser aceita por outro freelancer.",
    );
  });

  it("mantem multiplos papeis, bootstrap e politicas RLS", () => {
    const migration = readFileSync(
      join(root, "supabase/migrations/0005_multi_role_membership_rls.sql"),
      "utf8",
    );

    expect(migration).toContain(
      "create table if not exists public.organization_members",
    );
    expect(migration).toContain(
      "create table if not exists public.organization_member_roles",
    );
    expect(migration).toContain("bootstrap_google_user");
    expect(migration).toContain("has_organization_role");
    expect(migration).toContain("can_access_admin");
    expect(migration).toContain("can_access_freelancer");
    expect(migration).toContain("enable row level security");
  });
});
