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

  it("copia cookies fragmentados para redirects e impede cache", () => {
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

    expect(response.headers.get("cache-control")).toBe(
      "private, no-store, max-age=0",
    );
    expect(response.cookies.get("sb-test-auth-token.0")?.value).toBe("fresh-0");
    expect(response.cookies.get("sb-test-auth-token.1")?.value).toBe("fresh-1");
  });

  it("renova cookies no proxy e preserva a sessao em rota admin sem consultar perfil", async () => {
    const fromSpy = mockSupabaseClient({
      claimsUserId: "auth-user-1",
      refreshedCookie: "fresh-token",
    });

    const response = await updateSession(
      new NextRequest("https://tracos.test/admin/eventos"),
    );

    expect(response.headers.get("location")).toBeNull();
    expect(response.headers.get("cache-control")).toBe(
      "private, no-store, max-age=0",
    );
    expect(response.cookies.get("sb-test-auth-token")?.value).toBe(
      "fresh-token",
    );
    expect(fromSpy).not.toHaveBeenCalled();
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
    expect(response.headers.get("cache-control")).toBe(
      "private, no-store, max-age=0",
    );
    expect(response.cookies.get("sb-test-auth-token")?.value).toBe(
      "cleared-or-refreshed",
    );
  });

  it("nao redireciona prefetch sem sessao para login", async () => {
    mockSupabaseClient({
      claimsUserId: null,
      refreshedCookie: "ignored",
    });

    const request = new NextRequest("https://tracos.test/admin/eventos", {
      headers: {
        "next-router-prefetch": "1",
      },
    });
    const response = await updateSession(request);

    expect(response.headers.get("location")).toBeNull();
    expect(response.cookies.get("sb-test-auth-token")).toBeUndefined();
  });
});

function mockSupabaseClient({
  claimsUserId,
  refreshedCookie,
}: {
  claimsUserId: string | null;
  refreshedCookie: string;
}) {
  const fromSpy = vi.fn();

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
      from: fromSpy,
    } as never;
  });

  return fromSpy;
}
