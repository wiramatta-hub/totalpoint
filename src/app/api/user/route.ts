import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/user?line_uid=xxx
 * Returns user profile, or creates one if it doesn't exist yet.
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const line_uid = searchParams.get("line_uid");
    const display_name = searchParams.get("display_name");

    if (!line_uid) {
      return NextResponse.json({ error: "line_uid is required" }, { status: 400 });
    }

    // Upsert: create user on first login via LIFF
    const user = await prisma.user.upsert({
      where: { line_uid },
      update: {
        // Keep display_name fresh if LINE profile changes
        ...(display_name ? { display_name } : {}),
      },
      create: {
        line_uid,
        display_name: display_name ?? "LINE User",
      },
    });

    return NextResponse.json({ user });
  } catch (err) {
    console.error("[GET /api/user]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
