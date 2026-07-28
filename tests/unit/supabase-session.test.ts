import { NextRequest, NextResponse } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createServerClient } from "@supabase/ssr";
import { redirectWithCookies, updateSession } from "@/lib/supabase/proxy";

vi.mock("@supabase/ssr", () => ({
  createServerClient: vi.fn(),
}));

const mockedCreateServerClient = vi.mocked(createServerClient);

describe("persistencia de sessao Supabase no proxy", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://supabase.test";
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "publishable-key";
  });

  it("copia cookies fragmentados para redirects", () => {
    const sourceResponse = NextResponse.next();
    sourceResponse.cookies.set("sb-test-auth-token.0", "fresh-0", {
      path: "/",
    });
    sourceResponse.cookies.set("sb-test-auth-token.1", "fresh-1", {
      path: "/",
    });

    const response = redirectWithCookies(
      new URL("https://tracos.test/login"),
      sourceResponse,
    );

    expect(response.cookies.get("sb-test-auth-token.0")?.value).toBe("fresh-0");
    expect(response.cookies.get("sb-test-auth-token.1")?.value).toBe("fresh-1");
  });

  it("renova cookies no proxy e preserva a sessao em rota admin", async () => {
    mockSupabaseClient({
      claimsUserId: "auth-user-1",
      profile: adminFreelancerProfile(),
      refreshedCookie: "fresh-token",
    });

    const response = await updateSession(
      new NextRequest("https://tracos.test/admin/eventos"),
    );

    expect(response.headers.get("location")).toBeNull();
    expect(response.cookies.get("sb-test-auth-token")?.value).toBe(
      "fresh-token",
    );
  });

  it("preserva cookies renovados ao redirecionar usuario sem sessao para login", async () => {
    mockSupabaseClient({
      claimsUserId: null,
      refreshedCookie: "cleared-or-refreshed",
    });

    const response = await updateSession(
      new NextRequest("https://tracos.test/admin/financeiro"),
    );

    expect(response.headers.get("location")).toBe(
      "https://tracos.test/login?redirectedFrom=%2Fadmin%2Ffinanceiro",
    );
    expect(response.cookies.get("sb-test-auth-token")?.value).toBe(
      "cleared-or-refreshed",
    );
  });

  it("redireciona sessao com dois papeis em /login para selecionar area", async () => {
    mockSupabaseClient({
      claimsUserId: "auth-user-1",
      profile: adminFreelancerProfile(),
      refreshedCookie: "fresh-token",
    });

    const response = await updateSession(
      new NextRequest("https://tracos.test/login"),
    );

    expect(response.headers.get("location")).toBe(
      "https://tracos.test/selecionar-area",
    );
    expect(response.cookies.get("sb-test-auth-token")?.value).toBe(
      "fresh-token",
    );
  });
});

function mockSupabaseClient({
  claimsUserId,
  profile,
  refreshedCookie,
}: {
  claimsUserId: string | null;
  profile?: unknown;
  refreshedCookie: string;
}) {
  mockedCreateServerClient.mockImplementation((_, __, options) => {
    const cookieOptions = options as unknown as {
      cookies: {
        setAll: (
          cookiesToSet: Array<{
            name: string;
            value: string;
            options: { path: string };
          }>,
        ) => void;
      };
    };

    cookieOptions.cookies.setAll([
      {
        name: "sb-test-auth-token",
        value: refreshedCookie,
        options: { path: "/" },
      },
    ]);

    return {
      auth: {
        getClaims: vi.fn(async () => ({
          data: claimsUserId ? { claims: { sub: claimsUserId } } : null,
          error: claimsUserId ? null : new Error("missing session"),
        })),
      },
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            maybeSingle: vi.fn(async () => ({
              data: profile ?? null,
              error: null,
            })),
          })),
        })),
      })),
    } as never;
  });
}

function adminFreelancerProfile() {
  return {
    id: "profile-1",
    organization_id: "org-1",
    is_active: true,
    organization_members: [
      {
        organization_id: "org-1",
        is_active: true,
        organization_member_roles: [{ role: "admin" }, { role: "freelancer" }],
      },
    ],
  };
}
