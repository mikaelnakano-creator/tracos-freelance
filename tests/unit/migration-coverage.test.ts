import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();

describe("migrations de acesso, vagas e RLS", () => {
  it("mantém RPC atômica de aceite de vaga", () => {
    const migration = readFileSync(
      join(root, "supabase/migrations/0003_event_team_slots.sql"),
      "utf8",
    );

    expect(migration).toContain("accept_open_event_slot");
    expect(migration).toContain("for update");
    expect(migration).toContain("Você já faz parte da equipe deste evento.");
  });

  it("mantém usuários autorizados e políticas RLS", () => {
    const migration = readFileSync(
      join(root, "supabase/migrations/0004_google_authorized_access.sql"),
      "utf8",
    );

    expect(migration).toContain(
      "create table if not exists public.authorized_users",
    );
    expect(migration).toContain("enable row level security");
    expect(migration).toContain("Admins manage authorized users");
    expect(migration).toContain("Freelancers update own public profile");
  });
});
