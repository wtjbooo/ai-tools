import { NextRequest, NextResponse } from "next/server";
export const dynamic = "force-dynamic";

function normalizeRedirectTo(input: string | null) {
  if (!input) return "/";

  if (!input.startsWith("/")) {
    return "/";
  }

  if (input.startsWith("//")) {
    return "/";
  }

  return input;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams, origin } = new URL(request.url);
    const redirectTo = normalizeRedirectTo(searchParams.get("redirectTo"));

    const target = new URL("/auth/email", origin);
    target.searchParams.set("redirectTo", redirectTo);

    return NextResponse.redirect(target);
  } catch (error) {
    console.error("[AUTH_EMAIL_START_GET_ERROR]", error);

    return NextResponse.json(
      { ok: false, error: "邮箱登录入口暂时不可用，请稍后重试" },
      { status: 500 },
    );
  }
}